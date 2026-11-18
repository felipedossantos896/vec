#!/usr/bin/env python3
"""Resolve ready SDD tasks using GitHub Issue states; never writes to GitHub."""
import json
import os
from pathlib import Path
import re
import sys
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
SPEC = os.getenv("SPEC_NAME", "001-indicadores-v2")
REPO = os.getenv("GITHUB_REPOSITORY", "")
TOKEN = os.getenv("GH_TOKEN", "")


def validate_graph(data, task_text):
    if data.get("schema_version") != 1:
        raise ValueError("Unsupported graph schema")
    tasks = data.get("tasks")
    if not isinstance(tasks, list) or not tasks:
        raise ValueError("Graph must contain tasks")
    by_id = {}
    for task in tasks:
        if not isinstance(task, dict):
            raise ValueError("Invalid task")
        ident, issue, deps = task.get("id"), task.get("issue"), task.get("depends_on")
        if not isinstance(ident, str) or not re.fullmatch(r"T\d{3}", ident) or ident in by_id:
            raise ValueError("Invalid or duplicate task ID")
        if type(issue) is not int or issue < 1 or not isinstance(deps, list):
            raise ValueError("Invalid issue mapping or dependencies")
        if len(deps) != len(set(deps)):
            raise ValueError("Duplicate dependency")
        by_id[ident] = task
    if len({task["issue"] for task in tasks}) != len(tasks):
        raise ValueError("Duplicate issue mapping")
    declared = set(re.findall(r"\*\*(T\d{3})\s*[—-]", task_text))
    if set(by_id) != declared:
        raise ValueError("Graph IDs do not match tasks.md")
    visiting, visited = set(), set()

    def visit(ident):
        if ident not in by_id:
            raise ValueError("Unknown dependency: " + ident)
        if ident in visiting:
            raise ValueError("Dependency cycle at " + ident)
        if ident in visited:
            return
        visiting.add(ident)
        for dep in by_id[ident]["depends_on"]:
            visit(dep)
        visiting.remove(ident)
        visited.add(ident)

    for ident in by_id:
        visit(ident)
    return tasks


def ready_tasks(tasks, states):
    complete = {task["id"] for task in tasks if states[task["issue"]] == "closed"}
    return [task for task in tasks if states[task["issue"]] == "open"
            and set(task["depends_on"]).issubset(complete)]


def issue_state(number):
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", REPO) or not TOKEN:
        raise ValueError("GITHUB_REPOSITORY and GH_TOKEN required for issue resolution")
    url = "https://api.github.com/repos/" + REPO + "/issues/" + str(number)
    req = Request(url, headers={
        "Accept": "application/vnd.github+json",
        "Authorization": "Bearer " + TOKEN,
        "X-GitHub-Api-Version": "2022-11-28",
    })
    with urlopen(req, timeout=15) as response:
        data = json.load(response)
    if "pull_request" in data or data.get("state") not in ("open", "closed"):
        raise ValueError("Invalid Issue response for #" + str(number))
    return data["state"]


def main():
    if not re.fullmatch(r"[0-9]{3}-[a-z0-9]+(?:-[a-z0-9]+)*", SPEC):
        raise ValueError("Invalid spec name")
    directory = ROOT / "specs" / SPEC
    tasks = validate_graph(json.loads((directory / "graph.json").read_text()),
                           (directory / "tasks.md").read_text())
    states = {task["issue"]: issue_state(task["issue"]) for task in tasks}
    ready = ready_tasks(tasks, states)
    result = {"spec": SPEC, "ready": [{"task": t["id"], "issue": t["issue"]} for t in ready],
              "blocked": [{"task": t["id"], "issue": t["issue"]} for t in tasks
                          if states[t["issue"]] == "open" and t not in ready],
              "completed": [{"task": t["id"], "issue": t["issue"]} for t in tasks
                            if states[t["issue"]] == "closed"]}
    print(json.dumps(result, indent=2))
    output = os.getenv("GITHUB_STEP_SUMMARY")
    if output:
        with open(output, "a", encoding="utf-8") as file:
            file.write("## SDD dependency graph — " + SPEC + "\n\n")
            for group in ("ready", "blocked", "completed"):
                file.write("**" + group + ":** " + ", ".join(
                    t["task"] + " (#" + str(t["issue"]) + ")" for t in result[group]) + "\n\n")
    if not ready:
        print("No ready tasks; nothing to dispatch.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, json.JSONDecodeError) as exc:
        sys.exit("Graph resolution failed: " + str(exc))
