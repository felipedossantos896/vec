use crate::Result;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub(super) struct Task {
    pub(super) id: String,
    pub(super) issue: u64,
    pub(super) depends_on: Vec<String>,
}

#[derive(Deserialize)]
struct Graph {
    schema_version: u64,
    tasks: Vec<Task>,
}

pub(super) fn valid_spec_name(name: &str) -> bool {
    Regex::new(r"^[0-9]{3}-[a-z0-9]+(?:-[a-z0-9]+)*$")
        .unwrap()
        .is_match(name)
}

pub(super) fn load_graph(root: &Path, name: &str) -> Result<(Vec<Task>, String)> {
    if !valid_spec_name(name) {
        return Err("Invalid spec name".into());
    }
    let directory = root.join("specs").join(name);
    let graph = fs::read_to_string(directory.join("graph.json")).map_err(|e| e.to_string())?;
    let tasks = fs::read_to_string(directory.join("tasks.md")).map_err(|e| e.to_string())?;
    Ok((validate_graph(&graph, &tasks)?, tasks))
}

fn validate_graph(graph_json: &str, task_text: &str) -> Result<Vec<Task>> {
    let graph: Graph = serde_json::from_str(graph_json).map_err(|e| e.to_string())?;
    if graph.schema_version != 1 {
        return Err("Unsupported graph schema".into());
    }
    if graph.tasks.is_empty() {
        return Err("Graph must contain tasks".into());
    }
    let id_re = Regex::new(r"^T\d{3}$").unwrap();
    let mut ids = HashSet::new();
    let mut issues = HashSet::new();
    for task in &graph.tasks {
        if !id_re.is_match(&task.id) || !ids.insert(task.id.clone()) {
            return Err("Invalid or duplicate task ID".into());
        }
        if task.issue == 0 {
            return Err("Invalid issue mapping or dependencies".into());
        }
        let deps: HashSet<_> = task.depends_on.iter().collect();
        if deps.len() != task.depends_on.len() {
            return Err("Duplicate dependency".into());
        }
        if !issues.insert(task.issue) {
            return Err("Duplicate issue mapping".into());
        }
    }
    let declared_list: Vec<String> = Regex::new(r"\*\*(T\d{3})\s*[—-]")
        .unwrap()
        .captures_iter(task_text)
        .map(|capture| capture[1].to_string())
        .collect();
    let declared: HashSet<_> = declared_list.iter().cloned().collect();
    if declared.len() != declared_list.len() {
        return Err("Task IDs are missing or duplicated".into());
    }
    if ids != declared {
        return Err("Graph IDs do not match tasks.md".into());
    }
    let by_id: HashMap<_, _> = graph
        .tasks
        .iter()
        .map(|task| (task.id.as_str(), task))
        .collect();
    let mut visiting = HashSet::new();
    let mut visited = HashSet::new();
    for id in by_id.keys() {
        visit(id, &by_id, &mut visiting, &mut visited)?;
    }
    Ok(graph.tasks)
}

fn visit<'a>(
    id: &'a str,
    tasks: &HashMap<&'a str, &'a Task>,
    visiting: &mut HashSet<&'a str>,
    visited: &mut HashSet<&'a str>,
) -> Result<()> {
    let task = tasks
        .get(id)
        .ok_or_else(|| format!("Unknown dependency: {id}"))?;
    if visiting.contains(id) {
        return Err(format!("Dependency cycle at {id}"));
    }
    if visited.contains(id) {
        return Ok(());
    }
    visiting.insert(id);
    for dependency in &task.depends_on {
        visit(dependency, tasks, visiting, visited)?;
    }
    visiting.remove(id);
    visited.insert(id);
    Ok(())
}

pub(super) fn ready_tasks(tasks: &[Task], states: &HashMap<u64, String>) -> Vec<Task> {
    let complete: HashSet<_> = tasks
        .iter()
        .filter(|task| states.get(&task.issue).map(String::as_str) == Some("closed"))
        .map(|task| task.id.as_str())
        .collect();
    tasks
        .iter()
        .filter(|task| {
            states.get(&task.issue).map(String::as_str) == Some("open")
                && task
                    .depends_on
                    .iter()
                    .all(|dependency| complete.contains(dependency.as_str()))
        })
        .cloned()
        .collect()
}

pub(super) fn choose_task(
    tasks: &[Task],
    states: &HashMap<u64, String>,
    issue: u64,
) -> Result<Task> {
    let matches: Vec<_> = ready_tasks(tasks, states)
        .into_iter()
        .filter(|task| task.issue == issue)
        .collect();
    if matches.len() != 1 {
        return Err("Issue is not ready or not mapped to the requested spec".into());
    }
    Ok(matches[0].clone())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn graph() -> String {
        json!({"schema_version":1,"tasks":[
            {"id":"T001","issue":13,"depends_on":[]},
            {"id":"T002","issue":14,"depends_on":["T001"]},
            {"id":"T003","issue":15,"depends_on":["T002"]}
        ]})
        .to_string()
    }
    const TASKS: &str = "- [ ] **T001 — Baseline**\n- [ ] **T002 — Tests**\n- [ ] **T003 — UI**\n";
    fn task(id: &str, issue: u64, deps: &[&str]) -> Task {
        Task {
            id: id.into(),
            issue,
            depends_on: deps.iter().map(|value| value.to_string()).collect(),
        }
    }

    #[test]
    fn ready_after_dependency() {
        let tasks = validate_graph(&graph(), TASKS).unwrap();
        let states = HashMap::from([
            (13, "closed".into()),
            (14, "open".into()),
            (15, "open".into()),
        ]);
        assert_eq!(
            ready_tasks(&tasks, &states),
            vec![task("T002", 14, &["T001"])]
        );
    }
    #[test]
    fn first_ready_when_all_open() {
        let tasks = validate_graph(&graph(), TASKS).unwrap();
        let states = HashMap::from([
            (13, "open".into()),
            (14, "open".into()),
            (15, "open".into()),
        ]);
        assert_eq!(ready_tasks(&tasks, &states), vec![task("T001", 13, &[])]);
    }
    #[test]
    fn cycle_rejected() {
        let value = graph().replace("\"depends_on\":[]", "\"depends_on\":[\"T003\"]");
        assert!(validate_graph(&value, TASKS).unwrap_err().contains("cycle"));
    }
    #[test]
    fn unknown_dependency_rejected() {
        let value = graph().replace("\"T001\"]", "\"T999\"]");
        assert!(
            validate_graph(&value, TASKS)
                .unwrap_err()
                .contains("Unknown")
        );
    }
    #[test]
    fn duplicate_issue_rejected() {
        let value = graph().replace("\"issue\":14", "\"issue\":13");
        assert!(
            validate_graph(&value, TASKS)
                .unwrap_err()
                .contains("Duplicate issue")
        );
    }
    #[test]
    fn missing_mapping_rejected() {
        let value = json!({
            "schema_version": 1,
            "tasks": [
                {"id": "T001", "issue": 13, "depends_on": []},
                {"id": "T002", "issue": 14, "depends_on": ["T001"]}
            ]
        })
        .to_string();
        assert!(
            validate_graph(&value, TASKS)
                .unwrap_err()
                .contains("do not match")
        );
    }
    #[test]
    fn duplicate_task_declaration_rejected() {
        let duplicated = format!("{TASKS}- [ ] **T001 — Duplicated**\n");
        assert!(
            validate_graph(&graph(), &duplicated)
                .unwrap_err()
                .contains("duplicated")
        );
    }
    #[test]
    fn choose_only_ready_issue() {
        let tasks = validate_graph(&graph(), TASKS).unwrap();
        let states = HashMap::from([
            (13, "closed".into()),
            (14, "open".into()),
            (15, "open".into()),
        ]);
        assert_eq!(choose_task(&tasks, &states, 14).unwrap().id, "T002");
        assert!(choose_task(&tasks, &states, 15).is_err());
        assert!(choose_task(&tasks, &states, 999).is_err());
    }

    #[test]
    fn spec_names_are_constrained() {
        assert!(valid_spec_name("001-indicadores-v2"));
        assert!(!valid_spec_name("../secrets"));
    }
}
