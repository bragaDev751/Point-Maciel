import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#1a011a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://pointdomaciel.com.br"), 
  title: {
    default: "Point do Maciel | Cardápio Digital",
    template: "%s | Point do Maciel"
  },
  description: "Peça os melhores lanches, burgers e bebidas no Point do Maciel. Rapidez e qualidade direto pelo WhatsApp!",
  manifest: "/manifest.json",
  keywords: ["Point do Maciel", "Cardápio Digital", "Hambúrguer", "Lanches", "Pedidos Online", "WhatsApp"],
  authors: [{ name: "Gabriel Braga" }],

  icons: {
    icon: [
      { url: "/favicon.ico" }, 
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Point Maciel",
  },

  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://pointdomaciel.com.br",
    title: "Point do Maciel | Cardápio Digital",
    description: "Já escolheu o seu lanche hoje? Confira nosso cardápio completo!",
    siteName: "Point do Maciel",
    images: [
      {
        url: "/og-image.jpg", 
        width: 1200,
        height: 630,
        alt: "Point do Maciel",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html 
      lang="pt-br" 
      className="scroll-smooth"
      data-scroll-behavior="smooth" 
    >
      <body className="antialiased selection:bg-[#ffcc00] selection:text-[#1a011a]">
        {children}
      </body>
    </html>
  );
}