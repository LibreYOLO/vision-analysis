# Voice and data rules

## Audience

Engineers who deploy detection models. They know what mAP is. They want numbers, conditions, and a clear decision boundary. They do not want marketing or research-paper framing.

## Voice

- Short sentences. One idea per sentence.
- Active voice.
- No superlatives ("blazing", "crushes", "destroys", "insane").
- No hedging ("really", "quite", "arguably", "very").
- No em dashes. Use colons, periods, or parens.
- No "Bottom line" or "Conclusion" sections. The verdict block at the top does that once.

## What this article is not

- Not a research note. Do not speculate about why architectures perform the way they do. Do not name GELAN, PGI, CSPDarknet, PAFPN, or similar in prose. Those tokens belong in the specs table at most.
- Not a marketing piece. Do not editorialize about how impressive either model is. Quote numbers. Let the reader decide.
- Not a metric primer. The reader knows mAP. State the form (percent or decimal) once and move on.

## Never do this

- **No paper-mAP comparisons.** Do not mention paper-reported mAP, `paperReportedMap`, "paper value", "published mAP", or anything comparing measured numbers to the paper. Not in prose, not in tables, not in callouts. Every article measures LibreYOLO retrained checkpoints; other weight sources can yield different values. Say that once in the Accuracy section, and do not elaborate.

## Data rules

- Every number must come from the fact sheet JSON. The validator rejects unsourced numbers.
- mAP values shown as percent form (46.8 = 0.468 in the JSON). State this once.
- Precision and recall in the JSONs are single-threshold point measurements. Flag them in the table with "not comparable, not ranked". Never use them to pick a winner.
- Use `deltas_pct` values as-is from the fact sheet. Do not invent secondary calculations.
- If a metric is missing, drop the sentence or table row that would have used it.
- If `cross_runtime` or `cross_hardware` is empty, drop the corresponding section.

## Template

Match `article-pipeline/target_article_example_v1.html` for layout, CSS palette (dark theme), and section order. Fill with fact-sheet data for the specific pair.
