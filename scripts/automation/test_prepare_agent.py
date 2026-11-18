import unittest
from prepare_agent import choose_task


class ChooseTaskTests(unittest.TestCase):
    def setUp(self):
        self.tasks = [
            {"id": "T001", "issue": 13, "depends_on": []},
            {"id": "T002", "issue": 14, "depends_on": ["T001"]},
            {"id": "T003", "issue": 15, "depends_on": ["T001"]},
        ]

    def test_accepts_ready_issue(self):
        task = choose_task(self.tasks, {13: "closed", 14: "open", 15: "open"}, 14)
        self.assertEqual(task["id"], "T002")

    def test_rejects_blocked_issue(self):
        with self.assertRaises(ValueError):
            choose_task(self.tasks, {13: "open", 14: "open", 15: "open"}, 14)

    def test_rejects_closed_issue(self):
        with self.assertRaises(ValueError):
            choose_task(self.tasks, {13: "closed", 14: "closed", 15: "open"}, 14)

    def test_rejects_unmapped_issue(self):
        with self.assertRaises(ValueError):
            choose_task(self.tasks, {13: "closed", 14: "open", 15: "open"}, 999)
