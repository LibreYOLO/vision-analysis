"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { BenchmarkResult, SortKey, SortOrder } from "@/lib/types";
import { getFamilyColor } from "@/lib/utils/colors";
import { formatNumber, formatPercent, formatMs } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface LeaderboardTableProps {
  data: BenchmarkResult[];
  familyFilter?: string[];
  initialSortKey?: SortKey | "model";
  initialSortOrder?: SortOrder;
  onSortChange?: (key: SortKey | "model", order: SortOrder) => void;
}

const COLUMNS: Array<{
  key: SortKey | "model";
  label: string;
  align: "left" | "right";
  format?: "percent" | "number" | "ms" | "millions";
  sortable: boolean;
}> = [
  { key: "model", label: "Model", align: "left", sortable: true },
  { key: "mAP_50_95", label: "mAP@50-95", align: "right", format: "percent", sortable: true },
  { key: "mAP_50", label: "mAP@50", align: "right", format: "percent", sortable: true },
  { key: "throughputFps", label: "FPS", align: "right", format: "number", sortable: true },
  { key: "totalMs", label: "Latency", align: "right", format: "ms", sortable: true },
  { key: "paramsM", label: "Params (M)", align: "right", format: "millions", sortable: true },
  { key: "flopsG", label: "GFLOPs", align: "right", format: "number", sortable: true },
  { key: "mAPPerGflop", label: "mAP/GFLOP", align: "right", format: "number", sortable: true },
];

function formatValue(value: number | undefined, format?: string): string {
  if (value === undefined || value === null) return "-";
  switch (format) {
    case "percent":
      return formatPercent(value);
    case "ms":
      return formatMs(value);
    case "millions":
      return `${formatNumber(value, 1)}M`;
    case "number":
    default:
      return formatNumber(value, 1);
  }
}

// Get rank-bar color based on relative position (green=top, yellow=mid, red=bottom)
function getRankColor(index: number, total: number): string {
  const ratio = index / Math.max(total - 1, 1);
  if (ratio < 0.33) return "#22c55e"; // green
  if (ratio < 0.66) return "#eab308"; // yellow
  return "#ef4444"; // red
}

export function LeaderboardTable({
  data,
  familyFilter = [],
  initialSortKey = "mAP_50_95",
  initialSortOrder = "desc",
  onSortChange,
}: LeaderboardTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | "model">(initialSortKey);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);

  const sortedData = useMemo(() => {
    const filtered = familyFilter.length > 0
      ? data.filter((d) => familyFilter.includes(d.family))
      : data;

    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey as keyof BenchmarkResult];
      const bVal = b[sortKey as keyof BenchmarkResult];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      const diff = (aVal as number) - (bVal as number);
      return sortOrder === "asc" ? diff : -diff;
    });
  }, [data, sortKey, sortOrder, familyFilter]);

  const handleSort = (key: SortKey | "model") => {
    if (sortKey === key) {
      const nextOrder = sortOrder === "asc" ? "desc" : "asc";
      setSortOrder(nextOrder);
      onSortChange?.(key, nextOrder);
    } else {
      const nextOrder = key === "totalMs" ? "asc" : "desc";
      setSortKey(key);
      setSortOrder(nextOrder);
      onSortChange?.(key, nextOrder);
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
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
                  "px-2 py-2 text-sm font-medium text-foreground",
                  col.align === "right" && "text-right",
                  col.sortable && "cursor-pointer hover:bg-muted select-none"
                )}
                onClick={() => col.sortable && handleSort(col.key as SortKey)}
              >
                <div
                  className={cn(
                    "flex items-center",
                    col.align === "right" && "justify-end"
                  )}
                >
                  {col.label}
                  {col.sortable && <SortIcon columnKey={col.key} />}
                </div>
              </th>
            ))}
            <th className="px-2 py-2 w-20" />
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, index) => (
            <tr
              key={row.model}
              className="h-[53px] border-b border-border hover:bg-muted transition-colors"
            >
              {/* Rank */}
              <td className="text-center relative">
                <div className="flex items-center justify-center">
                  <div
                    className="rank-bar absolute left-0 top-2 bottom-2"
                    style={{ backgroundColor: getRankColor(index, sortedData.length) }}
                  />
                  <span className="text-sm font-mono text-muted-foreground">{index + 1}</span>
                </div>
              </td>

              {/* Model Name (sticky) */}
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
                </Link>
              </td>

              {/* Data cells */}
              {COLUMNS.slice(1).map((col) => (
                <td key={col.key} className={cn("px-2 py-2 font-mono text-sm", col.align === "right" && "text-right")}>
                  {formatValue(row[col.key as keyof BenchmarkResult] as number, col.format)}
                </td>
              ))}

              {/* Model link */}
              <td className="px-2 py-2 text-right">
                <Link
                  href={`/model/${row.model}`}
                  className="inline-flex items-center text-xs text-brand border border-border rounded px-2 py-1 hover:bg-brand-light transition-colors"
                >
                  Model
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {sortedData.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No models match the current filters
        </div>
      )}
    </div>
  );
}
