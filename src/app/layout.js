import "./globals.css";

export const metadata = {
  title: "Horangel Millan — Full-Stack Developer | SAP BTP",
  description: "Portfolio de Horangel Millan: Next.js, React, arquitecturas cloud e integraciones SAP BTP.",
  metadataBase: new URL("https://horangelmillan.dev"),
  openGraph: {
    title: "Horangel Millan — Full-Stack Developer | SAP BTP",
    description: "Portfolio de Horangel Millan: Next.js, React, arquitecturas cloud e integraciones SAP BTP.",
    url: "https://horangelmillan.dev",
    siteName: "Horangel Millan",
    locale: "es_CO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Horangel Millan — Full-Stack Developer | SAP BTP",
    description: "Portfolio de Horangel Millan: Next.js, React, arquitecturas cloud e integraciones SAP BTP.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body >
        {children}
      </body>
    </html>
  );
}
