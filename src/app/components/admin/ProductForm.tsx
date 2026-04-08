'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase, TENANT_ID_MACIEL } from '@/lib/supabase';
import { Produto } from '@/app/types/Index';
import toast from 'react-hot-toast';

interface ProdutoMutation {
  nome: string;
  preco: number;
  categoria_nome: string;
  descricao?: string; 
  image?: string;
  tenant_id: string;
}

interface CategoriaDB {
  id: string;
  nome: string;
}

export const ProductForm = () => {
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState(''); 

  const [listaCategorias, setListaCategorias] = useState<CategoriaDB[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | number | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔥 Buscar categorias do banco
  useEffect(() => {
    const carregarCategorias = async () => {
      const { data, error } = await supabase
        .from('categorias')
        .select('id, nome')
        .eq('tenant_id', TENANT_ID_MACIEL)
        .order('nome', { ascending: true });

      if (error) {
        console.error('Erro ao buscar categorias:', error);
      } else if (data) {
        setListaCategorias(data);
        if (data.length > 0 && !categoria) {
          setCategoria(data[0].nome);
        }
      }
    };

    carregarCategorias();

    window.addEventListener('refreshCategories', carregarCategorias);
    return () => window.removeEventListener('refreshCategories', carregarCategorias);
  }, [categoria]);

  // 🎯 Evento de edição
  useEffect(() => {
    const handleEdit = (e: Event) => {
      const customEvent = e as CustomEvent<Produto>;
      const p = customEvent.detail;

      setEditandoId(p.id);
      setNome(p.nome);
      setPreco(p.preco.toString());
      setCategoria(p.categoria_nome);
      setDescricao(p.descricao || ''); 
      setPreviewUrl(p.image || p.imagem_url || null);

      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('editProduct', handleEdit);
    return () => window.removeEventListener('editProduct', handleEdit);
  }, []);

  const cancelarEdicao = () => {
    setEditandoId(null);
    setNome('');
    setPreco('');
    setDescricao('');
    setImageFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadImagem = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${TENANT_ID_MACIEL}/${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('produtos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('produtos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome || !preco || !categoria) {
      return toast.error("Preencha nome, preço e categoria!");
    }

    setUploading(true);

    try {
      let imageUrl = previewUrl;

      if (imageFile) {
        imageUrl = await uploadImagem(imageFile);
      }

      const dados: ProdutoMutation = {
        nome,
        preco: parseFloat(preco),
        categoria_nome: categoria,
        descricao, 
        tenant_id: TENANT_ID_MACIEL
      };

      if (imageUrl) dados.image = imageUrl;

      const { error } = editandoId
        ? await supabase
            .from('produtos')
            .update(dados)
            .eq('id', editandoId)
            .eq('tenant_id', TENANT_ID_MACIEL)
        : await supabase
            .from('produtos')
            .insert([dados]);

      if (error) throw error;

      toast.success(editandoId ? "Item atualizado!" : "Item adicionado!");
      cancelarEdicao();

      window.dispatchEvent(new Event('refreshProducts'));

    } catch (error: unknown) {
      let mensagem = "Falha ao salvar";

      if (error instanceof Error) {
        mensagem = error.message;
      } else if (typeof error === 'string') {
        mensagem = error;
      }

      toast.error(`Erro: ${mensagem}`);
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className={`p-8 rounded-[2.5rem] border transition-all duration-500 shadow-2xl ${editandoId ? 'bg-[#ffcc00]/10 border-[#ffcc00]' : 'bg-white/5 border-white/10'}`}>
      <h2 className="text-sm font-black text-[#ffcc00] mb-6 italic uppercase tracking-widest">
        {editandoId ? '📝 Editando Item' : '✚ Novo Item no Cardápio'}
      </h2>

      <form onSubmit={salvar} className="space-y-5">

        {previewUrl && (
          <div className="flex justify-center">
            <img src={previewUrl} className="h-32 w-32 object-cover rounded-3xl border-2 border-[#ffcc00] shadow-lg" />
          </div>
        )}

        <input
          placeholder="Nome do Produto"
          value={nome}
          onChange={e => setNome(e.target.value)}
          className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-[#ffcc00] transition-all"
        />

     
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black text-white/30 ml-2 italic">Ingredientes / Descrição</label>
          <textarea
            placeholder="Ex: Pão brioche, blend 180g, queijo cheddar..."
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-[#ffcc00] transition-all min-h-[100px] resize-none text-sm text-white"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black text-white/30 ml-2">Foto do Produto</label>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-[#ffcc00] file:text-[#3b013b]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-white/30 ml-2">Preço (R$)</label>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={preco}
              onChange={e => setPreco(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-[#ffcc00]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-white/30 ml-2">Categoria</label>
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              className="w-full bg-[#1a011a] border border-white/10 p-5 rounded-2xl outline-none focus:border-[#ffcc00] text-white"
            >
              {listaCategorias.length > 0 ? (
                listaCategorias.map((cat) => (
                  <option key={cat.id} value={cat.nome} className="bg-[#1a011a]">
                    {cat.nome}
                  </option>
                ))
              ) : (
                <option>Carregando...</option>
              )}
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={uploading}
            className="flex-1 bg-[#ffcc00] text-[#3b013b] p-5 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all shadow-xl shadow-[#ffcc00]/10 disabled:opacity-50"
          >
            {uploading ? 'Processando...' : (editandoId ? 'Salvar Alterações' : 'Cadastrar no Cardápio')}
          </button>

          {editandoId && (
            <button
              type="button"
              onClick={cancelarEdicao}
              className="bg-white/10 px-6 rounded-2xl font-black uppercase text-[10px] hover:bg-white/20 transition-all"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </section>
  );
};