---
name: article-v2
description: Generate a data-backed article for visionanalysis.org with the v2 article engine (article-pipeline/v2). Supports five article types (vs, hardware-guide, runtime-guide, license-guide, finding). Use when the user asks to write, generate, or regenerate an article, a model comparison, a hardware buying guide, a runtime conversion guide, a license guide, or a findings post. Supersedes the model-comparison-article skill.
---

# The v2 article engine

You are writing for engineers who deploy detection models. The engine's core
rule: **the site renders the data; you write only the interpretation.** Your
prose is under 20% of the page. Every number you type must come from a claims
file that a script computed. If you follow the workflow, nothing you produce
can be wrong or slop.

Never use an em dash anywhere (prose, titles, deks, code comments). Use a
colon, comma, or period.

## Commands

Python: use `python3` on POSIX shells. On this Windows box python is not on
PATH; use `C:\Users\Usuario\AppData\Local\Programs\Python\Python312\python.exe`.
Run everything from the repo root (`vision-analysis/`).

```
python3 article-pipeline/v2/claims.py list                      # coverage: what can be written
python3 article-pipeline/v2/claims.py plan [--limit N] [--json]  # ranked, de-duplicated worklist of every viable article
python3 article-pipeline/v2/claims.py family-vs <famA> <famB> [--hardware H] [--runtime R]
python3 article-pipeline/v2/claims.py vs <a> <b> [--hardware H] [--runtime R]
python3 article-pipeline/v2/claims.py hardware-guide <hw> [--runtime R]
python3 article-pipeline/v2/claims.py runtime-guide <hw> <baseline_rt> <target_rt>
python3 article-pipeline/v2/claims.py license-guide [--hardware H] [--runtime R]
python3 article-pipeline/v2/claims.py finding scan [--hardware H]
python3 article-pipeline/v2/validate.py website/src/content/articles/<slug>.json
```

Defaults: hardware `nvidia_geforce_rtx_5070_ti`, runtime `pytorch_fp32`.
Hardware ids with data: `nvidia_geforce_rtx_5070_ti`, `jetson_orin`, `rpi5`,
`a100`, `rpi5_hailo8`. Runtime ids: `pytorch_fp32`, `onnx_fp32`,
`tensorrt_fp32`, `tensorrt_fp16`, `ncnn_fp32`, `hailo_int8`.
Note: non-permissive-license models (YOLO-NAS) only have data on
`jetson_orin`, `rpi5`, `a100`, `rpi5_hailo8`, so license-guide needs
`--hardware jetson_orin` (or another of those).

## Workflow (follow exactly)

1. **Check coverage.** `claims.py list`. If the requested combination lacks
   data, say so and stop. Never substitute a different combination silently.

2. **Compile claims.** Run the claims command for the article type. It writes
   `article-pipeline/v2/output/<slug>.claims.json` and prints a gate verdict.
   - **GATE FAILED (exit 2): do not write the article. Ever.** Report the gate
     reason to the user and stop. A failed gate means the data has no story
     (models are different size classes, too few significant deltas, etc.).
   - GATE PASSED: read the claims file. It contains `facts` (all usable
     numbers), `claims` (pre-phrased candidate statements, each with
     `passed: true/false`), and `allowed_numbers`.

3. **Write the content JSON** at `website/src/content/articles/<slug>.json`.
   The `slug` must equal the claims file's slug (finding articles may choose
   their own descriptive slug). Schema and block reference below.
   - Use ONLY claims with `passed: true`. Rephrase them; do not copy the
     statement text verbatim (it is written for you, not for readers).
   - Every number in your prose must appear in `allowed_numbers` (the
     validator enforces this; rounding to fewer decimals is allowed).
   - Claims with `strength: "strong"` are the story. Lead with them.
   - Claims with kind `caveat` are MANDATORY: surface them in the verdict or
     Setup prose (e.g. mismatched input sizes).

4. **Validate.** `validate.py website/src/content/articles/<slug>.json`.
   Fix every reported error and rerun until it prints OK. Do not publish a
   file that fails validation. Do not weaken the validator.

5. **Build check.** From `website/`: `npm run build` (node lives at
   `C:\Program Files\nodejs` on this box if not on PATH). The article appears
   at `/articles/<slug>` and enters the sitemap automatically; there is no
   registration step. Fix any build error you introduced.

6. **Report.** Tell the user the slug, the gate summary (n claims passed),
   validation result, and whether the build passed. Commit only if asked.

## Content JSON schema

```json
{
  "slug": "dfine-s-vs-yolov9s",
  "type": "vs",
  "title": "D-FINE-S vs YOLOv9-S: measured on the same protocol",
  "dek": "One to two sentences with a real number. This is the meta description: 50-165 chars.",
  "date": "2026-07-03",
  "author": "Vision Analysis",
  "readingMinutes": 5,
  "tags": ["comparison", "dfine", "yolov9"],
  "status": "published",
  "claimsFile": "article-pipeline/v2/output/dfine-s-vs-yolov9s.claims.json",
  "blocks": [ ... ]
}
```

- `date`: today's date, ISO.
- `title`: 15-70 chars, must contain the search phrase for the type (see SEO
  patterns below). No hardware in vs titles.
- `status`: `"published"` unless the user asked for a draft.
- `readingMinutes`: total prose words / 200, rounded up, min 3.

## Block reference

Text blocks (LLM-written, validated):

| kind | purpose |
|---|---|
| `{"kind": "verdict", "text": ...}` | 2-4 sentences answering the reader's question with numbers. First block of every article. |
| `{"kind": "prose", "text": ...}` | One paragraph. Minimal markdown: `[text](href)`, `` `code` ``, `**bold**`. No headings inside. |
| `{"kind": "heading", "text": ...}` | h2 section heading. |
| `{"kind": "callout", "text": ...}` | Short caveat or honesty note. |

Data blocks (rendered live from the verified dataset; they self-update when
new benchmark runs land, so prefer them over prose for anything numeric):

| kind | renders |
|---|---|
| `{"kind": "comparison-table", "models": ["a","b"], "hardware": H, "runtime": R}` | side-by-side metric table with winner highlighting, license row included |
| `{"kind": "ranking-table", "hardware": H, "runtime": R, "metric": "mAP_50_95"\|"throughputFps", "limit": 10, "licenseFilter": "permissive"?, "maxParamsM": 20?}` | leaderboard slice |
| `{"kind": "speedup-table", "hardware": H, "baseline": RT, "target": RT, "limit": 15?}` | per-model conversion speedups + mAP delta |
| `{"kind": "family-frontier", "familyA": famId, "familyB": famId, "hardware": H, "runtime": R}` | both families' variant ladders interleaved by params (the family-vs signature block) |
| `{"kind": "chart", "src": "/embed/scatter?highlight=a,b", "caption": ...}` | live scatter iframe |
| `{"kind": "kv", "title": ..., "items": [{"k": ..., "v": ..., "href"?: ...}]}` | license/provenance key-value block |
| `{"kind": "code", "language": "python", "text": ...}` | LibreYOLO snippet |
| `{"kind": "methodology"}` | fixed protocol paragraph with links. REQUIRED in every article. |

All blocks take an optional `caption`.

## Required structure per type

Every article: `verdict` first, at least one data block, one `methodology`
block, prose budget max 900 words total (target 350-600).

**family-vs** (slug `<famA>-vs-<famB>`, family ids alphabetical) is the HEADLINE
type: it compares two architecture families across their whole size range, which
is the higher-traffic head-term query ("YOLOv9 vs RT-DETR", "D-FINE vs DEIM").
Prefer it over vs. Structure:
verdict (the matched-compute accuracy edge AND the speed edge in one breath, plus
the crossover if `family_crossover` passed: name which family wins at the small
end vs the large end), lede prose (how many variants each family fields, both on
one protocol), `family-frontier` block (familyA/familyB/hardware/runtime from
claims meta: this is the signature visual, both ladders interleaved by params),
chart using `facts.chart_highlight` as the highlight list, heading "Accuracy at
matched compute" + prose (use `aggregate.mean_mAP_delta_pts`, `a_wins`/`b_wins`,
flagship and efficient-end claims; the comparison is nearest-params, say so),
heading "Speed" + prose (`aggregate.mean_fps_delta_pct`), heading "Where the
frontier crosses" + prose ONLY if `family_crossover` passed, kv "Licensing"
(per-family permissiveness from `facts.license`; surface `family_license_edge`
if it passed), heading "Which family to pick" + prose (small-model use, large-
model use, license-driven, runtime-driven), methodology. No per-model code block
(too many variants); instead one sentence pointing to the family's model pages.
Never claim a single overall winner when the crossover claim passed.

**vs** (slug `<a>-vs-<b>`, ids alphabetical) is now the LONG-TAIL supporting
type, for a specific high-intent variant pair only. Structure:
verdict, lede prose, comparison-table, chart (`/embed/scatter?highlight=a,b`),
heading "Accuracy" + prose, heading "Speed" + prose, cross-runtime or
cross-hardware observation if the claims contain `ranking_flip` or
`ranking_stable`, kv "License and provenance" (license, release date, repo,
LibreYOLO weights from `facts`), heading "When to pick which" + prose (one
sentence per model), methodology, optional code block. LibreYOLO class names:
read `libreyolo/docs/nomenclature.md` conventions; weights are
`Libre<FAMILY><size>.pt` (e.g. `LibreYOLO9s.pt`); only include a code block
for models with `inLibreYOLO: true` in facts.

**hardware-guide** (slug `best-object-detection-<hw>`):
verdict (name the winner + the budget picks), lede, ranking-table by
mAP_50_95 (limit 15), heading + prose on the frontier, ranking-table by
throughputFps (limit 10), budget-pick prose from `budget_picks` claims,
permissive-license prose + ranking-table with `licenseFilter` if the
`best_permissive` claim passed, methodology.

**runtime-guide** (slug from claims, e.g. `tensorrt-fp16-vs-pytorch-fp32-jetson-orin`):
verdict (median speedup + accuracy cost), lede, speedup-table (limit 15),
prose on family spread, prose on accuracy losers (or the no-loss claim),
prose on regressions if any (this is the interesting part), methodology.

**license-guide** (slug `permissive-license-detection-models-<hw>`):
verdict, lede on why license matters at deploy time (no legal advice; say
"not legal advice" in a callout), one prose + comparison-table per matchup
from the `alt_*` claims, ranking-table with `licenseFilter: "permissive"`,
methodology.

**finding** (slug: descriptive, your choice, e.g.
`tensorrt-fp16-makes-these-models-slower`):
run `finding scan`, pick ONE coherent group of findings (same kind), write a
short post: verdict, what we observed (prose + the relevant data block),
which models/hardware, what we did NOT determine (no root-cause speculation),
methodology. Findings posts are the only type where curiosity is the angle;
still no speculation about why architectures behave as they do.

## SEO title patterns

- family-vs: `"{FamA} vs {FamB}: which detector family wins"` or `"{FamA} vs {FamB}: full benchmark comparison"`
- vs: `"{A} vs {B}: measured on the same protocol"` or `"{A} vs {B}: benchmark"`
- hardware-guide: `"Best object detection models for {hardware} ({year})"`
- runtime-guide: `"{Target} vs {Baseline} on {hardware}: N models measured"`
- license-guide: `"Commercially safe object detection models for {hardware}"`
- finding: state the finding plainly, numbers allowed.

Deks must contain at least one concrete number from the claims file.

## Voice (non-negotiable)

- Short sentences. One idea per sentence. Active voice.
- No superlatives, no hedging, no "really/quite/very".
- No em dashes, no en dashes.
- No architectural speculation: never explain WHY a model is fast or accurate.
  Backbone/neck names stay out of prose entirely.
- Never mention paper-reported mAP or compare measured numbers to any paper.
- No "Conclusion" or "Bottom line" sections: the verdict block owns that.
- No AI-slop phrasing: "dive into", "landscape", "it's worth noting",
  "in the realm of", "seamless", "cutting-edge".
- The reader knows what mAP is. State once that mAP is shown in percent form
  and move on (the methodology block covers protocol).

## Batch generation

Use `claims.py plan` to get a ranked, de-duplicated worklist. It scores every
viable article by demand (popular families) plus differentiation (cross-family,
ranking flips, license edges, small-object gaps) and penalizes the Nth article
with the same family+size shape, so near-duplicates sink. Take the top N from
the plan, not an arbitrary enumeration.

Do NOT try to write all ~680 viable articles. The gate proves each has a real
delta, but it cannot see search demand or judge whether a page is differentiated
from its neighbors. A pile of near-identical vs pages triggers site-wide
Helpful-Content demotion (the pSEO failure mode in SEO-ROADMAP.md). Generate in
waves: a differentiated core first, measure in Search Console, expand where real
queries land. Guides (hardware, runtime, license) are each structurally unique,
so prefer them; vs pages need demand behind the pair.

Process one article at a time through the full workflow. If any gate fails, skip
it and list it in the final report with the reason. Never lower a threshold in
claims.py to force a gate to pass.
