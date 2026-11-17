import "server-only";

import { renderSVG } from "uqr";

/** QR code as an SVG string. The only place that knows which QR library is used. */
export function renderQrSvg(text: string): string {
  return renderSVG(text, { ecc: "M", border: 2 });
}
