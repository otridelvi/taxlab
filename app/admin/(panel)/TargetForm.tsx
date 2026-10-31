"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ui from "@/components/admin/ui.module.css";

/** Target of completed participants per cell (1–500). Admin only. */
export function TargetForm({ current }: { current: number }) {
  const router = useRouter();
  const [value, setValue] = useState(String(current));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPerCell: Number(value) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setMessage({ ok: false, text: body?.error?.message ?? "Terjadi kesalahan. Coba lagi." });
        return;
      }
      setMessage({ ok: true, text: "Target disimpan." });
      router.refresh();
    } catch {
      setMessage({ ok: false, text: "Gagal menghubungi server. Coba lagi." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className={ui.filters} aria-label="Target per sel">
      <div className={ui.field}>
        <label htmlFor="target">Target selesai per sel</label>
        <input
          id="target"
          type="number"
          min={1}
          max={500}
          step={1}
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ width: 120 }}
        />
      </div>
      <button type="submit" className={ui.buttonSecondary} disabled={pending || Number(value) === current}>
        {pending ? "Menyimpan…" : "Simpan target"}
      </button>
      {message ? (
        <p className={message.ok ? ui.muted : ui.error} role={message.ok ? "status" : "alert"} style={{ margin: 0, alignSelf: "center" }}>
          {message.text}
        </p>
      ) : null}
    </form>
  );
}
