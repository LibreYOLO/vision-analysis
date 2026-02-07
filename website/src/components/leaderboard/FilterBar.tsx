"use client";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getFamilyColor, getAllFamilies } from "@/lib/utils/colors";
import { getHardwareOptions, getRuntimeOptions } from "@/lib/data";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  hardware: string;
  onHardwareChange: (value: string) => void;
  runtime: string;
  onRuntimeChange: (value: string) => void;
  selectedFamilies: string[];
  onFamilyToggle: (family: string) => void;
  resultCount: number;
}

export function FilterBar({
  hardware,
  onHardwareChange,
  runtime,
  onRuntimeChange,
  selectedFamilies,
  onFamilyToggle,
  resultCount,
}: FilterBarProps) {
  const hardwareOptions = getHardwareOptions();
  const runtimeOptions = getRuntimeOptions(hardware);
  const families = getAllFamilies();

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-4 border-b">
      <div className="flex flex-wrap items-center gap-3">
        {/* Hardware Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Hardware:</span>
          <Select value={hardware} onValueChange={onHardwareChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select hardware" />
            </SelectTrigger>
            <SelectContent>
              {hardwareOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Runtime Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Runtime:</span>
          <Select value={runtime} onValueChange={onRuntimeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select runtime" />
            </SelectTrigger>
            <SelectContent>
              {runtimeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Family Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Families:</span>
          {families.map((family) => {
            const isSelected = selectedFamilies.includes(family);
            const color = getFamilyColor(family);
            return (
              <Badge
                key={family}
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-all hover:scale-105",
                  isSelected && "ring-2 ring-offset-2"
                )}
                style={{
                  backgroundColor: isSelected ? color : "transparent",
                  borderColor: color,
                  color: isSelected ? "white" : color,
                }}
                onClick={() => onFamilyToggle(family)}
              >
                {family}
              </Badge>
            );
          })}
          {selectedFamilies.length > 0 && (
            <button
              onClick={() => selectedFamilies.forEach(onFamilyToggle)}
              className="text-xs text-muted-foreground hover:text-foreground underline ml-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Result Count */}
      <div className="text-sm text-muted-foreground">
        {resultCount} model{resultCount !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
