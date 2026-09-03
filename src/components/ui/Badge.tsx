import { cn } from "@/lib/cn";
import type { DeliveryStatus, OrderStatus, PickupStatus, CampaignStatus } from "@/lib/types";

const tone = {
  neutral: "border-navy-200 bg-navy-50 text-navy-500",
  positive: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-red-200 bg-red-50 text-red-800",
  dark: "border-navy-900 bg-navy-900 text-white",
} as const;

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-sm border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em]",
        tone[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, [string, keyof typeof tone]> = {
    PENDING: ["Ikke betalt", "warning"],
    PAID: ["Betalt", "positive"],
    CANCELLED: ["Avbrutt", "critical"],
    REFUNDED: ["Refundert", "neutral"],
  };
  const [text, variant] = map[status];
  return <Badge variant={variant}>{text}</Badge>;
}

export function PickupStatusBadge({ status }: { status: PickupStatus }) {
  const map: Record<PickupStatus, [string, keyof typeof tone]> = {
    NOT_READY: ["Ikke klar", "neutral"],
    READY: ["Klar til henting", "warning"],
    PICKED_UP: ["Hentet", "positive"],
  };
  const [text, variant] = map[status];
  return <Badge variant={variant}>{text}</Badge>;
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return status === "DELIVERED" ? <Badge variant="positive">Levert</Badge> : <Badge variant="neutral">Ikke levert</Badge>;
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const map: Record<CampaignStatus, [string, keyof typeof tone]> = {
    DRAFT: ["Utkast", "neutral"],
    ACTIVE: ["Aktiv", "dark"],
    CLOSED: ["Stengt", "warning"],
    PICKUP: ["Utlevering", "warning"],
    COMPLETED: ["Fullført", "positive"],
  };
  const [text, variant] = map[status];
  return <Badge variant={variant}>{text}</Badge>;
}
