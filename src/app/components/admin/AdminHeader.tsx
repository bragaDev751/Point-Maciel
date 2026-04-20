'use client';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface AdminHeaderProps {
  userEmail?: string; 
}

export const AdminHeader = ({ userEmail }: AdminHeaderProps) => {
  const router = useRouter();
  

  const handleLogout = async () => {
    if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
    const loadingId = toast.loading("Encerrando sessão...");
    await supabase.auth.signOut();
    toast.success("Até logo!", { id: loadingId });
    router.push('/admin/login');
  };

  return (
    <header className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
      <div>
        <h1 className="text-2xl font-black italic text-[#ffcc00] tracking-tighter uppercase leading-none">
          Admin <span className="text-white">Point</span>
        </h1>
        <p className="text-[9px] text-white/30 font-black uppercase tracking-[0.4em] mt-1">
          {userEmail || 'Sessão Administrativa'}
        </p>
      </div>
      
      <button 
        onClick={handleLogout} 
        className="group flex items-center gap-2 bg-red-500/10 text-red-500 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-95"
      >
        <span>Sair</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </header>
  );
};