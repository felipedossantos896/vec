//! `evidence`: runs the CI-equivalent checks on a clean commit and renders
//! sanitised Markdown evidence (counts and pass/fail only, never raw output).
//!
//!   evidence [--visual] [--pr <n>] [--handoff <spec>]
//!
//! `--visual` adds preflight and `npm run test:e2e:dev`; `--pr` replaces the
//! marked section of that PR body (only when its head is the tested commit);
//! `--handoff` appends an entry to `specs/<spec>/handoff.md`.

mod rules;

use crate::Result;
use crate::preflight::preflight_outcomes;
use crate::process::{
    allowlisted_environment, repo_root, run_captured_with_input, run_output, run_output_timeout,
};
use rules::{CheckResult, Context, Counter, count, handoff_entry, parse, render, replace_section};
use serde_json::Value;
use std::fs;
use std::io::Write;
use std::path::Path;
use std::time::{Duration, Instant};

const TIMEOUT: Duration = Duration::from_secs(15 * 60);

/// (label, program, args, counter) — mirrors `.github/workflows/ci.yml`.
const CHECKS: &[(&str, &str, &[&str], Counter)] = &[
    (
        "Typecheck",
        "npm",
        &["run", "--silent", "typecheck"],
        Counter::None,
    ),
    (
        "Build do frontend",
        "npm",
        &["run", "--silent", "build"],
        Counter::None,
    ),
    (
        "Testes do frontend",
        "npm",
        &["run", "--silent", "test:frontend"],
        Counter::Node,
    ),
    (
        "Formatação Rust",
        "cargo",
        &[
            "fmt",
            "--manifest-path",
            "scripts/automation/Cargo.toml",
            "--",
            "--check",
        ],
        Counter::None,
    ),
    (
        "Testes da automação",
        "cargo",
        &[
            "test",
            "--locked",
            "--manifest-path",
            "scripts/automation/Cargo.toml",
        ],
        Counter::Cargo,
    ),
    (
        "Validação da spec",
        "cargo",
        &[
            "run",
            "--locked",
            "--quiet",
            "--manifest-path",
            "scripts/automation/Cargo.toml",
            "--",
            "validate-graph",
        ],
        Counter::None,
    ),
    ("Go vet", "go", &["vet", "./..."], Counter::None),
    ("Go test", "go", &["test", "./..."], Counter::GoPackages),
    ("Go build", "go", &["build", "./..."], Counter::None),
];

fn check(
    root: &Path,
    label: &'static str,
    program: &str,
    args: &[&str],
    counter: Counter,
) -> CheckResult {
    let command = format!("{program} {}", args.join(" "));
    eprintln!("… {label}");
    let started = Instant::now();
    let outcome = run_output_timeout(program, args, Some(root), TIMEOUT);
    let seconds = started.elapsed().as_secs();
    match outcome {
        Ok(output) => {
            let detail = count(counter, &output)
                .map(|c| format!("{c}, {seconds}s"))
                .unwrap_or(format!("{seconds}s"));
            CheckResult {
                label,
                command,
                passed: true,
                detail,
            }
        }
        Err(_) => CheckResult {
            label,
            command: command.clone(),
            passed: false,
            detail: format!("rode `{command}` para ver o erro"),
        },
    }
}

fn inline(label: &'static str, command: &str, outcome: Result<String>) -> CheckResult {
    let (passed, detail) = match outcome {
        Ok(detail) => (true, detail),
        Err(problem) => (false, problem),
    };
    CheckResult {
        label,
        command: command.into(),
        passed,
        detail,
    }
}

fn clean_worktree(root: &Path) -> Result<String> {
    if run_output("git", &["status", "--porcelain"], Some(root))?.is_empty() {
        Ok("nenhuma alteração".into())
    } else {
        Err("há arquivos alterados ou gerados (ex.: JS/CSS compilados fora de sincronia)".into())
    }
}

fn gofmt(root: &Path) -> Result<String> {
    let files = run_output("gofmt", &["-l", "."], Some(root))?;
    if files.is_empty() {
        Ok(String::new())
    } else {
        Err(format!(
            "{} arquivo(s) fora do padrão",
            files.lines().count()
        ))
    }
}

fn visual_checks(root: &Path, results: &mut Vec<CheckResult>) {
    let preflight = preflight_outcomes().and_then(|outcomes| {
        let failed: Vec<_> = outcomes
            .iter()
            .filter(|(_, o)| o.is_err())
            .map(|(name, _)| *name)
            .collect();
        if failed.is_empty() {
            Ok(format!("{} verificações ok", outcomes.len()))
        } else {
            Err(format!(
                "falhou: {}; rode `vec-automation preflight`",
                failed.join(", ")
            ))
        }
    });
    results.push(inline("Preflight", "vec-automation preflight", preflight));
    let has_script = fs::read_to_string(root.join("package.json"))
        .ok()
        .and_then(|text| serde_json::from_str::<Value>(&text).ok())
        .is_some_and(|json| json["scripts"]["test:e2e:dev"].is_string());
    if has_script {
        results.push(check(
            root,
            "Smoke E2E vec-dev",
            "npm",
            &["run", "--silent", "test:e2e:dev"],
            Counter::OkLines,
        ));
    } else {
        results.push(inline(
            "Smoke E2E vec-dev",
            "npm run test:e2e:dev",
            Err("script test:e2e:dev ausente nesta branch".into()),
        ));
    }
}

fn update_pr(root: &Path, number: u64, commit: &str, section: &str) -> Result<()> {
    let number = number.to_string();
    let data: Value = serde_json::from_str(&run_output(
        "gh",
        &["pr", "view", &number, "--json", "headRefOid,body"],
        Some(root),
    )?)
    .map_err(|e| e.to_string())?;
    if data["headRefOid"].as_str() != Some(commit) {
        return Err(format!(
            "PR #{number} head is not the tested commit; push it and run again"
        ));
    }
    let body = replace_section(data["body"].as_str().unwrap_or_default(), section);
    run_captured_with_input(
        "gh",
        &["pr", "edit", &number, "--body-file", "-"],
        Some(root),
        &body,
        &allowlisted_environment(),
    )?;
    eprintln!("PR #{number} atualizada com a evidência.");
    Ok(())
}

pub(crate) fn evidence_command(args: &[String]) -> Result<()> {
    let options = parse(args)?;
    let root = repo_root()?;
    let branch = run_output("git", &["branch", "--show-current"], Some(&root))?;
    if branch.is_empty() || branch == "main" {
        return Err("run evidence on a task branch, not main or detached HEAD".into());
    }
    clean_worktree(&root)
        .map_err(|_| "commit your changes first: evidence must describe a commit")?;
    let commit = run_output("git", &["rev-parse", "HEAD"], Some(&root))?;
    let base = run_output("git", &["merge-base", "HEAD", "origin/main"], Some(&root))?;
    let generated_at = run_output("date", &["-u", "+%Y-%m-%d %H:%M"], None)?;

    let mut results = Vec::new();
    if options.visual {
        visual_checks(&root, &mut results);
    }
    for (label, program, args, counter) in CHECKS {
        results.push(check(&root, label, program, args, *counter));
    }
    results.push(inline("gofmt", "gofmt -l .", gofmt(&root)));
    results.push(inline(
        "Espaços em branco",
        "git diff --check",
        run_output("git", &["diff", "--check", &base, "HEAD"], Some(&root)).map(|_| String::new()),
    ));
    results.push(inline(
        "Worktree após verificações",
        "git status --porcelain",
        clean_worktree(&root),
    ));

    let context = Context {
        commit: &commit[..12],
        branch: &branch,
        base: &base[..12],
        generated_at: &generated_at,
    };
    let section = render(&context, &results);
    println!("{section}");
    if let Some(number) = options.pr {
        update_pr(&root, number, &commit, &section)?;
    }
    if let Some(spec) = &options.handoff {
        let path = root.join("specs").join(spec).join("handoff.md");
        let mut file = fs::OpenOptions::new()
            .append(true)
            .open(&path)
            .map_err(|_| format!("specs/{spec}/handoff.md not found"))?;
        file.write_all(handoff_entry(&context, &results).as_bytes())
            .map_err(|e| e.to_string())?;
        eprintln!("Handoff atualizado em specs/{spec}/handoff.md; faça commit dele.");
    }
    let failed = results.iter().filter(|result| !result.passed).count();
    if failed > 0 {
        return Err(format!("Evidence: {failed} check(s) failed."));
    }
    Ok(())
}
