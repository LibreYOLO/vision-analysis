#!/usr/bin/env python3
"""Audit that every number in an article is traceable to its fact sheet.

Usage: number_audit.py <article.html|.md> <fact_sheet.json>
Exits 0 on pass, 1 on any unverified numbers. Ignores numbers inside
<style>, <script>, and <head>.
"""
import json
import re
import sys
from pathlib import Path

TOL = 0.01  # absolute tolerance for matching a number against the fact sheet


def _flat_numbers(obj):
    """Collect every numeric token found anywhere in the fact sheet.

    Also extracts numeric tokens from string values so dates like
    '2024-02-21' and versions like '2.8.0+cu128' don't trip the audit.
    """
    out = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            out |= _flat_numbers(k)
            out |= _flat_numbers(v)
    elif isinstance(obj, list):
        for v in obj:
            out |= _flat_numbers(v)
    elif isinstance(obj, bool):
        return out
    elif isinstance(obj, (int, float)):
        out.add(float(obj))
    elif isinstance(obj, str):
        for m in re.finditer(r"-?\d+(?:\.\d+)?", obj):
            out.add(float(m.group(0)))
    return out


def _derived(numbers):
    """Pairwise differences, percent deltas, and decimal-percent scaling.

    Scaling covers the common mismatch where mAP is 0.468 in the JSON but
    quoted as 46.8 in prose.
    """
    extras = set()
    nums = list(numbers)
    for a in nums:
        extras.add(round(a * 100, 2))
        extras.add(round(a * 100, 1))
        extras.add(round(a * 100, 0))
        extras.add(round(a / 100, 4))
        for b in nums:
            if a == b:
                continue
            diff = a - b
            extras.add(round(diff, 4))
            extras.add(round(diff, 2))
            extras.add(round(diff, 1))
            extras.add(round(diff * 100, 2))
            extras.add(round(diff * 100, 1))
            extras.add(round(diff * 100, 0))
            if b:
                pct = (a - b) / b * 100
                extras.add(round(pct, 2))
                extras.add(round(pct, 1))
                extras.add(round(pct, 0))
    return extras


def _strip_nondata(html):
    html = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL)
    html = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL)
    html = re.sub(r"<head[^>]*>.*?</head>", "", html, flags=re.DOTALL)
    return html


def _numbers_in(text):
    return [
        (m.group(0), float(m.group(0)), m.start())
        for m in re.finditer(r"(?<![\w.])-?\d+(?:\.\d+)?", text)
    ]


def main():
    if len(sys.argv) < 3:
        print("usage: number_audit.py <article> <fact_sheet.json>", file=sys.stderr)
        sys.exit(1)
    article_path = Path(sys.argv[1])
    facts_path = Path(sys.argv[2])
    text = article_path.read_text()
    if article_path.suffix.lower() == ".html":
        text = _strip_nondata(text)
    facts = json.loads(facts_path.read_text())

    allowed = _flat_numbers(facts)
    allowed |= _derived(allowed)

    unverified = []
    for raw, n, _ in _numbers_in(text):
        if any(abs(n - a) <= TOL for a in allowed):
            continue
        unverified.append(raw)

    if unverified:
        print(f"FAIL: {len(unverified)} unverified numbers in {article_path.name}:", file=sys.stderr)
        for s in unverified:
            print(f"  - {s}", file=sys.stderr)
        sys.exit(1)
    print(f"OK: every number in {article_path.name} is traceable to the fact sheet.")


if __name__ == "__main__":
    main()
