import type { Metadata } from "next";
import { RootLayoutClient } from "./layout-client";
import "./globals.css";

export const metadata: Metadata = {
  title: "Supplied · Operations Dashboard",
  description: "Operations dashboard",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
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
        <RootLayoutClient>
          {children}
        </RootLayoutClient>
      </body>
    </html>
  );
}
