import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/* eslint @next/next/no-img-element: off */

export const alt = "Portafolio de Horangel Millan Ramos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public/brand/horangel-logo.svg"), "base64");

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 64, padding: 76, background: "#eee3cf", color: "#171513" }}>
      <div style={{ width: 340, height: 340, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <img src={`data:image/svg+xml;base64,${logo}`} width="320" height="320" alt="" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.1 }}>Horangel Millan Ramos</div>
        <div style={{ fontSize: 31, color: "#55504a" }}>Desarrollador Full-Stack · SAP BTP</div>
        <div style={{ fontSize: 25, color: "#d84b0b" }}>horangelmillan.dev</div>
      </div>
    </div>,
    size
  );
}
