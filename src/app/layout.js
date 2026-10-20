import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata = {
  metadataBase: new URL("https://horangelmillan.dev"),
  title: "Horangel Millan Ramos | Desarrollador Full-Stack",
  description:
    "Portafolio de Horangel Millan Ramos, desarrollador Full-Stack y consultor SAP BTP. Desarrollo aplicaciones web, integraciones cloud y soluciones empresariales.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Horangel Millan Ramos | Desarrollador Full-Stack",
    description:
      "Portafolio de Horangel Millan Ramos: desarrollo Full-Stack, aplicaciones web e integraciones SAP BTP.",
    url: "https://horangelmillan.dev",
    siteName: "Horangel Millan",
    locale: "es_CO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
            title: "Horangel Millan Ramos | Desarrollador Full-Stack",
            description: "Portafolio de Horangel Millan Ramos: desarrollo Full-Stack, aplicaciones web e integraciones SAP BTP.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body >
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
