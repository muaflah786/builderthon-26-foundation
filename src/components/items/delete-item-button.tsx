// REFERENCE SLICE: copy & rename (see docs/COMPETITION_ADAPTATION_GUIDE.md)
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";

/** Delete with a confirmation dialog, then back to the list with a toast. */
export function DeleteItemButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    try {
      await apiFetch<void>(`/api/items/${id}`, { method: "DELETE" });
      toast({ title: "Item deleted", variant: "success" });
      router.push("/app/items");
      router.refresh();
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : "Could not delete item";
      toast({ title: message, variant: "danger" });
      setPending(false);
      setOpen(false);
    }
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Delete this item?"
        description={`"${title}" will be permanently deleted.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirm} loading={pending}>
              Delete item
            </Button>
          </>
        }
      />
    </>
  );
}
