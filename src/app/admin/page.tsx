'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { User } from '@supabase/supabase-js';

// Componentes
import { ProductForm } from '@/app/components/admin/ProductForm';
import { ProductList } from '@/app/components/admin/ProductList';
import { TableManager } from '@/app/components/admin/TableManager';
import { Dashboard } from '@/app/components/admin/Dashboard';
import { CozinhaMonitor } from '@/app/components/admin/CozinhaMonitor';
import { ComplementosManager } from '@/app/components/admin/ComplementosManager';
import { TaxasManager } from '@/app/components/admin/TaxasManager'; 
// Supabase
import { supabase, TENANT_ID_MACIEL } from '@/lib/supabase';

// --- TIPOS ---
type AbaTipo = 'relatorios' | 'cozinha' | 'produtos' | 'complementos' | 'mesas' | 'entregas';
interface Categoria {
  id: string;
  nome: string;
  emoji: string;
}

// --- CONTROLE DA LOJA ---
function ControleLoja() {
  const [aberta, setAberta] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const buscarStatus = async () => {
      const { data } = await supabase
        .from('config_loja')
        .select('esta_aberta')
        .eq('tenant_id', TENANT_ID_MACIEL)
        .single();

      if (data) setAberta(data.esta_aberta);
      setLoading(false);
    };
    buscarStatus();
  }, []);

  const alternarStatus = async () => {
    const novoStatus = !aberta;
    const loadingId = toast.loading('Sincronizando loja...');

    const { error } = await supabase
      .from('config_loja')
      .update({ esta_aberta: novoStatus })
      .eq('tenant_id', TENANT_ID_MACIEL);

    if (!error) {
      setAberta(novoStatus);
      toast.success(novoStatus ? 'Loja Aberta!' : 'Loja Fechada!', { id: loadingId });
    } else {
      toast.error('Erro ao atualizar status', { id: loadingId });
    }
  };

  if (loading) return <div className="w-28 h-8 bg-white/5 animate-pulse rounded-xl" />;

  return (
    <button
      onClick={alternarStatus}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all border ${
        aberta
          ? 'bg-green-500/10 text-green-500 border-green-500/20'
          : 'bg-red-500/10 text-red-500 border-red-500/20'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${aberta ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
      {aberta ? 'Aberta' : 'Fechada'}
    </button>
  );
}

// --- PÁGINA PRINCIPAL ---
export default function AdminPage() {
  const [abaAtiva, setAbaAtiva] = useState<AbaTipo>('relatorios');
  const [novaCat, setNovaCat] = useState({ nome: '', emoji: '' });
  const [listaCategorias, setListaCategorias] = useState<Categoria[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  
  // Estados de Autenticação com Tipagem Correta
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const router = useRouter();

  // 1. Verificação de Segurança (Client-side)
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: activeUser }, error } = await supabase.auth.getUser();
      if (error || !activeUser) {
        router.push('/admin/login');
      } else {
        setUser(activeUser);
        setAuthLoading(false);
      }
    };
    checkUser();
  }, [router]);

  // 2. Logout
  const handleLogout = async () => {
    const loadingId = toast.loading('Saindo...');
    await supabase.auth.signOut();
    toast.success('Sessão encerrada', { id: loadingId });
    router.push('/admin/login');
  };

  // 3. Categorias
  const carregarCategorias = useCallback(async () => {
    if (authLoading) return;
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('tenant_id', TENANT_ID_MACIEL)
        .order('nome', { ascending: true });

      if (error) throw error;
      setListaCategorias(data || []);
    } catch {
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoadingCategorias(false);
    }
  }, [authLoading]);

  useEffect(() => {
    carregarCategorias();
  }, [carregarCategorias]);

  const cadastrarCategoria = async () => {
    if (!novaCat.nome.trim()) return toast.error('Digite um nome');

    const loadingId = toast.loading('Salvando...');

    const { error } = await supabase.from('categorias').insert([
      {
        nome: novaCat.nome.trim(),
        emoji: novaCat.emoji || '🍔',
        tenant_id: TENANT_ID_MACIEL,
      },
    ]);

    if (error) {
      toast.error('Erro ao salvar', { id: loadingId });
    } else {
      toast.success('Categoria criada!', { id: loadingId });
      setNovaCat({ nome: '', emoji: '' });
      carregarCategorias();
      window.dispatchEvent(new Event('refreshCategories'));
    }
  };

  const excluirCategoria = async (id: string) => {
    if (!confirm('Excluir categoria?')) return;

    const loadingId = toast.loading('Excluindo...');

    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', id)
      .eq('tenant_id', TENANT_ID_MACIEL);

    if (error) {
      toast.error('Erro ao excluir', { id: loadingId });
    } else {
      toast.success('Removido!', { id: loadingId });
      carregarCategorias();
      window.dispatchEvent(new Event('refreshCategories'));
    }
  };

  const renderBotaoNav = (id: AbaTipo, icon: string, label: string) => (
    <button
      onClick={() => setAbaAtiva(id)}
      className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${
        abaAtiva === id
          ? 'bg-[#ffcc00] text-[#3b013b] scale-105 shadow-[0_0_20px_rgba(255,204,0,0.3)]'
          : 'text-white/30 hover:text-white hover:bg-white/5'
      }`}
    >
      <span>{icon}</span>
      <span className="hidden md:inline">{label}</span>
    </button>
  );

  // Tela de Loading enquanto verifica se está logado
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f010f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#ffcc00] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#ffcc00] font-black uppercase tracking-tighter text-[10px]">Autenticando Gabriel...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f010f] text-white p-4 md:p-8">
      <Toaster position="bottom-right" />

      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col xl:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-4xl font-black italic uppercase">
                POINT <span className="text-[#ffcc00]">ADMIN</span>
              </h1>
            </div>
            <ControleLoja />
          </div>

          <nav className="flex bg-white/5 p-1.5 rounded-[2.5rem] border border-white/10 overflow-x-auto max-w-full">
            {renderBotaoNav('relatorios', '📊', 'Dashboard')}
            {renderBotaoNav('cozinha', '👨‍🍳', 'Cozinha')}
            {renderBotaoNav('produtos', '🍔', 'Produtos')}
            {renderBotaoNav('complementos', '🍦', 'Extras')}
            {renderBotaoNav('mesas', '📍', 'Mesas')}
            {renderBotaoNav('entregas', '🛵', 'Taxas')}
          </nav>

          <button 
            onClick={handleLogout} 
            className="group flex items-center gap-2 text-white/40 hover:text-red-400 transition-colors font-black text-[10px] uppercase tracking-widest"
          >
            Sair <span className="group-hover:translate-x-1 transition-transform">🚪</span>
          </button>
        </header>

        <AnimatePresence mode="wait">
          <motion.div 
            key={abaAtiva} 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {abaAtiva === 'relatorios' && <Dashboard />}
            {abaAtiva === 'cozinha' && <CozinhaMonitor />}
            {abaAtiva === 'mesas' && <TableManager />}
            {abaAtiva === 'complementos' && <ComplementosManager />}
            {abaAtiva === 'entregas' && <TaxasManager />}

            {abaAtiva === 'produtos' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-4">
                  <div className="bg-white/5 p-6 rounded-3xl sticky top-8 border border-white/10">
                    <h3 className="text-[#ffcc00] font-black text-xs uppercase mb-4 tracking-widest">Categorias</h3>
                    <div className="flex gap-2 mb-4">
                      <input
                        placeholder="🍔"
                        value={novaCat.emoji}
                        onChange={e => setNovaCat({ ...novaCat, emoji: e.target.value })}
                        className="w-14 p-3 bg-black/40 rounded-xl border border-white/10 focus:border-[#ffcc00] outline-none transition-all"
                      />
                      <input
                        placeholder="Nova Categoria..."
                        value={novaCat.nome}
                        onChange={e => setNovaCat({ ...novaCat, nome: e.target.value })}
                        className="flex-1 p-3 bg-black/40 rounded-xl border border-white/10 focus:border-[#ffcc00] outline-none transition-all"
                      />
                    </div>

                    <button 
                      onClick={cadastrarCategoria} 
                      className="w-full bg-[#ffcc00] text-black py-3 rounded-xl font-black text-xs uppercase hover:scale-[1.02] transition-transform"
                    >
                      Salvar Categoria
                    </button>

                    <div className="space-y-2 mt-6 max-h-[300px] overflow-y-auto pr-2">
                      {listaCategorias.map(cat => (
                        <div key={cat.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                          <span className="text-sm font-medium">{cat.emoji} {cat.nome}</span>
                          <button 
                            onClick={() => excluirCategoria(cat.id)}
                            className="text-white/20 hover:text-red-500 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-8 space-y-10">
                  <ProductForm />
                  <ProductList />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}