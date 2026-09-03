import { cn } from "@/lib/cn";
import { progressPercent } from "@/lib/finance";

export function Progress({
  current,
  target,
  className,
  showLabel = true,
}: {
  current: number;
  target: number;
  className?: string;
  showLabel?: boolean;
}) {
  const percent = progressPercent(current, target);
  const reached = target > 0 && current >= target;

  return (
    <div className={className}>
      {showLabel ? (
        <div className="mb-2 flex items-baseline justify-between text-sm">
          <span className="tabular font-medium text-navy-900">
            {current} / {target || "—"} solgt
          </span>
          <span className="tabular text-navy-400">{percent}%</span>
        </div>
      ) : null}
      <div className="h-1.5 w-full overflow-hidden rounded-sm bg-navy-100">
        <div
          className={cn("h-full transition-all", reached ? "bg-emerald-600" : "bg-navy-900")}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
