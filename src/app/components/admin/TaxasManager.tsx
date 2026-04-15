"use client";

import { useEffect, useState, useCallback } from "react"; 
import { supabase, TENANT_ID_MACIEL } from "@/lib/supabase";
import { Trash2, Plus } from "lucide-react";

interface Taxa {
  id: string;
  bairro: string;
  valor: number;
}

export function TaxasManager() {
  const [taxas, setTaxas] = useState<Taxa[]>([]);
  const [novoBairro, setNovoBairro] = useState("");
  const [novoValor, setNovoValor] = useState("");

  const carregarTaxas = useCallback(async () => {
    const { data } = await supabase
      .from("taxas_entrega")
      .select("*")
      .eq("tenant_id", TENANT_ID_MACIEL)
      .order("bairro", { ascending: true });
    
    if (data) setTaxas(data);
  }, []); 


  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      await carregarTaxas();
    };

    fetchInitialData();

    return () => {
      isMounted = false;
    };
  }, [carregarTaxas]); 

  const adicionarTaxa = async () => {
    if (!novoBairro || !novoValor) return;
    const { error } = await supabase.from("taxas_entrega").insert({
      tenant_id: TENANT_ID_MACIEL,
      bairro: novoBairro,
      valor: parseFloat(novoValor)
    });
    
    if (!error) {
      setNovoBairro("");
      setNovoValor("");
      carregarTaxas();
    }
  };

  const deletarTaxa = async (id: string) => {
    const { error } = await supabase.from("taxas_entrega").delete().eq("id", id);
    if (!error) carregarTaxas();
  };

  return (
    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 backdrop-blur-sm">
      <h2 className="text-xl font-black text-white uppercase italic mb-6">📍 Gerenciar Taxas</h2>
      
      <div className="flex flex-col md:flex-row gap-3 mb-8">
        <input 
          placeholder="Nome do Bairro" 
          value={novoBairro}
          onChange={(e) => setNovoBairro(e.target.value)}
          className="bg-white/5 border border-white/10 p-3 rounded-xl text-white flex-1 outline-none focus:border-[#ffcc00]/50"
        />
        <input 
          type="number" 
          placeholder="R$ 0,00" 
          value={novoValor}
          onChange={(e) => setNovoValor(e.target.value)}
          className="bg-white/5 border border-white/10 p-3 rounded-xl text-white md:w-32 outline-none focus:border-[#ffcc00]/50"
        />
        <button 
          onClick={adicionarTaxa} 
          className="bg-[#ffcc00] text-[#3b013b] px-6 py-3 rounded-xl font-black uppercase flex items-center justify-center gap-2 hover:scale-105 transition-transform"
        >
          <Plus size={18} /> Adicionar
        </button>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
        {taxas.length === 0 ? (
          <p className="text-white/20 text-xs italic text-center py-4">Nenhum bairro cadastrado.</p>
        ) : (
          taxas.map((taxa) => (
            <div key={taxa.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
              <div>
                <p className="text-white font-bold uppercase text-xs tracking-wider">{taxa.bairro}</p>
                <p className="text-[#ffcc00] font-black">R$ {taxa.valor.toFixed(2)}</p>
              </div>
              <button 
                onClick={() => deletarTaxa(taxa.id)} 
                className="text-red-500/50 hover:text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}