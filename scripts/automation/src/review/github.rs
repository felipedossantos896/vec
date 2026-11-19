use crate::Result;
use crate::process::run_output;
use serde::Deserialize;
use serde_json::Value;

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct PullRequest {
    state: String,
    is_draft: bool,
    author: Option<Login>,
    pub(super) base_ref_name: String,
    pub(super) base_ref_oid: String,
    pub(super) head_ref_oid: String,
    is_cross_repository: bool,
    head_repository_owner: Option<Login>,
    #[serde(default)]
    status_check_rollup: Vec<Check>,
}

#[derive(Clone, Debug, Deserialize)]
struct Login {
    login: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Check {
    name: Option<String>,
    context: Option<String>,
    workflow_name: Option<String>,
    status: Option<String>,
    conclusion: Option<String>,
    state: Option<String>,
}

pub(super) fn pr_data(number: u64, repository: &str) -> Result<PullRequest> {
    let fields = "state,isDraft,isCrossRepository,author,baseRefName,baseRefOid,headRefOid,headRepositoryOwner,statusCheckRollup";
    let output = run_output(
        "gh",
        &[
            "pr",
            "view",
            &number.to_string(),
            "--repo",
            repository,
            "--json",
            fields,
        ],
        None,
    )?;
    serde_json::from_str(&output).map_err(|e| e.to_string())
}

pub(super) fn require_owner_pr(pr: &PullRequest, owner: &str) -> Result<()> {
    if pr.author.as_ref().map(|value| value.login.as_str()) != Some(owner)
        || pr
            .head_repository_owner
            .as_ref()
            .map(|value| value.login.as_str())
            != Some(owner)
        || pr.is_cross_repository
    {
        return Err(
            "autonomous review is restricted to owner-authored branches in this repository".into(),
        );
    }
    Ok(())
}

pub(super) fn require_ready_pr(pr: &PullRequest) -> Result<()> {
    if pr.state != "OPEN" || pr.is_draft {
        return Err("PR must be open and not draft".into());
    }
    if pr.status_check_rollup.is_empty() {
        return Err("PR has no checks".into());
    }
    let mut required = false;
    let mut failures = Vec::new();
    for check in &pr.status_check_rollup {
        let name = check
            .name
            .as_deref()
            .or(check.context.as_deref())
            .unwrap_or("unknown check");
        let success = (check.status.as_deref() == Some("COMPLETED")
            && check.conclusion.as_deref() == Some("SUCCESS"))
            || check.state.as_deref() == Some("SUCCESS");
        let optional_skip =
            name == "Publicar no Fly.io" && check.conclusion.as_deref() == Some("SKIPPED");
        if name == "testes" && check.workflow_name.as_deref() == Some("CI") && success {
            required = true;
        }
        if !success && !optional_skip {
            failures.push(name.to_string());
        }
    }
    if !required {
        failures.push("required check testes is missing or unsuccessful".into());
    }
    if !failures.is_empty() {
        return Err(format!("checks are not green: {}", failures.join(", ")));
    }
    Ok(())
}

pub(super) fn confirm_unchanged(initial: &PullRequest, current: &PullRequest) -> Result<()> {
    if current.head_ref_oid != initial.head_ref_oid {
        return Err("PR changed during review; run it again".into());
    }
    if current.base_ref_name != initial.base_ref_name
        || current.base_ref_oid != initial.base_ref_oid
    {
        return Err("PR base changed during review; run it again".into());
    }
    require_ready_pr(current)
}

pub(super) fn verified_ci_evidence(
    repository: &str,
    number: u64,
    pr: &PullRequest,
) -> Result<String> {
    let endpoint = format!("repos/{repository}/actions/workflows/ci.yml/runs");
    let output = run_output(
        "gh",
        &[
            "api",
            "--hostname",
            "github.com",
            "--method",
            "GET",
            &endpoint,
            "-f",
            "event=pull_request",
            "-f",
            &format!("head_sha={}", pr.head_ref_oid),
        ],
        None,
    )?;
    let run = ci_run_for_pr(
        &serde_json::from_str(&output).map_err(|e| e.to_string())?,
        number,
        pr,
    )?;
    let endpoint = format!("repos/{repository}/actions/runs/{run}/jobs");
    let output = run_output("gh", &["api", "--hostname", "github.com", &endpoint], None)?;
    let jobs: Value = serde_json::from_str(&output).map_err(|e| e.to_string())?;
    if !jobs["jobs"].as_array().is_some_and(|jobs| {
        jobs.iter().any(|job| {
            job["name"] == "testes"
                && job["status"] == "completed"
                && job["conclusion"] == "success"
        })
    }) {
        return Err("the expected CI run has no successful testes job".into());
    }
    Ok(format!(
        "Trusted gate evidence: GitHub Actions run {run} of ci.yml passed testes for PR #{number} at exact head {} before this review.",
        pr.head_ref_oid
    ))
}

fn ci_run_for_pr(response: &Value, number: u64, pr: &PullRequest) -> Result<u64> {
    let run = response["workflow_runs"]
        .as_array()
        .and_then(|runs| {
            runs.iter().find(|run| {
                run["path"] == ".github/workflows/ci.yml"
                    && run["event"] == "pull_request"
                    && run["head_sha"] == pr.head_ref_oid
                    && run["pull_requests"].as_array().is_some_and(|pulls| {
                        pulls.iter().any(|pull| {
                            pull["number"] == number
                                && pull["base"]["ref"] == pr.base_ref_name
                                && pull["base"]["sha"] == pr.base_ref_oid
                                && pull["head"]["sha"] == pr.head_ref_oid
                        })
                    })
            })
        })
        .filter(|run| run["status"] == "completed" && run["conclusion"] == "success")
        .ok_or("the expected CI workflow is not successful for this PR, base and head")?;
    run["id"].as_u64().ok_or_else(|| "missing CI run ID".into())
}

#[cfg(test)]
mod tests {
    use super::super::agent::review_prompt;
    use super::*;
    use serde_json::json;

    fn pr() -> PullRequest {
        PullRequest {
            state: "OPEN".into(),
            is_draft: false,
            author: Some(Login {
                login: "owner".into(),
            }),
            base_ref_name: "main".into(),
            base_ref_oid: "base".into(),
            head_ref_oid: "head".into(),
            is_cross_repository: false,
            head_repository_owner: Some(Login {
                login: "owner".into(),
            }),
            status_check_rollup: vec![Check {
                name: Some("testes".into()),
                context: None,
                workflow_name: Some("CI".into()),
                status: Some("COMPLETED".into()),
                conclusion: Some("SUCCESS".into()),
                state: None,
            }],
        }
    }

    #[test]
    fn only_owner_branches() {
        require_owner_pr(&pr(), "owner").unwrap();
        assert!(require_owner_pr(&pr(), "other").is_err());
        let mut fork = pr();
        fork.is_cross_repository = true;
        assert!(require_owner_pr(&fork, "owner").is_err());
    }
    #[test]
    fn green_ci_and_evidence_required() {
        require_ready_pr(&pr()).unwrap();
        let mut bad = pr();
        bad.status_check_rollup[0].conclusion = Some("FAILURE".into());
        assert!(require_ready_pr(&bad).is_err());
        let mut missing = pr();
        missing.status_check_rollup[0].name = Some("unrelated".into());
        assert!(require_ready_pr(&missing).is_err());
        let mut wrong_workflow = pr();
        wrong_workflow.status_check_rollup[0].workflow_name = Some("untrusted".into());
        assert!(require_ready_pr(&wrong_workflow).is_err());
    }
    #[test]
    fn optional_deploy_skip_allowed() {
        let mut value = pr();
        value.status_check_rollup.push(Check {
            name: Some("Publicar no Fly.io".into()),
            context: None,
            workflow_name: Some("CI".into()),
            status: Some("COMPLETED".into()),
            conclusion: Some("SKIPPED".into()),
            state: None,
        });
        require_ready_pr(&value).unwrap();
    }

    #[test]
    fn changed_sha_or_base_rejected() {
        let initial = pr();
        let mut changed = pr();
        changed.head_ref_oid = "new".into();
        assert!(confirm_unchanged(&initial, &changed).is_err());
        changed = pr();
        changed.base_ref_oid = "new".into();
        assert!(confirm_unchanged(&initial, &changed).is_err());
    }
    #[test]
    fn prompt_contains_trusted_ci_evidence() {
        let value = pr();
        let prompt = review_prompt(34, &value, "Trusted gate evidence: exact head head", "diff");
        assert!(prompt.starts_with("Trusted gate evidence:"));
        assert!(prompt.contains("exact head head"));
    }

    #[test]
    fn ci_evidence_requires_the_reviewed_pr_and_base() {
        let mut response = json!({"workflow_runs":[{
            "id":42,"path":".github/workflows/ci.yml","event":"pull_request","head_sha":"head",
            "status":"completed","conclusion":"success","pull_requests":[
                {"number":36,"base":{"ref":"main","sha":"base"},"head":{"sha":"head"}}
            ]
        }]});
        assert_eq!(ci_run_for_pr(&response, 36, &pr()).unwrap(), 42);
        assert!(ci_run_for_pr(&response, 37, &pr()).is_err());
        response["workflow_runs"][0]["pull_requests"][0]["base"]["sha"] = json!("other");
        assert!(ci_run_for_pr(&response, 36, &pr()).is_err());
    }
}
