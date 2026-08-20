"use client";

interface SellButtonProps {
  onClick: () => void;
}

export default function SellButton({ onClick }: SellButtonProps) {
  return (
    <div
      style={{
        marginTop: "8px",
        width: "100%",
      }}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          all: "revert",
          display: "block",
          width: "100%",
          boxSizing: "border-box",
          padding: "8px 12px",
          margin: 0,
          background: "linear-gradient(135deg, #FFD68A 0%, #FFC466 100%)",
          color: "#0B0E1A",
          border: "0px solid transparent",
          borderRadius: "999px",
          fontWeight: 700,
          fontSize: "10.4px",
          fontFamily: "inherit",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          textAlign: "center",
          cursor: "pointer",
          boxShadow: "0 8px 26px -8px rgba(255,196,102,0.55)",
          textDecoration: "none",
          lineHeight: 1.4,
          opacity: 1,
          visibility: "visible",
          pointerEvents: "auto",
          WebkitAppearance: "none",
          MozAppearance: "none",
          appearance: "none",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 14px 34px -10px rgba(255,196,102,0.75)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 8px 26px -8px rgba(255,196,102,0.55)";
        }}
      >
        List for Sale
      </button>
    </div>
  );
}
