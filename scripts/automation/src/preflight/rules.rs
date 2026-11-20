//! Pure preflight rules, kept free of I/O so they can be unit tested.

use regex::Regex;
use std::collections::BTreeSet;

/// Extracts `(major, minor)` from `node --version` (`v24.1.0`) or
/// `go version` (`go version go1.25.1 darwin/arm64`) / `go.mod` (`go 1.24`).
pub(super) fn parse_version(text: &str) -> Option<(u64, u64)> {
    let capture = Regex::new(r"(?:^v|\bgo ?|^)(\d+)\.(\d+)")
        .unwrap()
        .captures(text.trim())?;
    Some((capture[1].parse().ok()?, capture[2].parse().ok()?))
}

pub(super) fn go_mod_version(go_mod: &str) -> Option<(u64, u64)> {
    go_mod
        .lines()
        .find_map(|line| line.trim().strip_prefix("go ").and_then(parse_version))
}

pub(super) fn version_at_least(found: (u64, u64), required: (u64, u64)) -> bool {
    found >= required
}

/// The turso CLI exits 0 when logged out, so its text must be inspected.
pub(super) fn turso_logged_out(output: &str) -> bool {
    output.contains("not logged in")
}

/// Reads applied migration names from `turso db shell` tabular output.
/// Without the `VERSAO` header the query did not run (the CLI may exit 0
/// on failure), so the result is unknown rather than "nothing applied".
pub(super) fn applied_migrations(shell_output: &str) -> Option<BTreeSet<String>> {
    let mut lines = shell_output.lines().map(str::trim);
    if lines.next() != Some("VERSAO") {
        return None;
    }
    let name = Regex::new(r"^[0-9]{4}_[a-z0-9_]+\.sql$").unwrap();
    Some(
        lines
            .filter(|line| name.is_match(line))
            .map(String::from)
            .collect(),
    )
}

/// Compares repository migrations with the applied ones. An applied
/// migration missing from the repository means the branch is behind.
pub(super) fn migration_problem(
    repository: &BTreeSet<String>,
    applied: &BTreeSet<String>,
) -> Option<String> {
    let pending: Vec<_> = repository.difference(applied).cloned().collect();
    let unknown: Vec<_> = applied.difference(repository).cloned().collect();
    if !pending.is_empty() {
        return Some(format!(
            "pending in vec-dev: {}; apply them against vec-dev with `go run ./backend/cmd/migrate`",
            pending.join(", ")
        ));
    }
    if !unknown.is_empty() {
        return Some(format!(
            "vec-dev has migrations missing from this branch: {}; rebase on main",
            unknown.join(", ")
        ));
    }
    None
}

/// `turso db show <name> --url` must point at the exact database name,
/// which Turso renders as `libsql://<name>-<org>.<region>.turso.io`.
pub(super) fn url_targets_database(url: &str, database: &str) -> bool {
    let host = url.trim().strip_prefix("libsql://").unwrap_or_default();
    let label = host.split('.').next().unwrap_or_default();
    label
        .strip_prefix(database)
        .and_then(|rest| rest.strip_prefix('-'))
        .is_some_and(|org| !org.is_empty() && !org.contains('.'))
}

/// Detects a Playwright MCP entry in the Codex TOML config or the Claude
/// Code JSON config (plugin id or `mcpServers` key).
pub(super) fn has_playwright_mcp(codex_config: &str, claude_config: &str) -> bool {
    codex_config
        .lines()
        .any(|line| line.trim() == "[mcp_servers.playwright]")
        || claude_config.contains("\"playwright@")
        || Regex::new(r#""playwright"\s*:\s*\{"#)
            .unwrap()
            .is_match(claude_config)
}

pub(super) fn branch_problem(branch: &str) -> Option<String> {
    match branch {
        "" | "HEAD" => Some("detached HEAD; switch to a task branch".into()),
        "main" | "master" => Some(format!(
            "on {branch}; create a task branch or worktree first"
        )),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn set(items: &[&str]) -> BTreeSet<String> {
        items.iter().map(|item| item.to_string()).collect()
    }

    #[test]
    fn versions_are_parsed() {
        assert_eq!(parse_version("v24.1.0\n"), Some((24, 1)));
        assert_eq!(
            parse_version("go version go1.25.1 darwin/arm64"),
            Some((1, 25))
        );
        assert_eq!(go_mod_version("module vec\n\ngo 1.24\n"), Some((1, 24)));
        assert_eq!(parse_version("not a version"), None);
        assert!(version_at_least((1, 25), (1, 24)));
        assert!(!version_at_least((22, 9), (24, 0)));
    }

    #[test]
    fn migrations_are_compared() {
        let output = "VERSAO \n0001_inicial.sql   \n0002_listas_iniciais.sql\n";
        let applied = applied_migrations(output).unwrap();
        assert_eq!(
            applied,
            set(&["0001_inicial.sql", "0002_listas_iniciais.sql"])
        );
        assert_eq!(migration_problem(&applied, &applied), None);
        let repository = set(&["0001_inicial.sql", "0002_listas_iniciais.sql", "0003_x.sql"]);
        assert!(
            migration_problem(&repository, &applied)
                .unwrap()
                .contains("pending in vec-dev: 0003_x.sql")
        );
        assert!(
            migration_problem(&set(&["0001_inicial.sql"]), &applied)
                .unwrap()
                .contains("rebase on main")
        );
    }

    #[test]
    fn failed_turso_output_is_not_treated_as_empty() {
        let logged_out = "You are not logged in, please login with turso auth login before running other commands.";
        assert!(turso_logged_out(logged_out));
        assert!(!turso_logged_out("someone"));
        assert_eq!(applied_migrations(logged_out), None);
        assert_eq!(applied_migrations(""), None);
        assert_eq!(applied_migrations("VERSAO\n"), Some(BTreeSet::new()));
    }

    #[test]
    fn only_the_exact_database_is_accepted() {
        assert!(url_targets_database(
            "libsql://vec-dev-org.aws-us-east-1.turso.io\n",
            "vec-dev"
        ));
        for url in [
            "libsql://vec-prod-org.aws-us-east-1.turso.io",
            "libsql://vec-dev.aws-us-east-1.turso.io",
            "libsql://vec-devx-org.turso.io",
            "https://vec-dev-org.turso.io",
            "",
        ] {
            assert!(!url_targets_database(url, "vec-dev"), "{url}");
        }
    }

    #[test]
    fn playwright_mcp_detected_in_either_agent() {
        assert!(has_playwright_mcp(
            "[mcp_servers.playwright]\ncommand = \"npx\"",
            ""
        ));
        assert!(has_playwright_mcp(
            "",
            r#"{"enabled":["playwright@synced"]}"#
        ));
        assert!(has_playwright_mcp(
            "",
            r#"{"mcpServers":{"playwright": {"command":"npx"}}}"#
        ));
        // ~/.claude/settings.json plugin and project .mcp.json, joined by mcp_check.
        let settings = r#"{"enabledPlugins":{"playwright@claude-plugins":true}}"#;
        assert!(has_playwright_mcp("", &format!("{{}}\n{settings}\n")));
        let project = r#"{"mcpServers":{"playwright":{"command":"npx"}}}"#;
        assert!(has_playwright_mcp("", &format!("{{}}\n{{}}\n{project}")));
        assert!(!has_playwright_mcp(
            "# playwright later",
            r#"{"note":"playwright"}"#
        ));
    }

    #[test]
    fn task_branch_required() {
        assert!(branch_problem("main").is_some());
        assert!(branch_problem("HEAD").is_some());
        assert!(branch_problem("").is_some());
        assert_eq!(branch_problem("chore/issue-26-preflight"), None);
    }
}
