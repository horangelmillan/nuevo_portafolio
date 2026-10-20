import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/* eslint @next/next/no-img-element: off */

export const size = { width: 48, height: 48 };
export const contentType = "image/png";

export default async function Icon() {
  const logo = await readFile(join(process.cwd(), "public/brand/horangel-logo.svg"), "base64");

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img src={`data:image/svg+xml;base64,${logo}`} width="40" height="40" alt="" />
    </div>,
    size
  );
}
