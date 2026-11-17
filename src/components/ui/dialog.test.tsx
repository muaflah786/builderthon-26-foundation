// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

// jsdom does not implement showModal()/close(); emulate the parts the component relies on.
beforeAll(() => {
  const proto = HTMLDialogElement.prototype;
  proto.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  proto.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

afterEach(cleanup);

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Confirm"
        description="Are you sure?"
      >
        <Button onClick={() => setOpen(false)}>Done</Button>
      </Dialog>
    </>
  );
}

const dialog = () => document.querySelector("dialog")!;

describe("Dialog", () => {
  it("opens with showModal and is labelled by its title and description", () => {
    render(<Harness />);
    expect(dialog().open).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(dialog().open).toBe(true);
    expect(screen.getByRole("dialog", { name: "Confirm" })).toHaveAccessibleDescription(
      "Are you sure?",
    );
  });

  it("closes from the close button and returns focus to the trigger", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open" });
    trigger.focus();
    fireEvent.click(trigger);
    screen.getByRole("button", { name: "Done" }).focus();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(dialog().open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("syncs parent state when the browser closes it (Esc)", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    // Esc on a modal dialog makes the browser call close(), which fires "close".
    act(() => dialog().close());
    expect(dialog().open).toBe(false);
    // Parent state is now closed, so it can be reopened.
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(dialog().open).toBe(true);
  });

  it("closes on a backdrop click", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(dialog());
    expect(dialog().open).toBe(false);
  });
});
