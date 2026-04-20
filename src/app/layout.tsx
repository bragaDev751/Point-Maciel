import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// 1. Viewport Otimizada: Impede o zoom chato em inputs no iPhone
export const viewport: Viewport = {
  themeColor: "#1a011a", // Mudei para o roxo escuro para a barra do celular sumir no fundo do seu app
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// 2. Metadados Completos (SEO + Social Media)
export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"), 
  title: {
    default: "Point do Maciel | Cardápio Digital",
    template: "%s | Point do Maciel"
  },
  description: "Peça os melhores lanches, burgers e bebidas no Point do Maciel. Rapidez e qualidade direto pelo WhatsApp!",
  manifest: "/manifest.json",
  keywords: ["Point do Maciel", "Cardápio Digital", "Hambúrguer", "Lanches", "Pedidos Online", "WhatsApp"],
  authors: [{ name: "Gabriel Braga" }],
  
  // Apple PWA
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // Deixa a barra de status mais integrada ao fundo escuro
    title: "Point Maciel",
  },

  // Isso aqui é o que faz o link ficar BONITO no WhatsApp/Instagram
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://pointdomaciel.com.br", // Substitua pelo seu domínio quando tiver
    title: "Point do Maciel | Cardápio Digital",
    description: "Já escolheu o seu lanche hoje? Confira nosso cardápio completo!",
    siteName: "Point do Maciel",
    images: [
      {
        url: "/og-image.jpg", // Coloque uma foto do lanche principal com esse nome na pasta public
        width: 1200,
        height: 630,
        alt: "Logo Point do Maciel",
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
    <html lang="pt-br" className="scroll-smooth">
      <body className="antialiased selection:bg-[#ffcc00] selection:text-[#1a011a]">{children}</body>
    </html>
  );
}
