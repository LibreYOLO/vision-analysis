"use client";

import { cn } from "@/lib/utils";

interface FamilyFilterProps {
  families: string[];
  selectedFamilies: string[];
  onFamilyToggle: (family: string) => void;
  /** Optional trailing count (e.g. how many models are visible). */
  resultCount?: number;
}

/**
 * Family selection is an architecture-level filter: it applies to BOTH the
 * hardware-agnostic and the hardware-specific charts. It lives with the first
 * (Accuracy vs Parameters) chart, since families are what that chart plots.
 */
export function FamilyFilter({
  families,
  selectedFamilies,
  onFamilyToggle,
  resultCount,
}: FamilyFilterProps) {
  const noFamilyFilter = selectedFamilies.length === 0;
  return (
    <div className="bg-card rounded-md p-3 border border-border">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground mr-1">Families</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {families.map((family) => {
              const isSelected = selectedFamilies.includes(family);
              const looksActive = noFamilyFilter || isSelected;
              return (
                <button
                  key={family}
                  onClick={() => onFamilyToggle(family)}
                  aria-pressed={isSelected}
                  className={cn(
                    "filter-chip",
                    looksActive ? "filter-chip-active" : "text-foreground"
                  )}
                >
                  {family}
                </button>
              );
            })}
            {selectedFamilies.length > 0 && (
              <button
                onClick={() => selectedFamilies.forEach(onFamilyToggle)}
                className="text-xs text-muted-foreground hover:text-foreground ml-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {typeof resultCount === "number" && (
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            {resultCount} model{resultCount !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
