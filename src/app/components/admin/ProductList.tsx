'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';import { supabase, TENANT_ID_MACIEL } from '@/lib/supabase';
import { Produto } from '@/app/types/Index';
import { Power, PowerOff, Trash2, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';

export const ProductList = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [busca, setBusca] = useState("");
const [filtroCategoria, setFiltroCategoria] = useState("Todas");

  const fetchProdutos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('tenant_id', TENANT_ID_MACIEL)
        .order('id', { ascending: false });

      if (error) throw error;
      setProdutos((data as Produto[]) || []);
    } catch (err: unknown) {
      console.error(err);
      toast.error("Erro ao carregar lista");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProdutos();
    const handleRefresh = () => {
      setLoading(true);
      fetchProdutos();
    };
    window.addEventListener('refreshProducts', handleRefresh);
    return () => window.removeEventListener('refreshProducts', handleRefresh);
  }, [fetchProdutos]);

  // FUNÇÃO PARA ALTERNAR DISPONIBILIDADE
  const toggleStatus = async (id: string | number, statusAtual: boolean) => {
    try {
      const { error } = await supabase
        .from('produtos')
        .update({ disponivel: !statusAtual })
        .eq('id', id)
        .eq('tenant_id', TENANT_ID_MACIEL);

      if (error) throw error;

      toast.success(statusAtual ? "Produto Pausado ⏸️" : "Produto Ativo ✅");
      
      // Atualiza o estado local para refletir a mudança na hora
      setProdutos(prev => prev.map(p => 
        p.id === id ? { ...p, disponivel: !statusAtual } : p
      ));
    } catch (err) {
      toast.error("Erro ao mudar status");
    }
  };

  const deletar = async (id: string | number, imageUrl?: string) => {
    if (!confirm("Remover este item definitivamente?")) return;

    try {
      if (imageUrl) {
        const urlParts = imageUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        if (fileName) {
          await supabase.storage.from('produtos').remove([`${TENANT_ID_MACIEL}/${fileName}`]);
        }
      }

      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id)
        .eq('tenant_id', TENANT_ID_MACIEL);

      if (error) throw error;
      toast.success("Item removido!");
      fetchProdutos(); 
    } catch (error: unknown) { 
      const mensagem = error instanceof Error ? error.message : "Erro ao excluir.";
      toast.error(mensagem);
    }
  };
const produtosFiltrados = useMemo(() => {
  return produtos.filter(p => {
    const matchesBusca = p.nome.toLowerCase().includes(busca.toLowerCase());
    const matchesCategoria =
      filtroCategoria === "Todas" || p.categoria_nome === filtroCategoria;

    return matchesBusca && matchesCategoria;
  });
}, [busca, filtroCategoria, produtos]);
  if (loading) if (loading) return (
  <div className="py-20 text-center opacity-20 animate-pulse font-black uppercase tracking-[0.3em]">
    Sincronizando Cardápio...
  </div>
);

return (
  <div className="space-y-6">

    {/* BARRA DE BUSCA E FILTRO */}
    <div className="sticky top-0 z-10 bg-[#1a011a] pb-4 space-y-3">
      
      {/* INPUT BUSCA */}
      <div className="relative">
        <input 
          type="text"
          placeholder="Buscar produto (ex: Morango...)"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full bg-white/5 border border-white/10 p-5 pl-12 rounded-2xl text-white font-bold outline-none focus:border-[#ffcc00] transition-all"
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
          🔍
        </div>
      </div>

      {/* FILTRO DE CATEGORIA */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        <button 
          onClick={() => setFiltroCategoria("Todas")}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex-shrink-0 ${
            filtroCategoria === "Todas"
              ? 'bg-[#ffcc00] text-[#3b013b]'
              : 'bg-white/5 text-white/40'
          }`}
        >
          Todas
        </button>

        {Array.from(new Set(produtos.map(p => p.categoria_nome))).map(cat => (
          <button 
            key={cat}
            onClick={() => setFiltroCategoria(cat)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex-shrink-0 ${
              filtroCategoria === cat
                ? 'bg-[#ffcc00] text-[#3b013b]'
                : 'bg-white/5 text-white/40'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>

    {/* LISTA */}
    <div className="grid gap-3">
      {produtosFiltrados.length === 0 ? (
        <div className="p-10 border border-dashed border-white/10 rounded-[2rem] text-center text-white/20 text-sm italic">
          Nenhum item encontrado.
        </div>
      ) : (
        produtosFiltrados.map((p) => (
          <div 
            key={p.id} 
            className={`flex justify-between items-center p-5 rounded-[2.5rem] border transition-all group ${
              p.disponivel 
              ? 'bg-white/5 border-white/5 hover:border-white/10' 
              : 'bg-red-500/5 border-red-500/10 grayscale opacity-60'
            }`}
          >

            <div className="flex items-center gap-4 min-w-0">
              
              <button 
                onClick={() => toggleStatus(p.id, p.disponivel ?? true)}
                className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all flex-shrink-0 ${
                  p.disponivel 
                  ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' 
                  : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                }`}
              >
                {p.disponivel ? <Power size={20}/> : <PowerOff size={20}/>}
              </button>

              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0 bg-black/20">
                <img 
                  src={p.imagem_url || p.image || 'https://via.placeholder.com/150'} 
                  className="w-full h-full object-cover" 
                  alt={p.nome} 
                />
              </div>

              <div className="min-w-0">
                <span className="text-[9px] text-[#ffcc00] font-bold uppercase tracking-[0.15em] block mb-0.5">
                  {p.categoria_nome}
                </span>

                <p className={`font-bold text-base leading-tight truncate ${
                  p.disponivel ? 'text-white/90' : 'text-white/30 line-through'
                }`}>
                  {p.nome}
                </p>
                
                <p className="text-[#ffcc00] font-black italic text-lg leading-none pt-1">
                  R$ {p.preco.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex gap-2 ml-4">
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('editProduct', { detail: p }))}
                className="h-11 w-11 bg-white/5 text-white/50 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-[#ffcc00] hover:text-[#3b013b] hover:border-[#ffcc00] active:scale-90 transition-all"
              >
                <Edit3 size={18} />
              </button>

              <button 
                onClick={() => deletar(p.id, p.imagem_url || p.image)}
                className="h-11 w-11 bg-red-500/10 text-red-500/50 border border-red-500/10 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white active:scale-90 transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>

          </div>
        ))
      )}
    </div>
  </div>
);
};