#!/usr/bin/env python3
"""Shared helpers for Vision Analysis benchmark submission validation/build."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SUPPORT_MATRIX_PATH = ROOT / "support-matrix.json"
SUBMISSIONS_DIR = ROOT / "submissions"
GENERATED_RESULTS_PATH = ROOT / "generated" / "verified-results.v1.json"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def load_support_matrix() -> dict[str, Any]:
    return load_json(SUPPORT_MATRIX_PATH)


def iter_submission_paths() -> list[Path]:
    if not SUBMISSIONS_DIR.exists():
        return []
    return sorted(p for p in SUBMISSIONS_DIR.glob("*.json") if p.is_file())


def parse_iso8601(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def required_path(data: dict[str, Any], *path: str) -> Any:
    current: Any = data
    for key in path:
        if not isinstance(current, dict) or key not in current:
            raise KeyError(".".join(path))
        current = current[key]
    return current


def validate_submission(submission: dict[str, Any], support: dict[str, Any], source: str) -> list[str]:
    errors: list[str] = []

    def expect(path: tuple[str, ...], expected_type: type | tuple[type, ...] | None = None) -> Any | None:
        try:
            value = required_path(submission, *path)
        except KeyError:
            errors.append(f"{source}: missing {'.'.join(path)}")
            return None
        if expected_type is not None and not isinstance(value, expected_type):
            errors.append(f"{source}: {'.'.join(path)} must be {expected_type}")
            return None
        return value

    schema_version = expect(("schema_version",), str)
    submission_id = expect(("submission_id",), str)
    created_at = expect(("created_at",), str)
    model = expect(("model",), dict)
    config = expect(("config",), dict)
    hardware = expect(("hardware",), dict)
    runtime = expect(("runtime",), dict)
    accuracy = expect(("accuracy",), dict)
    timing = expect(("timing",), dict)
    throughput = expect(("throughput",), dict)
    model_stats = expect(("model_stats",), dict)
    metadata = expect(("metadata",), dict)
    benchmark = expect(("benchmark",), dict)

    if schema_version and schema_version != "va.submission.v1":
        errors.append(f"{source}: schema_version must be va.submission.v1")

    if created_at:
        try:
            parse_iso8601(created_at)
        except ValueError:
            errors.append(f"{source}: created_at is not valid ISO-8601")

    if metadata:
        benchmark_date = metadata.get("benchmark_date")
        if not isinstance(benchmark_date, str):
            errors.append(f"{source}: metadata.benchmark_date must be a string")
        else:
            try:
                parse_iso8601(benchmark_date)
            except ValueError:
                errors.append(f"{source}: metadata.benchmark_date is not valid ISO-8601")

    if model:
        model_id = str(model.get("id", "")).strip()
        if not model_id:
            errors.append(f"{source}: model.id must be non-empty")
        elif model_id not in set(support.get("models", [])):
            errors.append(f"{source}: unsupported model.id {model_id}")

    supported_runtimes = {item["backend"]: item for item in support.get("runtimes", [])}
    if runtime:
        backend = runtime.get("format")
        provider = runtime.get("provider")
        precision = runtime.get("precision")
        if backend not in supported_runtimes:
            errors.append(f"{source}: unsupported runtime.format {backend}")
        else:
            rt = supported_runtimes[backend]
            if provider not in rt.get("providers", []):
                errors.append(f"{source}: unsupported runtime.provider {provider} for {backend}")
            if precision not in rt.get("precisions", []):
                errors.append(f"{source}: unsupported runtime.precision {precision} for {backend}")

    for label, block in (
        ("config", config),
        ("hardware", hardware),
        ("accuracy", accuracy),
        ("timing", timing),
        ("throughput", throughput),
        ("model_stats", model_stats),
    ):
        if not isinstance(block, dict):
            continue
        for key, value in block.items():
            if isinstance(value, dict):
                for subkey, subvalue in value.items():
                    if isinstance(subvalue, (int, float)) and subvalue < 0:
                        errors.append(f"{source}: {label}.{key}.{subkey} must be non-negative")
            elif isinstance(value, (int, float)) and value < 0:
                errors.append(f"{source}: {label}.{key} must be non-negative")

    if config:
        for field in ("batch_size", "input_size", "conf", "iou", "max_det"):
            if field not in config:
                errors.append(f"{source}: missing config.{field}")

    if hardware and not str(hardware.get("id", "")).strip():
        errors.append(f"{source}: hardware.id must be non-empty")

    if benchmark:
        supported_identifier = support.get("supported_libreyolo_identifier")
        submission_identifier = benchmark.get("libreyolo_commit")
        if (
            supported_identifier
            and submission_identifier
            and submission_identifier != "unknown"
            and submission_identifier != supported_identifier
        ):
            errors.append(
                f"{source}: libreyolo_commit {submission_identifier} does not match support matrix"
            )

    if submission_id and not submission_id.strip():
        errors.append(f"{source}: submission_id must be non-empty")

    return errors


def load_and_validate_submissions() -> tuple[list[dict[str, Any]], list[str]]:
    support = load_support_matrix()
    results: list[dict[str, Any]] = []
    errors: list[str] = []
    seen_submission_ids: set[str] = set()

    for path in iter_submission_paths():
        try:
            submission = load_json(path)
        except json.JSONDecodeError as exc:
            errors.append(f"{path.name}: invalid JSON ({exc})")
            continue

        submission_errors = validate_submission(submission, support, path.name)
        submission_id = submission.get("submission_id")
        if isinstance(submission_id, str):
            if submission_id in seen_submission_ids:
                submission_errors.append(f"{path.name}: duplicate submission_id {submission_id}")
            else:
                seen_submission_ids.add(submission_id)

        if submission_errors:
            errors.extend(submission_errors)
            continue

        results.append({"path": path, "submission": submission})

    return results, errors


def verified_payload(items: list[dict[str, Any]]) -> dict[str, Any]:
    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    results = []
    for item in sorted(items, key=lambda x: (x["submission"]["created_at"], x["path"].name)):
        submission = dict(item["submission"])
        submission["source_file"] = item["path"].name
        submission["verified_at"] = generated_at
        results.append(submission)

    return {
        "schema_version": "va.verified-results.v1",
        "generated_at": generated_at,
        "results": results,
    }
