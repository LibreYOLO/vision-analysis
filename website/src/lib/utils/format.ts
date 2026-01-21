// Format a number with specified decimal places
export function formatNumber(value: number, decimals: number = 1): string {
  return value.toFixed(decimals);
}

// Format a percentage (0-100 scale)
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Format milliseconds
export function formatMs(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}ms`;
}

// Format FPS
export function formatFps(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)} FPS`;
}

// Format parameters (millions)
export function formatParams(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}M`;
}

// Format FLOPs (GFLOPs)
export function formatFlops(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}G`;
}

// Format memory (MB)
export function formatMemory(value: number): string {
  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)}GB`;
  }
  return `${Math.round(value)}MB`;
}

// Format cost per hour
export function formatCostPerHour(value: number): string {
  return `$${value.toFixed(2)}/hr`;
}

// Format model name for display
export function formatModelName(model: string): string {
  return model
    .replace(/-/g, " ")
    .replace(/yolo/gi, "YOLO")
    .replace(/rtdetr/gi, "RT-DETR")
    .replace(/nas/gi, "NAS");
}

// Get relative time string
export function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
