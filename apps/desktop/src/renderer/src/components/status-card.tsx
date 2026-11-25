import type { JSX } from "react";

interface StatusCardProps {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "error";
}

export const StatusCard = ({
  label,
  value,
  hint,
  tone = "default",
}: StatusCardProps): JSX.Element => (
  <div className="rounded-2xl border border-surface-800 bg-surface-950/60 p-4">
    <p className="text-xs tracking-wide text-surface-500 uppercase">{label}</p>
    <p
      className={
        tone === "error"
          ? "mt-2 font-mono text-sm text-red-400"
          : "mt-2 font-mono text-sm text-brand-300"
      }
    >
      {value}
    </p>
    <p className="mt-1 text-xs text-surface-500">{hint}</p>
  </div>
);
