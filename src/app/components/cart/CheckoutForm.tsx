"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { supabase, TENANT_ID_MACIEL } from "@/lib/supabase";
import { Produto } from "@/app/types/Index";
import { CreditCard, Banknote, QrCode, Smartphone, Gift } from "lucide-react";

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
  // ===== PIX =====
  const [pedidoFinalizado, setPedidoFinalizado] = useState<{
    id: string;
    msg: string;
  } | null>(null);

  const [copiou, setCopiou] = useState(false);

  const CHAVE_PIX_MACIEL = "05746347388";

  // ================= ADIÇÃO: ESTADOS DE FIDELIDADE =================
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
  // ==============================================================

  useEffect(() => {
    if (mesaURL) {
      setTipoEntrega("mesa");
      setPagamento("Mesa");
    }
  }, [mesaURL, setTipoEntrega]);
  useEffect(() => {
    const buscarTaxas = async () => {
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

    if (tipoEntrega === "mesa") msg += `📍 *Mesa:* ${mesaURL}%0A`;
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
      msg += `*${index + 1}. ${item.nome}*%0A`;
      if (item.descricao) {
        msg += `   ➕ ${item.descricao}%0A`;
      }
      msg += `   R$ ${item.preco.toFixed(2)}%0A%0A`;
    });

    msg += `---------------------------------------%0A`;
    msg += `**TOTAL FINAL: R$ ${totalFinalComTaxa.toFixed(2)}*`;
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
      enderecoCompleto = `MESA ${mesaURL}`;
    }

    setIsEnviando(true);

    try {
      if (usarDescontoFidelidade) {
        await supabase
          .from("fidelidade")
          .update({
            pontos_acumulados: pontosDisponiveis - PONTOS_NECESSARIOS,
          })
          .eq("tenant_id", TENANT_ID_MACIEL)
          .eq("cliente_telefone", telLimpo);
      }

      const { data: novoPedido, error: errorPedido } = await supabase
        .from("pedidos")
        .insert([
          {
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
          },
        ])
        .select()
        .single();

      if (errorPedido) throw errorPedido;

      if (novoPedido) {
        const itensParaInserir = carrinho.map((item) => ({
          pedido_id: novoPedido.id,
          produto_nome: item.nome,
          quantidade: 1,
          preco_unitario: item.preco,
        }));

        await supabase.from("pedido_itens").insert(itensParaInserir);
      }
      const mensagem = formatarWhats();
      const linkWhatsapp = `https://wa.me/5588981277642?text=${mensagem}`;

      if (pagamento === "Pix") {
        setPedidoFinalizado({
          id: novoPedido.id,
          msg: mensagem,
        });
        return;
      } else {
        onConfirm();
        window.location.href = linkWhatsapp;
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar pedido.");
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
          <h2 className="text-2xl font-black uppercase">Pagamento via Pix</h2>

          <img src="/qrcode-pix.png" className="w-48 h-48 mx-auto" />

          <div className="bg-white/5 p-4 rounded-xl flex justify-between items-center">
            <span className="text-xs">{CHAVE_PIX_MACIEL}</span>

            <button onClick={handleCopiarPix}>
              {copiou ? "Copiado!" : "Copiar"}
            </button>
          </div>

          <div className="text-xl font-bold text-yellow-400">
            R$ {totalFinalComTaxa.toFixed(2)}
          </div>

          <button
            onClick={() => {
              onConfirm();
              window.location.href = `https://wa.me/5588981277642?text=${pedidoFinalizado.msg}`;
            }}
            className="w-full bg-green-500 text-white p-4 rounded-xl"
          >
            Já paguei
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
      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-[10px] font-black uppercase text-white/20">
            Seu Carrinho
          </h3>
          <button
            onClick={onBack}
            className="text-[10px] font-black uppercase text-yellow-400"
          >
            + Adicionar mais
          </button>
        </div>

        <AnimatePresence>
          {carrinho.map((item, index) => (
            <motion.div
              key={`${item.id}-${index}`}
              layout
              className="bg-white/5 p-5 rounded-[2rem] border border-white/5 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 border border-white/10">
                    <img
                      src={item.imagem_url || item.image}
                      className="w-full h-full object-cover"
                      alt={item.nome}
                    />
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase italic">
                      {item.nome}
                    </p>
                    {item.descricao && (
                      <p className="text-[10px] text-yellow-400 font-bold leading-tight max-w-[200px]">
                        + {item.descricao}
                      </p>
                    )}
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
                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                  Valor do Item
                </span>
                <span className="text-yellow-400 font-black italic">
                  R$ {item.preco.toFixed(2)}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="bg-[#1a011a] p-6 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl">
        <h2 className="text-xl font-black italic uppercase tracking-tighter">
          Finalizar Pedido
        </h2>

        {!mesaURL && (
          <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
            <button
              onClick={() => setTipoEntrega("delivery")}
              className={`py-3 rounded-xl font-black text-[10px] uppercase transition-all ${tipoEntrega === "delivery" ? "bg-yellow-400 text-black" : "text-white/40"}`}
            >
              🛵 Delivery
            </button>
            <button
              onClick={() => setTipoEntrega("retirada")}
              className={`py-3 rounded-xl font-black text-[10px] uppercase transition-all ${tipoEntrega === "retirada" ? "bg-yellow-400 text-black" : "text-white/40"}`}
            >
              🥡 Retirada
            </button>
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Seu Nome"
            value={nome}
            onChange={setNome}
            placeholder="Como te chamamos?"
          />
          <Input
            label="WhatsApp"
            value={telefone}
            onChange={(val) => setTelefone(val.replace(/\D/g, ""))}
            placeholder="(00) 00000-0000"
          />

          {/* ADIÇÃO: CARD DE RESGATE FIDELIDADE */}
          <AnimatePresence>
            {pontosDisponiveis >= PONTOS_NECESSARIOS && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`p-4 rounded-2xl border-2 border-dashed flex items-center justify-between transition-all ${usarDescontoFidelidade ? "border-green-500 bg-green-500/10" : "border-[#ffcc00]/30 bg-white/5"}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${usarDescontoFidelidade ? "bg-green-500 text-white" : "bg-[#ffcc00] text-black"}`}
                  >
                    <Gift size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-white">
                      Você tem {pontosDisponiveis} pontos!
                    </p>
                    <p className="text-[9px] font-bold text-white/40 uppercase">
                      Liberado R$ 10,00 de desconto
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setUsarDescontoFidelidade(!usarDescontoFidelidade)
                  }
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${usarDescontoFidelidade ? "bg-green-500 text-white" : "bg-[#ffcc00] text-black"}`}
                >
                  {usarDescontoFidelidade ? "Aplicado" : "Resgatar"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {tipoEntrega === "delivery" && (
            <div className="space-y-4 pt-2 border-t border-white/5">
              <Input
                label="Rua"
                value={endereco}
                onChange={setEndereco}
                placeholder="Rua exemplo"
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">
                    Bairro
                  </label>
                  <select
                    value={bairro}
                    onChange={(e) => {
                      const sel = taxasDisponiveis.find(
                        (t) => t.bairro === e.target.value,
                      );
                      setBairro(e.target.value);
                      setTaxaEntrega(sel ? sel.valor : 0);
                    }}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white text-sm font-bold outline-none focus:border-yellow-400"
                  >
                    <option value="">Selecione seu bairro...</option>
                    {taxasDisponiveis.map((t) => (
                      <option key={t.id} value={t.bairro} className="bg-black">
                        {t.bairro} - R$ {t.valor.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Número"
                  value={numero}
                  onChange={setNumero}
                  placeholder="Nº"
                />
              </div>
              <Input
                label="Ponto de Referência"
                value={referencia}
                onChange={setReferencia}
                placeholder="Próximo a..."
              />
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-white/5 space-y-4">
          <h3 className="text-[10px] font-black uppercase text-white/30 ml-4 tracking-widest">
            Forma de Pagamento
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {[
              { id: "Pix", label: "PIX", icon: <QrCode size={16} /> },
              {
                id: "Cartão (Entregador)",
                label: "Cartão (na entrega)",
                icon: <CreditCard size={16} />,
              },
              {
                id: "Dinheiro",
                label: "Dinheiro",
                icon: <Banknote size={16} />,
              },
            ].map((met) => (
              <button
                key={met.id}
                onClick={() => setPagamento(met.id as PagamentoMetodo)}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${pagamento === met.id ? "border-yellow-400 bg-yellow-400/10 text-yellow-400" : "border-white/5 bg-white/5 text-white/40"}`}
              >
                <div className="flex items-center gap-3">
                  {met.icon}
                  <span className="text-xs font-black uppercase">
                    {met.label}
                  </span>
                </div>
                {pagamento === met.id && (
                  <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_10px_#ffcc00]" />
                )}
              </button>
            ))}
          </div>
          <AnimatePresence>
            {pagamento === "Dinheiro" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <Input
                  label="Troco para quanto?"
                  value={trocoPara}
                  onChange={setTrocoPara}
                  placeholder="Ex: 50"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pt-4 border-t border-white/5">
          {tipoEntrega === "delivery" && taxaEntrega > 0 && (
            <div className="flex justify-between px-2 mb-1">
              <span className="text-[10px] text-white/40 uppercase">
                Taxa de Entrega
              </span>
              <span className="text-xs text-white font-bold">
                R$ {taxaEntrega.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-end mb-4 px-2">
            <span className="text-[10px] font-black uppercase text-white/30">
              Total do Pedido
            </span>
            <div className="flex flex-col items-end">
              {usarDescontoFidelidade && (
                <span className="text-xs text-red-500 line-through font-bold opacity-50">
                  R$ {total.toFixed(2)}
                </span>
              )}
              <div className="text-3xl font-black text-yellow-400 italic">
                R$ {totalFinalComTaxa.toFixed(2)}{" "}
              </div>
            </div>
          </div>

          <button
            onClick={handleFinalizar}
            disabled={isEnviando || carrinho.length === 0}
            className="w-full bg-[#25D366] text-white h-16 rounded-[1.5rem] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-50 hover:brightness-110 active:scale-95"
          >
            {isEnviando ? (
              "Processando..."
            ) : (
              <>
                <Smartphone size={20} /> Confirmar e Enviar
              </>
            )}
          </button>
        </div>
      </div>
    </motion.section>
  );
};

const Input = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => (
  <div className="space-y-1">
    <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">
      {label}
    </label>
    <input
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-yellow-400/50 text-sm font-bold text-white transition-all placeholder:text-white/10"
    />
  </div>
);
