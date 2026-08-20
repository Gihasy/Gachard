"use client";

import Link from "next/link";
import Logo from "@/components/Logo";

const productLinks = [
  { label: "Collect", href: "/collect" },
  { label: "Play", href: "/play" },
  { label: "Trade", href: "/trade" },
  { label: "Scan", href: "/scan" },
  { label: "Redeem", href: "/profile" },
];

export default function Footer() {
  return (
    <footer
      className="relative mt-24"
      data-testid="site-footer"
      style={{
        borderTop: "1px solid rgba(230,232,240,0.08)",
        background:
          "linear-gradient(180deg, rgba(11,14,26,0) 0%, rgba(11,14,26,0.9) 40%, rgba(11,14,26,1) 100%)",
      }}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 pt-16 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-3 mb-5">
              <Logo size={56} showWordmark />
            </Link>
            <p className="text-sm text-white/60 max-w-[280px] leading-relaxed">
              Collect. Play. Trade. A next-generation collectible card ecosystem
              connecting the physical and digital worlds.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4
              className="text-[0.72rem] uppercase tracking-[0.2em] mb-4"
              style={{ color: "var(--cosmic-violet)" }}
            >
              Product
            </h4>
            <ul className="space-y-2.5">
              {productLinks.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="hr-glow my-10" />

        <div className="flex items-center justify-between">
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} Gachard. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
