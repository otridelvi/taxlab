"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        minHeight: 42,
        padding: "0 18px",
        font: "inherit",
        fontWeight: 600,
        fontSize: 14,
        color: "#fff",
        background: "var(--color-accent)",
        border: 0,
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
      }}
    >
      Cetak
    </button>
  );
}
