import unittest
from resolve_graph import validate_graph, ready_tasks

TASK_TEXT = "- [ ] **T001 — Baseline**\n- [ ] **T002 — Tests**\n- [ ] **T003 — UI**\n"


def graph():
    return {"schema_version": 1, "tasks": [
        {"id": "T001", "issue": 13, "depends_on": []},
        {"id": "T002", "issue": 14, "depends_on": ["T001"]},
        {"id": "T003", "issue": 15, "depends_on": ["T002"]},
    ]}


class ResolveGraphTests(unittest.TestCase):
    def test_ready_after_completed_dependency(self):
        tasks = validate_graph(graph(), TASK_TEXT)
        self.assertEqual([t["id"] for t in ready_tasks(tasks, {13: "closed", 14: "open", 15: "open"})], ["T002"])

    def test_first_task_ready_when_all_open(self):
        tasks = validate_graph(graph(), TASK_TEXT)
        self.assertEqual([t["id"] for t in ready_tasks(tasks, {13: "open", 14: "open", 15: "open"})], ["T001"])

    def test_cycle_rejected(self):
        data = graph()
        data["tasks"][0]["depends_on"] = ["T003"]
        with self.assertRaisesRegex(ValueError, "cycle"):
            validate_graph(data, TASK_TEXT)

    def test_unknown_dependency_rejected(self):
        data = graph()
        data["tasks"][1]["depends_on"] = ["T999"]
        with self.assertRaisesRegex(ValueError, "Unknown"):
            validate_graph(data, TASK_TEXT)

    def test_duplicate_issue_rejected(self):
        data = graph()
        data["tasks"][1]["issue"] = 13
        with self.assertRaisesRegex(ValueError, "Duplicate issue"):
            validate_graph(data, TASK_TEXT)

    def test_missing_task_mapping_rejected(self):
        data = graph()
        data["tasks"].pop()
        with self.assertRaisesRegex(ValueError, "do not match"):
            validate_graph(data, TASK_TEXT)


if __name__ == "__main__":
    unittest.main()
