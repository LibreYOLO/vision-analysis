"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { getFamilyColor } from "@/lib/utils/colors";
import { formatNumber, formatPercent } from "@/lib/utils/format";
import { isLibreYoloModel } from "@/lib/data/provenance";
import { cn } from "@/lib/utils";

// One row per detection model: RF100-VL scores averaged over the 100 datasets.
export interface Rf100VlRow {
  model: string;
  family: string;
  ap50: number; // mean AP@50 across the 100 datasets (percent scale, 0..100)
  ap5095: number; // mean AP@50-95 across the 100 datasets (percent scale, 0..100)
  paramsM: number;
  /** True while the row carries placeholder numbers, not harness results. */
  fake?: boolean;
}

type Rf100SortKey = "model" | "ap50" | "ap5095" | "paramsM";

const COLUMNS: Array<{
  key: Rf100SortKey;
  label: string;
  align: "left" | "right";
}> = [
  { key: "model", label: "Model", align: "left" },
  { key: "ap50", label: "RF100-VL AP@50 (avg)", align: "right" },
  { key: "ap5095", label: "RF100-VL AP@50-95 (avg)", align: "right" },
  { key: "paramsM", label: "Params (M)", align: "right" },
];

function getRankColor(index: number, total: number): string {
  const ratio = index / Math.max(total - 1, 1);
  if (ratio < 0.33) return "#22c55e";
  if (ratio < 0.66) return "#eab308";
  return "#ef4444";
}

export function Rf100VlTable({ rows }: { rows: Rf100VlRow[] }) {
  const [sortKey, setSortKey] = useState<Rf100SortKey>("ap50");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const cmp =
        sortKey === "model"
          ? a.model.localeCompare(b.model)
          : (a[sortKey] as number) - (b[sortKey] as number);
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortOrder]);

  const handleSort = (key: Rf100SortKey) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortOrder(key === "model" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: Rf100SortKey }) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />;
    }
    return sortOrder === "desc" ? (
      <ArrowDown className="ml-1 h-3 w-3 text-brand" />
    ) : (
      <ArrowUp className="ml-1 h-3 w-3 text-brand" />
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-muted">
            <th className="text-center px-2 py-2 text-sm font-medium text-foreground w-12">#</th>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-2 py-2 text-sm font-medium text-foreground cursor-pointer hover:bg-muted select-none",
                  col.align === "right" && "text-right"
                )}
                onClick={() => handleSort(col.key)}
              >
                <div
                  className={cn(
                    "flex items-center",
                    col.align === "right" && "justify-end"
                  )}
                >
                  {col.label}
                  <SortIcon columnKey={col.key} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, index) => (
            <tr
              key={row.model}
              className="h-[53px] border-b border-border hover:bg-muted transition-colors"
            >
              <td className="text-center relative">
                <div className="flex items-center justify-center">
                  <div
                    className="rank-bar absolute left-0 top-2 bottom-2"
                    style={{ backgroundColor: getRankColor(index, sorted.length) }}
                  />
                  <span className="text-sm font-mono text-muted-foreground">{index + 1}</span>
                </div>
              </td>
              <td className="bg-card sticky left-0 z-10 px-2">
                <Link
                  href={`/model/${row.model}`}
                  className="flex items-center gap-2 hover:underline"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getFamilyColor(row.family) }}
                  />
                  <span className="font-semibold text-sm">{row.model}</span>
                  {!isLibreYoloModel(row.model) && (
                    <span
                      title="Competitor model — not part of LibreYOLO (AGPL-licensed). Benchmarked on the same harness for comparison."
                      className="ml-1 flex-shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40"
                    >
                      AGPL
                    </span>
                  )}
                  {row.fake && (
                    <span
                      title="Placeholder number — no RF100-VL harness run submitted yet."
                      className="ml-1 flex-shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/40"
                    >
                      Fake
                    </span>
                  )}
                </Link>
              </td>
              <td className="px-2 text-right font-mono text-sm">{formatPercent(row.ap50)}</td>
              <td className="px-2 text-right font-mono text-sm">{formatPercent(row.ap5095)}</td>
              <td className="px-2 text-right font-mono text-sm">
                {row.paramsM > 0 ? `${formatNumber(row.paramsM, 1)}M` : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
