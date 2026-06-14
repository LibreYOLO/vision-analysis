import { BenchmarkResult } from "@/lib/types";
import { ChartXAxis, summarizeChart } from "@/lib/llm/chartExport";

interface ChartDataTableProps {
  data: BenchmarkResult[];
  xAxis: ChartXAxis;
  title: string;
  hardwareLabel?: string;
  runtimeLabel?: string;
}

/**
 * A text/table representation of the chart's data, rendered in the DOM (and so
 * in the server HTML) but visually hidden. The Observable Plot chart is an SVG
 * built client-side in a useEffect, which non-JS crawlers and screen readers
 * cannot read — this table is the machine-readable equivalent. NOT a client
 * component, so it server-renders into the initial HTML.
 */
export function ChartDataTable({
  data,
  xAxis,
  title,
  hardwareLabel,
  runtimeLabel,
}: ChartDataTableProps) {
  if (data.length === 0) return null;
  const rows = [...data].sort((a, b) => b.mAP_50_95 - a.mAP_50_95);
  const isLatency = xAxis === "latencyMs";
  const summary = summarizeChart(data, { title, xAxis, hardwareLabel, runtimeLabel });

  return (
    <table className="sr-only" aria-label={`${title} — data table`}>
      <caption>{summary}</caption>
      <thead>
        <tr>
          <th scope="col">Model</th>
          <th scope="col">Family</th>
          <th scope="col">mAP@50-95 (%)</th>
          {isLatency ? (
            <>
              <th scope="col">Latency (ms)</th>
              <th scope="col">FPS</th>
              <th scope="col">Params (M)</th>
            </>
          ) : (
            <>
              <th scope="col">Params (M)</th>
              <th scope="col">GFLOPs</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((d) => (
          <tr key={d.model}>
            <th scope="row">{d.model}</th>
            <td>{d.family}</td>
            <td>{d.mAP_50_95.toFixed(1)}</td>
            {isLatency ? (
              <>
                <td>{d.totalMs.toFixed(1)}</td>
                <td>{d.throughputFps.toFixed(1)}</td>
                <td>{d.paramsM.toFixed(1)}</td>
              </>
            ) : (
              <>
                <td>{d.paramsM.toFixed(1)}</td>
                <td>{d.flopsG.toFixed(1)}</td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
