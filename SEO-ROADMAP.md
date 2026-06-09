# SEO Roadmap for visionanalysis.org

Produced 2026-06-10 from a codebase audit + research pass on programmatic SEO for
benchmark/comparison sites. Items marked ✅ were already fixed in the same commit
that added this file.

## 0. Critical fixes (done)

- ✅ **Dead domain everywhere.** The codebase pointed to `https://visionanalysis.ai`
  (does not resolve) while production serves `https://www.visionanalysis.org`.
  Fixed in `site.ts`, `sitemap.ts`, `robots.ts`, both `opengraph-image.tsx` footers,
  and `scripts/generate-draft.ts`. `sitemap.ts`/`robots.ts` now derive from
  `siteConfig.url` so it can't drift again.
- ✅ **Model OG images were broken.** `model/[slug]/opengraph-image.tsx` read
  `params.slug` without awaiting (Next 16 `params` is a Promise), so every shared
  model link rendered a "Model Not Found" card. Also now picks a hardware combo
  that actually has results and shows its display name.
- ✅ **Broken default OG image.** Root metadata referenced `public/og-default.png`,
  which doesn't exist. Removed the explicit references; the file-based
  `opengraph-image.tsx` generators are used instead.
- ✅ **Sitemap was missing `/parity` and `/about`.** Added.

## 1. Quick wins (this week)

1. **Canonicals on every page.** No `alternates.canonical` exists anywhere.
   With `metadataBase` set, add relative canonicals per page:
   - Home (needs a metadata export): `alternates: { canonical: "/" }`, plus a tuned
     title like "Object Detection Benchmarks: YOLO, RT-DETR, D-FINE Leaderboard".
   - `/compare` (currently has **no metadata export at all**): canonical stays
     `/compare` regardless of `?models=`/`?hw=` params. Canonical-strip is the
     correct pattern for filter params — do NOT noindex.
   - `model/[slug]`: `canonical: /model/${slug}`; change OG `type` from "article"
     to "website".
   - Hardware pages, `/parity`, `/about`: same pattern.
2. **JSON-LD.** Zero structured data exists today. Add a small `JsonLd` component and:
   - `layout.tsx`: `Organization` + `WebSite` (logo, `sameAs: [github]`).
   - `/` and `/about`: **`Dataset`** schema describing the verified benchmark dataset
     (distribution → GitHub `generated/verified-results.v1.json`,
     `measurementTechnique: "COCO val2017 mAP@50-95, end-to-end latency"`).
     Gets the site into Google Dataset Search — a citation channel for researchers.
   - `model/[slug]`: `BreadcrumbList` (Home → family → model).
   - FAQ and HowTo rich results are dead (deprecated by Google) — skip the markup,
     but answer-first FAQ *content* still helps AI answer extraction.
3. **Sitemap `lastModified`.** Currently `new Date()` on every build, which tells
   Google everything changed daily and erodes trust. Use the dataset generation
   timestamp from `generated/verified-results.v1.json` instead.
4. **Richer titles/descriptions with real numbers.** `model/[slug]` title →
   `"{Model} Benchmark: mAP, FPS, Latency on COCO"`; embed actual best-mAP/best-FPS
   numbers in the description (numbers lift CTR and AI citation).
5. **`llms.txt` route** listing the leaderboard, parity, model pages, and the raw
   JSON dataset on GitHub. Cheap; mostly read by coding agents, not AI search
   crawlers — don't build strategy on it.

## 2. Programmatic page strategy (the gold mine)

- **`/vs/[pair]` static comparison routes** — `yolov9c-vs-yolox-l` style, model ids
  ordered alphabetically (301-redirect the flipped order). Query-param `/compare`
  can never rank for "yolov9 vs yolox"; static pages can.
- **Don't generate all pairs.** Only pairs where both models have verified data AND
  the pair is meaningful: cross-family within ~2.5× params, same-family adjacent
  variants, flagship-vs-flagship. Likely 100–400 genuinely differentiated pages —
  the kind that survives Google's pSEO crackdowns (thin variable-substitution pages
  get wiped; pages backed by proprietary data are durable).
- **Page anatomy:** H1 "{A} vs {B}"; answer-first verdict in the first viewport
  (44% of LLM citations come from the first 30% of a page); side-by-side table with
  win highlighting; speed breakdown; cross-runtime ranking-stability; license &
  provenance ("which is safe for commercial use" is underexploited, high-intent);
  link to `/compare?models=a,b` to customize.
- **JSON-LD:** `TechArticle` with `dateModified` = benchmark date (freshness is the
  top LLM-citation signal: 76% of ChatGPT's most-cited pages updated in last 30 days),
  `BreadcrumbList`, `isBasedOn` → Dataset node.
- **Hardware long-tail:** when Raspberry Pi / edge data lands, enrich
  `/hardware/[slug]` for "best object detection model for raspberry pi 5";
  add `/vs/[pair]/[hardware]` only where the ranking *flips* vs default hardware.
- **Family hubs:** `/family/[slug]` from `families.json` (paper, authors,
  innovations, variant table) for "yolov9 variants"-shaped queries.
- **Internal linking mesh:** model page → its 3–5 strongest /vs/ pages; /vs/ page →
  both model pages + hardware page + /parity (trust) + sibling comparisons; every
  /vs/ page in the sitemap.

## 3. Article pipeline integration

Pipeline output (`article-pipeline/output/`, `public/articles/draft-*.html`) is
currently **orphaned** — no route serves it, it's not in the sitemap or link graph.
Recommended: merge article prose INTO `/vs/[pair]` pages (store validated prose as
JSON/MDX keyed by pair; the vs page renders data tables always, prose when
available). One URL accumulates all authority per pair. If standalone articles are
kept, serve via a real `/articles/[slug]` route (never raw HTML in `public/`), with
canonical to the /vs/ page when content overlaps. Re-run the pipeline when new
benchmark data lands — that's the freshness engine.

## 4. Measurement

- **Google Search Console:** add a *Domain property* for `visionanalysis.org`,
  submit the (now-fixed) sitemap. **Bing Webmaster Tools** too — Bing feeds ChatGPT
  search.
- **Query buckets to track:** "X vs Y"; "{model} fps/latency/benchmark/tensorrt";
  hardware ("raspberry pi", "a100"); license queries; head terms ("fastest object
  detection model").
- **AI crawler telemetry:** watch GPTBot / OAI-SearchBot / ClaudeBot /
  PerplexityBot user agents in Vercel logs; spot-check monthly whether
  ChatGPT/Perplexity cite visionanalysis.org for "yolov9 vs yolox benchmark".

**Suggested order:** canonicals + metadata (1) → Dataset JSON-LD + GSC/Bing setup →
`/vs/[pair]` for the ~20 pairs with verified data → article-prose merge → family
hubs and hardware enrichment as data grows.
