import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const layout = readFileSync(join(root, "src", "app", "layout.tsx"), "utf8");

const failures = [];

if (!packageJson.dependencies?.["@vercel/analytics"]) {
  failures.push("@vercel/analytics is missing from dependencies");
}

if (!layout.includes('from "@vercel/analytics/next"')) {
  failures.push("the root layout does not import @vercel/analytics/next");
}

if (!layout.includes("<Analytics")) {
  failures.push("the root layout does not render the Analytics component");
}

if (failures.length > 0) {
  console.error("Vercel Web Analytics integration check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Vercel Web Analytics integration is present.");
