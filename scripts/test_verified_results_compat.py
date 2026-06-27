#!/usr/bin/env python3
"""Compatibility checks for the Step 1 benchmark-coordinate refactor."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
GENERATED_RESULTS_PATH = ROOT / "generated" / "verified-results.v1.json"
MODELS_METADATA_PATH = ROOT / "website" / "src" / "data" / "metadata" / "models.json"

EXPECTED_RESULT_COUNT = 74

OLD_HARDWARE_MAP = [
    ("a100", "a100"),
    ("raspberry pi 5", "rpi5"),
    ("t4", "t4"),
    ("rtx 3090", "rtx3090"),
    ("rtx 4090", "rtx4090"),
    ("5080", "rtx5080"),
    ("dgx spark", "dgx_spark"),
    ("gb10", "dgx_spark"),
    ("jetson", "jetson"),
]

NEW_HARDWARE_MAP = [
    ("a100", "a100"),
    ("raspberry pi 5", "rpi5"),
    ("t4", "t4"),
    ("rtx 3090", "rtx3090"),
    ("rtx 4090", "rtx4090"),
    ("5080", "rtx5080"),
    ("dgx spark", "dgx_spark"),
    ("gb10", "dgx_spark"),
    ("jetson", "jetson_orin"),
    ("orin", "jetson_orin"),
]

HARDWARE_ID_ALIASES = {
    "jetson": "jetson_orin",
    "orin": "jetson_orin",
}

MODEL_NAME_MAP = {
    "yolov9-t": "yolov9t",
    "yolov9-s": "yolov9s",
    "yolov9-m": "yolov9m",
    "yolov9-c": "yolov9c",
    "yolov9t": "yolov9t",
    "yolov9s": "yolov9s",
    "yolov9m": "yolov9m",
    "yolov9c": "yolov9c",
    "yoloxnano": "yolox-nano",
    "yolox-nano": "yolox-nano",
    "yoloxtiny": "yolox-tiny",
    "yolox-tiny": "yolox-tiny",
    "yoloxs": "yolox-s",
    "yolox-s": "yolox-s",
    "yoloxm": "yolox-m",
    "yolox-m": "yolox-m",
    "yoloxl": "yolox-l",
    "yolox-l": "yolox-l",
    "yoloxx": "yolox-x",
    "yolox-x": "yolox-x",
    "rfdetr-n": "rfdetr-n",
    "rf-detr-n": "rfdetr-n",
    "rfdetr-s": "rfdetr-s",
    "rf-detr-s": "rfdetr-s",
    "rfdetr-m": "rfdetr-m",
    "rf-detr-m": "rfdetr-m",
    "rfdetr-l": "rfdetr-l",
    "rf-detr-l": "rfdetr-l",
}


def slugify(value: str) -> str:
    return re.sub(r"(^_+|_+$)", "", re.sub(r"[^a-z0-9]+", "_", value.lower()))


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def old_model_id(submission: dict[str, Any]) -> str:
    model = submission["model"]
    name = model["name"].lower()
    if name in MODEL_NAME_MAP:
        return MODEL_NAME_MAP[name]

    family = model["family"].lower()
    variant = model["variant"].lower()
    if family.startswith("yolov9"):
        return f"yolov9{variant}"
    if family.startswith("yolox"):
        return f"yolox-{variant}"
    return f"{family}-{variant}"


def new_model_id(submission: dict[str, Any]) -> str:
    model = submission["model"]
    explicit_id = str(model.get("id", "")).strip()
    return explicit_id or old_model_id(submission)


def detect_hardware_from_strings(
    submission: dict[str, Any], hardware_map: list[tuple[str, str]]
) -> str:
    hardware = submission["hardware"]
    gpu_lower = str(hardware.get("gpu", "")).lower()
    for pattern, hardware_id in hardware_map:
        if pattern in gpu_lower:
            return hardware_id

    cpu_lower = str(hardware.get("cpu", "")).lower()
    for pattern, hardware_id in hardware_map:
        if pattern in cpu_lower:
            return hardware_id

    return slugify(gpu_lower)


def old_hardware_id(submission: dict[str, Any]) -> str:
    return detect_hardware_from_strings(submission, OLD_HARDWARE_MAP)


def new_hardware_id(submission: dict[str, Any]) -> str:
    explicit_id = str(submission["hardware"].get("id", "")).strip()
    if explicit_id:
        normalized_id = slugify(explicit_id)
        return HARDWARE_ID_ALIASES.get(normalized_id, normalized_id)
    return detect_hardware_from_strings(submission, NEW_HARDWARE_MAP)


def runtime_id(submission: dict[str, Any]) -> str:
    runtime = submission.get("runtime")
    if runtime:
        return f"{runtime['format']}_{runtime['precision']}"
    return "pytorch_fp32"


def num_images(submission: dict[str, Any]) -> int:
    eval_block = submission.get("eval") or {}
    dataset_block = submission.get("dataset") or {}
    timing_block = submission.get("timing") or {}
    return int(
        eval_block.get("numImages")
        or dataset_block.get("num_images")
        or timing_block.get("num_images")
        or 0
    )


def batch_size(submission: dict[str, Any]) -> int:
    config_block = submission.get("config") or {}
    timing_block = submission.get("timing") or {}
    return int(config_block.get("batch_size") or timing_block.get("batch_size") or 1)


def input_size(submission: dict[str, Any]) -> int:
    config_block = submission.get("config") or {}
    model_block = submission.get("model") or {}
    return int(config_block.get("input_size") or model_block.get("input_size") or 0)


def new_coordinate(submission: dict[str, Any]) -> tuple[Any, ...]:
    runtime = runtime_id(submission)
    precision = (submission.get("runtime") or {}).get("precision") or runtime.split("_")[-1]
    images = num_images(submission)
    dataset_variant = "full" if images == 5000 else ("mini500" if images == 500 else f"subset{images}")
    return (
        new_model_id(submission),
        new_hardware_id(submission),
        runtime,
        precision,
        "coco_val2017",
        dataset_variant,
        images,
        input_size(submission),
        batch_size(submission),
    )


def latest_by_key(
    submissions: list[dict[str, Any]],
    key_fn,
) -> dict[Any, dict[str, Any]]:
    grouped: dict[Any, dict[str, Any]] = {}
    for submission in submissions:
        key = key_fn(submission)
        existing = grouped.get(key)
        timestamp = submission["metadata"]["benchmark_date"]
        if existing is None or timestamp > existing["metadata"]["benchmark_date"]:
            grouped[key] = submission
    return grouped


def row_identity(submission: dict[str, Any], hardware_id: str) -> tuple[str, str, str, str]:
    return (
        hardware_id,
        runtime_id(submission),
        new_model_id(submission),
        submission["source_file"],
    )


def main() -> int:
    payload = load_json(GENERATED_RESULTS_PATH)
    submissions = payload["results"]
    metadata_model_ids = {
        model["id"] for model in load_json(MODELS_METADATA_PATH)["models"]
    }

    assert len(submissions) == EXPECTED_RESULT_COUNT, (
        f"expected {EXPECTED_RESULT_COUNT} verified results, got {len(submissions)}"
    )

    missing_metadata = sorted(
        {new_model_id(submission) for submission in submissions} - metadata_model_ids
    )
    assert not missing_metadata, f"models missing from models.json: {missing_metadata}"

    for submission in submissions:
        source = submission["source_file"]
        assert old_model_id(submission) == new_model_id(submission), (
            f"{source}: model.id no longer matches legacy normalization"
        )
        assert old_hardware_id(submission) == new_hardware_id(submission), (
            f"{source}: hardware id changed from legacy detection"
        )
        assert num_images(submission) == 5000, f"{source}: expected 5000 images"
        assert batch_size(submission) == 1, f"{source}: expected batch size 1"

    old_rows_by_model = latest_by_key(
        submissions,
        lambda submission: (
            old_hardware_id(submission),
            runtime_id(submission),
            old_model_id(submission),
        ),
    )
    new_rows_by_coordinate = latest_by_key(submissions, new_coordinate)

    old_rows = sorted(
        row_identity(submission, old_hardware_id(submission))
        for submission in old_rows_by_model.values()
    )
    new_rows = sorted(
        row_identity(submission, new_hardware_id(submission))
        for submission in new_rows_by_coordinate.values()
    )

    assert len(old_rows) == EXPECTED_RESULT_COUNT, (
        f"legacy model-keyed loader would keep {len(old_rows)} rows"
    )
    assert len(new_rows) == EXPECTED_RESULT_COUNT, (
        f"coordinate-keyed loader keeps {len(new_rows)} rows"
    )
    assert old_rows == new_rows, "coordinate-keyed loader changed the current row set"

    print(
        f"Verified Step 1 compatibility: {len(new_rows)} rows, "
        "unique per model/hardware/runtime, all full-val batch=1."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
