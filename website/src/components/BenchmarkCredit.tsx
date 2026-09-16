import { BenchmarkResult } from "@/lib/types";

export function BenchmarkCredit({ result }: { result: BenchmarkResult }) {
  const credit = result.credit;
  const author = credit?.author;
  return (
    <div className="space-y-1 text-xs text-muted-foreground min-w-40">
      {author && <p>Benchmark by {author.anonymous ? "Anonymous contributor" : author.display_name}</p>}
      {!author?.anonymous && author?.links && (
        <p className="flex flex-wrap gap-2">
          {Object.entries(author.links).map(([kind, url]) => (
            <a key={kind} href={url} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
              {{github: "GitHub", linkedin: "LinkedIn", x: "X", website: "Website"}[kind]}
            </a>
          ))}
        </p>
      )}
      {credit && !author?.anonymous && (
        <p>Submitted by <a href={`https://github.com/${credit.submitted_by}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">@{credit.submitted_by}</a></p>
      )}
      <p className="flex flex-wrap gap-2">
        {credit && <a href={credit.source_pr} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Source PR</a>}
        {result.sourceFile && <a href={`https://github.com/LibreYOLO/vision-analysis/blob/main/submissions/${encodeURIComponent(result.sourceFile)}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Run JSON</a>}
        {!credit && !result.sourceFile && <span>Credit not recorded</span>}
      </p>
    </div>
  );
}
