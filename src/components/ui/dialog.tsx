"use client";

import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DialogProps = Omit<ComponentProps<"dialog">, "open" | "title" | "onClose"> & {
  /** Controlled open state. */
  open: boolean;
  /** Called when the dialog asks to close (Esc, backdrop click, close button). */
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** Buttons row rendered at the bottom (e.g. Cancel / Confirm). */
  footer?: ReactNode;
};

/**
 * Modal dialog on the native `<dialog>` element (`showModal()`), so focus trapping,
 * `inert` background and Esc-to-close come from the browser. Focus returns to the
 * element that was focused before opening.
 *
 *   const [open, setOpen] = useState(false);
 *   <Button onClick={() => setOpen(true)}>Delete</Button>
 *   <Dialog open={open} onClose={() => setOpen(false)} title="Delete item?" footer={...} />
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  className,
  children,
  ...props
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocusTo.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Fires whenever the dialog closes (prop change, Esc, form method="dialog"):
  // restore focus and let the parent sync its state.
  const handleClose = () => {
    returnFocusTo.current?.focus();
    returnFocusTo.current = null;
    onClose();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        "border-border bg-background text-foreground m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg border p-0 shadow-lg",
        className,
      )}
      onClose={handleClose}
      onClick={(event) => {
        // A click on the backdrop targets the <dialog> element itself.
        if (event.target === event.currentTarget) onClose();
      }}
      {...props}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="text-muted-foreground text-sm">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:bg-muted hover:text-foreground -m-1 rounded-md p-1"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        {children ? <div className="text-sm">{children}</div> : null}
        {footer ? <div className="flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </dialog>
  );
}
