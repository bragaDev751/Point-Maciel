"use client";

import { useEffect, useState } from "react";
import { supabase, TENANT_ID_MACIEL } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Printer } from "lucide-react";

/* ================= TYPES ================= */

interface ItemPedido {
  id: string;
  nome: string;
  qtd: number;
  preco: number;
  detalhes?: string;
}

type StatusPedido = "novo" | "preparando" | "pronto" | "finalizado";
type TipoPedido = "delivery" | "retirada" | "mesa";

interface Pedido {
  id: string;
  cliente_nome: string;
  cliente_telefone?: string;
  tipo_pedido: TipoPedido;
  mesa_numero?: string;
  endereco?: string;
  itens: ItemPedido[] | null;
  total_pedido: number;
  status: StatusPedido;
  metodo_pagamento?: string;
  created_at: string;
}

export function CozinhaMonitor() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  /* ================= HELPERS (Lógica Blindada) ================= */

  const safeItens = (itens: Pedido["itens"]): ItemPedido[] => {
    if (!itens) return [];
    if (Array.isArray(itens)) return itens;
    return [];
  };

  /* ================= LOAD + REALTIME ================= */

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
        console.error("Erro na busca:", err);
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
                prev.map((p) => (p.id === atualizado.id ? atualizado : p)),
              );
            }
          } else if (payload.eventType === "DELETE") {
            const antigo = payload.old as { id: string };
            setPedidos((prev) => prev.filter((p) => p.id !== antigo.id));
          }
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  /* ================= ACTIONS ================= */

  const atualizarStatus = async (id: string, novoStatus: StatusPedido) => {
    await supabase.from("pedidos").update({ status: novoStatus }).eq("id", id);
  };

  const excluirPedido = async (id: string) => {
    if (!window.confirm("Deseja excluir permanentemente este pedido?")) return;
    await supabase.from("pedidos").delete().eq("id", id);
  };

  /* ================= PRINT FUNCTION (Layout Térmico) ================= */

  const imprimirPedido = (pedido: Pedido) => {
    const itens = safeItens(pedido.itens);
    const dataFormatada = new Date(pedido.created_at).toLocaleString("pt-BR");
    const win = window.open("", "PRINT", "height=600,width=400");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <style>
            body { font-family: monospace; width: 280px; padding: 10px; margin: 0; }
            .center { text-align: center; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            .item { font-size: 12px; margin-bottom: 4px; }
            .det { font-size: 10px; margin-left: 10px; font-style: italic; }
            .total { font-weight: bold; text-align: right; margin-top: 10px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="center">
            <strong>POINT MACIEL</strong><br/>
            ${dataFormatada}<br/>
            ID: #${pedido.id.slice(0, 5).toUpperCase()}
          </div>
          <div class="divider"></div>
          <div>
            <strong>${pedido.cliente_nome}</strong><br/>
            ${pedido.tipo_pedido.toUpperCase()}<br/>
            ${pedido.mesa_numero ? `Mesa: ${pedido.mesa_numero}<br/>` : ""}
            ${pedido.endereco ? `End: ${pedido.endereco}<br/>` : ""}
          </div>
          <div class="divider"></div>
          ${itens
            .map(
              (i) => `
            <div class="item">
              ${i.qtd || 1}x ${i.nome}
              ${i.detalhes ? `<div class="det">${i.detalhes}</div>` : ""}
            </div>
          `,
            )
            .join("")}
          <div class="divider"></div>
          <div>Pagamento: ${pedido.metodo_pagamento || "Não informado"}</div>
          <div class="total">TOTAL: R$ ${pedido.total_pedido.toFixed(2)}</div>
          <div class="center" style="margin-top: 20px; font-size: 10px;">VisualStack System</div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 250);
  };

  /* ================= UI CONFIG ================= */

  const colunas: { id: StatusPedido; titulo: string; cor: string }[] = [
    { id: "novo", titulo: "📥 Novos", cor: "text-blue-400 bg-blue-500/10" },
    {
      id: "preparando",
      titulo: "🔥 Preparando",
      cor: "text-orange-400 bg-orange-500/10",
    },
    {
      id: "pronto",
      titulo: "✅ Prontos",
      cor: "text-green-400 bg-green-500/10",
    },
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
            <div
              className={`p-4 rounded-2xl border border-white/5 font-black uppercase text-[10px] tracking-widest ${col.cor}`}
            >
              {col.titulo} ({pedidosColuna.length})
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {pedidosColuna.map((pedido) => {
                  const itens = safeItens(pedido.itens);

                  return (
                    <motion.div
                      key={pedido.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-white/5 border border-white/10 p-5 rounded-[2rem] backdrop-blur-sm relative group"
                    >
                      {/* AÇÕES NO TOPO (Imprimir e Excluir) */}
                      <div className="absolute top-4 right-4 flex gap-2 z-20">
                        <button
                          onClick={() => imprimirPedido(pedido)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:bg-[#ffcc00] hover:text-black transition-all"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          onClick={() => excluirPedido(pedido.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="flex justify-between items-start mb-3">
                        <div className="pr-12 w-full">
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

                          {pedido.tipo_pedido === "delivery" &&
                            pedido.endereco && (
                              <div className="bg-white/5 p-2 rounded-lg mt-2 border border-white/5">
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

                      {/* LISTA DE ITENS */}
                      <div className="border-t border-white/5 pt-3 mb-4 space-y-2">
                        {itens.length > 0 ? (
                          itens.map((item, i) => (
                            <div
                              key={i}
                              className="text-xs font-bold text-white/70"
                            >
                              <span className="text-[#ffcc00] mr-2">
                                {item.qtd || 1}x
                              </span>
                              {item.nome}
                              {item.detalhes && (
                                <p className="text-[9px] text-white/40 italic font-medium ml-6">
                                  {item.detalhes}
                                </p>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-red-400/50 italic">
                            Nenhum item detalhado
                          </p>
                        )}
                      </div>

                      {/* WHATSAPP */}
                      {pedido.cliente_telefone && (
                        <button
                          onClick={() => {
                            const msg = `Olá ${pedido.cliente_nome}, seu pedido está pronto! 🛵`;
                            window.open(
                              `https://wa.me/${pedido.cliente_telefone?.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`,
                              "_blank",
                            );
                          }}
                          className="mb-3 w-full border border-green-500/30 text-green-500 py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-green-500 hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                          📱 Avisar no WhatsApp
                        </button>
                      )}

                      {/* BOTÕES DE STATUS */}
                      <div className="flex gap-2">
                        {pedido.status === "novo" && (
                          <button
                            onClick={() =>
                              atualizarStatus(pedido.id, "preparando")
                            }
                            className="w-full bg-blue-500 py-3 rounded-xl text-[10px] font-black uppercase text-white hover:bg-blue-600 shadow-lg shadow-blue-500/10"
                          >
                            Preparar
                          </button>
                        )}
                        {pedido.status === "preparando" && (
                          <button
                            onClick={() => atualizarStatus(pedido.id, "pronto")}
                            className="w-full bg-orange-500 py-3 rounded-xl text-[10px] font-black uppercase text-black hover:bg-orange-600 shadow-lg shadow-orange-500/10"
                          >
                            Pronto
                          </button>
                        )}
                        {pedido.status === "pronto" && (
                          <button
                            onClick={() =>
                              atualizarStatus(pedido.id, "finalizado")
                            }
                            className="w-full bg-green-500 py-3 rounded-xl text-[10px] font-black uppercase text-black hover:bg-green-600 shadow-lg shadow-green-500/10"
                          >
                            Finalizar
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

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
