'use client';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface HeaderProps {
  cartCount: number;
  isAnimating: boolean;
}

export const Header = ({ cartCount, isAnimating }: HeaderProps) => (
  <header className="p-4 flex justify-between items-center bg-[#3b013b]/80 backdrop-blur-2xl sticky top-0 z-50 border-b border-white/5 shadow-2xl">
    {/* LADO ESQUERDO: Logo e Status */}
    <div className="flex items-center gap-3">
      <div className="relative h-11 w-11 rounded-2xl overflow-hidden border-2 border-[#ffcc00] shadow-[0_0_15px_rgba(255,204,0,0.2)]">
        <Image src="/logo.png" alt="Logo Point Maciel" fill className="object-cover" />
      </div>
      <div className="flex flex-col">
        <h1 className="text-lg font-black italic text-[#ffcc00] leading-none tracking-tighter uppercase">Point Maciel</h1>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
          <span className="text-[9px] text-green-400 font-black uppercase tracking-[0.2em]">Delivery Aberto</span>
        </div>
      </div>
    </div>
    
    {/* LADO DIREITO: Ações (Admin + Carrinho) */}
    <div className="flex items-center gap-2">
      {/* Botão Admin - Agora dentro do Header para alinhar */}
      <Link 
        href="/admin/login" 
        className="h-12 w-12 flex items-center justify-center bg-white/5 rounded-2xl border border-white/10 text-white/20 hover:text-[#ffcc00] hover:border-[#ffcc00]/30 transition-all backdrop-blur-md active:scale-90"
        title="Área Administrativa"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
      </Link>

      {/* Botão Carrinho */}
      <motion.div 
        animate={isAnimating ? { scale: [1, 1.2, 1] } : {}}
        className="relative h-12 w-12 flex items-center justify-center bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md"
      >
        <span className="text-xl">🛒</span>
        {cartCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-[#ffcc00] text-[#3b013b] text-[10px] font-black h-5 w-5 rounded-lg flex items-center justify-center border-2 border-[#3b013b] shadow-lg">
            {cartCount}
          </span>
        )}
      </motion.div>
    </div>
  </header>
);