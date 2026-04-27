"use client";
import { useState, useEffect } from "react";
import { supabase, TENANT_ID_MACIEL } from "@/lib/supabase";
import { Calendar, Target, TrendingUp, Loader2 } from "lucide-react";

interface ItemPedidoDB {
  id: string;
  pedido_id: string;
  produto_nome?: string;
  nome?: string;
  quantidade?: number;
}

interface DayMetrics {
  faturamentoDia: number;
  faturamentoMes: number;
  totalPedidosDia: number;
  rankingDia: { nome: string; qtd: number }[];
  rankingMes: { nome: string; qtd: number }[];
  totalDescontos: number;
}

export const Dashboard = () => {
  const [dataAlvo, setDataAlvo] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DayMetrics>({
    faturamentoDia: 0,
    faturamentoMes: 0,
    totalPedidosDia: 0,
    rankingDia: [],
    rankingMes: [],
    totalDescontos: 0,
  });

 useEffect(() => {
  let isMounted = true;

  const fetchStats = async () => {
    if (
      typeof window === "undefined" ||
      !supabase ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return;
    }

    setLoading(true);

    try {
      const inicioMes = `${dataAlvo.slice(0, 7)}-01T00:00:00.000Z`;
      const fimDiaCompleto = `${dataAlvo}T23:59:59.999Z`;

      console.log("Consultando de:", inicioMes, "até:", fimDiaCompleto);

      // 🔹 1ª chamada (pedidos)
      const { data: pedidosData, error } = await supabase
        .from("pedidos")
        .select("total_pedido, created_at, id")
        .eq("tenant_id", TENANT_ID_MACIEL)
        .gte("created_at", inicioMes)
        .lte("created_at", fimDiaCompleto);

      if (error) throw error;
      if (!isMounted) return;

      const pedidos = pedidosData || [];

      if (!pedidos.length) {
        setMetrics({
          faturamentoDia: 0,
          faturamentoMes: 0,
          totalPedidosDia: 0,
          rankingDia: [],
          rankingMes: [],
          totalDescontos: 0,
        });
        return;
      }

      const IDsDosPedidos = pedidos.map((p) => p.id);

     const { data: itensData, error: erroItens } = await supabase
  .from("pedido_itens")
  .select("*")
  .in("pedido_id", IDsDosPedidos);

if (erroItens) throw erroItens;

const itensRaw: ItemPedidoDB[] = itensData ?? [];

      // 🔸 PROCESSAMENTO
      const countsDia: Record<string, number> = {};
      const countsMes: Record<string, number> = {};

      const pedidosHoje = pedidos.filter((p) =>
        p.created_at.startsWith(dataAlvo),
      );

      const pedidosHojeIDs = pedidosHoje.map((p) => p.id);

      itensRaw.forEach((item) => {
        const nome = item.produto_nome || item.nome || "Produto";

        countsMes[nome] = (countsMes[nome] || 0) + (item.quantidade || 1);

        if (pedidosHojeIDs.includes(item.pedido_id)) {
          countsDia[nome] = (countsDia[nome] || 0) + (item.quantidade || 1);
        }
      });

      const sortRanking = (obj: Record<string, number>) =>
        Object.entries(obj)
          .map(([nome, qtd]) => ({ nome, qtd }))
          .sort((a, b) => b.qtd - a.qtd)
          .slice(0, 5);

      setMetrics({
        faturamentoDia: pedidosHoje.reduce(
          (acc, p) => acc + Number(p.total_pedido || 0),
          0,
        ),
        faturamentoMes: pedidos.reduce(
          (acc, p) => acc + Number(p.total_pedido || 0),
          0,
        ),
        totalPedidosDia: pedidosHoje.length,
        rankingDia: sortRanking(countsDia),
        rankingMes: sortRanking(countsMes),
        totalDescontos: 0,
      });
    } catch (error) {
      console.error("Erro Dashboard:", error);
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  fetchStats();

  return () => {
    isMounted = false;
  };
}, [dataAlvo]);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* 📅 HEADER COM DATA */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/5 border border-white/10 p-6 rounded-[2.5rem] backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#ffcc00]/20 rounded-2xl text-[#ffcc00]">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
              Relatórios de Vendas
            </h2>
            <p className="text-sm font-black text-white italic uppercase">
              Point Maciel
            </p>
          </div>
        </div>

        <input
          type="date"
          value={dataAlvo}
          onChange={(e) => setDataAlvo(e.target.value)}
          className="bg-black/60 border border-[#ffcc00]/30 rounded-2xl px-6 py-3 text-xs font-black text-[#ffcc00] outline-none focus:border-[#ffcc00] transition-all"
        />
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center text-white/20 gap-4">
          <Loader2 className="animate-spin" size={40} />
          <p className="text-[10px] font-black uppercase tracking-widest">
            Processando dados...
          </p>
        </div>
      ) : (
        <>
          {/* 💰 CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
              <p className="text-[10px] font-black uppercase text-white/40 mb-2">
                Vendas Hoje
              </p>
              <h3 className="text-3xl font-black text-[#ffcc00]">
                R$ {metrics.faturamentoDia.toFixed(2)}
              </h3>
            </div>

            <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
              <p className="text-[10px] font-black uppercase text-white/40 mb-2">
                Faturamento Mês
              </p>
              <h3 className="text-3xl font-black text-white">
                R$ {metrics.faturamentoMes.toFixed(2)}
              </h3>
            </div>

            <div className="bg-[#ffcc00] p-8 rounded-[2.5rem]">
              <p className="text-[10px] font-black uppercase text-black/60 mb-2">
                Pedidos Hoje
              </p>
              <h3 className="text-3xl font-black text-black">
                {metrics.totalPedidosDia}
              </h3>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/20 p-8 rounded-[2.5rem]">
              <p className="text-[10px] font-black uppercase text-purple-400 mb-2">
                Fidelidade (Mês)
              </p>
              <h3 className="text-3xl font-black text-purple-400">
                R$ {metrics.totalDescontos.toFixed(2)}
              </h3>
            </div>
          </div>

          {/* 🏆 RANKINGS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* DIA */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] backdrop-blur-md">
              <div className="flex items-center gap-3 mb-8">
                <Target size={20} className="text-[#ffcc00]" />
                <h3 className="text-xs font-black uppercase italic tracking-widest text-white">
                  Top 5 de Hoje
                </h3>
              </div>

              <div className="space-y-6">
                {metrics.rankingDia.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span>
                        {index + 1}º {item.nome}
                      </span>
                      <span>{item.qtd} un</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MÊS */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] backdrop-blur-md">
              <div className="flex items-center gap-3 mb-8">
                <TrendingUp size={20} className="text-purple-400" />
                <h3 className="text-xs font-black uppercase italic tracking-widest text-white">
                  Campeões do Mês
                </h3>
              </div>

              <div className="space-y-6">
                {metrics.rankingMes.map((item, index) => (
                  <div key={index}>
                    {index + 1}º {item.nome} - {item.qtd}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
