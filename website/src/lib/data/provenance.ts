import modelsData from "@/data/metadata/models.json";

/**
 * Provenance helpers: distinguish models that are available in LibreYOLO from
 * competitor/reference models (inLibreYOLO=false) that are benchmarked on the
 * same harness for comparison only.
 *
 * The site's headline claims ("N models run in LibreYOLO", "MIT-licensed",
 * "free for commercial use") are only true of the LibreYOLO set, so anything
 * that aggregates for those claims must scope to it. Competitor rows are shown
 * on the leaderboard for comparison but must be visibly marked as not-LibreYOLO.
 */

type ModelProvenance = { id: string; inLibreYOLO: boolean };

const LIBREYOLO_MODEL_IDS = new Set(
  (modelsData.models as ModelProvenance[])
    .filter((m) => m.inLibreYOLO)
    .map((m) => m.id)
);

/** True if the model id is available in the LibreYOLO library. */
export function isLibreYoloModel(modelId: string): boolean {
  return LIBREYOLO_MODEL_IDS.has(modelId);
}

/** Keep only rows for models available in LibreYOLO (for scoped claims/counts). */
export function libreYoloOnly<T extends { model: string }>(rows: T[]): T[] {
  return rows.filter((r) => isLibreYoloModel(r.model));
}
