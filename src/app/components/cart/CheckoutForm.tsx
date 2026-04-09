"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { supabase, TENANT_ID_MACIEL } from "@/lib/supabase";
import { Produto } from "@/app/types/Index";

interface CheckoutFormProps {
  carrinho: Produto[];
  total: number;
  nome: string;
  setNome: (v: string) => void;
  endereco: string;
  setEndereco: (v: string) => void;
  tipoEntrega: "delivery" | "retirada" | "mesa";
  setTipoEntrega: (v: "delivery" | "retirada" | "mesa") => void;
  onAdd: (p: Produto) => void;
  onRemove: (index: number) => void;
  onBack: () => void;
  onConfirm: () => void;
  lojaAberta: boolean;
}

export const CheckoutForm = ({
  carrinho, total, nome, setNome, endereco, setEndereco,
  tipoEntrega, setTipoEntrega, onAdd, onRemove, onBack, onConfirm, lojaAberta
}: CheckoutFormProps) => {

  const searchParams = useSearchParams();
  const mesaURL = searchParams.get("mesa");
  const [isEnviando, setIsEnviando] = useState(false);
  const [bairro, setBairro] = useState("");
  const [numero, setNumero] = useState("");
  const [referencia, setReferencia] = useState("");
  const [telefone, setTelefone] = useState("");

  useEffect(() => {
    if (mesaURL) setTipoEntrega("mesa");
  }, [mesaURL, setTipoEntrega]);

  // AJUSTE: Não agrupamos mais por ID, pois cada item montado é único
  // Exibimos a lista exatamente como está no carrinho
  const formatarWhats = () => {
    let msg = `*🚀 NOVO PEDIDO - POINT MACIEL*%0A`;
    msg += `---------------------------------------%0A`;
    msg += `*Cliente:* ${nome}%0A`;
    msg += `*Contato:* ${telefone}%0A`;
    
    if (tipoEntrega === "mesa") msg += `📍 *Mesa:* ${mesaURL}%0A`;
    if (tipoEntrega === "delivery") {
      msg += `🛵 *DELIVERY*%0A`;
      msg += `*Endereço:* ${endereco}, ${numero}%0A`;
      msg += `*Bairro:* ${bairro}%0A`;
      if (referencia) msg += `*Ref:* ${referencia}%0A`;
    }
    if (tipoEntrega === "retirada") msg += `🥡 *RETIRADA NO LOCAL*%0A`;
    
    msg += `---------------------------------------%0A`;
    msg += `*ITENS:*%0A`;
    
    carrinho.forEach((item, index) => {
      msg += `*${index + 1}. ${item.nome}*%0A`;
      if (item.descricao) msg += `   _{${item.descricao}}_%0A`;
      msg += `   R$ ${item.preco.toFixed(2)}%0A%0A`;
    });

    msg += `---------------------------------------%0A`;
    msg += `*TOTAL: R$ ${total.toFixed(2)}*`;
    return msg;
  };

const handleFinalizar = async (viaWhatsapp: boolean) => {
    if (!lojaAberta) return alert("A loja está fechada.");
    if (!nome.trim()) return alert("Digite seu nome.");
    if (!telefone.trim()) return alert("Informe seu WhatsApp.");

    let enderecoCompleto = "";
    if (tipoEntrega === "delivery") {
      if (!endereco || !bairro) return alert("Rua e bairro são obrigatórios.");
      enderecoCompleto = `${endereco}, Nº ${numero} - ${bairro}${referencia ? ` (Ref: ${referencia})` : ""}`;
    } else if (tipoEntrega === "retirada") {
      enderecoCompleto = "RETIRADA NO LOCAL";
    } else {
      enderecoCompleto = `MESA ${mesaURL}`;
    }

    setIsEnviando(true);
    try {
      // 1. Inserimos o pedido e usamos o .select().single() para pegar o ID gerado
      const { data: novoPedido, error: errorPedido } = await supabase
        .from("pedidos")
        .insert([{
          cliente_nome: nome,
          cliente_telefone: telefone,
          tipo_pedido: tipoEntrega,
          mesa_numero: tipoEntrega === "mesa" ? mesaURL : null,
          endereco: enderecoCompleto,
          total_pedido: total,
          status: "novo",
          metodo_pagamento: "Aguardando WhatsApp",
          tenant_id: TENANT_ID_MACIEL,
        }])
        .select()
        .single();

      if (errorPedido) throw errorPedido;

      // 2. Agora salvamos os itens na tabela pedido_itens (que o dashboard usa)
      if (novoPedido) {
        const itensParaInserir = carrinho.map(item => ({
          pedido_id: novoPedido.id, // O ID que acabamos de gerar
          produto_nome: item.nome,
          quantidade: 1, // Como seu carrinho lida com itens únicos, a qtd é 1
          preco_unitario: item.preco
        }));

        const { error: errorItens } = await supabase
          .from("pedido_itens")
          .insert(itensParaInserir);

        if (errorItens) {
          console.error("Erro ao salvar itens, mas o pedido foi:", errorItens);
        }
      }
      
      if (viaWhatsapp || tipoEntrega !== "mesa") {
        window.open(`https://wa.me/5588981277642?text=${formatarWhats()}`, "_blank");
      }
      onConfirm();
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar pedido.");
    } finally {
      setIsEnviando(false);
    }
  };

  return (
    <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-4 max-w-2xl mx-auto pb-24">
      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center px-2">
            <h3 className="text-[10px] font-black uppercase text-white/20">Seu Carrinho</h3>
            <button onClick={onBack} className="text-[10px] font-black uppercase text-yellow-400">
                + Adicionar mais
            </button>
        </div>

        <AnimatePresence>
          {carrinho.map((item, index) => (
            <motion.div key={`${item.id}-${index}`} layout className="bg-white/5 p-5 rounded-[2rem] border border-white/5 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 border border-white/10">
                    <img src={item.imagem_url || item.image} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase italic">{item.nome}</p>
                    <p className="text-white/40 text-[10px] uppercase leading-tight max-w-[200px]">
                      {item.descricao}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => onRemove(index)}
                  className="bg-red-500/10 text-red-500 p-2 rounded-xl text-xs font-bold"
                >
                  Remover
                </button>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Valor do Pote</span>
                <span className="text-yellow-400 font-black italic">R$ {item.preco.toFixed(2)}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ... (resto do formulário de endereço e botão de finalizar igual ao seu original) */}
      <div className="bg-[#1a011a] p-6 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl">
        <h2 className="text-xl font-black italic uppercase tracking-tighter">Finalizar Pedido</h2>
        
        {!mesaURL && (
          <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
            <button 
                onClick={() => setTipoEntrega("delivery")}
                className={`py-3 rounded-xl font-black text-[10px] uppercase transition-all ${tipoEntrega === "delivery" ? "bg-yellow-400 text-black" : "text-white/40"}`}
            >🛵 Delivery</button>
            <button 
                onClick={() => setTipoEntrega("retirada")}
                className={`py-3 rounded-xl font-black text-[10px] uppercase transition-all ${tipoEntrega === "retirada" ? "bg-yellow-400 text-black" : "text-white/40"}`}
            >🥡 Retirada</button>
          </div>
        )}

        <div className="space-y-4">
            <Input label="Seu Nome" value={nome} onChange={setNome} placeholder="Como te chamamos?" />
            <Input label="WhatsApp" value={telefone} onChange={setTelefone} placeholder="(00) 00000-0000" />

            {tipoEntrega === "delivery" && (
              <div className="space-y-4 pt-2 border-t border-white/5">
                  <Input label="Rua" value={endereco} onChange={setEndereco} placeholder="Rua exemplo" />
                  <div className="grid grid-cols-2 gap-4">
                      <Input label="Bairro" value={bairro} onChange={setBairro} placeholder="Seu bairro" />
                      <Input label="Número" value={numero} onChange={setNumero} placeholder="Nº" />
                  </div>
                  <Input label="Ponto de Referência" value={referencia} onChange={setReferencia} placeholder="Próximo a..." />
              </div>
            )}
        </div>

        <div className="pt-4 border-t border-white/5">
            <div className="flex justify-between items-end mb-4 px-2">
                <span className="text-[10px] font-black uppercase text-white/30">Total do Pedido</span>
                <div className="text-3xl font-black text-yellow-400 italic">R$ {total.toFixed(2)}</div>
            </div>

            <button
                onClick={() => handleFinalizar(true)}
                disabled={isEnviando || carrinho.length === 0}
                className="w-full bg-[#25D366] text-white h-16 rounded-[1.5rem] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
                {isEnviando ? "Enviando..." : "Confirmar e Enviar"}
            </button>
        </div>
      </div>
    </motion.section>
  );
};

const Input = ({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string }) => (
  <div className="space-y-1">
    <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">{label}</label>
    <input
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-yellow-400/50 text-sm font-bold text-white"
    />
  </div>
);