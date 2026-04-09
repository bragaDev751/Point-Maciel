"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { supabase, TENANT_ID_MACIEL } from "@/lib/supabase";
import { Produto } from "@/app/types/Index";
import { CreditCard, Banknote, QrCode, Smartphone } from "lucide-react";

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

  // NOVOS ESTADOS
  const [pagamento, setPagamento] = useState<PagamentoMetodo>("Pix");
  const [trocoPara, setTrocoPara] = useState("");

  useEffect(() => {
    if (mesaURL) {
      setTipoEntrega("mesa");
      setPagamento("Mesa");
    }
  }, [mesaURL, setTipoEntrega]);

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
    msg += `*PAGAMENTO:* ${pagamento}%0A`;
    if (pagamento === "Dinheiro" && trocoPara) {
      msg += `*Troco para:* R$ ${Number(trocoPara).toFixed(2)}%0A`;
    }

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

  const handleFinalizar = async () => {
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
      // 1. Inserimos o pedido salvando o campo 'itens' para a Cozinha e o 'metodo_pagamento'
      const { data: novoPedido, error: errorPedido } = await supabase
        .from("pedidos")
        .insert([
          {
            cliente_nome: nome,
            cliente_telefone: telefone,
            tipo_pedido: tipoEntrega,
            mesa_numero: tipoEntrega === "mesa" ? mesaURL : null,
            endereco: enderecoCompleto,
            total_pedido: total,
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

      // 2. Salvamos na tabela pedido_itens para o Dashboard
      if (novoPedido) {
        const itensParaInserir = carrinho.map((item) => ({
          pedido_id: novoPedido.id,
          produto_nome: item.nome,
          quantidade: 1,
          preco_unitario: item.preco,
        }));
        await supabase.from("pedido_itens").insert(itensParaInserir);
      }

      // 3. Abre o WhatsApp com a mensagem formatada
      window.open(
        `https://wa.me/5588981277642?text=${formatarWhats()}`,
        "_blank",
      );

      onConfirm();
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar pedido.");
    } finally {
      setIsEnviando(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 max-w-2xl mx-auto pb-24"
    >
      {/* Listagem de itens do carrinho omitida para brevidade, mantenha a sua */}
      {/* Listagem de itens do carrinho */}
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
            onChange={setTelefone}
            placeholder="(00) 00000-0000"
          />

          {tipoEntrega === "delivery" && (
            <div className="space-y-4 pt-2 border-t border-white/5">
              <Input
                label="Rua"
                value={endereco}
                onChange={setEndereco}
                placeholder="Rua exemplo"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Bairro"
                  value={bairro}
                  onChange={setBairro}
                  placeholder="Seu bairro"
                />
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

        {/* SEÇÃO DE PAGAMENTO */}
        <div className="pt-4 border-t border-white/5 space-y-4">
          <h3 className="text-[10px] font-black uppercase text-white/30 ml-4 tracking-widest">
            Forma de Pagamento
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {[
              { id: "Pix", label: "PIX", icon: <Smartphone size={16} /> },
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

          {/* CAMPO DE TROCO DINÂMICO */}
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
          <div className="flex justify-between items-end mb-4 px-2">
            <span className="text-[10px] font-black uppercase text-white/30">
              Total do Pedido
            </span>
            <div className="text-3xl font-black text-yellow-400 italic">
              R$ {total.toFixed(2)}
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
                <Smartphone size={20} />
                Confirmar e Enviar
              </>
            )}
          </button>
        </div>
      </div>
    </motion.section>
  );
};

// ... Mantenha o seu componente Input original no final

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
      className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-yellow-400/50 text-sm font-bold text-white"
    />
  </div>
);
