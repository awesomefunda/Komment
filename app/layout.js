import "./globals.css";

export const metadata = {
  title: "Komment — where comment is content",
  description:
    "Turn great social media comments into shareable content cards. No login needed.",
  openGraph: {
    title: "Komment",
    description: "Where comment is content.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Komment",
    description: "Where comment is content.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">{children}</body>
    </html>
  );
}
