"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { supabase, TENANT_ID_MACIEL } from "@/lib/supabase";
import { Produto } from "@/app/types/Index";
import { CreditCard, Banknote, QrCode, Smartphone, Gift } from "lucide-react";
import Image from "next/image";
import LinkPix from "@/public/qrcode-pix.png";

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

type PagamentoMetodo = "Pix" | "Cartão (Entregador)" | "Dinheiro" | "Mesa";

export const CheckoutForm = ({
  carrinho,
  total,
  nome,
  setNome,
  endereco,
  setEndereco,
  tipoEntrega,
  setTipoEntrega,
  onAdd,
  onRemove,
  onBack,
  onConfirm,
  lojaAberta,
}: CheckoutFormProps) => {
  const searchParams = useSearchParams();
  const mesaURL = searchParams.get("mesa");
  const [isEnviando, setIsEnviando] = useState(false);
  const [bairro, setBairro] = useState("");
  const [numero, setNumero] = useState("");
  const [referencia, setReferencia] = useState("");
  const [telefone, setTelefone] = useState("");

  const [pagamento, setPagamento] = useState<PagamentoMetodo>("Pix");
  const [trocoPara, setTrocoPara] = useState("");
  const [taxasDisponiveis, setTaxasDisponiveis] = useState<
    { id: string; bairro: string; valor: number }[]
  >([]);
  const [taxaEntrega, setTaxaEntrega] = useState(0);
  
  const [pedidoFinalizado, setPedidoFinalizado] = useState<{
    id: string;
    msg: string;
  } | null>(null);

  const [copiou, setCopiou] = useState(false);
  const CHAVE_PIX_MACIEL = "05746347388";

  // FIDELIDADE
  const [pontosDisponiveis, setPontosDisponiveis] = useState(0);
  const [usarDescontoFidelidade, setUsarDescontoFidelidade] = useState(false);
  const VALOR_DESCONTO = 10;
  const PONTOS_NECESSARIOS = 150;

  const totalFinal = usarDescontoFidelidade
    ? Math.max(total - VALOR_DESCONTO, 0)
    : total;

  const totalFinalComTaxa =
    tipoEntrega === "delivery" ? totalFinal + taxaEntrega : totalFinal;

  useEffect(() => {
    const buscarPontos = async () => {
      if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
      const telLimpo = telefone.replace(/\D/g, "");
      if (telLimpo.length >= 10) {
        const { data } = await supabase
          .from("fidelidade")
          .select("pontos_acumulados")
          .eq("tenant_id", TENANT_ID_MACIEL)
          .eq("cliente_telefone", telLimpo)
          .maybeSingle();
        setPontosDisponiveis(data?.pontos_acumulados || 0);
      } else {
        setPontosDisponiveis(0);
        setUsarDescontoFidelidade(false);
      }
    };
    buscarPontos();
  }, [telefone]);

  useEffect(() => {
    if (mesaURL) {
      setTipoEntrega("mesa");
      setPagamento("Mesa");
    }
  }, [mesaURL, setTipoEntrega]);

  useEffect(() => {
    const buscarTaxas = async () => {
      if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
      const { data } = await supabase
        .from("taxas_entrega")
        .select("*")
        .eq("tenant_id", TENANT_ID_MACIEL)
        .order("bairro", { ascending: true });

      if (data) setTaxasDisponiveis(data);
    };
    buscarTaxas();
  }, []);

  const formatarWhats = () => {
    let msg = `*🚀 NOVO PEDIDO - POINT MACIEL*%0A`;
    msg += `---------------------------------------%0A`;
    msg += `*Cliente:* ${nome}%0A`;
    msg += `*Contato:* ${telefone}%0A`;

    if (tipoEntrega === "mesa") {
      msg += `🍽️ *COMER NO LOCAL*%0A`;
      msg += `📍 *MESA:* ${mesaURL || "Informar ao atendente"}%0A`;
    }
    if (tipoEntrega === "delivery") {
      msg += `🛵 *DELIVERY*%0A`;
      msg += `*Bairro:* ${bairro}%0A`;
      msg += `*Taxa Entrega:* R$ ${taxaEntrega.toFixed(2)}%0A`;
      msg += `*Endereço:* ${endereco}, ${numero}%0A`;
      if (referencia) msg += `*Ref:* ${referencia}%0A`;
    }
    if (tipoEntrega === "retirada") msg += `🥡 *RETIRADA NO LOCAL*%0A`;

    msg += `---------------------------------------%0A`;
    msg += `*PAGAMENTO:* ${pagamento}%0A`;
    if (pagamento === "Dinheiro" && trocoPara) {
      msg += `*Troco para:* R$ ${Number(trocoPara).toFixed(2)}%0A`;
    }

    if (usarDescontoFidelidade) {
      msg += `*DESCONTO APLICADO:* - R$ ${VALOR_DESCONTO.toFixed(2)} (Fidelidade)%0A`;
    }

    msg += `---------------------------------------%0A`;
    msg += `*ITENS:*%0A`;

    carrinho.forEach((item, index) => {
  msg += `*${index + 1}. ${item.nome.toUpperCase()}*%0A`;
  
  if (item.descricao) {
    const descWhats = item.descricao.replace(/\n/g, "%0A   ");
    msg += `   ${descWhats}%0A`;
  }
  
  msg += `   _R$ ${item.preco.toFixed(2)}_%0A%0A`;
});

    msg += `---------------------------------------%0A`;
    msg += `*TOTAL FINAL: R$ ${totalFinalComTaxa.toFixed(2)}*%0A`;
    return msg;
  };

  const handleCopiarPix = () => {
    navigator.clipboard.writeText(CHAVE_PIX_MACIEL);
    setCopiou(true);
    setTimeout(() => setCopiou(false), 2000);
  };

  const handleFinalizar = async () => {
  if (!lojaAberta) return alert("A loja está fechada.");
  if (!nome.trim()) return alert("Digite seu nome.");
  if (!telefone.trim()) return alert("Informe seu WhatsApp.");

  const telLimpo = telefone.replace(/\D/g, "");
  let enderecoCompleto = "";

  if (tipoEntrega === "delivery") {
    if (!endereco || !bairro || taxaEntrega === 0)
      return alert("Selecione um bairro válido.");
    enderecoCompleto = `${endereco}, Nº ${numero} - ${bairro}${
      referencia ? ` (Ref: ${referencia})` : ""
    }`;
  } else if (tipoEntrega === "retirada") {
    enderecoCompleto = "RETIRADA NO LOCAL";
  } else {
    enderecoCompleto = `COMER NO LOCAL - MESA ${mesaURL || "S/N"}`;
  }

  setIsEnviando(true);

  try {
    // Fidelidade
    if (usarDescontoFidelidade) {
      const { error } = await supabase
        .from("fidelidade")
        .update({
          pontos_acumulados: pontosDisponiveis - PONTOS_NECESSARIOS,
        })
        .eq("tenant_id", TENANT_ID_MACIEL)
        .eq("cliente_telefone", telLimpo);

      if (error) {
        console.error("⚠️ Erro fidelidade:", error.message);
      }
    }

    // Payload
    const payloadPedido = {
      cliente_nome: nome,
      cliente_telefone: telLimpo,
      tipo_pedido: tipoEntrega,
      mesa_numero: tipoEntrega === "mesa" ? mesaURL : null,
      endereco: enderecoCompleto,
      total_pedido: totalFinalComTaxa,
      status: "novo",
      metodo_pagamento:
        pagamento + (trocoPara ? ` (Troco p/ ${trocoPara})` : ""),
      tenant_id: TENANT_ID_MACIEL,
      itens: carrinho.map((i) => ({
        id: i.id,
        nome: i.nome,
        detalhes: i.descricao,
        preco: i.preco,
        qtd: 1,
      })),
    };

    // Insert pedido
    const { data: pedidos, error: errorPedido } = await supabase
      .from("pedidos")
      .insert([payloadPedido])
      .select();

    if (errorPedido) {
      console.error("❌ ERRO SUPABASE:");
      console.error("message:", errorPedido.message);
      console.error("details:", errorPedido.details);
      console.error("hint:", errorPedido.hint);
      throw errorPedido;
    }

    const novoPedido = pedidos?.[0];

    if (!novoPedido) {
      throw new Error("Pedido não retornado pelo banco.");
    }

    // Insert itens
    const itensParaInserir = carrinho.map((item) => ({
      pedido_id: novoPedido.id,
      produto_nome: item.nome,
      quantidade: 1,
      preco_unitario: item.preco,
    }));

    const { error: errorItens } = await supabase
      .from("pedido_itens")
      .insert(itensParaInserir);

    if (errorItens) {
      console.error("⚠️ Erro ao inserir itens:", errorItens.message);
    }

const mensagemPronta = formatarWhats();

if (pagamento === "Pix") {
  setPedidoFinalizado({
    id: novoPedido.id,
    msg: mensagemPronta,
  });
  setIsEnviando(false);
  return;
}

const linkWhatsapp = `https://wa.me/5588981277642?text=${mensagemPronta}`;
window.open(linkWhatsapp, "_blank");

setTimeout(() => onConfirm(), 600);

  } catch (err: unknown) {
    console.error("🔥 ERRO FINAL:", err);

    if (
      typeof err === "object" &&
      err !== null &&
      "message" in err
    ) {
      alert(`Erro: ${(err as { message: string }).message}`);
    } else {
      alert("Erro desconhecido ao enviar pedido.");
    }
  } finally {
    setIsEnviando(false);
  }
};

  if (pedidoFinalizado) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-4 max-w-md mx-auto text-center space-y-6 pt-10"
      >
        <div className="bg-[#1a011a] p-8 rounded-[3rem] border border-yellow-400/20 space-y-6">
          <h2 className="text-2xl font-black uppercase text-white">Pagamento via Pix</h2>
<div className="bg-white p-4 rounded-3xl w-48 h-48 mx-auto flex items-center justify-center relative overflow-hidden">
  <Image 
    src="/qrcode-pix.png" 
    alt="QR Code Pix" 
    fill
    className="object-contain p-2"
    unoptimized 
  />
</div>        <div className="bg-white/5 p-4 rounded-xl flex justify-between items-center border border-white/10">
            <span className="text-[10px] text-white/50 font-mono truncate mr-2">{CHAVE_PIX_MACIEL}</span>
            <button 
              onClick={handleCopiarPix}
              className="bg-yellow-400 text-black px-3 py-1 rounded-lg text-[10px] font-black uppercase"
            >
              {copiou ? "Copiado!" : "Copiar"}
            </button>
          </div>

          <div className="text-3xl font-black text-yellow-400 italic">
            R$ {totalFinalComTaxa.toFixed(2)}
          </div>

          <button
            onClick={() => {
              onConfirm();
              window.location.href = `https://wa.me/5588981277642?text=${pedidoFinalizado.msg}`;
            }}
            className="w-full bg-green-500 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-green-600 transition-all"
          >
            Já paguei / Enviar Whats
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 max-w-2xl mx-auto pb-24"
    >
<div className="flex items-center gap-4 mb-6">
  <button 
    onClick={onBack}
    className="bg-white/5 p-3 rounded-2xl border border-white/10 text-yellow-400 active:scale-90 transition-all"
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  </button>

  <div>
    <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">
      Finalizar Pedido
    </h2>
    <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">
      Point Maciel
    </p>
  </div>
</div>

<div className="space-y-3 mb-8">
  <h3 className="text-[10px] font-black uppercase text-white/20 tracking-widest px-2">
    Seu Carrinho ({carrinho.length})
  </h3>

  <AnimatePresence>
    {carrinho.map((item, index) => (
      <motion.div
        key={`${item.id}-${index}`}
        layout
        className="bg-white/5 p-4 rounded-[2rem] border border-white/5"
      >
        <div className="flex gap-3 items-center">
          
          {/* IMAGEM */}
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex-shrink-0">
            <img
              src={item.imagem_url || item.image || 'https://via.placeholder.com/150'}
              className="w-full h-full object-cover"
              alt={item.nome}
            />
          </div>
          
          {/* TEXTO */}
          <div className="flex-1 min-w-0">
            <p className="font-black text-[12px] uppercase italic text-white truncate">
              {item.nome}
            </p>

            {item.descricao && (
  <p className="text-[10px] text-yellow-400/80 font-medium leading-relaxed whitespace-pre-line mt-1">
    {item.descricao}
  </p>
)}

            <p className="text-yellow-400 font-black italic text-[11px] mt-0.5">
              R$ {item.preco.toFixed(2)}
            </p>
          </div>

          {/* REMOVER */}
          <button
            onClick={() => onRemove(index)}
            className="bg-red-500/10 text-red-500 p-2.5 rounded-xl active:bg-red-500 active:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
          </button>

        </div>
      </motion.div>
    ))}
  </AnimatePresence>

  <button
    onClick={onBack}
    className="w-full py-3 text-[10px] font-black uppercase text-yellow-400/50 border border-dashed border-white/10 rounded-2xl"
  >
    + Adicionar mais itens
  </button>
</div>

      <div className="bg-[#1a011a] p-6 rounded-[2.5rem] border border-white/10 space-y-6 shadow-2xl">
        <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">
          Finalizar Pedido
        </h2>

        {!mesaURL && (
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5">
            <button
              onClick={() => setTipoEntrega("delivery")}
              className={`py-3 rounded-xl font-black text-[10px] uppercase transition-all ${
                tipoEntrega === "delivery" ? "bg-yellow-400 text-black shadow-lg" : "text-white/40"
              }`}
            >
              🛵 Delivery
            </button>
            <button
              onClick={() => { setTipoEntrega("retirada"); setPagamento("Dinheiro"); }}
              className={`py-3 rounded-xl font-black text-[10px] uppercase transition-all ${
                tipoEntrega === "retirada" ? "bg-yellow-400 text-black shadow-lg" : "text-white/40"
              }`}
            >
              🥡 Retirada
            </button>
            <button
              onClick={() => { setTipoEntrega("mesa"); setPagamento("Mesa"); }}
              className={`py-3 rounded-xl font-black text-[10px] uppercase transition-all ${
                tipoEntrega === "mesa" ? "bg-yellow-400 text-black shadow-lg" : "text-white/40"
              }`}
            >
              🍽️ Local
            </button>
          </div>
        )}

        <div className="space-y-4">
          <Input label="Seu Nome" value={nome} onChange={setNome} placeholder="Como te chamamos?" />
          <Input label="WhatsApp (para aviso)" value={telefone} onChange={(val) => setTelefone(val.replace(/\D/g, ""))} placeholder="(00) 00000-0000" />

          <AnimatePresence>
            {pontosDisponiveis >= PONTOS_NECESSARIOS && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`p-4 rounded-2xl border-2 border-dashed flex items-center justify-between transition-all ${usarDescontoFidelidade ? "border-green-500 bg-green-500/10" : "border-yellow-400/30 bg-white/5"}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${usarDescontoFidelidade ? "bg-green-500 text-white" : "bg-yellow-400 text-black"}`}>
                    <Gift size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-white">Você tem {pontosDisponiveis} pontos!</p>
                    <p className="text-[9px] font-bold text-white/40 uppercase">Liberado R$ 10,00 de desconto</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUsarDescontoFidelidade(!usarDescontoFidelidade)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${usarDescontoFidelidade ? "bg-green-500 text-white" : "bg-yellow-400 text-black"}`}
                >
                  {usarDescontoFidelidade ? "Aplicado" : "Resgatar"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {tipoEntrega === "delivery" && (
            <div className="space-y-4 pt-4 border-t border-white/5">
              <Input label="Rua e Número" value={endereco} onChange={setEndereco} placeholder="Ex: Rua das Flores, 123" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">Bairro</label>
                  <select
                    value={bairro}
                    onChange={(e) => {
                      const sel = taxasDisponiveis.find((t) => t.bairro === e.target.value);
                      setBairro(e.target.value);
                      setTaxaEntrega(sel ? sel.valor : 0);
                    }}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white text-sm font-bold outline-none focus:border-yellow-400 appearance-none"
                  >
                    <option value="" className="bg-[#1a011a]">Selecione seu bairro...</option>
                    {taxasDisponiveis.map((t) => (
                      <option key={t.id} value={t.bairro} className="bg-[#1a011a]">
                        {t.bairro} - R$ {t.valor.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
                <Input label="Nº/Apto" value={numero} onChange={setNumero} placeholder="Nº" />
              </div>
              <Input label="Ponto de Referência" value={referencia} onChange={setReferencia} placeholder="Próximo a..." />
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-white/5 space-y-4">
          <h3 className="text-[10px] font-black uppercase text-white/30 ml-4 tracking-widest">Forma de Pagamento</h3>
          <div className="grid grid-cols-1 gap-2">
            {[
              { id: "Pix", label: "PIX (Copia e Cola)", icon: <QrCode size={16} /> },
              { id: "Cartão (Entregador)", label: "Cartão na Entrega", icon: <CreditCard size={16} /> },
              { id: "Dinheiro", label: "Dinheiro", icon: <Banknote size={16} /> },
              ...(tipoEntrega === "mesa" ? [{ id: "Mesa", label: "Pagar na Mesa", icon: <Smartphone size={16} /> }] : []),
            ].map((met) => (
              <button
                key={met.id}
                onClick={() => setPagamento(met.id as PagamentoMetodo)}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${pagamento === met.id ? "border-yellow-400 bg-yellow-400/10 text-yellow-400 shadow-[0_0_15px_rgba(255,204,0,0.1)]" : "border-white/5 bg-white/5 text-white/40"}`}
              >
                <div className="flex items-center gap-3">
                  {met.icon}
                  <span className="text-[10px] font-black uppercase">{met.label}</span>
                </div>
                {pagamento === met.id && <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_10px_#ffcc00]" />}
              </button>
            ))}
          </div>
          <AnimatePresence>
            {pagamento === "Dinheiro" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <Input label="Troco para quanto?" value={trocoPara} onChange={setTrocoPara} placeholder="Ex: 50" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pt-4 border-t border-white/10">
          {tipoEntrega === "delivery" && taxaEntrega > 0 && (
            <div className="flex justify-between px-2 mb-2">
              <span className="text-[10px] text-white/40 uppercase font-bold">Taxa de Entrega</span>
              <span className="text-xs text-white font-black">R$ {taxaEntrega.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-end mb-6 px-2">
            <span className="text-[10px] font-black uppercase text-white/30 tracking-tighter">Total do Pedido</span>
            <div className="flex flex-col items-end">
              {usarDescontoFidelidade && <span className="text-xs text-red-500 line-through font-bold opacity-50">R$ {total.toFixed(2)}</span>}
              <div className="text-4xl font-black text-yellow-400 italic leading-none">R$ {totalFinalComTaxa.toFixed(2)}</div>
            </div>
          </div>

          <button
            onClick={handleFinalizar}
            disabled={isEnviando || carrinho.length === 0}
            className="w-full bg-[#25D366] text-white h-18 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-30 hover:brightness-110 active:scale-95 shadow-xl shadow-green-500/10"
          >
            {isEnviando ? "Enviando..." : <><Smartphone size={22} /> Enviar Pedido</>}
          </button>
        </div>
      </div>
    </motion.section>
  );
};

const Input = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; }) => (
  <div className="space-y-1">
    <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">{label}</label>
    <input
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-yellow-400/50 text-sm font-bold text-white transition-all placeholder:text-white/10"
    />
  </div>
);