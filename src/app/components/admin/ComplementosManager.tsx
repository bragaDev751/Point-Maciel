"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase, TENANT_ID_MACIEL } from "@/lib/supabase";
import { toast } from "react-hot-toast";
import { Trash2, Power, PowerOff, IceCream, PlusCircle } from "lucide-react";

interface ComplementoItem {
  id: string;
  nome: string;
  preco: number;
  categoria_pai: string;
  tenant_id: string;
  disponivel: boolean;
  tipo: "sabor" | "extra";
}

const CATEGORIAS = [
  "Sorvete",
  "Açaí",
  "Hambúrgueres",
  "Cuscuz",
  "Monte seu Cuscuz",
];
export function ComplementosManager() {
  const [itens, setItens] = useState<ComplementoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    nome: "",
    preco: "0",
    categoria_pai: CATEGORIAS[0],
    tipo: "sabor" as "sabor" | "extra",
  });

  const carregar = useCallback(async () => {
    if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("complementos")
        .select("*")
        .eq("tenant_id", TENANT_ID_MACIEL)
        .order("categoria_pai");

      if (error) throw error;
      const itensNormalizados = (data || []).map((item) => ({
        ...item,
        categoria_pai: item.categoria_pai?.trim() || "",
      }));

      setItens(itensNormalizados);
    } catch (err) {
      toast.error("Erro ao carregar complementos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function toggleStatus(id: string, statusAtual: boolean) {
    const { error } = await supabase
      .from("complementos")
      .update({ disponivel: !statusAtual })
      .eq("id", id);

    if (!error) {
      toast.success(statusAtual ? "Item esgotado!" : "Item disponível!");
      setItens((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, disponivel: !statusAtual } : item,
        ),
      );
    } else {
      toast.error("Erro ao mudar status");
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome) return toast.error("Nome obrigatório");

    const categoriaParaSalvar = form.categoria_pai.trim();

    const precoFinal =
      form.tipo === "sabor" && form.categoria_pai === "Monte seu Cuscuz"
        ? 0
        : parseFloat(form.preco.replace(",", "."));

    const { error } = await supabase.from("complementos").insert([
      {
        nome: form.nome.trim(),
        preco: precoFinal,
        categoria_pai: categoriaParaSalvar,
        tipo: form.tipo,
        tenant_id: TENANT_ID_MACIEL,
        disponivel: true,
      },
    ]);

    if (!error) {
      toast.success("Adicionado com sucesso!");
      setForm((prev) => ({ ...prev, nome: "", preco: "0" }));
      carregar();
    } else {
      toast.error("Erro ao salvar no banco.");
    }
  }

  async function excluir(id: string) {
    if (!confirm("Excluir item permanentemente?")) return;
    const { error } = await supabase.from("complementos").delete().eq("id", id);

    if (!error) {
      toast.success("Removido");
      carregar();
    } else {
      toast.error("Erro ao excluir");
    }
  }
  const isGratis =
    form.tipo === "sabor" && form.categoria_pai === "Monte seu Cuscuz";
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* FORMULÁRIO DE CADASTRO */}
      <div className="lg:col-span-4">
        <form
          onSubmit={handleAdd}
          className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 sticky top-8 backdrop-blur-md"
        >
          <h2 className="text-[#ffcc00] font-black text-xs uppercase italic tracking-[0.2em] mb-4">
            Novo Item / Sabor
          </h2>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-white/20 ml-2 italic">
              Nome do Complemento
            </label>
            <input
              placeholder="Ex: Chocolate, Morango, Granulado"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full p-4 bg-black/40 rounded-2xl border border-white/10 outline-none focus:border-[#ffcc00] text-sm text-white transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-white/20 ml-2 italic">
              Preço Adicional (R$)
            </label>
            <input
              placeholder="0,00"
              value={isGratis ? "0" : form.preco}
              disabled={isGratis}
              onChange={(e) => setForm({ ...form, preco: e.target.value })}
              className="w-full p-4 bg-black/40 rounded-2xl border border-white/10 outline-none focus:border-[#ffcc00] text-sm text-white transition-all disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-white/20 ml-2 italic">
                Categoria
              </label>
              <select
                value={form.categoria_pai}
                onChange={(e) => {
                  const novaCategoria = e.target.value;

                  setForm((prev) => ({
                    ...prev,
                    categoria_pai: novaCategoria,

                    tipo:
                      novaCategoria === "Monte seu Cuscuz"
                        ? "sabor"
                        : prev.tipo,
                  }));
                }}
                className="w-full p-4 bg-black/40 rounded-2xl border border-white/10 outline-none focus:border-[#ffcc00] text-xs appearance-none text-white font-bold"
              >
                {CATEGORIAS.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#0f010f]">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-white/20 ml-2 italic">
                Tipo de Item
              </label>
              <select
                value={form.tipo}
                disabled={form.categoria_pai === "Monte seu Cuscuz"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tipo: e.target.value as "sabor" | "extra",
                  })
                }
                className="w-full p-4 bg-black/40 rounded-2xl border border-white/10 outline-none focus:border-[#ffcc00] text-xs appearance-none text-[#ffcc00] font-bold"
              >
                <option value="sabor" className="bg-[#0f010f]">
                  Massa/Sabor
                </option>
                <option value="extra" className="bg-[#0f010f]">
                  Extra/Toping
                </option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#ffcc00] text-[#3b013b] py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-yellow-400/5 active:scale-95 transition-all mt-4 flex items-center justify-center gap-2"
          >
            <PlusCircle size={16} />
            Salvar no Cardápio
          </button>
        </form>
      </div>

      {/* LISTAGEM */}
      <div className="lg:col-span-8 space-y-12">
        {CATEGORIAS.map((cat) => {
          const itensDaCategoria = itens.filter((i) => {
            const nomeCat = (i.categoria_pai || "").trim().toLowerCase();
            const catAlvo = cat.trim().toLowerCase();

            if (catAlvo === "monte seu cuscuz") {
              return nomeCat === catAlvo;
            }

            return nomeCat === catAlvo;
          });

          if (itensDaCategoria.length === 0) return null;

          return (
            <div key={cat} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-[#ffcc00]/10 rounded-lg">
                  <IceCream size={16} className="text-[#ffcc00]" />
                </div>
                <h3 className="text-sm font-black uppercase text-white italic tracking-[0.2em]">
                  {cat}
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
              </div>

              {["sabor", "extra"].map((subTipo) => {
                const itensFiltrados = itensDaCategoria.filter(
                  (i) => i.tipo === subTipo,
                );

                return (
                  <div key={subTipo} className="space-y-3">
                    <h4 className="text-[9px] font-black uppercase text-white/30 ml-2 tracking-widest">
                      {subTipo === "sabor"
                        ? "🍦 Sabores / Massas"
                        : "✨ Acompanhamentos / Extras"}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {loading ? (
                        <div className="h-20 bg-white/5 animate-pulse rounded-3xl md:col-span-2" />
                      ) : itensFiltrados.length === 0 ? (
                        <p className="text-[10px] text-white/10 italic p-4 border border-dashed border-white/5 rounded-2xl md:col-span-2 text-center">
                          Nenhum item cadastrado nesta subcategoria.
                        </p>
                      ) : (
                        itensFiltrados.map((item) => (
                          <div
                            key={item.id}
                            className={`flex justify-between items-center bg-white/5 p-4 rounded-[1.5rem] border transition-all ${
                              item.disponivel
                                ? "border-white/5"
                                : "border-red-500/20 opacity-60 grayscale"
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() =>
                                  toggleStatus(item.id, item.disponivel)
                                }
                                className={`w-11 h-11 flex items-center justify-center rounded-2xl ${
                                  item.disponivel
                                    ? "bg-green-500/10 text-green-500"
                                    : "bg-red-500/10 text-red-500"
                                }`}
                              >
                                {item.disponivel ? (
                                  <Power size={18} />
                                ) : (
                                  <PowerOff size={18} />
                                )}
                              </button>

                              <div>
                                <p className="text-sm font-bold uppercase text-white">
                                  {item.nome}
                                </p>
                                <p className="text-[#ffcc00] text-[10px] font-black">
                                  {item.preco === 0
                                    ? "GRÁTIS"
                                    : `+ R$ ${Number(item.preco).toFixed(2)}`}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => excluir(item.id)}
                              className="p-3 text-white/20 hover:text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
