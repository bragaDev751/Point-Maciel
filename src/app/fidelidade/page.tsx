"use client";

import { AreaCliente } from "@/app/components/client/AreaCliente";

export default function PaginaFidelidade() {
  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-[#ffcc00] selection:text-black">
      <div className="pt-12 pb-6 px-4 text-center">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">
          Point <span className="text-[#ffcc00]">Club</span>
        </h1>
        <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-white/30 mt-2">
          Seu programa de recompensas
        </p>
      </div>

      <AreaCliente />
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xs px-4">
        <button 
          onClick={() => window.location.href = '/'}
          className="w-full bg-white/5 border border-white/10 backdrop-blur-xl py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
        >
          ← Voltar para o Cardápio
        </button>
      </div>
    </main>
  );
}