//! Local preflight: diagnoses the environment before a task starts.
//!
//! Every check runs, so one execution lists everything that needs fixing.
//! Output never includes tokens, passwords, config contents or query rows
//! beyond migration file names.

mod rules;

use crate::Result;
use crate::graph::readiness;
use crate::graph::repository::resolve_repository;
use crate::process::{repo_root, require_command, run_output, run_output_timeout};
use rules::{
    applied_migrations, branch_problem, go_mod_version, has_playwright_mcp, migration_problem,
    parse_version, turso_logged_out, url_targets_database, version_at_least,
};
use std::collections::BTreeSet;
use std::env;
use std::fs;
use std::net::TcpListener;
use std::path::{Path, PathBuf};
use std::time::Duration;

const DATABASE: &str = "vec-dev";
const NODE_MIN: (u64, u64) = (24, 0);
const TIMEOUT: Duration = Duration::from_secs(20);

pub(crate) type Outcome = (&'static str, Result<String>);

/// Runs every preflight check; also used by `evidence --visual`.
pub(crate) fn preflight_outcomes() -> Result<Vec<Outcome>> {
    let root = repo_root()?;
    let outcomes = [
        ("git", git_check(&root)),
        (
            "github",
            resolve_repository().map(|repo| format!("repository {repo}")),
        ),
        ("graph", graph_check()),
        ("tools", tools_check(&root)),
        ("playwright-mcp", mcp_check()),
        ("port", port_check()),
    ];
    let turso = turso_check();
    let migrations = match &turso {
        Ok(_) => migrations_check(&root),
        Err(_) => Err("skipped until the turso check passes".into()),
    };
    Ok(outcomes
        .into_iter()
        .chain([("turso", turso), ("migrations", migrations)])
        .collect())
}

pub(crate) fn preflight_command() -> Result<()> {
    let mut failures = 0;
    for (name, outcome) in preflight_outcomes()? {
        match outcome {
            Ok(detail) => println!("ok    {name}: {detail}"),
            Err(problem) => {
                failures += 1;
                println!("FAIL  {name}: {problem}");
            }
        }
    }
    if failures > 0 {
        return Err(format!(
            "Preflight failed: {failures} check(s) need attention."
        ));
    }
    println!("Preflight passed.");
    Ok(())
}

fn git_check(root: &Path) -> Result<String> {
    let branch = run_output("git", &["branch", "--show-current"], Some(root))?;
    if let Some(problem) = branch_problem(&branch) {
        return Err(problem);
    }
    if !run_output("git", &["status", "--porcelain"], Some(root))?.is_empty() {
        return Err("worktree has uncommitted changes; commit them or use another worktree".into());
    }
    Ok(format!("clean worktree on {branch}"))
}

fn graph_check() -> Result<String> {
    let issue = match env::var("ISSUE_NUMBER") {
        Ok(value) if !value.is_empty() => Some(
            value
                .parse::<u64>()
                .ok()
                .filter(|number| *number > 0)
                .ok_or("ISSUE_NUMBER must be a positive integer")?,
        ),
        _ => None,
    };
    readiness(issue)
}

fn tools_check(root: &Path) -> Result<String> {
    let node = run_output("node", &["--version"], None)
        .ok()
        .and_then(|output| parse_version(&output))
        .ok_or("node is not installed")?;
    if !version_at_least(node, NODE_MIN) {
        return Err(format!(
            "node {}.{} found; {} or newer required",
            node.0, node.1, NODE_MIN.0
        ));
    }
    let go_required = fs::read_to_string(root.join("go.mod"))
        .ok()
        .and_then(|text| go_mod_version(&text))
        .ok_or("go.mod has no go version")?;
    let go = run_output("go", &["version"], None)
        .ok()
        .and_then(|output| parse_version(&output))
        .ok_or("go is not installed")?;
    if !version_at_least(go, go_required) {
        return Err(format!(
            "go {}.{} found; {}.{} or newer required",
            go.0, go.1, go_required.0, go_required.1
        ));
    }
    if !root.join("node_modules/.bin/tsc").exists() {
        return Err("frontend dependencies missing; run `npm ci`".into());
    }
    Ok(format!(
        "node {}.{}, go {}.{}, npm dependencies",
        node.0, node.1, go.0, go.1
    ))
}

fn mcp_check() -> Result<String> {
    let home = env::var_os("HOME").map(PathBuf::from).unwrap_or_default();
    let codex = env::var_os("CODEX_HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| home.join(".codex"))
        .join("config.toml");
    let read = |path: PathBuf| fs::read_to_string(path).unwrap_or_default();
    if has_playwright_mcp(&read(codex), &read(home.join(".claude.json"))) {
        Ok("configured for Codex or Claude Code".into())
    } else {
        Err(
            "Playwright MCP not configured; add it to Codex or Claude Code and restart the session"
                .into(),
        )
    }
}

fn turso_check() -> Result<String> {
    require_command("turso").map_err(|_| "turso CLI is not installed")?;
    let whoami = run_output_timeout("turso", &["auth", "whoami"], None, TIMEOUT)
        .map_err(|_| "turso auth whoami failed")?;
    if turso_logged_out(&whoami) {
        return Err("turso CLI is not authenticated; run `turso auth login`".into());
    }
    let url = run_output_timeout("turso", &["db", "show", DATABASE, "--url"], None, TIMEOUT)
        .map_err(|_| format!("database {DATABASE} not found for this Turso account"))?;
    if !url_targets_database(&url, DATABASE) {
        return Err(format!(
            "turso did not resolve exactly {DATABASE}; refusing to continue"
        ));
    }
    Ok(format!("authenticated; {DATABASE} found"))
}

fn migrations_check(root: &Path) -> Result<String> {
    let repository: BTreeSet<String> = fs::read_dir(root.join("backend/migrations"))
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok()?.file_name().into_string().ok())
        .filter(|name| name.ends_with(".sql"))
        .collect();
    let output = run_output_timeout(
        "turso",
        &[
            "db",
            "shell",
            DATABASE,
            "SELECT versao FROM schema_migrations ORDER BY versao",
        ],
        None,
        TIMEOUT,
    )
    .map_err(|_| format!("could not read schema_migrations from {DATABASE} (read-only query)"))?;
    let applied = applied_migrations(&output)
        .ok_or_else(|| format!("schema_migrations query returned no result from {DATABASE}"))?;
    match migration_problem(&repository, &applied) {
        Some(problem) => Err(problem),
        None => Ok(format!(
            "{} applied in {DATABASE}, none pending",
            applied.len()
        )),
    }
}

fn port_check() -> Result<String> {
    let port: u16 = env::var("PORT")
        .unwrap_or_else(|_| "8080".into())
        .parse()
        .map_err(|_| "PORT must be a number between 1 and 65535")?;
    TcpListener::bind(("0.0.0.0", port))
        .map(|_| format!("{port} is free"))
        .map_err(|_| format!("port {port} is in use; stop that process or set PORT"))
}
