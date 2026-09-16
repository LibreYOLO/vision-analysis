"""Every pinned G0/G1 detector must be renderable and submittable."""
import copy
import json
import unittest
from pathlib import Path

from benchmark_data import load_support_matrix, validate_submission

ROOT = Path(__file__).resolve().parents[1]


class DetectorCatalogTests(unittest.TestCase):
    def test_all_sixty_variants_have_metadata_and_valid_submission_routes(self):
        catalog = json.loads((ROOT / "docs/g0-g1-catalog.json").read_text())
        metadata = json.loads((ROOT / "website/src/data/metadata/models.json").read_text())["models"]
        by_id = {model["id"]: model for model in metadata}
        self.assertEqual(len(by_id), len(metadata), "duplicate model metadata")
        families = json.loads((ROOT / "website/src/data/metadata/families.json").read_text())["families"]
        family_ids = {family["id"] for family in families}
        support = load_support_matrix()
        template_path = next((ROOT / "submissions").glob("yolov9t__pytorch__cuda__dgx_spark*.json"))
        template = json.loads(template_path.read_text())
        self.assertEqual(len(catalog["models"]), 60)
        self.assertEqual(len({row["family"] for row in catalog["models"]}), 13)
        for row in catalog["models"]:
            with self.subTest(model=row["id"]):
                model = by_id[row["id"]]
                self.assertEqual(model["coverageGroup"], row["group"])
                self.assertEqual(model["task"], "detection")
                self.assertEqual(model["specs"]["inputSizeDefault"], row["input_size"])
                self.assertIn(model["family"], family_ids)
                submission = copy.deepcopy(template)
                submission["model"].update(id=row["id"], family=model["family"], variant=row["size"], input_size=row["input_size"])
                submission["config"]["input_size"] = row["input_size"]
                submission["benchmark"]["libreyolo_commit"] = catalog["libreyolo_commit"]
                self.assertEqual(validate_submission(submission, support, row["id"], set(by_id)), [])
        missing = [r["id"] for r in catalog["models"] if not r["public_coco_checkpoint"]]
        self.assertEqual(set(missing), {"yolov9p2-t", "yolov9p2-s"})
        for key in missing:
            self.assertFalse(by_id[key]["source"].get("libreyoloWeightsUrl"))


if __name__ == "__main__":
    unittest.main()
