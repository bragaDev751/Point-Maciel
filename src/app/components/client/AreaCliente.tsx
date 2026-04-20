"use client";

import { useState } from "react";
import { supabase, TENANT_ID_MACIEL } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, History, RotateCcw, Calendar, ArrowRight, ShoppingBag, ReceiptText } from "lucide-react";

/* ================= TYPES ================= */
interface ItemPedido {
  id: string;
  nome: string;
  qtd: number;
  preco: number;
  imagem_url?: string;
}

interface FidelidadeData {
  pontos_acumulados: number;
  cliente_nome: string;
}

interface PedidoHistorico {
  id: string;
  created_at: string;
  total_pedido: number;
  itens: ItemPedido[] | null;
  status: string;
}

interface HistoricoPontos {
  id: string;
  quantidade: number;
  descricao: string;
  created_at: string;
}

export function AreaCliente() {
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);
  const [dadosFidelidade, setDadosFidelidade] = useState<FidelidadeData | null>(null);
  const [pedidosAntigos, setPedidosAntigos] = useState<PedidoHistorico[]>([]);
  const [extratoPontos, setExtratoPontos] = useState<HistoricoPontos[]>([]); // Novo estado
  const [buscaRealizada, setBuscaRealizada] = useState(false);

  const buscarDados = async () => {
    if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) 
      return;
    const telLimpo = telefone.replace(/\D/g, "");
    if (telLimpo.length < 10) return;
    setLoading(true);

    try {
      const { data: fidelidade } = await supabase
        .from("fidelidade")
        .select("*")
        .eq("tenant_id", TENANT_ID_MACIEL)
        .eq("cliente_telefone", telLimpo)
        .maybeSingle();

      const { data: pedidos } = await supabase
        .from("pedidos")
        .select("*")
        .eq("tenant_id", TENANT_ID_MACIEL)
        .eq("cliente_telefone", telLimpo)
        .order("created_at", { ascending: false });

      const { data: historico } = await supabase
        .from("historico_pontos")
        .select("*")
        .eq("tenant_id", TENANT_ID_MACIEL)
        .eq("cliente_telefone", telLimpo)
        .order("created_at", { ascending: false });

      setDadosFidelidade(fidelidade as FidelidadeData);
      setPedidosAntigos((pedidos as PedidoHistorico[]) || []);
      setExtratoPontos((historico as HistoricoPontos[]) || []);
      setBuscaRealizada(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resgatarCupom = () => {
    if (!dadosFidelidade || dadosFidelidade.pontos_acumulados < 150) return;
    
    const mensagem = `Olá! Sou o(a) ${dadosFidelidade.cliente_nome} e gostaria de resgatar meu cupom de R$ 10,00 de desconto (150 pontos) no meu pedido de hoje! 🎁`;
    const link = `https://wa.me/5588981277642?text=${encodeURIComponent(mensagem)}`; 
    window.open(link, "_blank");
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 space-y-8">
      
      {/* SEÇÃO DE ENTRADA PREMIUM */}
      <section className="relative overflow-hidden bg-[#1a011a] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffcc00]/5 blur-3xl rounded-full" />
        <div className="relative z-10">
          <h2 className="text-white font-black uppercase text-2xl italic tracking-tighter mb-2">
            Olá, <span className="text-[#ffcc00]">{dadosFidelidade?.cliente_nome?.split(' ')[0] || 'Visitante'}</span>
          </h2>
          <p className="text-white/40 text-[10px] uppercase font-bold tracking-[0.2em] mb-6">Acesse seu Point Club exclusivo</p>
          <div className="flex gap-3">
            <div className="relative flex-1">
                <input
                    type="tel"
                    placeholder="Seu WhatsApp..."
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-[#ffcc00] transition-all placeholder:text-white/10 text-sm"
                />
            </div>
            <button
              onClick={buscarDados}
              disabled={loading}
              className="bg-[#ffcc00] text-black w-16 rounded-2xl font-black transition-all flex items-center justify-center disabled:opacity-50 shadow-[0_0_20px_rgba(255,204,0,0.3)]"
            >
              {loading ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <ArrowRight size={24} />}
            </button>
          </div>
        </div>
      </section>

      <AnimatePresence mode="wait">
        {buscaRealizada && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            
            {/* CARD DE FIDELIDADE HOLOGRÁFICO */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#ffcc00] to-[#ff00ff] rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative bg-gradient-to-br from-[#2d012d] to-[#1a011a] p-8 rounded-[2.5rem] border border-white/10 overflow-hidden">
                {dadosFidelidade && dadosFidelidade.pontos_acumulados >= 150 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#ffcc00]/5 radial-gradient" />
                )}

                <div className="flex justify-between items-start mb-10 relative z-10">
                  <div className="space-y-1">
                    <p className="text-[#ffcc00] text-[10px] font-black uppercase tracking-[0.3em]">Membro VIP</p>
                    <h3 className="text-white font-black italic text-xl uppercase tracking-tight">Point Club Card</h3>
                  </div>
                  <Trophy className={dadosFidelidade && dadosFidelidade.pontos_acumulados >= 150 ? "text-[#ffcc00] animate-bounce" : "text-white/20"} size={32} />
                </div>

                <div className="flex items-end justify-between mb-4 relative z-10">
                    <div>
                        <span className="text-5xl font-black text-white italic tracking-tighter">
                            {dadosFidelidade?.pontos_acumulados || 0}
                        </span>
                        <span className="text-[#ffcc00] font-black ml-2 uppercase text-xs">Pontos</span>
                    </div>
                    <div className="text-right">
                        <p className="text-white/30 text-[9px] font-black uppercase">Meta de Resgate</p>
                        <p className="text-white font-black text-lg italic">150</p>
                    </div>
                </div>

                <div className="relative h-4 bg-black/50 rounded-full border border-white/5 p-1 mb-6">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(((dadosFidelidade?.pontos_acumulados || 0) / 150) * 100, 100)}%` }}
                        className="h-full bg-gradient-to-r from-[#ffcc00] via-[#fff5cc] to-[#ffcc00] rounded-full shadow-[0_0_20px_#ffcc00] relative"
                    >
                        <div className="absolute right-0 top-0 bottom-0 w-4 bg-white blur-md opacity-50" />
                    </motion.div>
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20 border-r border-dashed border-white/40" />
                </div>

                <AnimatePresence>
                    {dadosFidelidade && dadosFidelidade.pontos_acumulados >= 150 ? (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#ffcc00] p-4 rounded-2xl flex items-center justify-between shadow-[0_0_30px_rgba(255,204,0,0.3)]">
                            <div className="flex items-center gap-3">
                                <div className="bg-black text-[#ffcc00] p-2 rounded-lg font-black text-xs italic">CUPOM LIBERADO</div>
                                <p className="text-black font-black uppercase text-[10px] leading-tight">Você tem R$ 10,00 <br/> de desconto!</p>
                            </div>
                            <button onClick={resgatarCupom} className="bg-black text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase hover:scale-105 transition-all active:scale-95">
                                Resgatar agora
                            </button>
                        </motion.div>
                    ) : (
                        <p className="text-white/40 text-[10px] font-bold uppercase italic tracking-wider text-center">
                            Faltam <span className="text-[#ffcc00]">{Math.max(0, 150 - (dadosFidelidade?.pontos_acumulados || 0))} pontos</span> para seu cupom
                        </p>
                    )}
                </AnimatePresence>
              </div>
            </div>

            {/* EXTRATO DE PONTOS (HISTÓRICO SIMPLES) */}
            {extratoPontos.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-white font-black uppercase text-xs tracking-[0.2em] px-2 flex items-center gap-2">
                        <ReceiptText size={16} className="text-[#ffcc00]" /> Extrato Point Club
                    </h3>
                    <div className="bg-[#1a011a] border border-white/5 rounded-[2rem] overflow-hidden">
                        {extratoPontos.map((item) => (
                            <div key={item.id} className="flex justify-between items-center p-5 border-b border-white/5 last:border-0">
                                <div>
                                    <p className="text-white font-bold text-xs uppercase">{item.descricao}</p>
                                    <p className="text-[9px] text-white/30 uppercase font-black">{new Date(item.created_at).toLocaleDateString('pt-BR')}</p>
                                </div>
                                <span className={`font-black text-sm italic ${item.quantidade > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {item.quantidade > 0 ? `+${item.quantidade}` : item.quantidade}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* HISTÓRICO DE PEDIDOS */}
            <div className="space-y-5">
              <h3 className="text-white font-black uppercase text-xs tracking-[0.2em] px-2 flex items-center gap-2">
                  <History size={16} className="text-[#ffcc00]" /> Últimas Experiências
              </h3>
              
              <div className="grid gap-6">
                {pedidosAntigos.map((pedido) => (
                  <motion.div key={pedido.id} whileHover={{ scale: 1.01 }} className="bg-[#1a011a] border border-white/5 p-6 rounded-[2.5rem] shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <Calendar size={12} className="text-[#ffcc00]" />
                            <span className="text-[10px] font-black text-white/40 uppercase">
                                {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
                            </span>
                        </div>
                        <span className="text-[9px] font-black uppercase px-3 py-1 rounded-full bg-[#ffcc00]/10 text-[#ffcc00] border border-[#ffcc00]/20">
                            {pedido.status}
                        </span>
                    </div>

                    <div className="space-y-4 mb-6">
                        {pedido.itens?.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl">
                                        {item.imagem_url ? (
                                            <img src={item.imagem_url} alt={item.nome} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-white/5">
                                                <ShoppingBag size={18} className="text-white/10" />
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 bg-[#ffcc00] text-black font-black text-[9px] px-1.5 py-0.5 rounded-bl-xl shadow-lg">
                                            {item.qtd}x
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-white uppercase italic leading-tight tracking-tight">{item.nome}</h4>
                                        <p className="text-[10px] font-bold text-[#ffcc00] italic">R$ {item.preco.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                      <div>
                        <p className="text-[9px] font-black text-white/20 uppercase">Total do Pedido</p>
                        <p className="text-xl font-black text-white italic tracking-tighter">R$ {pedido.total_pedido.toFixed(2)}</p>
                      </div>
                      <button onClick={() => window.location.href = '/'} className="bg-white/5 hover:bg-[#ffcc00] hover:text-black text-white p-4 rounded-2xl transition-all shadow-lg active:scale-90">
                        <RotateCcw size={20} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}