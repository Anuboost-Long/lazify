import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lazify — Your entire dev loop, one window",
  description:
    "A desktop developer workspace for projects, coding agents, terminals, previews, templates, and local tooling.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
