use super::*;

#[test]
fn agent_environment_is_allowlisted() {
    let allowed = [
        "HOME",
        "PATH",
        "TMPDIR",
        "LANG",
        "LC_ALL",
        "TERM",
        "NO_COLOR",
        "XDG_CONFIG_HOME",
        "CODEX_HOME",
    ];
    let environment = allowlisted_environment();
    assert!(
        environment
            .iter()
            .all(|(name, _)| allowed.contains(&name.to_string_lossy().as_ref()))
    );
}

#[test]
fn subprocess_drains_output_while_writing_input() {
    let input = "x".repeat(200_000);
    let output = run_captured_with_input(
        "sh",
        &[
            "-c",
            "dd if=/dev/zero bs=1024 count=128 2>/dev/null; cat >/dev/null; printf done",
        ],
        None,
        &input,
        &allowlisted_environment(),
    )
    .unwrap();
    assert!(output.ends_with("done"));
}
#[test]
fn raw_command_output_preserves_trailing_whitespace() {
    assert_eq!(
        run_output_raw("sh", &["-c", "printf 'line  \\n'"], None).unwrap(),
        "line  \n"
    );
    assert_eq!(
        run_output("sh", &["-c", "printf ' value \\n'"], None).unwrap(),
        "value"
    );
}
#[cfg(unix)]
#[test]
fn review_directory_is_owner_only() {
    use std::os::unix::fs::PermissionsExt;
    let directory = TempDir::new("vec-review-permissions").unwrap();
    let mode = fs::metadata(&directory.path).unwrap().permissions().mode();
    assert_eq!(mode & 0o777, 0o700);
}
#[test]
fn invalid_utf8_is_rejected() {
    assert!(
        decode_output(vec![0xff], "git")
            .unwrap_err()
            .contains("not valid UTF-8")
    );
}
#[test]
fn failed_subprocess_does_not_replay_stderr() {
    let error = run_captured_with_input(
        "sh",
        &["-c", "printf 'sensitive diagnostic' >&2; exit 7"],
        None,
        "",
        &allowlisted_environment(),
    )
    .unwrap_err();
    assert!(error.contains("sh exited with"));
    assert!(!error.contains("sensitive"));
}

#[test]
fn command_timeout_terminates_the_child() {
    let started = Instant::now();
    let error = run_output_timeout(
        "sh",
        &["-c", "exec sleep 2"],
        None,
        Duration::from_millis(50),
    )
    .unwrap_err();
    assert!(error.contains("timed out"));
    assert!(started.elapsed() < Duration::from_secs(1));
}
#[test]
fn timed_command_drains_large_output() {
    let output = run_output_timeout(
        "sh",
        &["-c", "dd if=/dev/zero bs=1024 count=256 2>/dev/null"],
        None,
        Duration::from_secs(2),
    )
    .unwrap();
    assert_eq!(output.len(), 256 * 1024);
}
#[test]
fn failed_http_command_exposes_only_status_category() {
    assert_eq!(
        safe_http_status(b"private diagnostic (HTTP 404) secret"),
        Some("HTTP 404".into())
    );
    assert_eq!(safe_http_status(b"private diagnostic without status"), None);
}
