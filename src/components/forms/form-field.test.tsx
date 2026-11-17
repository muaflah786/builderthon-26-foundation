// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";

afterEach(cleanup);

describe("FormField", () => {
  it("links the label to the control and sets the name", () => {
    render(
      <FormField label="Title" name="title">
        <Input />
      </FormField>,
    );
    const input = screen.getByLabelText("Title");
    expect(input).toHaveAttribute("name", "title");
    expect(input.id).toBeTruthy();
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("wires hint and error ids into aria-describedby and marks the control invalid", () => {
    render(
      <FormField label="Email" name="email" hint="Work email" error={["Required", "Must be valid"]}>
        <Input />
      </FormField>,
    );
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");

    const hint = screen.getByText("Work email");
    const error = screen.getByText("Required Must be valid");
    expect(hint.id).toBe(`${input.id}-hint`);
    expect(error.id).toBe(`${input.id}-error`);
    expect(input.getAttribute("aria-describedby")?.split(" ")).toEqual([hint.id, error.id]);
    expect(input).toHaveAccessibleDescription("Work email Required Must be valid");
  });

  it("treats an empty error array as no error and respects an explicit id", () => {
    render(
      <FormField label="Name" name="name" id="custom" error={[]}>
        <Input />
      </FormField>,
    );
    const input = screen.getByLabelText("Name");
    expect(input.id).toBe("custom");
    expect(input).not.toHaveAttribute("aria-invalid");
  });
});
