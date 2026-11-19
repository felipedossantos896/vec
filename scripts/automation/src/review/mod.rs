mod agent;
mod github;

use crate::Result;
use crate::process::{TempDir, repo_root, require_command, run_output, run_status};
use agent::{choose_agent, implementers, run_agent};
use github::{
    confirm_unchanged, pr_data, require_owner_pr, require_ready_pr, verified_ci_evidence,
};
use regex::Regex;
use std::fs;

pub(crate) const BLOCKED_DRY_RUN: &str = "review blocked the PR";
const REVIEW_CONTEXT: &str = "revisao-independente";

pub(crate) fn review_pr_command(args: &[String]) -> Result<()> {
    let number: u64 = args
        .first()
        .ok_or("review-pr requires a PR number")?
        .parse()
        .map_err(|_| "invalid PR number")?;
    if number == 0 {
        return Err("invalid PR number".into());
    }
    let mut agent = "auto".to_string();
    let mut dry_run = false;
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--agent" => {
                i += 1;
                agent = args.get(i).ok_or("--agent requires a value")?.clone();
            }
            "--dry-run" => dry_run = true,
            "--merge" => return Err("automatic merge is unavailable; run review-pr without --merge and merge the reviewed PR through GitHub".into()),
            other => return Err(format!("unknown option: {other}")),
        }
        i += 1;
    }
    if !matches!(agent.as_str(), "auto" | "codex" | "claude") {
        return Err("invalid agent".into());
    }
    require_command("gh")?;
    require_command("git")?;
    run_status("gh", &["auth", "status"], None, None, true)?;
    let root = repo_root()?;
    let repository = run_output(
        "gh",
        &[
            "repo",
            "view",
            "--json",
            "nameWithOwner",
            "--jq",
            ".nameWithOwner",
        ],
        None,
    )?;
    let owner = repository.split('/').next().ok_or("invalid repository")?;
    let initial = pr_data(number, &repository)?;
    require_owner_pr(&initial, owner)?;
    require_ready_pr(&initial)?;
    let ci_evidence = verified_ci_evidence(&repository, number, &initial)?;
    let base_ref = format!("refs/remotes/origin/{}", initial.base_ref_name);
    let remote = format!("https://github.com/{repository}.git");
    run_status(
        "git",
        &[
            "fetch",
            &remote,
            &format!("{}:{base_ref}", initial.base_ref_name),
        ],
        Some(&root),
        None,
        true,
    )
    .map_err(|error| format!("fetching the reviewed base: {error}"))?;
    let fetched = run_output("git", &["rev-parse", &base_ref], Some(&root))?;
    if fetched != initial.base_ref_oid {
        return Err("fetched base does not match the PR base".into());
    }
    run_status(
        "git",
        &["fetch", &remote, &format!("pull/{number}/head")],
        Some(&root),
        None,
        true,
    )
    .map_err(|error| format!("fetching the reviewed PR head: {error}"))?;
    let messages = run_output(
        "git",
        &[
            "log",
            "--format=%B",
            &format!("{}..{}", initial.base_ref_oid, initial.head_ref_oid),
        ],
        Some(&root),
    )?;
    let agent = choose_agent(&agent, &implementers(&messages))?;
    run_status(&agent, &["--version"], None, None, true)?;
    let temp = TempDir::new(&format!("vec-review-pr-{number}"))?;
    let output = temp.path.join("review.md");
    let changed_ci = !run_output(
        "git",
        &[
            "diff",
            "--no-ext-diff",
            "--no-textconv",
            "--name-only",
            &initial.base_ref_oid,
            &initial.head_ref_oid,
            "--",
            ".github/workflows/ci.yml",
        ],
        Some(&root),
    )?
    .is_empty();
    let evidence = if changed_ci {
        format!(
            "The API verified the run identity and job result below. The candidate changes the CI workflow, so its green result alone does not establish that the expected validations ran. Independently compare the old and new CI steps in the supplied diff. If the new workflow still performs the required validations, include a standalone line `CI workflow: verified.` before the final verdict. Otherwise report the missing validation and block.\n{ci_evidence}"
        )
    } else {
        ci_evidence
    };
    run_agent(&agent, number, &initial, &evidence, &root, &output)
        .map_err(|error| format!("running the local {agent} review: {error}"))?;
    let review = safe_review(&fs::read_to_string(&output).map_err(|e| e.to_string())?)?;
    verified_ci_evidence(&repository, number, &initial)?;
    let current = pr_data(number, &repository)?;
    require_owner_pr(&current, owner)?;
    confirm_unchanged(&initial, &current)?;
    println!("{review}");
    let ship = can_publish_review(&review, changed_ci);
    if dry_run {
        return if ship {
            Ok(())
        } else {
            Err(BLOCKED_DRY_RUN.into())
        };
    }
    if !ship {
        publish_status(&repository, &initial.head_ref_oid, false, &agent)?;
        return Err("review blocked the PR; status revisao-independente set to failure".into());
    }
    let body = format!(
        "## Revisão independente local ({agent})\n\nBranch de destino revisada\n\n    {}\n\n**Base:** `{}`  \n**Head:** `{}`\n\nO agente local não encontrou bloqueios no diff exato acima.\n\nVerdict: Ship.",
        initial.base_ref_name, initial.base_ref_oid, initial.head_ref_oid
    );
    run_status(
        "gh",
        &[
            "pr",
            "comment",
            &number.to_string(),
            "--repo",
            &repository,
            "--body",
            &body,
        ],
        None,
        None,
        false,
    )?;
    publish_status(&repository, &initial.head_ref_oid, true, &agent)
}

/// Commit status required by the `main` protection. It is bound to the
/// reviewed SHA, so any new push needs a new independent review.
fn publish_status(repository: &str, sha: &str, ship: bool, agent: &str) -> Result<()> {
    let (state, description) = if ship {
        ("success", format!("Ship por {agent} no SHA revisado"))
    } else {
        ("failure", format!("Bloqueado por {agent}"))
    };
    run_status(
        "gh",
        &[
            "api",
            "--hostname",
            "github.com",
            "-X",
            "POST",
            &format!("repos/{repository}/statuses/{sha}"),
            "-f",
            &format!("state={state}"),
            "-f",
            &format!("context={REVIEW_CONTEXT}"),
            "-f",
            &format!("description={description}"),
        ],
        None,
        None,
        true,
    )
    .map_err(|error| format!("publishing the {REVIEW_CONTEXT} status: {error}"))
}

fn can_publish_review(review: &str, changed_ci: bool) -> bool {
    is_ship(review)
        && (!changed_ci
            || review
                .lines()
                .any(|line| line.trim() == "CI workflow: verified."))
}

fn is_ship(review: &str) -> bool {
    let lines: Vec<_> = review
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect();
    let verdicts: Vec<_> = lines
        .iter()
        .filter(|line| matches!(**line, "Verdict: Ship." | "Verdict: blocked."))
        .collect();
    verdicts.len() == 1 && lines.last() == Some(&"Verdict: Ship.")
}

fn safe_review(review: &str) -> Result<String> {
    let review = review.trim();
    if review.is_empty() || review.len() > 50_000 {
        return Err("review output is empty or too large".into());
    }
    let secret =
        Regex::new(r"(?i)(?:authorization:\s*bearer|(?:token|secret|password|api[_-]?key)\s*[=:])")
            .unwrap();
    if secret.is_match(review) {
        return Err("review output may contain a secret".into());
    }
    Ok(review.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exact_ship_only() {
        assert!(is_ship("Summary\n\nVerdict: Ship."));
        assert!(!is_ship("Looks good. Ship."));
        assert!(!is_ship("Verdict: Ship.\nVerdict: blocked."));
    }
    #[test]
    fn secrets_rejected() {
        assert!(safe_review("Verdict: Ship.").is_ok());
        assert!(safe_review("api_key=do-not-print").is_err());
    }

    #[test]
    fn publishing_with_changed_ci_requires_independent_workflow_review() {
        assert!(!can_publish_review("Verdict: Ship.", true));
        assert!(can_publish_review(
            "CI workflow: verified.\nVerdict: Ship.",
            true
        ));
        assert!(!can_publish_review(
            "CI workflow: verified.\nVerdict: blocked.",
            true
        ));
        assert!(can_publish_review("Verdict: Ship.", false));
    }
}
