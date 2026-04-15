"use client";

import { useState, useEffect, Suspense, useMemo } from "react";import { AnimatePresence } from "framer-motion";
import { Toaster, toast } from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

// Componentes
import { Header } from "@/app/components/layout/Header";
import { ProductCard } from "@/app/components/menu/ProductCard";
import { CheckoutForm } from "@/app/components/cart/CheckoutForm";
import { Footer } from "@/app/components/layout/Footer";
import { Produto, Complemento, ComplementoSelecao } from "@/app/types/Index";
import { SelectionModal } from "@/app/components/menu/SelectionModal";

type Categoria = {
  id: string;
  nome: string;
  emoji: string;
  ordem: number;
};

const TENANT_ID_MACIEL = "656f416f-3cf7-4c2e-97b4-53e1d13bc00d";

function HomeContent() {
  const searchParams = useSearchParams();
  const mesaURL = searchParams.get("mesa");

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [complementos, setComplementos] = useState<Complemento[]>([]);
  const [carrinho, setCarrinho] = useState<Produto[]>([]);
  const [catAtiva, setCatAtiva] = useState("Todos");
  const [etapa, setEtapa] = useState<"menu" | "checkout">("menu");
  const [animarCarrinho, setAnimarCarrinho] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lojaAberta, setLojaAberta] = useState(true);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState<"delivery" | "retirada" | "mesa">("delivery");

  // PERSISTÊNCIA
  useEffect(() => {
    const carrinhoSalvo = localStorage.getItem("@PointMaciel:carrinho");
    if (carrinhoSalvo) {
      try { setCarrinho(JSON.parse(carrinhoSalvo)); } catch {}
    }
    const nomeSalvo = localStorage.getItem("@PointMaciel:nome");
    if (nomeSalvo) setNome(nomeSalvo);
  }, []);

  useEffect(() => {
    localStorage.setItem("@PointMaciel:carrinho", JSON.stringify(carrinho));
  }, [carrinho]);

  useEffect(() => {
    if (mesaURL) setTipoEntrega("mesa");
  }, [mesaURL]);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoading(true);
        const [resCat, resProd, resConfig, resComp] = await Promise.all([
          supabase.from("categorias").select("*").eq("tenant_id", TENANT_ID_MACIEL).order("ordem", { ascending: true }),
          supabase.from("produtos").select("*").eq("tenant_id", TENANT_ID_MACIEL).order("id", { ascending: false }),
          supabase.from("config_loja").select("esta_aberta").eq("tenant_id", TENANT_ID_MACIEL).single(),
          supabase.from("complementos").select("*").eq("tenant_id", TENANT_ID_MACIEL)
        ]);

        if (resCat.error) throw resCat.error;
        if (resProd.error) throw resProd.error;

        setCategorias(resCat.data || []);
        setProdutos(resProd.data || []);
        setComplementos(resComp.data || []);
        if (resConfig.data) setLojaAberta(resConfig.data.esta_aberta);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar cardápio");
      } finally {
        setLoading(false);
      }
    };
    carregarDados();
  }, []);

  const total = carrinho.reduce((acc, item) => acc + item.preco, 0);

  const handleFinalizadoComSucesso = () => {
    localStorage.setItem("@PointMaciel:nome", nome);
    setCarrinho([]);
    localStorage.removeItem("@PointMaciel:carrinho");
    setEtapa("menu");
    toast.success("Pedido enviado!", { duration: 5000, icon: "🔥" });
  };

const handleAdd = (p: Produto) => {
  const pCat = p.categoria_nome?.trim().toLowerCase() || "";
  
  const temComplementos = complementos.some((c) => {
    const cPai = c.categoria_pai?.trim().toLowerCase() || "";
    return pCat.includes(cPai) || cPai.includes(pCat);
  });

  // Se for gelado (açai/sorvete) ou tiver complementos, abre o modal
  if (pCat.includes('sorvete') || pCat.includes('açaí') || temComplementos) {
    setProdutoSelecionado(p);
    return;
  }

  setCarrinho((prev) => [...prev, p]);
  setAnimarCarrinho(true);
  toast.success(`${p.nome} adicionado!`, { position: "bottom-center" });
  setTimeout(() => setAnimarCarrinho(false), 300);
};

  const confirmarAdicaoModal = (p: Produto, qtdTotal: number, extras?: ComplementoSelecao[]) => {
    const precoExtras =
      extras?.reduce((acc, comp) => {
        return acc + (comp.preco || 0) * comp.quantidade_selecionada;
      }, 0) || 0;

    const extrasTexto = extras?.length
      ? extras.map((e) => `${e.quantidade_selecionada}x ${e.nome}`).join(", ")
      : "";

    const descricaoFinal = p.descricao
      ? `${p.descricao}${extrasTexto ? ` + [${extrasTexto}]` : ""}`
      : extrasTexto;

    const produtoComExtras: Produto = {
      ...p,
      preco: p.preco + precoExtras,
      descricao: descricaoFinal,
    };

    setCarrinho((prev) => [...prev, produtoComExtras]);
    setAnimarCarrinho(true);
    setProdutoSelecionado(null);
    toast.success(`${p.nome} adicionado!`, { position: "bottom-center" });
    setTimeout(() => setAnimarCarrinho(false), 300);
  };

  const handleRemove = (index: number) => {
    setCarrinho((prev) => prev.filter((_, i) => i !== index));
  };
const produtosFiltrados = useMemo(() => {
  if (catAtiva === "Todos") return produtos;
  
  return produtos.filter((p: Produto) => { 
    const pCat = p.categoria_nome?.trim().toLowerCase() || "";
    const activeCat = catAtiva.trim().toLowerCase();
    
    return pCat.includes(activeCat) || activeCat.includes(pCat);
  });
}, [catAtiva, produtos]);
  return (
    <>
      <Toaster position="top-center" />

      {!lojaAberta && !loading && (
        <div className="bg-red-600 text-white py-2 text-center font-black uppercase text-[9px] tracking-[0.3em] sticky top-0 z-50 animate-pulse">
          🚫 LOJA FECHADA • NÃO ESTAMOS RECEBENDO PEDIDOS
        </div>
      )}

      <Header cartCount={carrinho.length} isAnimating={animarCarrinho} />

      {etapa === "menu" ? (
        <div className="pb-40">
          <nav className="flex gap-2 overflow-x-auto px-6 py-6 sticky top-0 bg-[#1a011a]/90 backdrop-blur-md z-30 no-scrollbar">
            <button
              onClick={() => setCatAtiva("Todos")}
              className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${
                catAtiva === "Todos" ? "bg-[#ffcc00] text-[#3b013b]" : "bg-white/5 text-white/40"
              }`}
            >
              🏠 Todos
            </button>
            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCatAtiva(cat.nome)}
                className={`px-6 py-3 rounded-2xl font-black text-[10px] flex gap-2 items-center transition-all ${
                  catAtiva === cat.nome ? "bg-[#ffcc00] text-[#3b013b] scale-105 shadow-lg shadow-yellow-400/20" : "bg-white/5 text-white/40"
                }`}
              >
                <span>{cat.emoji}</span>
                <span className="uppercase">{cat.nome}</span>
              </button>
            ))}
          </nav>

          <section className="px-6 grid gap-4 max-w-2xl mx-auto">
            {loading ? (
              <div className="py-20 text-center opacity-20 animate-pulse font-black uppercase text-[10px] tracking-widest">Sincronizando...</div>
            ) : produtosFiltrados.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {produtosFiltrados.map((p) => (
                  <ProductCard key={p.id} produto={p} onAdd={handleAdd} />
                ))}
              </AnimatePresence>
            ) : (
              <div className="py-20 text-center text-white/20 italic">Nenhum item nesta categoria</div>
            )}
          </section>

          <Footer />
        </div>
      ) : (
        <CheckoutForm
          carrinho={carrinho}
          total={total}
          nome={nome}
          setNome={setNome}
          endereco={endereco}
          setEndereco={setEndereco}
          tipoEntrega={tipoEntrega}
          setTipoEntrega={setTipoEntrega}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onBack={() => setEtapa("menu")}
          onConfirm={handleFinalizadoComSucesso}
          lojaAberta={lojaAberta}
        />
      )}

      <SelectionModal
        key={produtoSelecionado?.id || "vazio"}
        produto={produtoSelecionado}
        complementos={complementos}
        onClose={() => setProdutoSelecionado(null)}
        onConfirm={confirmarAdicaoModal}
      />

      {carrinho.length > 0 && etapa === "menu" && (
        <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[#1a011a] via-[#1a011a]/80 to-transparent z-40">
          <div className="max-w-2xl mx-auto">
            {lojaAberta ? (
              <button
                onClick={() => setEtapa("checkout")}
                className="w-full bg-[#ffcc00] text-[#3b013b] h-16 rounded-[2rem] font-black flex justify-between items-center px-8 shadow-[0_20px_50px_rgba(255,204,0,0.3)] active:scale-95 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-[#3b013b] text-[#ffcc00] w-8 h-8 rounded-xl flex items-center justify-center text-xs">
                    {carrinho.length}
                  </div>
                  <span className="uppercase text-[11px] tracking-[0.2em]">Ver Pedido</span>
                </div>
                <span className="text-2xl font-black italic">R$ {total.toFixed(2)}</span>
              </button>
            ) : (
              <div className="w-full bg-white/5 border border-white/10 p-4 rounded-[2rem] text-center backdrop-blur-md">
                <span className="text-[10px] font-black uppercase text-white/20 tracking-widest">
                  Loja Fechada
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#1a011a] text-white">
      <Suspense fallback={<div className="p-10 text-center opacity-20">Iniciando...</div>}>
        <HomeContent />
      </Suspense>
    </main>
  );
}