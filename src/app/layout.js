import "./globals.css";

export const metadata = {
  title: "Horangel Millan — Full-Stack Developer | SAP BTP",
  description: "Portfolio de Horangel Millan: Next.js, React, arquitecturas cloud e integraciones SAP BTP.",
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
