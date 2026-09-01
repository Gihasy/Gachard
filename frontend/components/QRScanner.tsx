"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScan: (tokenId: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      try {
        // Check camera API exists
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError("Camera is not supported in this browser. Try using manual input instead.");
          return;
        }

        // Explicitly request camera permission first — triggers browser prompt
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
        } catch (permErr) {
          const msg = permErr instanceof Error ? permErr.name : String(permErr);
          if (msg === "NotAllowedError" || msg === "PermissionDeniedError") {
            setError("Camera permission denied. Please allow camera access in your browser settings and reload.");
          } else if (msg === "NotFoundError") {
            setError("No camera found on this device.");
          } else if (msg === "NotReadableError") {
            setError("Camera is in use by another app.");
          } else {
            setError(`Camera error: ${msg}`);
          }
          return;
        }

        // Stop the stream immediately — html5-qrcode will manage its own stream
        stream.getTracks().forEach((t) => t.stop());

        // Dynamic import to avoid SSR issues
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        // Calculate responsive qrbox size
        const minDim = Math.min(window.innerWidth - 80, 320);
        const boxSize = Math.max(200, minDim);

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: boxSize, height: boxSize },
            aspectRatio: 1.0,
            disableFlip: false,
          },
          (decodedText) => {
            if (!mounted) return;
            setDetected(true);
            // Extract cardId/claimId from URL or use raw text
            let scannedId = decodedText;
            try {
              const url = new URL(decodedText);
              const cardId = url.searchParams.get("cardId");
              const claimId = url.searchParams.get("claimId");
              const tokenId = url.searchParams.get("tokenId");
              if (cardId) scannedId = cardId;
              else if (claimId) scannedId = claimId;
              else if (tokenId) scannedId = tokenId;
            } catch {
              // Not a URL, use as-is
            }
            // Small delay for visual feedback before closing
            setTimeout(() => {
              scanner.stop().catch(() => {});
              onScanRef.current(scannedId);
            }, 300);
          },
          () => {
            // QR code not found in frame — ignore
          }
        );

        if (mounted) setScanning(true);
      } catch (err) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[QRScanner] Error:", msg, err);
          if (msg.includes("NotAllowed") || msg.includes("Permission")) {
            setError("Camera permission denied. Please allow camera access in browser settings.");
          } else if (msg.includes("NotFoundError") || msg.includes("No camera")) {
            setError("No camera found on this device.");
          } else {
            setError(`Camera error: ${msg}`);
          }
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
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)" }}
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: "rgba(15,19,36,0.98)",
          border: `1px solid ${detected ? "rgba(0,255,136,0.5)" : "rgba(184,172,255,0.2)"}`,
          transition: "border-color 300ms ease",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <p
              className="text-[0.72rem] uppercase tracking-[0.22em]"
              style={{ color: detected ? "#00ff88" : "var(--cosmic-violet)" }}
            >
              {detected ? "QR Detected!" : "Scan QR Code"}
            </p>
            <p className="text-sm text-white/60 mt-1">
              {detected ? "Processing…" : "Point your camera at the QR code"}
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scanner */}
        <div className="relative p-5">
          <div
            id="qr-reader"
            className="rounded-2xl overflow-hidden"
            style={{
              border: `2px solid ${detected ? "rgba(0,255,136,0.6)" : "rgba(184,172,255,0.3)"}`,
              minHeight: "280px",
              transition: "border-color 300ms ease",
            }}
          />

          {/* Scan frame overlay with corner markers */}
          {scanning && !detected && (
            <div className="absolute inset-5 pointer-events-none flex items-center justify-center">
              <div className="relative" style={{ width: "75%", aspectRatio: "1/1" }}>
                {/* Corner markers */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" fill="none">
                  {/* Top-left */}
                  <path d="M2 20 L2 2 L20 2" stroke="var(--cosmic-violet)" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Top-right */}
                  <path d="M80 2 L98 2 L98 20" stroke="var(--cosmic-violet)" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Bottom-left */}
                  <path d="M2 80 L2 98 L20 98" stroke="var(--cosmic-violet)" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Bottom-right */}
                  <path d="M80 98 L98 98 L98 80" stroke="var(--cosmic-violet)" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                {/* Scanning line animation */}
                <div
                  className="absolute left-[10%] right-[10%] h-0.5 rounded-full"
                  style={{
                    background: "linear-gradient(90deg, transparent, var(--cosmic-violet), transparent)",
                    animation: "scanLine 2.5s ease-in-out infinite",
                    boxShadow: "0 0 12px rgba(138,92,255,0.5)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Success overlay */}
          {detected && (
            <div className="absolute inset-5 flex items-center justify-center rounded-2xl" style={{ background: "rgba(0,255,136,0.08)" }}>
              <div className="text-center">
                <div
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3"
                  style={{ background: "rgba(0,255,136,0.15)", border: "2px solid rgba(0,255,136,0.5)" }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l4 4 10-10" />
                  </svg>
                </div>
                <p className="text-sm font-medium" style={{ color: "#00ff88" }}>QR Code Scanned</p>
              </div>
            </div>
          )}

          {!scanning && !error && !detected && (
            <div className="absolute inset-5 flex items-center justify-center rounded-2xl bg-black/50">
              <div className="text-center">
                <div
                  className="w-10 h-10 mx-auto rounded-full border-2 border-t-transparent animate-spin mb-3"
                  style={{ borderColor: "var(--cosmic-violet)", borderTopColor: "transparent" }}
                />
                <p className="text-xs text-white/60 uppercase tracking-widest">Starting camera…</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 rounded-xl text-center" style={{
              background: "rgba(255,107,186,0.1)",
              border: "1px solid rgba(255,107,186,0.3)",
            }}>
              <p className="text-sm" style={{ color: "var(--aurora-pink)" }}>{error}</p>
              <p className="text-xs text-white/50 mt-2">Try using the manual input instead.</p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 pb-5">
          <p className="text-xs text-white/40 text-center">
            {scanning ? "Align the QR code within the frame" : "Hold steady — the scan happens automatically."}
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes scanLine {
          0%, 100% { top: 10%; }
          50% { top: 85%; }
        }
      `}</style>
    </div>,
    document.body
  );
}
