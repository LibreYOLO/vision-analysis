#!/usr/bin/env python3
"""Validator for v2 article content files.

Usage:
  validate.py <content.json> [claims.json]

If claims.json is omitted it is resolved from the content file's "claimsFile"
field (path relative to repo root).

Checks:
  1. Schema: required metadata fields, known block kinds, per-kind required keys.
  2. Gate: the claims file gate must have passed.
  3. Numbers: every numeric token in prose/verdict/callout text must exist in
     the claims file's allowed_numbers (exact match after normalization).
  4. Style: no em dashes, no banned marketing words, no forbidden sections,
     no paper-mAP comparisons, dek/title length bounds for SEO.
  5. Slug/status sanity, ISO date, tags present.

Exit 0 = publishable. Exit 1 = fix and rerun.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

BLOCK_KINDS = {
    "prose": {"text"},
    "verdict": {"text"},
    "heading": {"text"},
    "callout": {"text"},
    "chart": {"src", "caption"},
    "code": {"language", "text"},
    "kv": {"title", "items"},
    "comparison-table": {"models", "hardware", "runtime"},
    "ranking-table": {"hardware", "runtime", "metric"},
    "speedup-table": {"hardware", "baseline", "target"},
    "methodology": set(),
}

TEXT_KINDS = {"prose", "verdict", "callout"}

ARTICLE_TYPES = {"vs", "hardware-guide", "runtime-guide", "license-guide", "finding"}

BANNED_PATTERNS = [
    (r"—", "em dash (use colon, comma, or period)"),
    (r"–", "en dash (use hyphen)"),
    (r"(?i)\b(blazing|crushes|crushing|destroys|insane|game.chang\w+|revolution\w+|"
     r"unleash\w*|supercharge\w*|delve|elevate|seamless\w*|cutting.edge|"
     r"state.of.the.art|best.in.class)\b", "marketing superlative"),
    (r"(?i)\b(really|quite|arguably|very|extremely)\b", "hedge word"),
    (r"(?i)paper[- ]reported|published mAP|paper value|paperReportedMap|claims? in the paper",
     "paper-mAP comparison (forbidden)"),
    (r"(?i)^#*\s*(conclusion|bottom line)", "Conclusion/Bottom-line section (verdict block covers this)"),
    (r"(?i)\b(it'?s worth noting|in today'?s world|in the realm of|"
     r"let'?s dive|dive into|landscape of)\b", "AI-slop phrase"),
]

# tokens like 46.8, 0.468, 1,234, 3x, 45%, 12.5ms
NUMBER_RE = re.compile(r"(?<![\w./-])(\d+(?:[.,]\d+)?)")
# strip things that are not measurement claims before number extraction
STRIP_RE = re.compile(
    r"mAP@50-95|mAP@50|mAP@75|val2017|COCO|IoU|FP16|FP32|INT8|"
    r"YOLOv?\d+|RT-?DETR(?:v\d)?|D-FINE|DEIM(?:v\d)?|RF-DETR|Hailo-?8L?|"
    r"RTX \d{4}(?: Ti)?|A100|5070|5080|Pi ?5|Orin|r\d{2,3}m?|"
    r"\[[^\]]*\]\([^)]*\)|`[^`]*`|20\d\d-\d\d-\d\d|20\d\d",
    re.IGNORECASE,
)


def fail(errors):
    print("VALIDATION FAILED:")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)


def check_schema(doc, errors):
    for field in ("slug", "type", "title", "dek", "date", "author",
                  "readingMinutes", "tags", "status", "claimsFile", "blocks"):
        if field not in doc:
            errors.append(f"missing metadata field: {field}")
    if doc.get("type") not in ARTICLE_TYPES:
        errors.append(f"unknown article type: {doc.get('type')} (known: {sorted(ARTICLE_TYPES)})")
    if doc.get("status") not in ("published", "draft"):
        errors.append(f"status must be published|draft, got {doc.get('status')}")
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", doc.get("slug", "")):
        errors.append(f"slug must be kebab-case: {doc.get('slug')}")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", doc.get("date", "")):
        errors.append(f"date must be ISO yyyy-mm-dd: {doc.get('date')}")
    title = doc.get("title", "")
    if not (15 <= len(title) <= 70):
        errors.append(f"title length {len(title)} outside 15-70 chars (SEO): {title!r}")
    dek = doc.get("dek", "")
    if not (50 <= len(dek) <= 165):
        errors.append(f"dek length {len(dek)} outside 50-165 chars (meta description): {dek!r}")
    if not doc.get("tags"):
        errors.append("at least one tag required")

    blocks = doc.get("blocks", [])
    if not blocks:
        errors.append("blocks array is empty")
    for i, b in enumerate(blocks):
        kind = b.get("kind")
        if kind not in BLOCK_KINDS:
            errors.append(f"block[{i}]: unknown kind {kind!r} (known: {sorted(BLOCK_KINDS)})")
            continue
        missing = BLOCK_KINDS[kind] - set(b.keys())
        if missing:
            errors.append(f"block[{i}] ({kind}): missing keys {sorted(missing)}")

    kinds = [b.get("kind") for b in blocks]
    if "verdict" not in kinds:
        errors.append("no verdict block: every article opens with a verdict")
    if kinds and kinds[0] not in ("verdict", "prose"):
        errors.append(f"first block must be verdict or lede prose, got {kinds[0]}")
    if "methodology" not in kinds:
        errors.append("no methodology block: every article must link the protocol")
    data_kinds = {"comparison-table", "ranking-table", "speedup-table", "chart"}
    if not any(k in data_kinds for k in kinds):
        errors.append("no data block (table or chart): articles must show data, not just prose")

    # prose budget: rendered data must dominate
    n_text = sum(1 for k in kinds if k in TEXT_KINDS)
    n_data = sum(1 for k in kinds if k in data_kinds) + kinds.count("kv") + kinds.count("code")
    if n_text > 2 * n_data + 4:
        errors.append(
            f"prose budget exceeded: {n_text} text blocks vs {n_data} data blocks. "
            "Cut prose or add rendered data.")

    words = sum(len(str(b.get("text", "")).split()) for b in blocks if b.get("kind") in TEXT_KINDS)
    if words > 900:
        errors.append(f"total prose is {words} words (max 900). This engine renders data; it does not narrate it.")


def check_style(doc, errors):
    for i, b in enumerate(doc.get("blocks", [])):
        text = b.get("text", "") if b.get("kind") in TEXT_KINDS else ""
        if not text:
            continue
        for pattern, why in BANNED_PATTERNS:
            m = re.search(pattern, text)
            if m:
                errors.append(f"block[{i}]: {why}: {m.group(0)!r}")
    for field in ("title", "dek"):
        for pattern, why in BANNED_PATTERNS:
            m = re.search(pattern, doc.get(field, ""))
            if m:
                errors.append(f"{field}: {why}: {m.group(0)!r}")


def check_numbers(doc, claims, errors):
    allowed = set()
    for n in claims.get("allowed_numbers", []):
        allowed.add(round(float(n), 4))
    if not allowed:
        errors.append("claims file has no allowed_numbers; regenerate with claims.py")
        return

    def ok(value):
        v = float(value.replace(",", ""))
        if v in allowed or round(v, 4) in allowed:
            return True
        # a prose number may be a rounding of an allowed number
        for decimals in (0, 1, 2):
            for a in allowed:
                if round(a, decimals) == v:
                    return True
        return False

    for i, b in enumerate(doc.get("blocks", [])):
        if b.get("kind") not in TEXT_KINDS:
            continue
        text = STRIP_RE.sub(" ", b.get("text", ""))
        for m in NUMBER_RE.finditer(text):
            if not ok(m.group(1)):
                errors.append(
                    f"block[{i}]: number {m.group(1)} not in claims allowed_numbers. "
                    "Every prose number must come from the claims file.")


def check_gate(doc, claims, errors):
    gate = claims.get("gate", {})
    if not gate.get("passed"):
        errors.append(f"claims gate failed: {gate.get('reason')}")
    if claims.get("slug") and doc.get("slug") != claims["slug"] and doc.get("type") != "finding":
        errors.append(f"slug mismatch: content={doc.get('slug')} claims={claims['slug']}")
    if doc.get("type") != claims.get("meta", {}).get("type"):
        errors.append(f"type mismatch: content={doc.get('type')} claims={claims.get('meta', {}).get('type')}")

    # mandatory caveats must surface in prose
    all_text = " ".join(str(b.get("text", "")) for b in doc.get("blocks", [])).lower()
    for c in claims.get("claims", []):
        if c.get("kind") == "caveat" and c.get("passed") and c.get("strength") == "strong":
            if c["id"] == "input_size_caveat":
                sizes = [str(v) for v in c.get("values", {}).values() if v]
                if not all(s in all_text for s in sizes):
                    errors.append(
                        "mandatory input_size_caveat not surfaced: the two models run at "
                        "different input sizes and the prose must say so.")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    content_path = Path(sys.argv[1])
    doc = json.loads(content_path.read_text(encoding="utf-8"))

    if len(sys.argv) > 2:
        claims_path = Path(sys.argv[2])
    else:
        claims_path = ROOT / doc.get("claimsFile", "")
    if not claims_path.exists():
        fail([f"claims file not found: {claims_path}"])
    claims = json.loads(claims_path.read_text(encoding="utf-8"))

    errors = []
    check_schema(doc, errors)
    check_gate(doc, claims, errors)
    check_style(doc, errors)
    check_numbers(doc, claims, errors)

    if errors:
        fail(errors)
    words = sum(len(str(b.get("text", "")).split())
                for b in doc["blocks"] if b.get("kind") in TEXT_KINDS)
    print(f"OK: {content_path.name} is publishable "
          f"({len(doc['blocks'])} blocks, {words} prose words, gate passed).")


if __name__ == "__main__":
    main()
