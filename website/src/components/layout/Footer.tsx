import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="font-bold">{siteConfig.name}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Independent, reproducible benchmarks for computer vision models.
            </p>
          </div>

          {/* Benchmarks */}
          <div className="space-y-3">
            <h4 className="font-semibold">Benchmarks</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  Detection Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/compare" className="hover:text-foreground transition-colors">
                  Compare Models
                </Link>
              </li>
              <li>
                <Link href="/hardware" className="hover:text-foreground transition-colors">
                  Hardware Guides
                </Link>
              </li>
              <li>
                <Link href="/cost-calculator" className="hover:text-foreground transition-colors">
                  Cost Calculator
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <h4 className="font-semibold">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/methodology" className="hover:text-foreground transition-colors">
                  Methodology
                </Link>
              </li>
              <li>
                <a
                  href={siteConfig.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Libre-YOLO/libreyolo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  LibreYOLO
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="font-semibold">About</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <span>Built by {siteConfig.creator}</span>
              </li>
              <li>
                <span>Benchmarks are Apache-2.0 licensed</span>
              </li>
              <li>
                <a
                  href={siteConfig.links.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Twitter / X
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} {siteConfig.name}. All benchmark
            data is provided as-is for informational purposes.
          </p>
        </div>
      </div>
    </footer>
  );
}
