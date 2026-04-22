#!/usr/bin/env python3
"""Validate all benchmark submissions in submissions/."""

from __future__ import annotations

import sys

from benchmark_data import load_and_validate_submissions


def main() -> int:
    _items, errors = load_and_validate_submissions()
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1

    print("All submissions are valid.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
