"""Credit validation and generation preserve measurements and anonymous display."""
import copy
import unittest
from pathlib import Path

from benchmark_data import verified_payload
from submission_credits import validate_credits


class CreditTests(unittest.TestCase):
    def setUp(self):
        self.credit = {"source_pr": "https://github.com/LibreYOLO/vision-analysis/pull/14", "submitted_by": "DavidDiazMerino"}

    def check(self, credit):
        return validate_credits({"run.json": credit}, {"run.json"})

    def test_public_submitter_without_invented_authorship(self):
        self.assertEqual(self.check(self.credit), [])

    def test_author_optional_profiles(self):
        self.credit["author"] = {"display_name": "Example", "links": {"github": "https://github.com/example", "linkedin": "https://www.linkedin.com/in/example", "website": "https://example.org"}}
        self.assertEqual(self.check(self.credit), [])

    def test_anonymous_requires_no_identifying_author_fields(self):
        self.credit["author"] = {"anonymous": True}
        self.assertEqual(self.check(self.credit), [])
        self.credit["author"]["display_name"] = "Example"
        self.assertTrue(self.check(self.credit))

    def test_reject_unsafe_and_mislabelled_profile_links(self):
        for url in ("javascript:alert(1)", "http://github.com/example", "https://github.com.evil.example/name", "https://user:password@github.com/name"):
            self.credit["author"] = {"display_name": "Example", "links": {"github": url}}
            self.assertTrue(self.check(self.credit), url)

    def test_reject_orphan_and_wrong_pr(self):
        self.assertTrue(validate_credits({"missing.json": self.credit}, {"run.json"}))
        self.credit["source_pr"] = "https://github.com/another/repo/pull/14"
        self.assertTrue(self.check(self.credit))

    def test_generated_credit_does_not_mutate_run(self):
        run = {"created_at": "2026-09-13T06:34:01Z", "accuracy": {"mAP": 0.55}, "timing": {"mean": 16.69}, "repro": {"weights": {"sha256": "abc"}}}
        original = copy.deepcopy(run)
        payload = verified_payload([{"path": Path("run.json"), "submission": run, "credit": self.credit}])
        result = payload["results"][0]
        self.assertEqual(run, original)
        self.assertEqual(result["credit"], self.credit)
        for key in ("accuracy", "timing", "repro"):
            self.assertEqual(result[key], original[key])

    def test_old_run_remains_unattributed(self):
        result = verified_payload([{"path": Path("old.json"), "submission": {"created_at": "2026-09-13T06:34:01Z"}}])["results"][0]
        self.assertNotIn("credit", result)


if __name__ == "__main__":
    unittest.main()
