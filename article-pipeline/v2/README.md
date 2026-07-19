# Article engine v2

Generates data-backed articles for visionanalysis.org without the slop
failure mode of v1. The inversion vs v1: **the site renders the data, the LLM
writes only the interpretation**, and an article only exists when the data
clears a significance gate.

## Why v1 was retired

v1 (`article-pipeline/fact-sheet` + the `model-comparison-article` skill) had
the LLM write a full 16-section HTML article from a fact sheet. Every article
was the same skeleton with paraphrased connective prose (slop), it was keyed
to arbitrary model pairs (most of which have no story), the output HTML was
orphaned (no route served it), and its defaults went stale (`rtx5080`).

## Architecture

```
claims.py   ->  output/<slug>.claims.json  ->  LLM writes content JSON  ->  validate.py
(mechanistic)   facts + gated claims +          website/src/content/        rejects unsourced
                allowed_numbers                 articles/<slug>.json        numbers + style
```

- **claims.py** reads `generated/verified-results.v1.json` + metadata and
  emits, per article type, every number the article may cite plus pre-phrased
  candidate claims, each marked passed/failed against significance thresholds.
  A gate (min passed claims) decides whether the article should exist at all.
  Exit 2 = do not write.
- **The writer** (Opus subagent via `.claude/skills/article-v2/SKILL.md`)
  produces a content JSON: metadata + ordered blocks. Text blocks are the only
  prose. Data blocks (`comparison-table`, `ranking-table`, `speedup-table`,
  `chart`) are declarative dataset slices.
- **validate.py** enforces: schema, gate passed, every prose number present in
  `allowed_numbers`, style rules (no em dashes, no superlatives, no paper-mAP
  mentions, no AI-slop phrases), prose budget (max 900 words, data blocks must
  dominate), mandatory caveats surfaced.
- **The site** (`website/src/components/articles/ArticleRenderer.tsx`) renders
  data blocks live from the verified dataset at build time, so every table in
  every published article updates when new benchmark runs land. Dropping a
  validated JSON into `website/src/content/articles/` publishes it: the
  `/articles` index, the article route, and `sitemap.xml` all pick it up
  automatically (`website/src/lib/articles.ts` reads the folder).

## Article types

| type | claims command | story source |
|---|---|---|
| vs | `claims.py vs a b` | pair deltas, ranking flips, license edge |
| hardware-guide | `claims.py hardware-guide hw` | leaderboard, pareto frontier, latency-budget picks |
| runtime-guide | `claims.py runtime-guide hw base target` | speedup distribution, accuracy cost, regressions |
| license-guide | `claims.py license-guide --hardware hw` | permissive alternatives to non-permissive models |
| finding | `claims.py finding scan` | anomalies: jitter, FP16 cliffs, cross-hardware flips |

`claims.py list` prints coverage (which hardware/runtime combos have enough
models).

## Anti-slop invariants

1. No claim passes the gate, no article. Pairs in different size classes
   (params ratio > 2.5x) can never pass.
2. Prose is capped and validated; numbers must trace to the claims file.
3. Everything numeric on the page is rendered from the dataset, not written.
4. Freshness is free: rebuild = every article's tables update; sitemap
   `lastModified` comes from the article date.

## Publishing checklist (automated by the skill)

1. `claims.py <type> ...` gate passes
2. write `website/src/content/articles/<slug>.json`
3. `validate.py` passes
4. `cd website && npm run build` passes
5. deploy from repo root: `npx vercel --prod`
