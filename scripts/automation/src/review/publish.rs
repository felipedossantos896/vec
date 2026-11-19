//! What a review publishes on GitHub: the PR comment and the commit status
//! required by the `main` protection.

use crate::Result;
use crate::process::run_status;

pub(super) const REVIEW_CONTEXT: &str = "revisao-independente";
pub(super) const PROTECTED_BRANCH: &str = "main";

/// What a review may publish. Dry runs publish nothing; a block never yields
/// success; success only for the protected base, because the status lives on
/// the head commit and GitHub honours it for any PR with that head (a stacked
/// PR retargeted to main must be reviewed again against main).
#[derive(Debug, PartialEq)]
pub(super) struct Publication {
    pub(super) comment: bool,
    pub(super) success_status: bool,
    pub(super) failure_status: bool,
}

pub(super) fn publication(dry_run: bool, ship: bool, base_ref_name: &str) -> Publication {
    Publication {
        comment: !dry_run && ship,
        success_status: !dry_run && ship && base_ref_name == PROTECTED_BRANCH,
        failure_status: !dry_run && !ship,
    }
}

/// Commit status required by the `main` protection. It is bound to the
/// reviewed SHA, so any new push needs a new independent review.
pub(super) fn publish_status(
    repository: &str,
    sha: &str,
    ship: bool,
    reviewer: &str,
) -> Result<()> {
    let (state, description) = if ship {
        ("success", format!("Ship por {reviewer}"))
    } else {
        ("failure", format!("Bloqueado por {reviewer}"))
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn publication_rules() {
        let none = Publication {
            comment: false,
            success_status: false,
            failure_status: false,
        };
        assert_eq!(publication(true, true, "main"), none);
        assert_eq!(publication(true, false, "main"), none);
        assert_eq!(
            publication(false, false, "main"),
            Publication {
                comment: false,
                success_status: false,
                failure_status: true
            }
        );
        assert_eq!(
            publication(false, true, "main"),
            Publication {
                comment: true,
                success_status: true,
                failure_status: false
            }
        );
        for base in ["chore/issue-26-preflight", "Main"] {
            assert_eq!(
                publication(false, true, base),
                Publication {
                    comment: true,
                    success_status: false,
                    failure_status: false
                }
            );
        }
    }
}
