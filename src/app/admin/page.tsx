'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';

// Componentes
import { ProductForm } from '@/app/components/admin/ProductForm';
import { ProductList } from '@/app/components/admin/ProductList';
import { TableManager } from '@/app/components/admin/TableManager';
import { Dashboard } from '@/app/components/admin/Dashboard';
import { CozinhaMonitor } from '@/app/components/admin/CozinhaMonitor';

// Supabase
import { supabase, TENANT_ID_MACIEL } from '@/lib/supabase';

// --- TIPOS ---
type AbaTipo = 'relatorios' | 'cozinha' | 'produtos' | 'mesas';

interface Categoria {
  id: string;
  nome: string;
  emoji: string;
}

// --- COMPONENTE DE CONTROLE DA LOJA ---
function ControleLoja() {
  const [aberta, setAberta] = useState(true);
  const [loading, setLoading] = useState(true);

  // Busca o status real no banco de dados ao carregar
  useEffect(() => {
    const buscarStatus = async () => {
      const { data, error } = await supabase
        .from('config_loja')
        .select('esta_aberta')
        .eq('tenant_id', TENANT_ID_MACIEL)
        .single();
      
      if (!error && data) {
        setAberta(data.esta_aberta);
      }
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
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all active:scale-95 border ${
        aberta 
          ? 'bg-green-500/10 text-green-500 border-green-500/20' 
          : 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
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

  const router = useRouter();

  // 🔐 LOGOUT
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Sessão encerrada');
    router.push('/admin/login');
  };

  // 📥 CARREGAR CATEGORIAS
  const carregarCategorias = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('tenant_id', TENANT_ID_MACIEL)
        .order('nome', { ascending: true });

      if (error) throw error;
      setListaCategorias(data || []);
    } catch (error) {
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoadingCategorias(false);
    }
  }, []);

  useEffect(() => {
    carregarCategorias();
  }, [carregarCategorias]);

  // ➕ CRIAR CATEGORIA
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
      setLoadingCategorias(true); 
      carregarCategorias();
      window.dispatchEvent(new Event('refreshCategories'));
    }
  };

  // 🗑️ EXCLUIR CATEGORIA
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
      setLoadingCategorias(true);
      carregarCategorias();
      window.dispatchEvent(new Event('refreshCategories'));
    }
  };

  const renderBotaoNav = (id: AbaTipo, icon: string, label: string) => (
    <button
      onClick={() => setAbaAtiva(id)}
      className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${
        abaAtiva === id
          ? 'bg-[#ffcc00] text-[#3b013b] shadow-[0_0_25px_rgba(255,204,0,0.3)] scale-105'
          : 'text-white/30 hover:text-white hover:bg-white/5'
      }`}
    >
      <span>{icon}</span>
      <span className="hidden md:inline">{label}</span>
    </button>
  );

  return (
    <main className="min-h-screen bg-[#0f010f] text-white p-4 md:p-8">
      <Toaster position="bottom-right" />

      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-4xl font-black italic uppercase leading-none">
                POINT <span className="text-[#ffcc00]">ADMIN</span>
              </h1>
              <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black mt-1">
                Sistema ativo • Maciel Delivery
              </p>
            </div>
            
            {/* ✅ BOTÃO DE CONTROLE INTEGRADO NO HEADER */}
            <ControleLoja />
          </div>

          <nav className="flex bg-white/5 p-1.5 rounded-[2.5rem] border border-white/10 overflow-x-auto no-scrollbar">
            {renderBotaoNav('relatorios', '📊', 'Dashboard')}
            {renderBotaoNav('cozinha', '👨‍🍳', 'Cozinha')}
            {renderBotaoNav('produtos', '🍔', 'Produtos')}
            {renderBotaoNav('mesas', '📍', 'Mesas')}
          </nav>

          <button onClick={handleLogout} className="text-red-400 hover:text-red-500 font-black text-xs uppercase transition-colors">
            Sair 🚪
          </button>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={abaAtiva}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {abaAtiva === 'relatorios' && <Dashboard />}
            {abaAtiva === 'cozinha' && <CozinhaMonitor />}
            {abaAtiva === 'mesas' && <TableManager />}

            {abaAtiva === 'produtos' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Lado Esquerdo: Categorias */}
                <div className="lg:col-span-4">
                  <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-sm sticky top-8">
                    <h2 className="text-[#ffcc00] font-black text-xs uppercase mb-6 italic tracking-widest">
                      Categorias
                    </h2>

                    <div className="flex gap-2 mb-4">
                      <input
                        placeholder="🍔"
                        value={novaCat.emoji}
                        onChange={e => setNovaCat({ ...novaCat, emoji: e.target.value })}
                        className="w-14 p-3 bg-black/40 rounded-xl border border-white/10 text-center outline-none focus:border-[#ffcc00] transition-all"
                      />
                      <input
                        placeholder="Nome"
                        value={novaCat.nome}
                        onChange={e => setNovaCat({ ...novaCat, nome: e.target.value })}
                        className="flex-1 p-3 bg-black/40 rounded-xl border border-white/10 outline-none focus:border-[#ffcc00] transition-all"
                      />
                    </div>

                    <button
                      onClick={cadastrarCategoria}
                      className="w-full bg-[#ffcc00] text-[#3b013b] py-3 rounded-xl font-black text-[10px] uppercase tracking-widest mb-6 active:scale-95 transition-all"
                    >
                      Salvar Categoria
                    </button>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {loadingCategorias ? (
                        <p className="text-white/20 text-[10px] uppercase font-black animate-pulse">Sincronizando...</p>
                      ) : (
                        listaCategorias.map(cat => (
                          <div
                            key={cat.id}
                            className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-all"
                          >
                            <span className="text-sm font-bold">{cat.emoji} {cat.nome}</span>
                            <button
                              onClick={() => excluirCategoria(cat.id)}
                              className="text-red-400/50 hover:text-red-500 p-1 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Formulário e Lista de Produtos */}
                <div className="lg:col-span-8 space-y-10">
                  <ProductForm />
                  <div className="pt-8 border-t border-white/5">
                    <ProductList />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}