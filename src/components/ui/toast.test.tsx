// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "@/components/ui/toast";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function Trigger() {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast({ title: "Saved", duration: 1000 })}>
      Notify
    </button>
  );
}

describe("Toast", () => {
  it("announces in a polite live region and auto-dismisses", () => {
    vi.useFakeTimers();
    const { container } = render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    const region = container.querySelector('[aria-live="polite"]')!;
    expect(region).toHaveTextContent("Saved");

    act(() => vi.advanceTimersByTime(1000));
    expect(region).not.toHaveTextContent("Saved");
  });

  it("can be dismissed manually", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(screen.queryByText("Saved")).toBeNull();
  });

  it("throws outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});
