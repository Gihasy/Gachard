"use client";

import Image from "next/image";

/** Single source of truth for the Gachard brand mark. */
const MARK_SRC = "/icons/gachard-logo.png";

interface LogoProps {
  /** Approximate rendered height in px. */
  size?: number;
  /** Extra class on the outer wrapper. */
  className?: string;
  /** Priority hint for Next/Image (above-the-fold). */
  priority?: boolean;
}

export default function Logo({
  size = 40,
  className = "",
  priority = false,
}: LogoProps) {
  return (
    <span
      className={`relative shrink-0 inline-flex items-center justify-center ${className}`}
      style={{ height: size, width: size * 2.4 }}
    >
      <Image
        src={MARK_SRC}
        alt="Gachard"
        fill
        className="object-contain"
        sizes={`${Math.round(size * 2.4)}px`}
        priority={priority}
      />
    </span>
  );
}
