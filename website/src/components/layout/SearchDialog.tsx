"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getFamilyColor } from "@/lib/utils/colors";
import { cn } from "@/lib/utils";

export interface SearchItem {
  label: string;
  sublabel?: string;
  href: string;
  group: "Models" | "Hardware" | "Pages";
  family?: string;
}

interface SearchDialogProps {
  items: SearchItem[];
}

const GROUP_ORDER: SearchItem["group"][] = ["Models", "Hardware", "Pages"];

function matchScore(item: SearchItem, query: string): number {
  const q = query.toLowerCase();
  const label = item.label.toLowerCase();
  const sublabel = item.sublabel?.toLowerCase() ?? "";
  if (label.startsWith(q)) return 0;
  if (label.includes(q)) return 1;
  if (sublabel.includes(q)) return 2;
  return -1;
}

export function SearchDialog({ items }: SearchDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return items;
    return items
      .map((item) => ({ item, score: matchScore(item, trimmed) }))
      .filter(({ score }) => score >= 0)
      .sort((a, b) => a.score - b.score)
      .map(({ item }) => item);
  }, [items, query]);

  const grouped = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      group,
      items: results.filter((item) => item.group === group),
    })).filter(({ items: groupItems }) => groupItems.length > 0);
  }, [results]);

  // Flat list in display order, for keyboard navigation
  const flat = useMemo(() => grouped.flatMap(({ items: groupItems }) => groupItems), [grouped]);

  const navigate = useCallback(
    (item: SearchItem) => {
      setOpen(false);
      router.push(item.href);
    },
    [router]
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setHighlighted(0);
    }
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((prev) => Math.min(prev + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && flat[highlighted]) {
      e.preventDefault();
      navigate(flat[highlighted]);
    }
  };

  return (
    <>
      {/* Desktop trigger */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center bg-white/10 hover:bg-white/15 transition-colors rounded h-9 px-3 w-[160px] text-white/50 text-sm"
        aria-label="Search models and hardware"
      >
        <Search className="h-4 w-4 mr-2 flex-shrink-0" />
        <span>Search...</span>
        <kbd className="ml-auto text-[10px] font-mono border border-white/20 rounded px-1 py-0.5">
          Ctrl K
        </kbd>
      </button>

      {/* Mobile trigger */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center justify-center h-9 w-9 rounded text-white/60 hover:text-white transition-colors"
        aria-label="Search models and hardware"
      >
        <Search className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="top-[15%] translate-y-0 p-0 gap-0 overflow-hidden"
        >
          <DialogTitle className="sr-only">Search models and hardware</DialogTitle>
          <div className="flex items-center border-b border-border px-3">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlighted(0);
              }}
              onKeyDown={onInputKeyDown}
              placeholder="Search models, hardware, pages..."
              className="w-full bg-transparent px-3 py-3.5 text-sm outline-none placeholder:text-muted-foreground"
              role="combobox"
              aria-expanded={flat.length > 0}
              aria-controls="search-results"
              aria-activedescendant={flat[highlighted] ? `search-item-${highlighted}` : undefined}
            />
          </div>

          <div id="search-results" role="listbox" className="max-h-[320px] overflow-y-auto p-2">
            {flat.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No results for &ldquo;{query}&rdquo;
              </p>
            )}
            {grouped.map(({ group, items: groupItems }) => (
              <div key={group}>
                <p className="px-2 pt-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group}
                </p>
                {groupItems.map((item) => {
                  const flatIndex = flat.indexOf(item);
                  const isHighlighted = flatIndex === highlighted;
                  return (
                    <button
                      key={item.href}
                      id={`search-item-${flatIndex}`}
                      role="option"
                      aria-selected={isHighlighted}
                      onClick={() => navigate(item)}
                      onMouseEnter={() => setHighlighted(flatIndex)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm",
                        isHighlighted ? "bg-muted" : ""
                      )}
                    >
                      {item.family && (
                        <span
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getFamilyColor(item.family) }}
                        />
                      )}
                      <span className="font-medium">{item.label}</span>
                      {item.sublabel && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {item.sublabel}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
