"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/packs", label: "Packs" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/datacards", label: "Datacards" },
  { href: "/scan", label: "Scan" },
  { href: "/profile", label: "Profile" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ username?: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Mount-only: read the persisted user + attach the scroll listener.
  // State setters from useState are guaranteed stable by React and don't need
  // to be in the deps array; `localStorage` and `window` are globals.
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));

    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className="sticky top-0 z-50 w-full"
      data-testid="site-navbar"
      style={{
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        background: scrolled
          ? "rgba(11, 14, 26, 0.72)"
          : "rgba(11, 14, 26, 0.35)",
        borderBottom: scrolled
          ? "1px solid rgba(230,232,240,0.08)"
          : "1px solid transparent",
        transition: "background 220ms ease, border-color 220ms ease",
      }}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between h-[76px]">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 group"
            data-testid="nav-logo-link"
          >
            <Logo size={48} showWordmark priority className="drop-shadow-[0_0_18px_rgba(184,172,255,0.5)]" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className="relative px-4 py-2 text-[0.78rem] font-medium uppercase tracking-[0.14em] transition-colors"
                  style={{
                    color: active ? "#FFFFFF" : "rgba(230,232,240,0.72)",
                  }}
                >
                  <span className="relative z-10">{item.label}</span>
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-x-3 -bottom-[22px] h-[2px] rounded-full"
                      style={{
                        background:
                          "linear-gradient(90deg, var(--cosmic-violet), var(--aurora-pink), var(--electric-blue))",
                        boxShadow: "0 0 12px rgba(184,172,255,0.6)",
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <div
                className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
                data-testid="nav-user-chip"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: "var(--aurora-gold)",
                    boxShadow: "0 0 8px var(--aurora-gold)",
                  }}
                />
                <span className="text-xs font-medium text-white/85">
                  @{user.username}
                </span>
              </div>
            ) : (
              <Link
                href="/login"
                className="btn-primary hidden sm:inline-flex"
                data-testid="nav-login-btn"
              >
                Login
              </Link>
            )}

            <button
              className="lg:hidden relative w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              data-testid="nav-mobile-toggle"
            >
              <span className="sr-only">Menu</span>
              <div className="flex flex-col gap-[5px]">
                <span
                  className="block h-[1.5px] w-4 bg-white transition-transform"
                  style={{
                    transform: open
                      ? "rotate(45deg) translate(2px, 4px)"
                      : "none",
                  }}
                />
                <span
                  className="block h-[1.5px] w-4 bg-white transition-opacity"
                  style={{ opacity: open ? 0 : 1 }}
                />
                <span
                  className="block h-[1.5px] w-4 bg-white transition-transform"
                  style={{
                    transform: open
                      ? "rotate(-45deg) translate(2px, -4px)"
                      : "none",
                  }}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className="lg:hidden overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{ maxHeight: open ? "520px" : "0px" }}
        data-testid="nav-mobile-menu"
      >
        <div
          className="mx-5 mb-4 rounded-2xl p-4"
          style={{
            background: "rgba(15, 19, 36, 0.85)",
            border: "1px solid rgba(230,232,240,0.08)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="flex flex-col">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className="flex items-center justify-between py-3 px-3 rounded-xl text-sm font-medium uppercase tracking-[0.14em] transition-colors"
                  style={{
                    color: active ? "#FFFFFF" : "rgba(230,232,240,0.72)",
                    background: active
                      ? "rgba(184,172,255,0.1)"
                      : "transparent",
                  }}
                >
                  <span>{item.label}</span>
                  <span
                    aria-hidden
                    style={{ color: "rgba(184,172,255,0.7)" }}
                  >
                    →
                  </span>
                </Link>
              );
            })}
            <div className="mt-3 pt-3 border-t border-white/10">
              {user ? (
                <div className="text-sm text-white/70 px-3 py-2">
                  Signed in as{" "}
                  <span className="text-white font-semibold">
                    @{user.username}
                  </span>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="btn-primary w-full"
                  data-testid="mobile-nav-login-btn"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
