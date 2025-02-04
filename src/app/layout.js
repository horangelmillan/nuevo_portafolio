import "./globals.css";

export const metadata = {
  title: "Horangel Millan - Portfolio",
  description: "Horangel Millan's portfolio",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body >
        {children}
      </body>
    </html>
  );
}
