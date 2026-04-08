"use client";

import { useEffect, useState } from "react";
import { supabase, TENANT_ID_MACIEL } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

interface ItemPedido {
  id: string;
  nome: string;
  qtd: number;
  preco: number;
}

interface Pedido {
  id: string;
  cliente_nome: string;
  cliente_telefone?: string; 
  tipo_pedido: "delivery" | "retirada" | "mesa";
  mesa_numero?: string;
  endereco?: string;
  itens: ItemPedido[];
  total_pedido: number;
  status: "novo" | "preparando" | "pronto" | "finalizado";
  created_at: string;
}

export function CozinhaMonitor() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const carregarPedidos = async () => {
      try {
        const { data, error } = await supabase
          .from("pedidos")
          .select("*")
          .eq("tenant_id", TENANT_ID_MACIEL)
          .neq("status", "finalizado")
          .order("created_at", { ascending: true });

        if (!error && data && isMounted) {
          setPedidos(data as Pedido[]);
        }
      } catch (err) {
        console.error("Erro na busca inicial:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    carregarPedidos();

    const channel = supabase
      .channel("realtime_cozinha")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos",
          filter: `tenant_id=eq.${TENANT_ID_MACIEL}`,
        },
        (payload) => {
          if (!isMounted) return;

          if (payload.eventType === "INSERT") {
            const novo = payload.new as Pedido;
            setPedidos((prev) => [...prev, novo]);
            new Audio("/notification.mp3").play().catch(() => {});
          } else if (payload.eventType === "UPDATE") {
            const atualizado = payload.new as Pedido;

            if (atualizado.status === "finalizado") {
              setPedidos((prev) => prev.filter((p) => p.id !== atualizado.id));
            } else {
              setPedidos((prev) =>
                prev.map((p) => (p.id === atualizado.id ? atualizado : p))
              );
            }
          } else if (payload.eventType === "DELETE") {
            setPedidos((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const atualizarStatus = async (id: string, novoStatus: Pedido["status"]) => {
    const { error } = await supabase
      .from("pedidos")
      .update({ status: novoStatus })
      .eq("id", id);

    if (error) console.error("Erro ao atualizar:", error);
  };

  const excluirPedido = async (id: string) => {
    const confirmacao = window.confirm(
      "Tem certeza que deseja excluir permanentemente este pedido?"
    );
    if (!confirmacao) return;

    const { error } = await supabase.from("pedidos").delete().eq("id", id);

    if (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir o pedido.");
    } else {
      setPedidos((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const colunas: { id: Pedido["status"]; titulo: string; cor: string }[] = [
    { id: "novo", titulo: "📥 Novos", cor: "text-blue-400 bg-blue-500/10" },
    { id: "preparando", titulo: "🔥 Preparando", cor: "text-orange-400 bg-orange-500/10" },
    { id: "pronto", titulo: "✅ Prontos", cor: "text-green-400 bg-green-500/10" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/20 font-black uppercase tracking-[0.3em] animate-pulse italic">
          Sincronizando Cozinha...
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      {colunas.map((col) => {
        const pedidosColuna = pedidos.filter((p) => p.status === col.id);

        return (
          <div key={col.id} className="flex flex-col gap-4">
            <div className={`p-4 rounded-2xl border border-white/5 font-black uppercase text-[10px] tracking-widest ${col.cor}`}>
              {col.titulo} ({pedidosColuna.length})
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {pedidosColuna.map((pedido) => (
                  <motion.div
                    key={pedido.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-white/5 border border-white/10 p-5 rounded-[2rem] backdrop-blur-sm relative group"
                  >
                    {/* Botão de Excluir */}
                    <button
                      onClick={() => excluirPedido(pedido.id)}
                      className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                    >
                      ✕
                    </button>

                    {/* Cabeçalho do Card */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="pr-8 w-full">
                        <p className="text-[9px] font-black uppercase text-[#ffcc00] mb-1">
                          {pedido.tipo_pedido === "mesa"
                            ? `📍 Mesa ${pedido.mesa_numero}`
                            : pedido.tipo_pedido === "delivery"
                            ? "🛵 Delivery"
                            : "🥡 Retirada"}
                        </p>

                        <h3 className="font-black uppercase text-sm italic text-white leading-tight">
                          {pedido.cliente_nome}
                        </h3>

                        {/* Endereço Detalhado */}
                        {pedido.tipo_pedido === "delivery" && pedido.endereco && (
                          <div className="bg-white/5 p-2 rounded-lg mt-2 border border-white/5">
                            <p className="text-[10px] text-[#ffcc00] font-black uppercase mb-0.5">Endereço:</p>
                            <p className="text-[10px] text-white/60 font-bold leading-tight">
                              {pedido.endereco}
                            </p>
                          </div>
                        )}
                      </div>

                      <span className="text-[9px] opacity-30 font-mono">
                        {new Date(pedido.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Itens do Pedido */}
                    <div className="border-t border-white/5 pt-3 mb-4 space-y-1">
                      {pedido.itens.map((item, i) => (
                        <div key={i} className="text-xs font-bold text-white/70">
                          <span className="text-[#ffcc00] mr-2">{item.qtd}x</span>
                          {item.nome}
                        </div>
                      ))}
                    </div>

                    {/* Botão de Aviso WhatsApp (Apenas se houver telefone) */}
                    {pedido.cliente_telefone && (
                      <button
                        onClick={() => {
                          const msg = `Olá ${pedido.cliente_nome}, seu pedido do Point Maciel está pronto e saindo para entrega agora! 🛵 Obrigado!`;
                          const fone = pedido.cliente_telefone?.replace(/\D/g, "") || "";
                          window.open(`https://wa.me/${fone}?text=${encodeURIComponent(msg)}`, "_blank");
                        }}
                        className="mb-3 w-full border border-green-500/30 text-green-500 py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-green-500 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        📱 Avisar no WhatsApp
                      </button>
                    )}

                    {/* Botões de Ação de Status */}
                    <div className="flex gap-2">
                      {pedido.status === "novo" && (
                        <button
                          onClick={() => atualizarStatus(pedido.id, "preparando")}
                          className="w-full bg-blue-500 py-3 rounded-xl text-[10px] font-black uppercase text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/10"
                        >
                          Preparar
                        </button>
                      )}

                      {pedido.status === "preparando" && (
                        <button
                          onClick={() => atualizarStatus(pedido.id, "pronto")}
                          className="w-full bg-orange-500 py-3 rounded-xl text-[10px] font-black uppercase text-black hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/10"
                        >
                          Pronto
                        </button>
                      )}

                      {pedido.status === "pronto" && (
                        <button
                          onClick={() => atualizarStatus(pedido.id, "finalizado")}
                          className="w-full bg-green-500 py-3 rounded-xl text-[10px] font-black uppercase text-black hover:bg-green-600 transition-all shadow-lg shadow-green-500/10"
                        >
                          Entregar / Finalizar
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Estado Vazio para a Coluna */}
              {pedidosColuna.length === 0 && (
                <div className="py-10 border-2 border-dashed border-white/5 rounded-[2rem] flex items-center justify-center">
                  <span className="text-[9px] uppercase font-black text-white/5 tracking-widest italic">
                    Sem pedidos
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}