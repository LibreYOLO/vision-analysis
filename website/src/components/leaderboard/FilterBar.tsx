"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  hardware: string;
  onHardwareChange: (value: string) => void;
  runtime: string;
  onRuntimeChange: (value: string) => void;
  selectedFamilies: string[];
  onFamilyToggle: (family: string) => void;
  resultCount: number;
  hardwareOptions: Array<{ value: string; label: string }>;
  runtimeOptions: Array<{ value: string; label: string }>;
  families: string[];
}

export function FilterBar({
  hardware,
  onHardwareChange,
  runtime,
  onRuntimeChange,
  selectedFamilies,
  onFamilyToggle,
  resultCount,
  hardwareOptions,
  runtimeOptions,
  families,
}: FilterBarProps) {
  return (
    <div className="bg-card rounded-md p-3 border-b border-border">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Hardware Selector */}
          <Select value={hardware} onValueChange={onHardwareChange}>
            <SelectTrigger className="w-[180px] h-9 text-sm border-border bg-card">
              <SelectValue placeholder="Hardware" />
            </SelectTrigger>
            <SelectContent>
              {hardwareOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Runtime Selector */}
          <Select value={runtime} onValueChange={onRuntimeChange}>
            <SelectTrigger className="w-[160px] h-9 text-sm border-border bg-card">
              <SelectValue placeholder="Runtime" />
            </SelectTrigger>
            <SelectContent>
              {runtimeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Separator */}
          <div className="w-px h-6 bg-border hidden sm:block" />

          {/* Family Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {families.map((family) => {
              const isSelected = selectedFamilies.includes(family);
              return (
                <button
                  key={family}
                  onClick={() => onFamilyToggle(family)}
                  className={cn(
                    "filter-chip",
                    isSelected ? "filter-chip-active" : "text-foreground"
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

        {/* Result Count */}
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {resultCount} model{resultCount !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}
