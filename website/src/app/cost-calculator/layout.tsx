import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cost Calculator",
  description:
    "Estimate cloud GPU costs for your object detection workload. Compare pricing across A100, T4, and CPU options.",
};

export default function CostCalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
