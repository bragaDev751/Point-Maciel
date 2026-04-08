"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase, TENANT_ID_MACIEL } from "@/lib/supabase";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";

interface Mesa {
  id: string;
  numero: string;
  tenant_id: string;
}

export const TableManager = () => {
  const [numero, setNumero] = useState("");
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(false);

  // Estado para o Modal do QR Code
  const [mesaSelecionada, setMesaSelecionada] = useState<string | null>(null);

  // Busca apenas as mesas do Maciel
  const fetchMesas = useCallback(async () => {
    const { data, error } = await supabase
      .from("mesas")
      .select("*")
      .eq("tenant_id", TENANT_ID_MACIEL) // 🔥 Filtro de segurança
      .order("numero", { ascending: true });

    if (!error && data) {
      setMesas(data);
    }
  }, []);

  useEffect(() => {
    // Definimos uma função interna para lidar com a promessa
    const loadData = async () => {
      await fetchMesas();
    };

    loadData();
  }, [fetchMesas]);

  const adicionarMesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numero) return toast.error("Digite o número da mesa!");

    setLoading(true);
    const { error } = await supabase.from("mesas").insert([
      {
        numero,
        tenant_id: TENANT_ID_MACIEL, // ✅ Uso da constante centralizada
      },
    ]);

    if (error) {
      toast.error("Erro ao criar mesa");
      console.error(error);
    } else {
      toast.success(`Mesa ${numero} criada!`);
      setNumero("");
      fetchMesas();
    }
    setLoading(false);
  };

  const deletarMesa = async (id: string) => {
    if (!confirm("Remover esta mesa?")) return;

    // Deleta garantindo que pertence ao tenant atual
    const { error } = await supabase
      .from("mesas")
      .delete()
      .eq("id", id)
      .eq("tenant_id", TENANT_ID_MACIEL);

    if (error) {
      toast.error("Erro ao remover mesa");
    } else {
      toast.success("Mesa removida");
      fetchMesas();
    }
  };

  const copiarLinkMesa = (num: string) => {
    const urlBase = window.location.origin;
    const link = `${urlBase}?mesa=${encodeURIComponent(num)}`;
    navigator.clipboard.writeText(link);
    toast.success(`Link da Mesa ${num} copiado!`);
  };

  return (
    <div className="space-y-8">
      {/* Formulário de Cadastro */}
      <section className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-md">
        <h2 className="text-sm font-black text-[#ffcc00] mb-6 italic uppercase tracking-widest">
          ✚ Cadastrar Nova Mesa
        </h2>
        <form
          onSubmit={adicionarMesa}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            placeholder="Ex: 01, VIP, Varanda..."
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-[#ffcc00] text-white transition-all"
          />
          <button
            disabled={loading}
            className="bg-[#ffcc00] text-[#3b013b] px-10 py-5 sm:py-0 rounded-2xl font-black uppercase text-xs active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-[#ffcc00]/10"
          >
            {loading ? "Salvando..." : "Salvar Mesa"}
          </button>
        </form>
      </section>

      {/* Listagem de Mesas */}
      <section className="space-y-4">
        <h3 className="text-[10px] text-white/20 uppercase font-black tracking-[0.2em] px-2">
          Mesas Ativas ({mesas.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mesas.length === 0 ? (
            <div className="col-span-full p-10 border border-dashed border-white/10 rounded-[2rem] text-center text-white/20 text-sm italic">
              Nenhuma mesa configurada.
            </div>
          ) : (
            mesas.map((m) => (
              <div
                key={m.id}
                className="bg-white/5 p-5 rounded-[2rem] border border-white/5 flex justify-between items-center group hover:border-[#ffcc00]/30 transition-all"
              >
                <div>
                  <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest block mb-1">
                    Mesa
                  </span>
                  <p className="font-black text-2xl text-[#ffcc00] italic leading-none">
                    {m.numero}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setMesaSelecionada(m.numero)}
                    className="h-12 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 text-white"
                  >
                    🖼️ QR Code
                  </button>
                  <button
                    onClick={() => copiarLinkMesa(m.numero)}
                    className="h-12 w-12 bg-white/5 hover:bg-[#ffcc00] hover:text-[#3b013b] rounded-xl flex items-center justify-center transition-all border border-white/10"
                    title="Copiar Link"
                  >
                    🔗
                  </button>
                  <button
                    onClick={() => deletarMesa(m.id)}
                    className="h-12 w-12 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-lg"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Modal do QR Code (Abre por cima de tudo) */}
      {mesaSelecionada && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[100] p-6"
          onClick={() => setMesaSelecionada(null)}
        >
          <div
            className="bg-white p-10 rounded-[3.5rem] flex flex-col items-center gap-6 shadow-[0_0_80px_rgba(255,204,0,0.2)] animate-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <h3 className="text-[#3b013b] font-black text-3xl uppercase italic leading-none tracking-tighter">
                Point Maciel
              </h3>
              <p className="text-[#3b013b]/40 font-bold text-[10px] uppercase tracking-[0.4em] mt-3 bg-[#3b013b]/5 py-2 px-4 rounded-full">
                Mesa {mesaSelecionada}
              </p>
            </div>

            <div className="p-6 bg-white border-[12px] border-[#3b013b]/5 rounded-[2.5rem]">
              <QRCodeSVG
                value={`${window.location.origin}?mesa=${encodeURIComponent(mesaSelecionada)}`}
                size={220}
                fgColor="#3b013b"
                includeMargin={false}
              />
            </div>

            <button
              onClick={() => setMesaSelecionada(null)}
              className="w-full bg-[#3b013b] text-white py-5 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10"
            >
              Fechar Visualização
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
