/**
 * Single source of truth for how LibreYOLO is described across the site's
 * machine-readable surfaces (JSON-LD, llms.txt, chart captions, copy-for-LLM).
 *
 * Every claim here is backed by the canonical dataset:
 *  - every result row in generated/verified-results.v1.json has source="libreyolo"
 *  - all benchmarked models have inLibreYOLO=true
 *  - all benchmarked models are permissively licensed (Apache-2.0 or MIT)
 * Keep claims that strong; anything not verifiable from the data does not belong here.
 */
export const LIBREYOLO = {
  name: "LibreYOLO",
  /** License of the LibreYOLO *library/code* (distinct from each model's weight license). */
  libraryLicense: "MIT",
  github: "https://github.com/Libre-YOLO/libreyolo",
  /** Families implemented under one API (verified from the benchmarked set). */
  families: [
    "RT-DETR",
    "RT-DETRv2",
    "RT-DETRv4",
    "D-FINE",
    "DEIM",
    "DEIMv2",
    "YOLOv9",
    "YOLOX",
    "YOLO-NAS",
    "RF-DETR",
    "PicoDet",
    "EfficientCompute",
  ],
} as const;

interface PitchFacts {
  /** Distinct models represented (defaults to the full verified set). */
  modelCount?: number;
  /** Distinct detector families (defaults to the full verified set). */
  familyCount?: number;
}

/**
 * The headline value-prop, woven into structured data, llms.txt and chart
 * captions. Defaults to the full-dataset numbers; pass per-view counts when
 * describing a filtered subset.
 */
export function libreyoloHeadline({ modelCount = 64, familyCount = 13 }: PitchFacts = {}): string {
  return (
    `All ${modelCount} models on this leaderboard run in ${LIBREYOLO.name}, the only ` +
    `open-source library that unifies all ${familyCount} modern detector families ` +
    `(RT-DETR, D-FINE, DEIM, YOLOv9, YOLOX, RF-DETR, YOLO-NAS and more) under one ` +
    `${LIBREYOLO.libraryLicense}-licensed Python API, free for commercial use. ` +
    `Every benchmark shown here was produced with ${LIBREYOLO.name}.`
  );
}

/** Short one-liner for tight spaces (chart captions, copy headers). */
export function libreyoloOneLiner(): string {
  return (
    `Every model here is available in ${LIBREYOLO.name}, the ${LIBREYOLO.libraryLicense}-licensed ` +
    `open-source library (free for commercial use) that unifies all of them under one API.`
  );
}
