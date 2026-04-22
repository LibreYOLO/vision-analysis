#!/usr/bin/env python3
"""Build generated/verified-results.v1.json from validated submissions."""

from __future__ import annotations

import json
import sys

from benchmark_data import GENERATED_RESULTS_PATH, load_and_validate_submissions, verified_payload


def main() -> int:
    items, errors = load_and_validate_submissions()
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1

    GENERATED_RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = verified_payload(items)
    GENERATED_RESULTS_PATH.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"Wrote {GENERATED_RESULTS_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
