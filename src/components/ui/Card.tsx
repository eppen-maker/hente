import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("card", className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-navy-100 px-5 py-4">
      <div>
        <h2 className="text-base font-semibold text-navy-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-navy-400">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("card px-5 py-4", className)}>
      <p className="label">{label}</p>
      <p className="display tabular mt-2 text-2xl text-navy-900">{value}</p>
      {hint ? <p className="mt-1 text-sm text-navy-400">{hint}</p> : null}
    </div>
  );
}
