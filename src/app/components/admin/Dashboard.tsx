'use client';
import { useState, useEffect } from 'react';
import { supabase, TENANT_ID_MACIEL } from '@/lib/supabase';

export const Dashboard = () => {
  const [metrics, setMetrics] = useState({ hoje: 0, mes: 0, totalPedidos: 0 });
  const [topProdutos, setTopProdutos] = useState<{nome: string, qtd: number}[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const hoje = new Date();
      hoje.setHours(0,0,0,0);
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

      // 1. Faturamento Hoje (Filtrado por Maciel)
      const { data: dataHoje } = await supabase.from('pedidos')
        .select('total_pedido')
        .eq('tenant_id', TENANT_ID_MACIEL)
        .gte('created_at', hoje.toISOString());
      
      // 2. Faturamento Mês (Filtrado por Maciel)
      const { data: dataMes } = await supabase.from('pedidos')
        .select('total_pedido')
        .eq('tenant_id', TENANT_ID_MACIEL)
        .gte('created_at', primeiroDiaMes.toISOString());

      // 3. Ranking de Produtos (Filtrado por Maciel via tabela pedidos)
      // Nota: Idealmente a tabela pedido_itens também deve ter tenant_id
      const { data: itens } = await supabase.from('pedido_itens')
        .select('produto_nome, pedidos!inner(tenant_id)')
        .eq('pedidos.tenant_id', TENANT_ID_MACIEL);
      
      const counts: Record<string, number> = {};
      itens?.forEach(i => counts[i.produto_nome] = (counts[i.produto_nome] || 0) + 1);
      const sorted = Object.entries(counts)
        .map(([nome, qtd]) => ({ nome, qtd }))
        .sort((a, b) => b.qtd - a.qtd).slice(0, 5);

      setMetrics({
        hoje: dataHoje?.reduce((acc, p) => acc + Number(p.total_pedido), 0) || 0,
        mes: dataMes?.reduce((acc, p) => acc + Number(p.total_pedido), 0) || 0,
        totalPedidos: dataMes?.length || 0
      });
      setTopProdutos(sorted);
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-xl">
          <p className="text-[10px] uppercase font-black tracking-widest text-white/40">Vendas Hoje</p>
          <h3 className="text-3xl font-black text-[#ffcc00] mt-1">R$ {metrics.hoje.toFixed(2)}</h3>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-xl">
          <p className="text-[10px] uppercase font-black tracking-widest text-white/40">Faturamento Mensal</p>
          <h3 className="text-3xl font-black text-white mt-1">R$ {metrics.mes.toFixed(2)}</h3>
        </div>
        <div className="bg-white/5 border border-[#ffcc00]/20 p-6 rounded-[2rem] bg-gradient-to-br from-[#ffcc00]/10 to-transparent">
          <p className="text-[10px] uppercase font-black tracking-widest text-[#ffcc00]">Total Pedidos</p>
          <h3 className="text-3xl font-black text-white mt-1">{metrics.totalPedidos}</h3>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
        <h3 className="text-sm font-black uppercase italic text-[#ffcc00] mb-6 tracking-widest">🏆 Mais Vendidos</h3>
        <div className="space-y-4">
          {topProdutos.length > 0 ? topProdutos.map((prod, idx) => (
            <div key={prod.nome} className="flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <span className="text-white/20 font-black italic">#0{idx + 1}</span>
                <p className="font-bold text-white/80 group-hover:text-white transition-colors">{prod.nome}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1 w-24 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#ffcc00] transition-all duration-1000" 
                    style={{ width: `${(prod.qtd / (topProdutos[0]?.qtd || 1)) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-black text-[#ffcc00] w-8">{prod.qtd}x</span>
              </div>
            </div>
          )) : <p className="text-center text-white/20 uppercase text-[10px] font-black py-4">Sem dados de vendas ainda</p>}
        </div>
      </div>
    </div>
  );
};