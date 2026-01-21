"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { BenchmarkResult, SortKey, SortOrder } from "@/lib/types";
import { getFamilyColor } from "@/lib/utils/colors";
import { formatNumber, formatPercent, formatMs } from "@/lib/utils/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LeaderboardTableProps {
  data: BenchmarkResult[];
  familyFilter?: string[];
  initialSortKey?: SortKey;
  initialSortOrder?: SortOrder;
}

const COLUMNS: Array<{
  key: SortKey | "model";
  label: string;
  align: "left" | "right";
  format?: "percent" | "number" | "ms" | "millions";
  sortable: boolean;
}> = [
  { key: "model", label: "Model", align: "left", sortable: true },
  { key: "mAP_50_95", label: "mAP", align: "right", format: "percent", sortable: true },
  { key: "throughputFps", label: "FPS", align: "right", format: "number", sortable: true },
  { key: "totalMs", label: "Latency", align: "right", format: "ms", sortable: true },
  { key: "paramsM", label: "Params", align: "right", format: "millions", sortable: true },
  { key: "mAPPerGflop", label: "mAP/GFLOP", align: "right", format: "number", sortable: true },
];

function formatValue(value: number, format?: string): string {
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

export function LeaderboardTable({
  data,
  familyFilter = [],
  initialSortKey = "mAP_50_95",
  initialSortOrder = "desc",
}: LeaderboardTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | "model">(initialSortKey);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);

  const sortedData = useMemo(() => {
    // Filter by family if specified
    let filtered = familyFilter.length > 0
      ? data.filter((d) => familyFilter.includes(d.family))
      : data;

    // Sort
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
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Default sort order based on metric
      if (key === "totalMs") {
        setSortOrder("asc"); // Lower is better for latency
      } else {
        setSortOrder("desc"); // Higher is better for most metrics
      }
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />;
    }
    return sortOrder === "desc" ? (
      <ArrowDown className="ml-1 h-3 w-3" />
    ) : (
      <ArrowUp className="ml-1 h-3 w-3" />
    );
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">#</TableHead>
            {COLUMNS.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  col.align === "right" && "text-right",
                  col.sortable && "cursor-pointer hover:bg-muted/50 select-none"
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
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((row, index) => (
            <TableRow
              key={row.model}
              className="hover:bg-muted/30 transition-colors"
            >
              <TableCell className="text-center text-muted-foreground font-mono text-sm">
                {index + 1}
              </TableCell>
              <TableCell>
                <Link
                  href={`/model/${row.model}`}
                  className="flex items-center gap-2 hover:underline"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getFamilyColor(row.family) }}
                  />
                  <span className="font-medium">{row.model}</span>
                  <Badge
                    variant="outline"
                    className="text-xs font-normal hidden sm:inline-flex"
                    style={{
                      borderColor: getFamilyColor(row.family),
                      color: getFamilyColor(row.family),
                    }}
                  >
                    {row.family}
                  </Badge>
                </Link>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatValue(row.mAP_50_95, "percent")}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatValue(row.throughputFps, "number")}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatValue(row.totalMs, "ms")}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatValue(row.paramsM, "millions")}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatValue(row.mAPPerGflop, "number")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {sortedData.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No models match the current filters
        </div>
      )}
    </div>
  );
}
