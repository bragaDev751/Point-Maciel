'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Acesso negado: Verifique suas credenciais");
        setLoading(false);
        return;
      }

      if (data?.user) {
        toast.success("Bem-vindo, Maciel!");
        
        // --- AS DUAS LINHAS MÁGICAS PARA O NEXT.JS 15 ---
        router.refresh(); // Limpa o cache de rotas do servidor
        
        setTimeout(() => {
          router.push('/admin'); 
        }, 800); // Dá tempo do navegador salvar o cookie da sessão
      }
    } catch (err) {
      toast.error("Ocorreu um erro inesperado");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#1a011a] flex items-center justify-center p-6 text-white relative overflow-hidden">
      
      {/* 🔙 BOTÃO VOLTAR PARA O CARDÁPIO */}
      <button 
        onClick={() => router.push('/')}
        className="absolute top-8 left-8 z-50 flex items-center gap-2 text-white/40 hover:text-[#ffcc00] transition-all group font-black uppercase text-[10px] tracking-widest"
      >
        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#ffcc00]/50 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </div>
        Cardápio
      </button>

      {/* Luzes de Fundo Cyberpunk */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#ffcc00]/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full" />

      <Toaster position="top-center" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white/5 border border-white/10 p-10 rounded-[3rem] backdrop-blur-2xl shadow-2xl text-center relative z-10"
      >
        <div className="relative h-24 w-24 mx-auto mb-6 rounded-[2rem] overflow-hidden border-2 border-[#ffcc00] shadow-[0_0_20px_rgba(255,204,0,0.3)]">
          <Image 
            src="/logo.png" 
            alt="Logo" 
            fill 
            priority 
            className="object-cover" 
          />
        </div>
        
        <h1 className="text-3xl font-black italic text-white uppercase tracking-tighter">
          Admin <span className="text-[#ffcc00]">Point</span>
        </h1>
        <p className="text-[10px] text-white/40 uppercase tracking-[0.4em] mt-2 mb-10 font-black">Acesso Restrito</p>
        
        <form onSubmit={handleLogin} className="space-y-5 text-left">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-white/30 ml-4 tracking-widest">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@pointmaciel.com"
              className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00] transition-all"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-white/30 ml-4 tracking-widest">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00] transition-all"
              required
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#ffcc00] text-[#3b013b] p-5 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-[#ffcc00]/10 mt-6 disabled:opacity-50"
          >
            {loading ? "Autenticando..." : "Entrar no Painel"}
          </button>
        </form>
      </motion.div>
    </main>
  );
}