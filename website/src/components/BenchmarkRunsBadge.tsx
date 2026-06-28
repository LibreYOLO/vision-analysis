"use client";

import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

// GitHub shields-style two-tone badge with a tooltip explaining the count.
export function BenchmarkRunsBadge({ value }: { value: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help overflow-hidden rounded-[3px] text-[11px] font-medium leading-none">
          <span className="bg-white/10 px-2 py-1 text-white/60">Benchmark runs</span>
          <span className="bg-green-600/90 px-2 py-1 tabular-nums text-white">
            {value.toLocaleString("en-US")}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-center">
        Verified benchmark runs across different model sizes, hardware, and runtimes. Each run is one
        model measured on one hardware and runtime.
      </TooltipContent>
    </Tooltip>
  );
}
