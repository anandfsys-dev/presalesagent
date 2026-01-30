import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Salesforce RCA Configuration Tool",
  description: "Automate Salesforce Revenue Cloud Advanced configuration through Excel templates",
  keywords: ["Salesforce", "Revenue Cloud", "Configuration", "Automation", "CPQ"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-gray-50">
        {children}
      </body>
    </html>
  );
}
