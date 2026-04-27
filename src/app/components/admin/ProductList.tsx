"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase, TENANT_ID_MACIEL } from "@/lib/supabase";
import { Produto } from "@/app/types/Index";
import { Power, PowerOff, Trash2, Edit3 } from "lucide-react";
import toast from "react-hot-toast";


export const ProductList = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");

  const fetchProdutos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("tenant_id", TENANT_ID_MACIEL)
        .order("id", { ascending: false });

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
    if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
    const handleRefresh = () => {
      setLoading(true);
      fetchProdutos();
    };
    window.addEventListener("refreshProducts", handleRefresh);
    return () => window.removeEventListener("refreshProducts", handleRefresh);
  }, [fetchProdutos]);

  const toggleStatus = async (id: string | number, statusAtual: boolean) => {
    try {
      const { error } = await supabase
        .from("produtos")
        .update({ disponivel: !statusAtual })
        .eq("id", id)
        .eq("tenant_id", TENANT_ID_MACIEL);

      if (error) throw error;
      toast.success(statusAtual ? "Produto Pausado ⏸️" : "Produto Ativo ✅");
      setProdutos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, disponivel: !statusAtual } : p)),
      );
    } catch {
      toast.error("Erro ao mudar status");
    }
  };

  const deletar = async (id: string | number, imageUrl?: string) => {
    if (!confirm("Remover este item definitivamente?")) return;
    try {
      if (imageUrl) {
        const urlParts = imageUrl.split("/");
        const fileName = urlParts[urlParts.length - 1];
        if (fileName) {
          await supabase.storage
            .from("produtos")
            .remove([`${TENANT_ID_MACIEL}/${fileName}`]);
        }
      }
      const { error } = await supabase
        .from("produtos")
        .delete()
        .eq("id", id)
        .eq("tenant_id", TENANT_ID_MACIEL);
      if (error) throw error;
      toast.success("Item removido!");
      fetchProdutos();
    } catch (error: unknown) {
      const mensagem =
        error instanceof Error ? error.message : "Erro ao excluir.";
      toast.error(mensagem);
    }
  };

  const getEmoji = (nome: string) => {
    const n = nome.toLowerCase();
    if (n.includes("artesanais")) return "🍔✨";
    if (n.includes("hamb")) return "🍔";
    if (n.includes("adic") || n.includes("extra")) return "➕";
    if (n.includes("sorvete")) return "🍦";
    if (n.includes("açai")) return "🍧";
    if (n.includes("bebida")) return "🥤";
    if (n.includes("cuscuz")) return "🍲";
    if (n.includes("batata")) return "🍟";
    return "📦";
  };

const produtosFiltrados = useMemo(() => {
  const buscaLimpa = busca.trim().toLowerCase();
  const categoriaAlvo = filtroCategoria.trim().toLowerCase();

  return produtos.filter((p) => {
    const nomeValido = (p?.nome || "").toLowerCase();
    const categoriaProd = (p?.categoria_nome || "Sem Categoria")
      .trim()
      .toLowerCase();

    const matchesBusca = nomeValido.includes(buscaLimpa);

    const matchesCategoria =
      filtroCategoria === "Todas" ||
      categoriaProd === categoriaAlvo;

    return matchesBusca && matchesCategoria;
  });
}, [busca, filtroCategoria, produtos]);

  if (loading) {
    return (
      <div className="py-20 text-center opacity-20 animate-pulse font-black uppercase tracking-[0.3em]">
        Sincronizando Cardápio...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* BARRA DE BUSCA E FILTROS */}
      <div className="sticky top-0 z-10 bg-[#1a011a] pb-4 space-y-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-white/5 border border-white/10 p-5 pl-12 rounded-2xl text-white font-bold outline-none focus:border-[#ffcc00] transition-all"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
            🔍
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          <button
            onClick={() => setFiltroCategoria("Todas")}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex-shrink-0 ${
              filtroCategoria === "Todas"
                ? "bg-[#ffcc00] text-[#3b013b]"
                : "bg-white/5 text-white/40"
            }`}
          >
            🏠 Todas
          </button>

          {Array.from(new Set(produtos.map((p) => p.categoria_nome)))
            .sort((a, b) => {
              const lowA = a.toLowerCase();
              const lowB = b.toLowerCase();

              if (lowA.includes("artesanais")) return -1;
              if (lowB.includes("artesanais")) return 1;

              if (lowA.includes("hamb")) return -1;
              if (lowB.includes("hamb")) return 1;

              if (lowA.includes("cuscuz")) return -1;
              if (lowB.includes("cuscuz")) return 1;

              if (lowA.includes("adic") || lowA.includes("extra")) return -1;
              if (lowB.includes("adic") || lowB.includes("extra")) return 1;

              return a.localeCompare(b);
            })
            .map((cat) => (
              <button
                key={cat}
                onClick={() => setFiltroCategoria(cat)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex-shrink-0 flex items-center gap-2 ${
                  filtroCategoria === cat
                    ? "bg-[#ffcc00] text-[#3b013b]"
                    : "bg-white/5 text-white/40"
                }`}
              >
                <span className="text-xs">{getEmoji(cat)}</span>
                {cat}
              </button>
            ))}
        </div>
      </div>

      {/* LISTAGEM DOS PRODUTOS COM BLINDAGEM */}
      <div className="grid gap-3">
        {produtosFiltrados.length === 0 ? (
          <div className="p-10 border border-dashed border-white/10 rounded-[2rem] text-center text-white/20 text-sm italic">
            Nenhum item encontrado.
          </div>
        ) : (
          produtosFiltrados.map((p) => (
            <div
              key={p.id}
              className={`flex justify-between items-center p-3 md:p-4 rounded-[2.2rem] border transition-all group w-full overflow-hidden ${
                p.disponivel
                  ? "bg-white/5 border-white/5 hover:border-white/10"
                  : "bg-red-500/5 border-red-500/10 grayscale opacity-60"
              }`}
            >
              {/* ESQUERDA: Agrupador de Imagem e Info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Status Power - Fixo */}
                <button
                  onClick={() => toggleStatus(p.id, p.disponivel ?? true)}
                  className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl flex-none transition-colors ${
                    p.disponivel
                      ? "bg-green-500/10 text-green-500"
                      : "bg-red-500/20 text-red-500"
                  }`}
                >
                  {p.disponivel ? <Power size={16} /> : <PowerOff size={16} />}
                </button>

                {/* Imagem - Fixa */}
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden border border-white/10 flex-none bg-black/40">
                 <img
  src={
    p.imagem_url ||
    p.image ||
    "https://placehold.co/150/png"
  }
  loading="lazy" 
  decoding="async"
  className="w-full h-full object-cover"
  alt={p.nome}
  onError={(e) => {
    const img = e.currentTarget;

    if (!img.dataset.fallback) {
      img.dataset.fallback = "true";

      img.src =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    }
  }}
/>
                </div>

<div className="min-w-0 flex-1">
  <div className="flex items-center gap-2 mb-0.5">
    <span className="text-[7px] md:text-[8px] text-[#ffcc00] font-bold uppercase tracking-wider block truncate">
      {p.categoria_nome}
    </span>

    {p.categoria_nome?.toLowerCase().includes("monte seu cuscuz") && (
      <span className="bg-[#ffcc00] text-[#3b013b] text-[7px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">
        Combo • {p.qtd_sabores_gratis || 2} Recheios
      </span>
    )}
  </div>

  <p
    className={`font-bold text-xs md:text-sm leading-tight truncate ${
      p.disponivel ? "text-white" : "text-white/30"
    }`}
  >
    {p.nome}
  </p>

  <div className="flex items-center gap-2">
    <p className="text-[#ffcc00] font-black italic text-[11px] md:text-sm">
      R$ {p.preco.toFixed(2)}
    </p>

    {/* 🔥 INDICADOR DE ITEM GRÁTIS */}
    {p.preco === 0 && (
      <span className="text-[9px] text-green-400 font-bold uppercase italic">
        (Grátis no Combo)
      </span>
    )}
  </div>
</div> 

              {/* DIREITA: Botões de Ação - BLINDADOS (flex-none) */}
              <div className="flex gap-1.5 ml-2 flex-none">
                <button
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("editProduct", { detail: p }),
                    )
                  }
                  className="h-9 w-9 md:h-10 md:w-10 bg-white/10 text-white border border-white/10 rounded-xl flex items-center justify-center hover:bg-[#ffcc00] hover:text-[#3b013b] transition-all active:scale-90"
                  title="Editar Produto"
                >
                  <Edit3 size={15} />
                </button>

                <button
                  onClick={() => deletar(p.id, p.imagem_url || p.image)}
                  className="h-9 w-9 md:h-10 md:w-10 bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all active:scale-90"
                  title="Excluir Produto"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
        </div>
          ))
        )}
        
      </div>
    </div>
    
  );
};
