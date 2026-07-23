"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/topup", label: "Top Up" },
  { href: "/koleksi", label: "Koleksi" },
  { href: "/scan", label: "Scan" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/profil", label: "Profil" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  return (
    <nav style={{ background: "var(--deep-navy)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold" style={{ color: "var(--cosmic-violet)" }}>
              GACHARD
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-md text-sm font-medium uppercase tracking-wide"
                style={{
                  color: pathname === item.href ? "var(--cosmic-violet)" : "var(--silver-mist)",
                  background: pathname === item.href ? "rgba(184,172,255,0.1)" : "transparent",
                }}
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <span className="text-sm" style={{ color: "var(--silver-mist)" }}>@{user.username}</span>
            ) : (
              <Link
                href="/login"
                className="btn-cta px-4 py-2 text-sm"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
