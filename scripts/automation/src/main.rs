mod graph;
mod process;
mod review;

use graph::{prepare_agent_command, resolve_graph_command, validate_graph_command};
use review::{BLOCKED_DRY_RUN, review_pr_command};
use std::env;

type Result<T> = std::result::Result<T, String>;

fn main() {
    if let Err(error) = execute(env::args().skip(1).collect()) {
        eprintln!("{error}");
        std::process::exit(exit_code(&error));
    }
}

fn exit_code(error: &str) -> i32 {
    if error == BLOCKED_DRY_RUN { 2 } else { 1 }
}

fn execute(args: Vec<String>) -> Result<()> {
    match args.first().map(String::as_str) {
        Some("validate-graph") if args.len() == 1 => validate_graph_command(),
        Some("resolve-graph") if args.len() == 1 => resolve_graph_command(),
        Some("prepare-agent") if args.len() == 1 => prepare_agent_command(),
        Some("review-pr") => review_pr_command(&args[1..]),
        _ => Err(
            "usage: vec-automation <validate-graph|resolve-graph|prepare-agent|review-pr>".into(),
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blocked_dry_run_has_distinct_exit_code() {
        assert_eq!(exit_code(BLOCKED_DRY_RUN), 2);
        assert_eq!(exit_code("operational failure"), 1);
    }
}
