import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gallery } from "./gallery";

export const metadata: Metadata = { title: "UI gallery", robots: { index: false } };

/** Development-only component gallery. Returns 404 in production builds. */
export default function UiGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Gallery />;
}
