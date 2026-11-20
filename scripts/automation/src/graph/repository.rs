use crate::Result;
use crate::process::{run_output, run_status};
use regex::Regex;
use std::env;

/// Resolves `owner/name` for Issue lookups.
///
/// GitHub Actions keeps using `GITHUB_REPOSITORY` and `GH_TOKEN`. Locally,
/// the repository comes from the `origin` remote and authentication from the
/// credentials already stored by `gh`; the token is never read or printed.
pub(super) fn resolve_repository() -> Result<String> {
    let configured = env::var("GITHUB_REPOSITORY").unwrap_or_default();
    let repository = if configured.is_empty() {
        let url = run_output("git", &["remote", "get-url", "origin"], None)
            .map_err(|_| "GITHUB_REPOSITORY is unset and the origin remote is missing")?;
        repository_from_remote(&url)
            .ok_or("GITHUB_REPOSITORY is unset and origin is not a github.com repository")?
    } else {
        configured
    };
    if !valid_repository(&repository) {
        return Err("Invalid repository name".into());
    }
    require_github_auth(!env::var("GH_TOKEN").unwrap_or_default().is_empty())?;
    Ok(repository)
}

fn require_github_auth(has_token: bool) -> Result<()> {
    if has_token {
        return Ok(());
    }
    run_status(
        "gh",
        &["auth", "status", "--hostname", "github.com"],
        None,
        None,
        true,
    )
    .map_err(|_| "GH_TOKEN is unset and gh is not authenticated; run `gh auth login`".into())
}

fn valid_repository(repository: &str) -> bool {
    Regex::new(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
        .unwrap()
        .is_match(repository)
        && !repository
            .split('/')
            .any(|part| part == "." || part == "..")
}

pub(super) fn repository_from_remote(url: &str) -> Option<String> {
    let pattern = Regex::new(
        r"^(?:https://github\.com/|ssh://git@github\.com/|git@github\.com:)([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+?)(?:\.git)?/?$",
    )
    .unwrap();
    let repository = pattern.captures(url.trim())?[1].to_string();
    valid_repository(&repository).then_some(repository)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn github_remotes_are_parsed() {
        for url in [
            "https://github.com/owner/repo.git",
            "https://github.com/owner/repo",
            "git@github.com:owner/repo.git",
            "ssh://git@github.com/owner/repo.git\n",
        ] {
            assert_eq!(repository_from_remote(url).as_deref(), Some("owner/repo"));
        }
    }

    #[test]
    fn non_github_or_credentialed_remotes_are_rejected() {
        for url in [
            "https://gitlab.com/owner/repo.git",
            "https://token@github.com/owner/repo.git",
            "https://github.com.evil.test/owner/repo.git",
            "https://github.com/owner/repo/extra",
            "https://github.com/../repo.git",
            "/local/path/repo",
            "",
        ] {
            assert_eq!(repository_from_remote(url), None, "{url}");
        }
    }

    #[test]
    fn provided_token_skips_gh_session_check() {
        assert!(require_github_auth(true).is_ok());
    }
}
