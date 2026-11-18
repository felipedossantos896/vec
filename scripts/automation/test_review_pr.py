import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch

from review_pr import ReviewError, confirm_fetched_base, confirm_unchanged, is_ship, require_ready_pr, run_agent, safe_review, temporary_worktree, trusted_output_path


def pr(sha="abc", base="main", base_sha="base123", conclusion="SUCCESS", status="COMPLETED"):
    return {
        "state": "OPEN",
        "isDraft": False,
        "headRefOid": sha,
        "baseRefName": base,
        "baseRefOid": base_sha,
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

    def test_base_must_stay_unchanged(self):
        with self.assertRaisesRegex(ReviewError, "base changed"):
            confirm_unchanged(pr(), pr(base_sha="new-base"))
        with self.assertRaisesRegex(ReviewError, "base changed"):
            confirm_unchanged(pr(), pr(base="release"))

    def test_fetched_base_must_match_pr(self):
        confirm_fetched_base("base123", "base123")
        with self.assertRaisesRegex(ReviewError, "does not match"):
            confirm_fetched_base("base123", "stale")

    def test_only_explicit_ship_verdict_passes(self):
        self.assertTrue(is_ship("Summary\n\nVerdict: Ship."))
        self.assertFalse(is_ship("Looks good. Ship."))
        self.assertFalse(is_ship("Verdict: blocked."))
        self.assertFalse(is_ship("It should ship later."))
        self.assertFalse(is_ship("Verdict: Ship.\n\nVerdict: blocked."))

    def test_review_rejects_possible_secrets(self):
        self.assertEqual(safe_review("Verdict: Ship."), "Verdict: Ship.")
        with self.assertRaisesRegex(ReviewError, "secret"):
            safe_review("api_key=do-not-print")

    def test_agent_receives_only_allowlisted_environment(self):
        calls = []

        def fake_run(command, **kwargs):
            calls.append(kwargs)

        with patch.dict("review_pr.os.environ", {"PATH": "/bin", "HOME": "/tmp/home", "SECRET": "nope"}, clear=True):
            with patch("review_pr.run", side_effect=fake_run):
                run_agent("codex", 28, "head", "base", Path("/tmp/worktree"), Path("/tmp/review"))

        self.assertEqual(calls[0]["env"], {"HOME": "/tmp/home", "PATH": "/bin"})

    def test_review_output_is_outside_untrusted_worktree(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            worktree = root / "worktree"
            worktree.mkdir()
            target = root / "local-file"
            target.write_text("preserve", encoding="utf-8")
            (worktree / ".review.md").symlink_to(target)

            output = trusted_output_path(root)
            output.write_text("review", encoding="utf-8")

            self.assertEqual(target.read_text(encoding="utf-8"), "preserve")
            self.assertEqual(output.parent, root)

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
