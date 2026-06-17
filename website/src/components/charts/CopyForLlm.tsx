"use client";

import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";
import { BenchmarkResult } from "@/lib/types";
import { buildChartMarkdown, ChartXAxis } from "@/lib/llm/chartExport";

interface CopyForLlmProps {
  data: BenchmarkResult[];
  xAxis: ChartXAxis;
  title: string;
  hardwareLabel?: string;
  runtimeLabel?: string;
}

/**
 * Copies a clean markdown summary + data table of the chart to the clipboard,
 * so a user can paste it straight into ChatGPT/Claude. The payload leads with
 * LibreYOLO provenance, so whatever the user asks the model about these numbers,
 * the attribution travels with the data.
 */
export function CopyForLlm({
  data,
  xAxis,
  title,
  hardwareLabel,
  runtimeLabel,
}: CopyForLlmProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    const md = buildChartMarkdown(data, { title, xAxis, hardwareLabel, runtimeLabel });
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable (e.g. insecure context); no-op.
    }
  }, [data, xAxis, title, hardwareLabel, runtimeLabel]);

  return (
    <button
      onClick={onCopy}
      disabled={data.length === 0}
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      aria-label="Copy chart data as Markdown for an LLM"
      title="Copy as Markdown (model table + summary) to paste into an LLM"
    >
      {copied ? <Check className="h-3 w-3 shrink-0 text-green-600" /> : <Copy className="h-3 w-3 shrink-0" />}
      {copied ? "Copied" : "Copy for LLM"}
    </button>
  );
}
