// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/app/items", search: "q=hello&status=open&page=2" }));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

import { Pagination, pageHref } from "@/components/ui/pagination";

afterEach(cleanup);
beforeEach(() => {
  nav.pathname = "/app/items";
  nav.search = "q=hello&status=open&page=2";
});

const meta = (page: number, totalPages = 3) => ({
  page,
  pageSize: 10,
  total: totalPages * 10,
  totalPages,
});

describe("Pagination", () => {
  it("builds prev/next hrefs that keep the other search params", () => {
    render(<Pagination meta={meta(2)} />);
    const next = screen.getByRole("link", { name: "Next" });
    const prev = screen.getByRole("link", { name: "Previous" });

    const nextUrl = new URL(next.getAttribute("href")!, "http://x");
    expect(nextUrl.pathname).toBe("/app/items");
    expect(nextUrl.searchParams.get("q")).toBe("hello");
    expect(nextUrl.searchParams.get("status")).toBe("open");
    expect(nextUrl.searchParams.get("page")).toBe("3");

    // Page 1 drops the page param but keeps the filters.
    expect(prev.getAttribute("href")).toBe("/app/items?q=hello&status=open");
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  });

  it("disables Previous on the first page and Next on the last", () => {
    nav.search = "q=hello";
    const { rerender } = render(<Pagination meta={meta(1)} />);
    expect(screen.queryByRole("link", { name: "Previous" })).toBeNull();
    expect(screen.getByText("Previous")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/app/items?q=hello&page=2",
    );

    rerender(<Pagination meta={meta(3)} />);
    expect(screen.queryByRole("link", { name: "Next" })).toBeNull();
    expect(screen.getByText("Next")).toHaveAttribute("aria-disabled", "true");
  });

  it("disables both on a single page", () => {
    render(<Pagination meta={meta(1, 1)} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  });
});

describe("pageHref", () => {
  it("returns the bare pathname when no params remain", () => {
    expect(pageHref("/list", new URLSearchParams("page=4"), 1)).toBe("/list");
    expect(pageHref("/list", new URLSearchParams(""), 2)).toBe("/list?page=2");
  });
});
