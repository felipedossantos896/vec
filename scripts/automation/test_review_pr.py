import tempfile
from pathlib import Path
import unittest

from review_pr import ReviewError, confirm_unchanged, is_ship, merge_command, require_ready_pr, safe_review, temporary_worktree


def pr(sha="abc", conclusion="SUCCESS", status="COMPLETED"):
    return {
        "state": "OPEN",
        "isDraft": False,
        "headRefOid": sha,
        "statusCheckRollup": [{"name": "testes", "status": status, "conclusion": conclusion}],
    }


class ReviewPRTests(unittest.TestCase):
    def test_green_checks_are_required(self):
        require_ready_pr(pr())
        with self.assertRaisesRegex(ReviewError, "not green"):
            require_ready_pr(pr(conclusion="FAILURE"))
        with self.assertRaisesRegex(ReviewError, "not green"):
            require_ready_pr(pr(status="IN_PROGRESS", conclusion=""))

    def test_sha_must_stay_unchanged(self):
        with self.assertRaisesRegex(ReviewError, "changed"):
            confirm_unchanged(pr("old"), pr("new"))

    def test_only_explicit_ship_verdict_passes(self):
        self.assertTrue(is_ship("Summary\n\nVerdict: Ship."))
        self.assertFalse(is_ship("Looks good. Ship."))
        self.assertFalse(is_ship("Verdict: blocked."))
        self.assertFalse(is_ship("It should ship later."))
        self.assertFalse(is_ship("Verdict: Ship.\n\nVerdict: blocked."))

    def test_merge_is_pinned_to_reviewed_sha(self):
        command = merge_command(28, "abc123")
        self.assertIn("--match-head-commit", command)
        self.assertEqual(command[-1], "abc123")

    def test_review_rejects_possible_secrets(self):
        self.assertEqual(safe_review("Verdict: Ship."), "Verdict: Ship.")
        with self.assertRaisesRegex(ReviewError, "secret"):
            safe_review("api_key=do-not-print")

    def test_worktree_is_removed_after_failure(self):
        calls = []

        def fake_run(command, **kwargs):
            calls.append(command)

        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "review"
            with self.assertRaisesRegex(RuntimeError, "boom"):
                with temporary_worktree(Path(temp), "abc", path, runner=fake_run):
                    raise RuntimeError("boom")
        self.assertEqual(calls[0][:4], ["git", "worktree", "add", "--detach"])
        self.assertEqual(calls[-1][:4], ["git", "worktree", "remove", "--force"])


if __name__ == "__main__":
    unittest.main()
