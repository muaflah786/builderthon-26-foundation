import type { ComponentProps } from "react";

/** Small stroke icon set (no icon library). Names are generic, never situation ids. */
const PATHS = {
  party:
    "M4 20l4.5-12L16 15.5 4 20zM13 4l1 2M18 6l-2 1.5M20 11l-2.2-.4M10.5 6.5c1-1 2.5-1 3.5 0M15 10c1-.8 2.4-.8 3.3.1",
  cap: "M2 9l10-5 10 5-10 5L2 9zm4 2.2V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.8M22 9v6",
  siren: "M7 17v-5a5 5 0 0110 0v5M5 17h14v3H5v-3zM12 3v2M4.5 6l1.4 1.4M19.5 6l-1.4 1.4",
  calendar: "M4 6h16v14H4V6zm0 4h16M8 3v4M16 3v4",
  users:
    "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20c.6-3.2 3.3-5.5 6.5-5.5s5.9 2.3 6.5 5.5M16 4.2a3.5 3.5 0 010 6.6M18 14.6c2 .7 3.3 2.6 3.5 5.4",
  grid: "M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z",
  trophy:
    "M8 4h8v5a4 4 0 01-8 0V4zM8 6H4.5a3 3 0 003.5 4M16 6h3.5a3 3 0 01-3.5 4M12 13v4m-4 3h8l-1-3H9l-1 3z",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
  chart: "M5 20V12m7 8V7m7 13V4",
  check: "M4 12.5l5 5L20 6.5",
  alert: "M12 3l10 18H2L12 3zm0 7v5m0 3v.5",
  layers: "M12 3l9 5-9 5-9-5 9-5zm-9 9l9 5 9-5m-18 4l9 5 9-5",
  arrow: "M5 12h14m-6-6l6 6-6 6",
  pen: "M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className, ...props }: { name: IconName } & ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? "size-5"}
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
