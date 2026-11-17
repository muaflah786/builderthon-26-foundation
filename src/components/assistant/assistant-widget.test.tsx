// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AssistantClientConfig, ChatStreamEvent } from "@/lib/assistant/types";

const nav = vi.hoisted(() => ({ pathname: "/demo" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

import { AssistantWidget } from "@/components/assistant/assistant-widget";

const config: AssistantClientConfig = {
  siteId: "malabar-spice",
  assistantName: "Mira",
  welcomeMessage: "Hi, I'm Mira.",
  suggestedQuestions: ["What is your return policy?"],
};

/** NDJSON streaming response; `gate` lets a test hold the stream open. */
function ndjson(events: ChatStreamEvent[], gate?: Promise<void>) {
  const enc = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(controller) {
        for (const [i, e] of events.entries()) {
          if (gate && i === 1) await gate;
          controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
        }
        controller.close();
      },
    }),
    { headers: { "content-type": "application/x-ndjson" } },
  );
}
const meta: ChatStreamEvent = {
  type: "meta",
  provider: "ollama",
  model: "m",
  sources: [
    {
      id: "shipping-returns#returns",
      title: "Shipping & returns: Returns",
      url: "/demo/shipping-returns#returns",
    },
  ],
};

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  sessionStorage.clear();
  nav.pathname = "/demo";
  document.title = "Home · Shop";
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  Element.prototype.scrollTo = () => {};
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const open = () => fireEvent.click(screen.getByRole("button", { name: "Chat with Mira" }));
const input = () => screen.getByLabelText("Message Mira");
const sentBody = (i = 0) => JSON.parse(fetchMock.mock.calls[i][1].body);

describe("AssistantWidget", () => {
  it("opens and closes from the launcher (Escape too) with accessible names", () => {
    render(<AssistantWidget config={config} />);
    open();
    expect(screen.getByRole("dialog", { name: "Mira chat" })).toBeInTheDocument();
    expect(screen.getByText("Hi, I'm Mira.")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chat with Mira" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("streams an answer progressively and shows sources", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    fetchMock.mockResolvedValue(
      ndjson(
        [
          meta,
          { type: "delta", text: "Returns within " },
          { type: "delta", text: "7 days." },
          { type: "done" },
        ],
        gate,
      ),
    );
    render(<AssistantWidget config={config} />);
    open();
    fireEvent.change(input(), { target: { value: "Return policy?" } });
    fireEvent.keyDown(input(), { key: "Enter" });

    expect(await screen.findByText("Return policy?")).toBeInTheDocument();
    expect(screen.getByLabelText("Assistant is typing")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
    await act(async () => release());
    expect(await screen.findByText("Returns within 7 days.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Shipping & returns: Returns" })).toHaveAttribute(
      "href",
      "/demo/shipping-returns#returns",
    );
    expect(sentBody()).toMatchObject({
      siteId: "malabar-spice",
      message: "Return policy?",
      history: [],
      page: { path: "/", title: "Home · Shop" },
    });
  });

  it("Shift+Enter does not send; suggested questions send", async () => {
    fetchMock.mockResolvedValue(ndjson([meta, { type: "delta", text: "ok" }, { type: "done" }]));
    render(<AssistantWidget config={config} />);
    open();
    fireEvent.change(input(), { target: { value: "draft" } });
    fireEvent.keyDown(input(), { key: "Enter", shiftKey: true });
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "What is your return policy?" }));
    await screen.findByText("ok");
    expect(sentBody().message).toBe("What is your return policy?");
  });

  it("sends previous turns as history on follow-ups", async () => {
    fetchMock
      .mockResolvedValueOnce(ndjson([meta, { type: "delta", text: "7 days." }, { type: "done" }]))
      .mockResolvedValueOnce(
        ndjson([meta, { type: "delta", text: "Photo within 48h." }, { type: "done" }]),
      );
    render(<AssistantWidget config={config} />);
    open();
    fireEvent.change(input(), { target: { value: "Return policy?" } });
    fireEvent.submit(input().closest("form")!);
    await screen.findByText("7 days.");
    fireEvent.change(input(), { target: { value: "What about damaged products?" } });
    fireEvent.submit(input().closest("form")!);
    await screen.findByText("Photo within 48h.");
    expect(sentBody(1).history).toEqual([
      { role: "user", content: "Return policy?" },
      { role: "assistant", content: "7 days." },
    ]);
  });

  it("shows an error with retry; retry re-asks the same question", async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json(
          { ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "Not set up yet." } },
          { status: 503 },
        ),
      )
      .mockResolvedValueOnce(
        ndjson([meta, { type: "delta", text: "Works now." }, { type: "done" }]),
      );
    render(<AssistantWidget config={config} />);
    open();
    fireEvent.change(input(), { target: { value: "Hello?" } });
    fireEvent.submit(input().closest("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("Not set up yet.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText("Works now.");
    expect(sentBody(1).message).toBe("Hello?");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getAllByText("Hello?")).toHaveLength(1);
  });

  it("shows stream errors (e.g. provider timeout) as alerts", async () => {
    fetchMock.mockResolvedValue(
      ndjson([
        meta,
        { type: "error", code: "timeout", message: "The assistant took too long to answer." },
      ]),
    );
    render(<AssistantWidget config={config} />);
    open();
    fireEvent.change(input(), { target: { value: "Hi" } });
    fireEvent.submit(input().closest("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("took too long");
  });

  it("New chat clears the conversation and storage", async () => {
    fetchMock.mockResolvedValue(
      ndjson([meta, { type: "delta", text: "Answer." }, { type: "done" }]),
    );
    render(<AssistantWidget config={config} />);
    open();
    fireEvent.change(input(), { target: { value: "Q1" } });
    fireEvent.submit(input().closest("form")!);
    await screen.findByText("Answer.");
    await waitFor(() =>
      expect(sessionStorage.getItem("assistant:conversation:malabar-spice")).toContain("Q1"),
    );
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    expect(screen.queryByText("Q1")).not.toBeInTheDocument();
    expect(sessionStorage.getItem("assistant:conversation:malabar-spice")).toBeNull();
  });

  it("restores the conversation after navigation (same tab) and renders Malayalam", async () => {
    sessionStorage.setItem(
      "assistant:conversation:malabar-spice",
      JSON.stringify([
        { id: "a", role: "user", content: "കുരുമുളകിന്റെ വില?", status: "done" },
        { id: "b", role: "assistant", content: "₹240 (200 g)", status: "done" },
      ]),
    );
    render(<AssistantWidget config={config} />);
    open();
    expect(await screen.findByText("കുരുമുളകിന്റെ വില?")).toBeInTheDocument();
    expect(screen.getByText("₹240 (200 g)")).toBeInTheDocument();
  });

  it("renders model text as text, never as HTML", async () => {
    fetchMock.mockResolvedValue(
      ndjson([
        meta,
        { type: "delta", text: '<img src=x onerror="alert(1)"> **bold**' },
        { type: "done" },
      ]),
    );
    render(<AssistantWidget config={config} />);
    open();
    fireEvent.change(input(), { target: { value: "x" } });
    fireEvent.submit(input().closest("form")!);
    expect(await screen.findByText("bold")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});
