"""Keep the legacy comparison scoped without dropping current task identities."""
import unittest

from test_verified_results_compat import (
    legacy_full_val_cohort, latest_by_key, new_coordinate, new_model_id,
)


class BenchmarkCompatibilityTests(unittest.TestCase):
    def setUp(self):
        self.metadata = {
            "rfdetr-n": {"task": "detection"},
            "rfdetr-seg-n": {"task": "segmentation"},
        }

    def row(self, model_id, images=5000):
        return {
            "model": {"id": model_id, "name": "rf-detr-n", "family": "rfdetr", "variant": "n", "input_size": 384},
            "hardware": {"id": "dgx_spark"},
            "eval": {"numImages": images},
            "metadata": {"benchmark_date": "2026-09-13T06:34:01Z"},
        }

    def test_only_full_detection_is_legacy(self):
        detection = self.row("rfdetr-n")
        rows = [detection, self.row("rfdetr-seg-n"), self.row("rfdetr-n", 500)]
        self.assertEqual(legacy_full_val_cohort(rows, self.metadata), [detection])

    def test_detection_and_segmentation_remain_distinct(self):
        rows = [self.row("rfdetr-n"), self.row("rfdetr-seg-n")]
        self.assertEqual(new_model_id(rows[1]), "rfdetr-seg-n")
        self.assertEqual(len(latest_by_key(rows, new_coordinate)), 2)

    def test_duplicate_coordinates_are_still_detected(self):
        rows = [self.row("rfdetr-n"), self.row("rfdetr-n")]
        self.assertLess(len(latest_by_key(rows, new_coordinate)), len(rows))


if __name__ == "__main__":
    unittest.main()
