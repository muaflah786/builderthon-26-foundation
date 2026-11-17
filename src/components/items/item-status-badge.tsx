// REFERENCE SLICE: copy & rename (see docs/COMPETITION_ADAPTATION_GUIDE.md)
import { Badge } from "@/components/ui/badge";
import { ITEM_STATUS_LABELS, type ItemStatus } from "@/lib/validation/items";

const variants = { open: "primary", in_progress: "warning", done: "success" } as const;

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  return <Badge variant={variants[status]}>{ITEM_STATUS_LABELS[status]}</Badge>;
}
