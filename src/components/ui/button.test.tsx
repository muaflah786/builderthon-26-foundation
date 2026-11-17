// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";

afterEach(cleanup);

describe("Button", () => {
  it("defaults to type=button and forwards props", () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} className="extra" data-testid="b">
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("extra", "bg-primary");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("loading disables the button, sets aria-busy and shows a spinner", () => {
    const onClick = vi.fn();
    const { container } = render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector("svg.animate-spin")).not.toBeNull();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is not busy when not loading", () => {
    render(<Button>Go</Button>);
    const button = screen.getByRole("button", { name: "Go" });
    expect(button).not.toHaveAttribute("aria-busy");
    expect(button).toBeEnabled();
  });

  it("applies variant and size classes", () => {
    render(
      <Button variant="danger" size="lg">
        Delete
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("bg-danger", "h-12");
  });
});
