import type { Metadata } from "next";
import { DEMO_SITE } from "@/assistant-sites/malabar-spice/catalog";

export const metadata: Metadata = {
  title: "Contact",
  description: "Email, phone, opening hours and address of Malabar Spice Market.",
};

export default function ContactPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-4" data-assistant-context>
      <h1 className="text-3xl font-semibold tracking-tight">Contact us</h1>
      <p>For order questions, please include your order number.</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
        <dt className="text-muted-foreground">Email</dt>
        <dd>{DEMO_SITE.email}</dd>
        <dt className="text-muted-foreground">Phone</dt>
        <dd>{DEMO_SITE.phone}</dd>
        <dt className="text-muted-foreground">Hours</dt>
        <dd>{DEMO_SITE.hours}</dd>
        <dt className="text-muted-foreground">Address</dt>
        <dd>{DEMO_SITE.location}</dd>
      </dl>
      <p className="text-muted-foreground text-sm">
        These are demo contact details (example.com addresses); messages are not monitored.
      </p>
    </div>
  );
}
