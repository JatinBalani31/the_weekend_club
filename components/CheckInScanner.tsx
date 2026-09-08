"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, AlertTriangle, Search } from "lucide-react";

type CheckInResult = {
  type: "success" | "duplicate" | "error";
  name?: string;
  code?: string;
  event?: { title: string } | null;
  message: string;
  checkedInAt?: string;
};

export default function CheckInScanner() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [history, setHistory] = useState<CheckInResult[]>([]);
  const autoCheckedRef = useRef(false);
  const pendingCodeRef = useRef<string | null>(null);

  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode && !autoCheckedRef.current) {
      autoCheckedRef.current = true;
      const normalized = urlCode.trim().toUpperCase();
      setCode(normalized);
      pendingCodeRef.current = normalized;
    }
  }, [searchParams]);

  useEffect(() => {
    if (pendingCodeRef.current && !loading) {
      pendingCodeRef.current = null;
      handleCheckIn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function handleCheckIn() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);

    const response = await fetch("/api/admin/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: trimmed }),
    });
    const data = await response.json();
    setLoading(false);

    let entry: CheckInResult;
    if (response.ok) {
      entry = { type: "success", name: data.name, code: data.code, event: data.event, message: "Checked in", checkedInAt: data.checkedInAt };
    } else if (response.status === 409) {
      entry = { type: "duplicate", name: data.name, message: `Already checked in at ${new Date(data.checkedInAt).toLocaleTimeString("en-IN")}` };
    } else {
      entry = { type: "error", name: data.name, message: data.error ?? "Check-in failed" };
    }

    setResult(entry);
    setHistory((prev) => [entry, ...prev].slice(0, 50));
    setCode("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleCheckIn();
  }

  return (
    <div className="mt-8">
      <div className="flex gap-3">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          placeholder="TWC-001"
          autoFocus
          className="min-h-14 flex-1 border-2 border-border bg-surface px-4 font-mono text-lg uppercase tracking-widest focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          data-checkin
          onClick={handleCheckIn}
          disabled={loading || !code.trim()}
          className="flex min-h-14 w-14 items-center justify-center bg-accent text-bg disabled:opacity-50"
        >
          <Search size={22} />
        </button>
      </div>

      {result && (
        <div className={`mt-6 rounded-xl border-2 p-5 ${
          result.type === "success" ? "border-success bg-success/10" :
          result.type === "duplicate" ? "border-yellow-500 bg-yellow-500/10" :
          "border-error bg-error/10"
        }`}>
          <div className="flex items-start gap-3">
            {result.type === "success" && <CheckCircle2 size={28} className="mt-0.5 shrink-0 text-success" />}
            {result.type === "duplicate" && <AlertTriangle size={28} className="mt-0.5 shrink-0 text-yellow-500" />}
            {result.type === "error" && <XCircle size={28} className="mt-0.5 shrink-0 text-error" />}
            <div>
              {result.name && <p className="text-xl font-bold">{result.name}</p>}
              <p className="mt-1 text-sm font-semibold uppercase tracking-wider">
                {result.message}
              </p>
              {result.event && <p className="mt-1 text-sm text-text-muted">{result.event.title}</p>}
            </div>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Recent check-ins</p>
          <div className="mt-3 space-y-2">
            {history.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-border py-3 text-sm">
                {entry.type === "success" && <CheckCircle2 size={16} className="shrink-0 text-success" />}
                {entry.type === "duplicate" && <AlertTriangle size={16} className="shrink-0 text-yellow-500" />}
                {entry.type === "error" && <XCircle size={16} className="shrink-0 text-error" />}
                <span className="font-semibold">{entry.name ?? entry.code ?? "—"}</span>
                <span className="ml-auto text-text-muted">{entry.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
