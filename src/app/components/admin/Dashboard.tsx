'use client';
import { useState, useEffect } from 'react';
import { supabase, TENANT_ID_MACIEL } from '@/lib/supabase';
import { ShoppingBag, Calendar, DollarSign, Award, Target, TrendingUp, BarChart3 } from 'lucide-react';

interface DayMetrics {
  faturamentoDia: number;
  faturamentoMes: number;
  totalPedidosDia: number;
  rankingDia: { nome: string; qtd: number }[];
  rankingMes: { nome: string; qtd: number }[];
}

export const Dashboard = () => {
  const [dataAlvo, setDataAlvo] = useState(new Date().toISOString().split('T')[0]);
  const [metrics, setMetrics] = useState<DayMetrics>({
    faturamentoDia: 0,
    faturamentoMes: 0,
    totalPedidosDia: 0,
    rankingDia: [],
    rankingMes: []
  });
  const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchStats = async () => {
    setLoading(true);
    try {
      const inicioDia = `${dataAlvo}T00:00:00`;
      const fimDia = `${dataAlvo}T23:59:59`;
      const configDate = new Date(dataAlvo + 'T12:00:00');
      const inicioMes = new Date(configDate.getFullYear(), configDate.getMonth(), 1).toISOString().split('T')[0] + 'T00:00:00';

      const { data: pedidosMes } = await supabase
        .from('pedidos')
        .select('total_pedido, created_at, id')
        .eq('tenant_id', TENANT_ID_MACIEL)
        .gte('created_at', inicioMes)
        .lte('created_at', fimDia);

      if (pedidosMes && pedidosMes.length > 0) {
        const IDsDosPedidos = pedidosMes.map(p => p.id);

        // BUSCA TUDO (*) PARA NÃO TER ERRO DE COLUNA
        const { data: itensRaw } = await supabase
          .from('pedido_itens')
          .select('*') 
          .in('pedido_id', IDsDosPedidos); // <--- CONFIRME SE ESSA COLUNA É 'pedido_id' NO SEU BANCO

        console.log("PEDIDOS ENCONTRADOS:", pedidosMes.length);
        console.log("ITENS ENCONTRADOS NO BANCO:", itensRaw);

        const countsDia: Record<string, number> = {};
        const countsMes: Record<string, number> = {};
        const pedidosHojeIDs = pedidosMes.filter(p => p.created_at.startsWith(dataAlvo)).map(p => p.id);

        itensRaw?.forEach(item => {
          // Tenta 'produto_nome' ou 'nome' ou qualquer campo de texto
          const nome = item.produto_nome || item.nome || item.item_nome || 'Produto sem nome';
          
          countsMes[nome] = (countsMes[nome] || 0) + 1;
          
          if (pedidosHojeIDs.includes(item.pedido_id)) {
            countsDia[nome] = (countsDia[nome] || 0) + 1;
          }
        });

        const sortRanking = (obj: Record<string, number>) => 
          Object.entries(obj).map(([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 5);

        setMetrics({
          faturamentoDia: pedidosMes.filter(p => p.created_at.startsWith(dataAlvo)).reduce((acc, p) => acc + Number(p.total_pedido), 0),
          faturamentoMes: pedidosMes.reduce((acc, p) => acc + Number(p.total_pedido), 0),
          totalPedidosDia: pedidosHojeIDs.length,
          rankingDia: sortRanking(countsDia),
          rankingMes: sortRanking(countsMes)
        });
      }
    } catch (error) {
      console.error("Erro Dashboard:", error);
    } finally {
      setLoading(false);
    }
  };
  fetchStats();
}, [dataAlvo]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      
      {/* 📅 CONTROLE DE DATA ÚNICA */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/5 border border-white/10 p-5 rounded-[2.5rem] backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#ffcc00]/20 rounded-2xl text-[#ffcc00]"><Calendar size={24} /></div>
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40">Data de Referência</h2>
            <p className="text-sm font-black text-white italic">Point Maciel</p>
          </div>
        </div>
        <input 
          type="date" 
          value={dataAlvo} 
          onChange={(e) => setDataAlvo(e.target.value)}
          className="bg-black/60 border border-[#ffcc00]/30 rounded-2xl px-5 py-3 text-xs font-black text-[#ffcc00] outline-none focus:border-[#ffcc00] transition-all"
        />
      </div>

      {/* ⚡ CARDS DE FATURAMENTO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group">
          <p className="text-[10px] uppercase font-black text-white/40 mb-2">Vendas do Dia</p>
          <h3 className="text-4xl font-black text-[#ffcc00] italic">R$ {metrics.faturamentoDia.toFixed(2)}</h3>
          <DollarSign className="absolute -right-4 -bottom-4 opacity-5 text-white" size={90} />
        </div>

        <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden">
          <p className="text-[10px] uppercase font-black text-white/40 mb-2">Faturamento Mensal</p>
          <h3 className="text-4xl font-black text-white italic">R$ {metrics.faturamentoMes.toFixed(2)}</h3>
          <TrendingUp className="absolute -right-4 -bottom-4 opacity-5 text-white" size={90} />
        </div>

        <div className="bg-[#ffcc00] p-8 rounded-[2.5rem] relative overflow-hidden shadow-lg shadow-[#ffcc00]/10">
          <p className="text-[10px] uppercase font-black text-black/60 mb-2">Pedidos Hoje</p>
          <h3 className="text-4xl font-black text-black italic">{metrics.totalPedidosDia}</h3>
          <ShoppingBag className="absolute -right-4 -bottom-4 opacity-10 text-black" size={90} />
        </div>
      </div>

      {/* 🏆 RANKINGS LADO A LADO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* RANKING DO DIA */}
        <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8">
          <div className="flex items-center gap-3 mb-8">
            <Award size={22} className="text-[#ffcc00]" />
            <h3 className="text-xs font-black uppercase italic text-[#ffcc00] tracking-widest">Destaques do Dia</h3>
          </div>
          {metrics.rankingDia.length > 0 ? (
            <div className="space-y-3">
              {metrics.rankingDia.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5 group hover:border-[#ffcc00]/30 transition-all">
                  <p className="text-xs font-black text-white uppercase italic group-hover:text-[#ffcc00]">#0{idx+1} {item.nome}</p>
                  <span className="text-[10px] font-black text-[#ffcc00]">{item.qtd}x</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center opacity-20">
              <Target className="mx-auto mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest">Sem vendas hoje</p>
            </div>
          )}
        </div>

        {/* RANKING DO MÊS */}
        <div className="bg-white/10 border border-white/20 rounded-[3rem] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <BarChart3 size={22} className="text-[#ffcc00]" />
            <h3 className="text-sm font-black uppercase italic text-[#ffcc00] tracking-widest">Top 5 do Mês</h3>
          </div>
          {metrics.rankingMes.length > 0 ? (
            <div className="space-y-3">
              {metrics.rankingMes.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-[#ffcc00]/5 rounded-2xl border border-[#ffcc00]/20">
                  <p className="text-xs font-black text-white uppercase italic">#0{idx+1} {item.nome}</p>
                  <span className="text-[10px] font-black text-[#ffcc00] bg-[#ffcc00]/10 px-3 py-1 rounded-lg">{item.qtd} saídas</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center opacity-20">
              <Target className="mx-auto mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest">Sem dados mensais</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};