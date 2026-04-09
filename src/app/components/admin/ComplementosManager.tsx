'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase, TENANT_ID_MACIEL } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Trash2 } from 'lucide-react';

interface ComplementoItem {
  id: string;
  nome: string;
  preco: number;
  categoria_pai: string;
  tenant_id: string;
}

export function ComplementosManager() {
  const [itens, setItens] = useState<ComplementoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome: '', preco: '0', categoria_pai: 'Sorvete' });

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('complementos')
        .select('*')
        .eq('tenant_id', TENANT_ID_MACIEL)
        .order('categoria_pai');
      
      if (error) throw error;
      setItens(data || []);
    } catch (err) {
      toast.error("Erro ao carregar complementos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    carregar(); 
  }, [carregar]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome) return toast.error("Nome obrigatório");
    
    const { error } = await supabase.from('complementos').insert([{
      nome: form.nome,
      preco: parseFloat(form.preco.replace(',', '.')),
      categoria_pai: form.categoria_pai,
      tenant_id: TENANT_ID_MACIEL
    }]);

    if (!error) {
      toast.success("Adicionado!");
      setForm({ ...form, nome: '', preco: '0' });
      carregar();
    } else {
      toast.error("Erro ao salvar");
    }
  }

  async function excluir(id: string) {
    if (!confirm("Excluir item?")) return;
    const { error } = await supabase.from('complementos').delete().eq('id', id);
    
    if (!error) {
      toast.success("Removido");
      carregar();
    } else {
      toast.error("Erro ao excluir");
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* O restante do seu JSX permanece igual */}
      <div className="lg:col-span-4">
        <form onSubmit={handleAdd} className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 sticky top-8">
          <h2 className="text-[#ffcc00] font-black text-xs uppercase italic tracking-widest">Novo Sabores/Extra</h2>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-white/20 ml-2">Nome</label>
            <input 
              placeholder="Ex: Chocolate, Nutella" 
              value={form.nome} 
              onChange={e => setForm({...form, nome: e.target.value})}
              className="w-full p-3 bg-black/40 rounded-xl border border-white/10 outline-none focus:border-[#ffcc00] text-sm text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-white/20 ml-2">Preço Adicional</label>
            <input 
              placeholder="0 para grátis" 
              value={form.preco} 
              onChange={e => setForm({...form, preco: e.target.value})}
              className="w-full p-3 bg-black/40 rounded-xl border border-white/10 outline-none focus:border-[#ffcc00] text-sm text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-white/20 ml-2">Pertence a qual categoria?</label>
            <select 
              value={form.categoria_pai} 
              onChange={e => setForm({...form, categoria_pai: e.target.value})}
              className="w-full p-3 bg-black/40 rounded-xl border border-white/10 outline-none focus:border-[#ffcc00] text-sm appearance-none text-white"
            >
              <option value="Sorvete" className="bg-[#0f010f]">Sorvete</option>
              <option value="Açaí" className="bg-[#0f010f]">Açaí</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-[#ffcc00] text-[#3b013b] py-4 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-yellow-400/10 active:scale-95 transition-all">
            Salvar Item
          </button>
        </form>
      </div>

      <div className="lg:col-span-8 space-y-8">
        {['Sorvete', 'Açaí'].map(cat => (
          <div key={cat} className="space-y-4">
            <div className="flex items-center gap-4">
                <h3 className="text-xs font-black uppercase text-[#ffcc00] italic tracking-widest">{cat}</h3>
                <div className="h-px flex-1 bg-white/5" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {loading ? (
                  <div className="h-20 bg-white/5 animate-pulse rounded-2xl md:col-span-2" />
              ) : (
                itens.filter(i => i.categoria_pai === cat).map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                      <div>
                        <p className="text-sm font-bold uppercase italic text-white">{item.nome}</p>
                        <p className="text-[#ffcc00] text-[9px] font-black tracking-widest">
                            {item.preco === 0 ? 'GRÁTIS' : `+ R$ ${Number(item.preco).toFixed(2)}`}
                        </p>
                      </div>
                      <button onClick={() => excluir(item.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all">
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}