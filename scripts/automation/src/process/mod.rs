use crate::Result;
use regex::Regex;
use std::env;
use std::ffi::OsString;
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

pub(crate) fn repo_root() -> Result<PathBuf> {
    Ok(PathBuf::from(run_output(
        "git",
        &["rev-parse", "--show-toplevel"],
        None,
    )?))
}

pub(crate) fn require_command(name: &str) -> Result<()> {
    let status = Command::new(name)
        .arg("--version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
    if status.is_ok_and(|status| status.success()) {
        Ok(())
    } else {
        Err(format!("{name} is not installed"))
    }
}

pub(crate) fn run_output(program: &str, args: &[&str], cwd: Option<&Path>) -> Result<String> {
    Ok(run_output_raw(program, args, cwd)?.trim().to_string())
}

pub(crate) fn run_output_timeout(
    program: &str,
    args: &[&str],
    cwd: Option<&Path>,
    timeout: Duration,
) -> Result<String> {
    let mut command = Command::new(program);
    command
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(cwd) = cwd {
        command.current_dir(cwd);
    }
    let mut child = command.spawn().map_err(|e| e.to_string())?;
    let mut stdout = child.stdout.take().unwrap();
    let mut stderr = child.stderr.take().unwrap();
    let stdout_reader = thread::spawn(move || {
        let mut output = Vec::new();
        stdout.read_to_end(&mut output).map(|_| output)
    });
    let stderr_reader = thread::spawn(move || {
        let mut output = Vec::new();
        stderr.read_to_end(&mut output).map(|_| output)
    });
    let deadline = Instant::now() + timeout;
    let status = loop {
        if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
            break status;
        }
        if Instant::now() >= deadline {
            child.kill().map_err(|e| e.to_string())?;
            child.wait().map_err(|e| e.to_string())?;
            stdout_reader
                .join()
                .map_err(|_| "stdout reader panicked".to_string())?
                .map_err(|e| e.to_string())?;
            stderr_reader
                .join()
                .map_err(|_| "stderr reader panicked".to_string())?
                .map_err(|e| e.to_string())?;
            return Err(format!(
                "{program} timed out after {} seconds",
                timeout.as_secs()
            ));
        }
        thread::sleep(Duration::from_millis(25));
    };
    let stdout = stdout_reader
        .join()
        .map_err(|_| "stdout reader panicked".to_string())?
        .map_err(|e| e.to_string())?;
    let stderr = stderr_reader
        .join()
        .map_err(|_| "stderr reader panicked".to_string())?
        .map_err(|e| e.to_string())?;
    if !status.success() {
        let category = safe_http_status(&stderr)
            .map(|category| format!(" ({category})"))
            .unwrap_or_default();
        return Err(format!("{program} exited with {status}{category}"));
    }
    decode_output(stdout, program).map(|output| output.trim().to_string())
}

pub(crate) fn run_output_raw(program: &str, args: &[&str], cwd: Option<&Path>) -> Result<String> {
    let mut command = Command::new(program);
    command.args(args);
    if let Some(cwd) = cwd {
        command.current_dir(cwd);
    }
    let output = command.output().map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(format!("{program} exited with {}", output.status));
    }
    decode_output(output.stdout, program)
}

pub(crate) fn run_status(
    program: &str,
    args: &[&str],
    cwd: Option<&Path>,
    input: Option<(&str, &[(OsString, OsString)])>,
    quiet: bool,
) -> Result<()> {
    let mut command = Command::new(program);
    command.args(args);
    if let Some(cwd) = cwd {
        command.current_dir(cwd);
    }
    if let Some((_, environment)) = input {
        command
            .env_clear()
            .envs(environment.iter().cloned())
            .stdin(Stdio::piped());
    }
    if quiet {
        command.stdout(Stdio::null()).stderr(Stdio::null());
    }
    let mut child = command.spawn().map_err(|e| e.to_string())?;
    if let Some((text, _)) = input {
        child
            .stdin
            .take()
            .unwrap()
            .write_all(text.as_bytes())
            .map_err(|e| e.to_string())?;
    }
    let status = child.wait().map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("{program} exited with {status}"))
    }
}

pub(crate) fn run_captured_with_input(
    program: &str,
    args: &[&str],
    cwd: Option<&Path>,
    input: &str,
    environment: &[(OsString, OsString)],
) -> Result<String> {
    let mut command = Command::new(program);
    command
        .args(args)
        .env_clear()
        .envs(environment.iter().cloned())
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(cwd) = cwd {
        command.current_dir(cwd);
    }
    let mut child = command.spawn().map_err(|e| e.to_string())?;
    let mut stdin = child.stdin.take().unwrap();
    let input = input.as_bytes().to_vec();
    let writer = thread::spawn(move || stdin.write_all(&input));
    let output = child.wait_with_output().map_err(|e| e.to_string())?;
    writer
        .join()
        .map_err(|_| "stdin writer panicked".to_string())?
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(format!("{program} exited with {}", output.status));
    }
    decode_output(output.stdout, program)
}

fn decode_output(output: Vec<u8>, program: &str) -> Result<String> {
    String::from_utf8(output).map_err(|_| format!("{program} output is not valid UTF-8"))
}

fn safe_http_status(stderr: &[u8]) -> Option<String> {
    let stderr = std::str::from_utf8(stderr).ok()?;
    Regex::new(r"\bHTTP ([1-5][0-9]{2})\b")
        .unwrap()
        .captures(stderr)
        .map(|capture| format!("HTTP {}", &capture[1]))
}

pub(crate) struct TempDir {
    pub(crate) path: PathBuf,
}
impl TempDir {
    pub(crate) fn new(prefix: &str) -> Result<Self> {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_nanos();
        let path = env::temp_dir().join(format!("{prefix}-{}-{nonce}", std::process::id()));
        let mut builder = fs::DirBuilder::new();
        #[cfg(unix)]
        {
            use std::os::unix::fs::DirBuilderExt;
            builder.mode(0o700);
        }
        builder.create(&path).map_err(|e| e.to_string())?;
        Ok(Self { path })
    }
}
impl Drop for TempDir {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}

pub(crate) fn allowlisted_environment() -> Vec<(OsString, OsString)> {
    const ALLOWED: &[&str] = &[
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
    ALLOWED
        .iter()
        .filter_map(|name| env::var_os(name).map(|value| (OsString::from(name), value)))
        .collect()
}

#[cfg(test)]
mod tests;
