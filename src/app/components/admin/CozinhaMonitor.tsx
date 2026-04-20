"use client";

import { useEffect, useState, useRef } from "react";
import { supabase, TENANT_ID_MACIEL } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Printer, Smartphone } from "lucide-react";
/* ================= TYPES ================= */
const formatarWhats = (telefone: string) => {
  let limpo = telefone.replace(/\D/g, "");

  if (!limpo.startsWith("55") && limpo.length >= 10 && limpo.length <= 11) {
    limpo = "55" + limpo;
  }

  return limpo;
};
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
  tenant_id: string;
  cliente_nome: string;
  cliente_telefone?: string;
  tipo_pedido: string; 
  mesa_numero?: string;
  mesa?: string; 
  endereco?: string;
  itens: ItemPedido[];
  total_pedido: number;
  status: string;
  metodo_pagamento?: string;
  created_at: string;
  pontos_processados: boolean;
  desconto_fidelidade?: number;
}


export function CozinhaMonitor() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [audioAtivo, setAudioAtivo] = useState(false);
  const audioAtivoRef = useRef(false);

  useEffect(() => {
    audioAtivoRef.current = audioAtivo;
  }, [audioAtivo]);

  /* ================= HELPERS (Lógica Blindada) ================= */

  const safeItens = (itens: Pedido["itens"]): ItemPedido[] => {
    if (!itens) return [];
    if (Array.isArray(itens)) return itens;
    return [];
  };

  /* ================= LOAD + REALTIME ================= */

 useEffect(() => {
  let isMounted = true;

  // ✅ TRAVA PRINCIPAL (EVITA ERRO 400)
  if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("Supabase não inicializado. Verifique seu .env.local");
    return;
  }

  const carregarPedidos = async () => {
    try {
      if (!isMounted) return;

      setLoading(true);

      const { data, error } = await supabase
        .from("pedidos")
        .select("id, tenant_id, cliente_nome, cliente_telefone, tipo_pedido, mesa_numero, endereco, itens, total_pedido, status, created_at, pontos_processados")
        .eq("tenant_id", TENANT_ID_MACIEL)
        .neq("status", "finalizado")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Erro do Banco:", error.message);
        return;
      }

      if (data && isMounted) {
        const pedidosValidados: Pedido[] = (data as unknown[]).map((registro) => {
          const p = registro as Pedido;

          return {
            ...p,
            itens: Array.isArray(p.itens)
              ? (p.itens as ItemPedido[])
              : [],
          };
        });

        setPedidos(pedidosValidados);
      }
    } catch (err) {
      console.error("Erro crítico:", err);
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  carregarPedidos();

  // ✅ PROTEÇÃO NO REALTIME
  const channel = supabase
    .channel("realtime_cozinha")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "pedidos",
      },
      (payload) => {
        if (!isMounted) return;

        const novoPedido = payload.new as Pedido;
        const antigoPedido = payload.old as {
          id: string;
          tenant_id?: string;
        };

        const isDoTenant =
          (novoPedido && novoPedido.tenant_id === TENANT_ID_MACIEL) ||
          (payload.eventType === "DELETE" &&
            antigoPedido?.tenant_id === TENANT_ID_MACIEL);

        if (!isDoTenant) return;

        if (payload.eventType === "INSERT") {
          setPedidos((prev) => [...prev, novoPedido]);

          if (audioAtivoRef.current) {
            new Audio("/notification.mp3")
              .play()
              .catch((e) => console.log("Erro áudio:", e));
          }
        } else if (payload.eventType === "UPDATE") {
          if (novoPedido.status === "finalizado") {
            setPedidos((prev) =>
              prev.filter((p) => p.id !== novoPedido.id),
            );
          } else {
            setPedidos((prev) =>
              prev.map((p) =>
                p.id === novoPedido.id ? novoPedido : p,
              ),
            );
          }
        } else if (payload.eventType === "DELETE") {
          setPedidos((prev) =>
            prev.filter((p) => p.id !== antigoPedido.id),
          );
        }
      },
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.error(
          "Erro no Realtime: provavelmente suas envs não estão carregando",
        );
      }
    });

  return () => {
    isMounted = false;
    supabase.removeChannel(channel);
  };
}, []);

  /* ================= ACTIONS ================= */

  const atualizarStatus = async (pedido: Pedido, novoStatus: StatusPedido) => {
    try {
      const jaProcessado = pedido.pontos_processados;
      if (novoStatus === "finalizado" && jaProcessado) {
        alert("Este pedido já foi pontuado anteriormente.");
        return;
      }
      const { error: errorStatus } = await supabase
        .from("pedidos")
        .update({
          status: novoStatus,
          pontos_processados:
            novoStatus === "finalizado" ? true : pedido.pontos_processados,
        })
        .eq("id", pedido.id);

      if (errorStatus) throw errorStatus;

      if (
        novoStatus === "finalizado" &&
        pedido.cliente_telefone &&
        !jaProcessado
      ) {
        const pontosGanhos = Math.floor(pedido.total_pedido);

        const { data: existente, error: errorBusca } = await supabase
          .from("fidelidade")
          .select("pontos_acumulados")
          .eq("tenant_id", TENANT_ID_MACIEL)
          .eq("cliente_telefone", pedido.cliente_telefone)
          .maybeSingle();

        if (errorBusca) throw errorBusca;

        if (existente) {
          const { error: errorUpdate } = await supabase
            .from("fidelidade")
            .update({
              pontos_acumulados: existente.pontos_acumulados + pontosGanhos,
              cliente_nome: pedido.cliente_nome,
              updated_at: new Date().toISOString(),
            })
            .eq("tenant_id", TENANT_ID_MACIEL)
            .eq("cliente_telefone", pedido.cliente_telefone);

          if (errorUpdate) throw errorUpdate;
        } else {
          const { error: errorInsert } = await supabase
            .from("fidelidade")
            .insert({
              tenant_id: TENANT_ID_MACIEL,
              cliente_telefone: pedido.cliente_telefone,
              cliente_nome: pedido.cliente_nome,
              pontos_acumulados: pontosGanhos,
            });

          if (errorInsert) throw errorInsert;
        }

        console.log(`🎉 ${pontosGanhos} pontos para ${pedido.cliente_nome}`);
      }
    } catch (err) {
      console.error("Erro ao atualizar status/fidelidade:", err);
      alert("Erro ao atualizar pedido.");
    }
  };

  const excluirPedido = async (pedido: Pedido) => {
    if (
      !window.confirm(
        "Deseja excluir permanentemente este pedido? Se pontos foram gerados, eles serão estornados.",
      )
    )
      return;

    try {
      if (pedido.pontos_processados && pedido.cliente_telefone) {
        const pontosParaRemover = Math.floor(pedido.total_pedido);

        const { data: fidelidade, error: errorBusca } = await supabase
          .from("fidelidade")
          .select("pontos_acumulados")
          .eq("tenant_id", TENANT_ID_MACIEL)
          .eq("cliente_telefone", pedido.cliente_telefone)
          .maybeSingle();

        if (errorBusca) throw errorBusca;

        if (fidelidade) {
          const novoSaldo = Math.max(
            0,
            fidelidade.pontos_acumulados - pontosParaRemover,
          );

          const { error: errorEstorno } = await supabase
            .from("fidelidade")
            .update({
              pontos_acumulados: novoSaldo,
              updated_at: new Date().toISOString(),
            })
            .eq("tenant_id", TENANT_ID_MACIEL)
            .eq("cliente_telefone", pedido.cliente_telefone);

          if (errorEstorno) throw errorEstorno;
          console.log(`📉 Estorno realizado: -${pontosParaRemover} pontos.`);
        }
      }

      const { error: errorDelete } = await supabase
        .from("pedidos")
        .delete()
        .eq("id", pedido.id)
        .eq("tenant_id", TENANT_ID_MACIEL);

      if (errorDelete) throw errorDelete;
    } catch (err) {
      console.error("Erro na exclusão/estorno:", err);
      alert("Falha ao excluir o pedido. Tente novamente.");
    }
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
          @page { size: auto; margin: 0mm; }

          body { 
            font-family: 'Courier New', monospace;
            width: 280px;
            padding: 10px;
            margin: 0;
            color: #000;
          }

          .center { text-align: center; }

          .divider { 
            border-bottom: 1px dashed #000; 
            margin: 8px 0; 
          }

          .item {
            font-size: 12px;
            display: flex;
            justify-content: space-between;
          }

          .det {
            font-size: 10px;
            font-style: italic;
            background: #f0f0f0;
            padding: 2px;
            margin-top: 2px;
            display: block;
          }

          .total {
            font-weight: bold;
            text-align: right;
            margin-top: 10px;
            font-size: 14px;
            border-top: 1px solid #000;
            padding-top: 5px;
          }

          .title {
            font-size: 16px;
            font-weight: bold;
          }
        </style>
      </head>

      <body onload="window.print(); setTimeout(() => window.close(), 500);">

        <div class="center">
          <div class="title">POINT MACIEL</div>
          <div>${dataFormatada}</div>
          <div>ID: #${pedido.id.slice(0, 8).toUpperCase()}</div>
        </div>

        <div class="divider"></div>

        <div>
          <strong>${pedido.cliente_nome}</strong><br/>
          <strong>TIPO:</strong> ${pedido.tipo_pedido.toUpperCase()}<br/>
          ${pedido.mesa_numero ? `<strong>MESA:</strong> ${pedido.mesa_numero}<br/>` : ""}
          ${pedido.endereco ? `<strong>END:</strong> ${pedido.endereco}<br/>` : ""}
        </div>

        <div class="divider"></div>

        <div class="center">--- ITENS ---</div>

        ${itens
          .map(
            (i) => `
            <div style="margin-bottom: 6px;">
              <div class="item">
                <span>${i.qtd || 1}x ${i.nome}</span>
                <span>R$ ${(i.preco * (i.qtd || 1)).toFixed(2)}</span>
              </div>

              ${i.detalhes ? `<div class="det">${i.detalhes}</div>` : ""}
            </div>
          `,
          )
          .join("")}

        <div class="divider"></div>

        <div style="font-size: 10px;">
          PAGAMENTO: ${pedido.metodo_pagamento || "Não informado"}
          ${
            pedido.desconto_fidelidade
              ? `<br/>🎁 DESC. FIDELIDADE: -R$ ${pedido.desconto_fidelidade.toFixed(2)}`
              : ""
          }
        </div>

        <div class="total">
          TOTAL: R$ ${pedido.total_pedido.toFixed(2)}
        </div>

        <div class="center" style="margin-top: 20px; font-size: 9px;">
          VisualStack System
        </div>

        <br/><br/><br/><br/>
        <div class="center">.</div>

      </body>
    </html>
  `);

    win.document.close();
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
    <>
      {/* BLOQUEIO DE SOM */}
      {!audioAtivo && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center">
          <div className="text-center space-y-6 p-8 bg-[#1a011a] border border-yellow-400/20 rounded-[3rem] max-w-xs">
            <div className="w-20 h-20 bg-yellow-400 rounded-full mx-auto flex items-center justify-center animate-pulse">
              <Smartphone className="text-black" size={32} />
            </div>

            <h2 className="text-xl font-black uppercase italic">
              Monitor Online
            </h2>

            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">
              Clique abaixo para ativar os alertas sonoros da cozinha.
            </p>

            <button
              onClick={() => {
                setAudioAtivo(true);
                const audio = new Audio("/notification.mp3");
                audio
                  .play()
                  .catch((e) => alert("Erro ao carregar som: " + e.message));
              }}
              className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black uppercase tracking-widest"
            >
              Ligar Alertas
            </button>
          </div>
        </div>
      )}
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
                        {/* 🎁 BADGE FIDELIDADE */}
                        {pedido.desconto_fidelidade &&
                          pedido.desconto_fidelidade > 0 && (
                            <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-[8px] font-black px-3 py-1 rounded-full shadow-lg z-10 animate-bounce">
                              🎁 FIDELIDADE RESGATADA
                            </div>
                          )}
                        {/* AÇÕES NO TOPO (Imprimir e Excluir) */}
                        <div className="absolute top-4 right-4 flex gap-2 z-20">
                          <button
                            onClick={() => imprimirPedido(pedido)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:bg-[#ffcc00] hover:text-black transition-all"
                          >
                            <Printer size={14} />
                          </button>
                          <button
                            onClick={() => excluirPedido(pedido)}
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
                            {new Date(pedido.created_at).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
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
                                  <p className="text-[10px] text-white/40 italic font-medium ml-6 mt-1 whitespace-pre-line leading-relaxed bg-black/20 p-2 rounded-lg border border-white/5">
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
                                `https://wa.me/${formatarWhats(pedido.cliente_telefone!)}?text=${encodeURIComponent(msg)}`,
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
                                atualizarStatus(pedido, "preparando")
                              }
                              className="w-full bg-blue-500 py-3 rounded-xl text-[10px] font-black uppercase text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                            >
                              👨‍🍳 Preparar
                            </button>
                          )}

                          {pedido.status === "preparando" && (
                            <button
                              onClick={() => atualizarStatus(pedido, "pronto")}
                              className="w-full bg-orange-500 py-3 rounded-xl text-[10px] font-black uppercase text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all active:scale-95 animate-pulse-subtle"
                            >
                              🔔 Pronto para Entrega
                            </button>
                          )}

                          {pedido.status === "pronto" && (
                            <button
                              onClick={() =>
                                atualizarStatus(pedido, "finalizado")
                              }
                              className="w-full bg-green-500 py-3 rounded-xl text-[10px] font-black uppercase text-black hover:bg-green-600 shadow-lg shadow-green-500/20 transition-all active:scale-95 font-bold"
                            >
                              🏁 Finalizar e Pontuar
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
    </>
  );
}
