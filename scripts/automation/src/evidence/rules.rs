//! Pure evidence rules: parsing counts, rendering and section replacement.
//! Raw command output never reaches the rendered Markdown, only counts.

use crate::Result;
use regex::Regex;

pub(super) const START: &str = "<!-- vec-evidencia:inicio -->";
pub(super) const END: &str = "<!-- vec-evidencia:fim -->";

#[derive(Clone, Copy, Debug, PartialEq)]
pub(super) enum Counter {
    None,
    Cargo,
    Node,
    GoPackages,
    OkLines,
}

pub(super) struct CheckResult {
    pub(super) label: &'static str,
    pub(super) command: String,
    pub(super) passed: bool,
    pub(super) detail: String,
}

pub(super) struct Context<'a> {
    pub(super) commit: &'a str,
    pub(super) branch: &'a str,
    pub(super) base: &'a str,
    pub(super) generated_at: &'a str,
}

/// Summarises only how many tests/packages/steps passed.
pub(super) fn count(counter: Counter, output: &str) -> Option<String> {
    let sum = |pattern: &str| -> u64 {
        Regex::new(pattern)
            .unwrap()
            .captures_iter(output)
            .filter_map(|capture| capture[1].parse::<u64>().ok())
            .sum()
    };
    let text = match counter {
        Counter::None => return None,
        Counter::Cargo => format!("{} testes", sum(r"test result: ok\. (\d+) passed")),
        Counter::Node => format!("{} testes", sum(r"(?m)^(?:ℹ|#) pass (\d+)$")),
        Counter::GoPackages => format!(
            "{} pacotes com testes",
            output
                .lines()
                .filter(|line| line.starts_with("ok  \t"))
                .count()
        ),
        Counter::OkLines => format!(
            "{} verificações ok",
            output
                .lines()
                .filter(|line| line.starts_with("ok    "))
                .count()
        ),
    };
    Some(text)
}

pub(super) fn render(context: &Context, results: &[CheckResult]) -> String {
    let passed = results.iter().all(|result| result.passed);
    let mut text = format!(
        "{START}\n### Evidências automáticas\n\n\
         Commit testado: `{}` · branch `{}` · base `origin/main` `{}` · gerado em {} (UTC) \
         por `vec-automation evidence`.\n\n\
         | Verificação | Comando | Resultado |\n|---|---|---|\n",
        context.commit, context.branch, context.base, context.generated_at
    );
    for result in results {
        let status = if result.passed { "✅" } else { "❌" };
        let detail = if result.detail.is_empty() {
            String::new()
        } else {
            format!(" {}", escape(&result.detail))
        };
        text.push_str(&format!(
            "| {} | `{}` | {status}{detail} |\n",
            result.label,
            escape(&result.command)
        ));
    }
    text.push_str(if passed {
        "\nTodas as verificações passaram neste commit.\n"
    } else {
        "\n**Há verificações com falha neste commit.**\n"
    });
    text.push_str(END);
    text
}

fn escape(text: &str) -> String {
    text.replace('|', "\\|").replace('\n', " ")
}

/// Replaces the marked section of a PR body, or appends it once.
pub(super) fn replace_section(body: &str, section: &str) -> String {
    if let (Some(start), Some(end)) = (body.find(START), body.find(END))
        && start < end
    {
        let tail = &body[end + END.len()..];
        return format!("{}{section}{tail}", &body[..start]);
    }
    let body = body.trim_end();
    if body.is_empty() {
        section.to_string()
    } else {
        format!("{body}\n\n{section}\n")
    }
}

/// Handoff entry that names the tested commit; the commit that records the
/// entry only touches the handoff, so no self-referential hash is needed.
pub(super) fn handoff_entry(context: &Context, results: &[CheckResult]) -> String {
    let lines: Vec<_> = results
        .iter()
        .map(|result| {
            let status = if result.passed { "aprovado" } else { "FALHOU" };
            let detail = if result.detail.is_empty() {
                String::new()
            } else {
                format!(" ({})", result.detail)
            };
            format!("  - {}: {status}{detail}", result.label)
        })
        .collect();
    format!(
        "\n### Evidência automática — {}\n\
         - Commit testado: `{}` na branch `{}` (base `origin/main` `{}`). \
         O commit que registra este bloco altera apenas o handoff.\n\
         - Verificações executadas por `vec-automation evidence`:\n{}\n",
        context.generated_at,
        context.commit,
        context.branch,
        context.base,
        lines.join("\n")
    )
}

pub(super) struct Options {
    pub(super) visual: bool,
    pub(super) pr: Option<u64>,
    pub(super) handoff: Option<String>,
}

pub(super) fn parse(args: &[String]) -> Result<Options> {
    let usage = "usage: vec-automation evidence [--visual] [--pr <n>] [--handoff <spec>]";
    let mut options = Options {
        visual: false,
        pr: None,
        handoff: None,
    };
    let spec = Regex::new(r"^[0-9]{3}-[a-z0-9]+(?:-[a-z0-9]+)*$").unwrap();
    let mut args = args.iter();
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--visual" => options.visual = true,
            "--pr" => {
                let value = args.next().and_then(|v| v.parse().ok()).filter(|n| *n > 0);
                options.pr = Some(value.ok_or(usage)?);
            }
            "--handoff" => {
                let value = args.next().ok_or(usage)?;
                if !spec.is_match(value) {
                    return Err("Invalid spec name".into());
                }
                options.handoff = Some(value.clone());
            }
            _ => return Err(usage.into()),
        }
    }
    Ok(options)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(items: &[&str]) -> Vec<String> {
        items.iter().map(|item| item.to_string()).collect()
    }

    #[test]
    fn options_are_parsed_strictly() {
        let options = parse(&args(&[
            "--visual",
            "--pr",
            "41",
            "--handoff",
            "001-indicadores-v2",
        ]))
        .unwrap();
        assert!(options.visual);
        assert_eq!(options.pr, Some(41));
        assert_eq!(options.handoff.as_deref(), Some("001-indicadores-v2"));
        for bad in [
            &["--pr"][..],
            &["--pr", "0"],
            &["--pr", "x"],
            &["--handoff", "../x"],
            &["--other"],
        ] {
            assert!(parse(&args(bad)).is_err(), "{bad:?}");
        }
    }

    fn context() -> Context<'static> {
        Context {
            commit: "abc123def456",
            branch: "chore/x",
            base: "0123456789ab",
            generated_at: "2026-11-19 12:00",
        }
    }

    fn result(passed: bool) -> CheckResult {
        CheckResult {
            label: "Go test",
            command: "go test ./...".into(),
            passed,
            detail: "9 pacotes com testes".into(),
        }
    }

    #[test]
    fn counts_only_numbers() {
        let cargo =
            "running 3 tests\ntest result: ok. 3 passed; 0 failed\ntest result: ok. 2 passed;";
        assert_eq!(count(Counter::Cargo, cargo).unwrap(), "5 testes");
        assert_eq!(
            count(Counter::Node, "ℹ tests 11\nℹ pass 11\nℹ fail 0").unwrap(),
            "11 testes"
        );
        let go = "ok  \tvec/a\t0.1s\n?   \tvec/b\t[no test files]\nok  \tvec/c\t(cached)";
        assert_eq!(
            count(Counter::GoPackages, go).unwrap(),
            "2 pacotes com testes"
        );
        let smoke = "ok    login\nFAIL  x\nok    logout\nSmoke E2E falhou";
        assert_eq!(count(Counter::OkLines, smoke).unwrap(), "2 verificações ok");
        assert_eq!(count(Counter::None, "secret"), None);
    }

    #[test]
    fn render_names_tested_commit_and_status() {
        let text = render(&context(), &[result(true)]);
        assert!(text.starts_with(START) && text.ends_with(END));
        assert!(text.contains("Commit testado: `abc123def456`"));
        assert!(text.contains("| Go test | `go test ./...` | ✅ 9 pacotes com testes |"));
        assert!(text.contains("Todas as verificações passaram"));
        let failed = render(&context(), &[result(false)]);
        assert!(failed.contains("❌") && failed.contains("Há verificações com falha"));
    }

    #[test]
    fn table_cells_are_escaped() {
        let mut check = result(true);
        check.command = "a | b\nc".into();
        assert!(render(&context(), &[check]).contains("`a \\| b c`"));
    }

    #[test]
    fn section_is_replaced_or_appended_once() {
        let section = format!("{START}\nnovo\n{END}");
        let body = format!("Resumo\n\n{START}\nantigo\n{END}\n\nRodapé");
        let replaced = replace_section(&body, &section);
        assert_eq!(replaced, format!("Resumo\n\n{section}\n\nRodapé"));
        assert_eq!(replace_section(&replaced, &section), replaced);
        assert_eq!(
            replace_section("Resumo\n", &section),
            format!("Resumo\n\n{section}\n")
        );
        assert_eq!(replace_section("", &section), section);
        let reversed = format!("{END} x {START}");
        assert!(replace_section(&reversed, &section).ends_with(&format!("{section}\n")));
    }

    #[test]
    fn handoff_entry_references_tested_commit() {
        let entry = handoff_entry(&context(), &[result(true), result(false)]);
        assert!(entry.contains("Commit testado: `abc123def456`"));
        assert!(entry.contains("altera apenas o handoff"));
        assert!(entry.contains("- Go test: aprovado (9 pacotes com testes)"));
        assert!(entry.contains("- Go test: FALHOU"));
    }
}
