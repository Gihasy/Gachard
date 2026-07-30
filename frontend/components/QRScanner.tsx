"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScan: (tokenId: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!mounted) return;
            // Extract tokenId from URL or use raw text
            let tokenId = decodedText;
            try {
              const url = new URL(decodedText);
              const params = url.searchParams.get("tokenId");
              if (params) tokenId = params;
            } catch {
              // Not a URL, use as-is
            }
            scanner.stop().catch(() => {});
            onScan(tokenId);
          },
          () => {
            // QR code not found in frame — ignore
          }
        );

        if (mounted) setScanning(true);
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not access camera. Please allow camera permission."
          );
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.getState() === 2 &&
          scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: "rgba(15,19,36,0.95)",
          border: "1px solid rgba(184,172,255,0.2)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <p
              className="text-[0.72rem] uppercase tracking-[0.22em]"
              style={{ color: "var(--cosmic-violet)" }}
            >
              Scan QR Code
            </p>
            <p className="text-sm text-white/60 mt-1">
              Point your camera at the card's QR code
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scanner */}
        <div className="relative p-5">
          <div
            id="qr-reader"
            ref={containerRef}
            className="rounded-2xl overflow-hidden"
            style={{
              border: "2px solid rgba(184,172,255,0.3)",
              minHeight: "280px",
            }}
          />

          {!scanning && !error && (
            <div className="absolute inset-5 flex items-center justify-center rounded-2xl bg-black/50">
              <div className="text-center">
                <div
                  className="w-10 h-10 mx-auto rounded-full border-2 border-t-transparent animate-spin mb-3"
                  style={{
                    borderColor: "var(--cosmic-violet)",
                    borderTopColor: "transparent",
                  }}
                />
                <p className="text-xs text-white/60 uppercase tracking-widest">
                  Starting camera...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 rounded-xl text-center" style={{
              background: "rgba(255,107,186,0.1)",
              border: "1px solid rgba(255,107,186,0.3)",
            }}>
              <p className="text-sm" style={{ color: "var(--aurora-pink)" }}>
                {error}
              </p>
              <p className="text-xs text-white/50 mt-2">
                Try using the manual input instead.
              </p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 pb-5">
          <p className="text-xs text-white/40 text-center">
            Hold steady — the scan happens automatically.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
