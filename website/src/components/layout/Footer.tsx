import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="bg-black">
      <div className="mx-auto max-w-[1280px] px-8 pt-12 pb-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Links Column */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white">Benchmarks</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    Detection Leaderboard
                  </Link>
                </li>
                <li>
                  <Link href="/compare" className="hover:text-white transition-colors">
                    Compare Models
                  </Link>
                </li>
                <li>
                  <Link href="/hardware" className="hover:text-white transition-colors">
                    Hardware
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <a
                    href={siteConfig.links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <Link href="/about" className="hover:text-white transition-colors">
                    Methodology
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-white transition-colors">
                    API
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white">Contact</h4>
              <div className="flex items-center gap-3 mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/photo.jpg"
                  alt="Xuban Ceccon"
                  width={44}
                  height={44}
                  className="rounded-full object-cover w-11 h-11"
                />
                <div>
                  <p className="text-slate-200 text-sm font-medium">Xuban Ceccon</p>
                  <p className="text-slate-500 text-xs">Creator & Maintainer</p>
                </div>
              </div>
              <a
                href="https://www.linkedin.com/in/xuban-ceccon"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-slate-300 text-xs font-normal transition-colors inline-flex items-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                Let's chat
              </a>
            </div>
          </div>

          {/* Brand Column */}
          <div className="flex flex-col items-start xl:items-end space-y-4">
            <div className="flex items-center space-x-2">
              <Logo size={28} />
              <span className="font-bold text-lg text-white">{siteConfig.name}</span>
            </div>
            <p className="text-sm text-slate-400 xl:text-right max-w-xs">
              Credible and deep analysis of computer vision models.
              Benchmarks powered by LibreYOLO.
            </p>
            {/* Social links */}
            <div className="flex items-center space-x-3">
              <a
                href={siteConfig.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/10 text-center text-sm text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} {siteConfig.name}. All benchmark
            data is provided as-is for informational purposes.
          </p>
        </div>
      </div>
    </footer>
  );
}
