import { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getAllFamilies, getModelsByFamily } from "@/lib/data";
import { getFamilyColor } from "@/lib/utils/colors";
import { formatNumber } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Models",
  description:
    "Every detection model family benchmarked on Vision Analysis, grouped by architecture: real-time CNN detectors and transformer (DETR) detectors. Open a family for its variants and full hardware breakdown.",
};

interface FamilyRow {
  id: string;
  displayName: string;
  organization: string;
  variants: number;
  minParams: number;
  maxParams: number;
  approach: string;
  inLibreYOLO: boolean;
  isTransformer: boolean;
}

function buildRows(): FamilyRow[] {
  const rows: FamilyRow[] = [];
  for (const family of getAllFamilies()) {
    const models = getModelsByFamily(family.id);
    if (models.length === 0) continue; // only families with a working family page

    const params = models.map((m) => m.specs.paramsM).filter((p) => p > 0);
    const isTransformer = models.some(
      (m) => m.detectionApproach === "detr" || m.architecture.type === "transformer"
    );
    const anchorBased = models.some((m) => m.detectionApproach === "anchor-based");
    const approach = isTransformer ? "DETR" : anchorBased ? "anchor-based" : "anchor-free";

    rows.push({
      id: family.id,
      displayName: family.displayName,
      organization: family.organization,
      variants: models.length,
      minParams: params.length ? Math.min(...params) : 0,
      maxParams: params.length ? Math.max(...params) : 0,
      approach,
      inLibreYOLO: models.some((m) => m.inLibreYOLO),
      isTransformer,
    });
  }

  // In-LibreYOLO first, then smallest model ascending so the lineup reads small to large.
  return rows.sort((a, b) => {
    if (a.inLibreYOLO !== b.inLibreYOLO) return a.inLibreYOLO ? -1 : 1;
    return a.minParams - b.minParams;
  });
}

function paramRange(row: FamilyRow): string {
  if (row.minParams <= 0) return "-";
  if (row.variants === 1 || row.minParams === row.maxParams) {
    return `${formatNumber(row.minParams, 1)}M`;
  }
  return `${formatNumber(row.minParams, 1)} - ${formatNumber(row.maxParams, 1)}M`;
}

export default function ModelsPage() {
  const rows = buildRows();
  const cnn = rows.filter((r) => !r.isTransformer);
  const detr = rows.filter((r) => r.isTransformer);

  return (
    <>
      <section className="bg-black pb-32">
        <div className="mx-auto max-w-[1280px] px-4 pt-4">
          <h1 className="mb-2 text-2xl font-semibold text-white">Models</h1>
          <p className="max-w-2xl text-base text-white/60">
            Every detection family on Vision Analysis, grouped by architecture. Open a family for
            its variants, specifications, and full hardware breakdown.
          </p>
        </div>
      </section>

      <div className="-mt-16 mx-auto max-w-[1280px] px-4 pb-8">
        <FamilyGroup
          title="Real-time CNN detectors"
          description="Single-stage convolutional detectors. These run broadly, including on edge NPUs."
          rows={cnn}
        />
        <FamilyGroup
          title="Transformer (DETR) detectors"
          description="Detection-transformer architectures. Higher accuracy ceilings; GPU and CPU runtimes."
          rows={detr}
        />
      </div>
    </>
  );
}

function FamilyGroup({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: FamilyRow[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="section-group">
      <div className="section-group-header">
        <h2>
          {title}
          <span className="ml-2 text-base font-normal text-muted-foreground">
            {rows.length} {rows.length === 1 ? "family" : "families"}
          </span>
        </h2>
        <p className="text-base text-foreground">{description}</p>
      </div>
      <div className="section-group-content">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-muted">
                <th className="px-3 py-2 text-left font-medium text-foreground">Family</th>
                <th className="px-3 py-2 text-left font-medium text-foreground">Organization</th>
                <th className="px-3 py-2 text-right font-medium text-foreground">Variants</th>
                <th className="px-3 py-2 text-right font-medium text-foreground">Parameters</th>
                <th className="px-3 py-2 text-left font-medium text-foreground">Approach</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="group border-b border-border transition-colors hover:bg-muted"
                >
                  <td className="px-3 py-3">
                    <Link href={`/model/${row.id}`} className="flex items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: getFamilyColor(row.id) }}
                      />
                      <span className="font-semibold text-foreground group-hover:text-brand">
                        {row.displayName}
                      </span>
                      {!row.inLibreYOLO && (
                        <span className="text-xs font-normal text-muted-foreground">baseline</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{row.organization}</td>
                  <td className="px-3 py-3 text-right font-mono">{row.variants}</td>
                  <td className="px-3 py-3 text-right font-mono">{paramRange(row)}</td>
                  <td className="px-3 py-3 text-muted-foreground">{row.approach}</td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={`/model/${row.id}`}
                      className="inline-flex items-center gap-1 text-xs text-brand opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      View family
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
