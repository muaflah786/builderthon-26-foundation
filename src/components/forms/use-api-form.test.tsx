// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiClientError } from "@/lib/api/client";
import { FormError } from "@/components/forms/form-error";
import { FormField } from "@/components/forms/form-field";
import { formToObject, useApiForm } from "@/components/forms/use-api-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

afterEach(cleanup);

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  agree: z.boolean(),
});
type Values = z.output<typeof schema>;

function TestForm({
  submit,
  onSuccess,
}: {
  submit: (values: Values) => Promise<{ id: string }>;
  onSuccess?: (result: { id: string }) => void;
}) {
  const form = useApiForm({ schema, submit, onSuccess });
  return (
    <form onSubmit={form.onSubmit} noValidate>
      <FormError message={form.formError} />
      <FormField label="Title" name="title" error={form.fieldErrors.title}>
        <Input />
      </FormField>
      <input type="checkbox" name="agree" aria-label="Agree" />
      <Button type="submit" loading={form.pending}>
        Save
      </Button>
    </form>
  );
}

describe("useApiForm", () => {
  it("shows client validation errors and does not call submit", async () => {
    const submit = vi.fn();
    render(<TestForm submit={submit} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveAttribute("aria-invalid", "true");
    expect(submit).not.toHaveBeenCalled();
  });

  it("maps ApiClientError fieldErrors and message from the server", async () => {
    const submit = vi.fn().mockRejectedValue(
      new ApiClientError("VALIDATION_ERROR", "Validation failed", 422, {
        title: ["Already taken"],
      }),
    );
    render(<TestForm submit={submit} />);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Already taken")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Validation failed");
    expect(screen.getByLabelText("Title")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("success path: submits parsed values, shows pending, then calls onSuccess", async () => {
    let resolve!: (value: { id: string }) => void;
    const submit = vi.fn(() => new Promise<{ id: string }>((r) => (resolve = r)));
    const onSuccess = vi.fn();
    render(<TestForm submit={submit} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Hello" } });
    fireEvent.click(screen.getByLabelText("Agree"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeDisabled());
    expect(submit).toHaveBeenCalledWith({ title: "Hello", agree: true });

    resolve({ id: "1" });
    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith({ id: "1" }, expect.any(HTMLFormElement)),
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a generic message for unexpected errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const submit = vi.fn().mockRejectedValue(new Error("boom"));
    render(<TestForm submit={submit} />);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    consoleError.mockRestore();
  });
});

describe("formToObject", () => {
  it("handles checkboxes, checkbox groups, empty strings and multi-selects", () => {
    const { container } = render(
      <form>
        <input name="text" defaultValue="" />
        <input type="checkbox" name="single" />
        <input type="checkbox" name="group" value="a" defaultChecked />
        <input type="checkbox" name="group" value="b" />
        <input type="checkbox" name="group" value="c" defaultChecked />
        <input type="checkbox" name="none" value="x" />
        <input type="checkbox" name="none" value="y" />
        <select name="multi" multiple defaultValue={["2"]}>
          <option value="1">1</option>
          <option value="2">2</option>
        </select>
        <input type="file" name="upload" />
      </form>,
    );
    const form = container.querySelector("form")!;
    expect(formToObject(form)).toEqual({
      text: "",
      single: false,
      group: ["a", "c"],
      none: [],
      multi: ["2"],
    });
  });
});
