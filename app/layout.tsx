import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Slate Novum – Leads",
  description: "Outreach operations console for Slate.",
  // Reuse the existing brand asset so the browser tab shows the Slate logo.
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <header className="header">
            <div className="brand">
              <div className="logo-wrap">
                <img src="/logo.svg" alt="Slate" />
              </div>
              <div>
                <h1>Slate OS</h1>
                <p className="subtitle">Leads Tracker</p>
              </div>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
