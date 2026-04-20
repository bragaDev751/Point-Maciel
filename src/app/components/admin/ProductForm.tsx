"use client";
import { useState, useEffect, useRef } from "react";
import { supabase, TENANT_ID_MACIEL } from "@/lib/supabase";
import { Produto } from "@/app/types/Index";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface ProdutoMutation {
  nome: string;
  preco: number;
  categoria_nome: string;
  descricao?: string;
  image?: string;
  imagem_url?: string;
  tenant_id: string;
  hora_inicio?: string;
  hora_fim?: string;
  disponivel_sempre?: boolean;
  unidade_medida?: string;
  qtd_sabores_gratis?: number;
  qtd_extras_max?: number;
}

interface CategoriaDB {
  id: string;
  nome: string;
}

export const ProductForm = () => {
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");

  const [horaInicio, setHoraInicio] = useState("00:00");
  const [horaFim, setHoraFim] = useState("23:59");
  const [disponivelSempre, setDisponivelSempre] = useState(true);

  const [unidadeMedida, setUnidadeMedida] = useState("unid");

  const [qtdSabores, setQtdSabores] = useState("0");
  const [qtdExtras, setQtdExtras] = useState("0");

  const [listaCategorias, setListaCategorias] = useState<CategoriaDB[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | number | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const carregarCategorias = async () => {
      if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
      const { data, error } = await supabase
        .from("categorias")
        .select("id, nome")
        .eq("tenant_id", TENANT_ID_MACIEL)
        .order("nome", { ascending: true });

      if (error) {
        console.error("Erro ao buscar categorias:", error);
      } else if (data) {
        setListaCategorias(data);
        if (data.length > 0 && !categoria) {
          setCategoria(data[0].nome);
        }
      }
    };

    carregarCategorias();
    window.addEventListener("refreshCategories", carregarCategorias);
    return () =>
      window.removeEventListener("refreshCategories", carregarCategorias);
  }, [categoria]);

  useEffect(() => {
    const handleEdit = (e: Event) => {
      const customEvent = e as CustomEvent<Produto>;
      const p = customEvent.detail;

      setEditandoId(p.id);
      setNome(p.nome);
      setPreco(p.preco.toString());
      setCategoria(p.categoria_nome);
      setDescricao(p.descricao || "");
      setPreviewUrl(p.image || p.imagem_url || null);

      setHoraInicio(p.hora_inicio?.slice(0, 5) || "00:00");
      setHoraFim(p.hora_fim?.slice(0, 5) || "23:59");
      setDisponivelSempre(p.disponivel_sempre ?? true);

      setUnidadeMedida(p.unidade_medida || "unid");
      setQtdSabores(p.qtd_sabores_gratis?.toString() || "0");
      setQtdExtras(p.qtd_extras_max?.toString() || "0");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("editProduct", handleEdit);
    return () => window.removeEventListener("editProduct", handleEdit);
  }, []);

  const cancelarEdicao = () => {
    setEditandoId(null);
    setNome("");
    setPreco("");
    setDescricao("");
    setImageFile(null);
    setPreviewUrl(null);
    setHoraInicio("00:00");
    setHoraFim("23:59");
    setDisponivelSempre(true);
    setUnidadeMedida("unid");
    setQtdSabores("0");
    setQtdExtras("0");

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadImagem = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${TENANT_ID_MACIEL}/${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from("produtos")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("produtos").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome || !preco || !categoria) {
      return toast.error("Preencha nome, preço e categoria!");
    }

    setUploading(true);

    try {
      let imageUrl = previewUrl?.startsWith("http") ? previewUrl : null;
      if (imageFile) {
        imageUrl = await uploadImagem(imageFile);
      }

      const hInicio = disponivelSempre ? "00:00:00" : `${horaInicio}:00`;
      const hFim = disponivelSempre ? "23:59:59" : `${horaFim}:00`;

      const dados: ProdutoMutation = {
        nome,
        preco: parseFloat(preco),
        categoria_nome: categoria,
        descricao: descricao || "",
        tenant_id: TENANT_ID_MACIEL,
        hora_inicio: hInicio,
        hora_fim: hFim,
        disponivel_sempre: disponivelSempre,
        unidade_medida: unidadeMedida,
        image: imageUrl ?? undefined,
        imagem_url: imageUrl ?? undefined,

        qtd_sabores_gratis: parseInt(qtdSabores) || 0,
        qtd_extras_max: parseInt(qtdExtras) || 0,
      };

      const { error } = editandoId
        ? await supabase
            .from("produtos")
            .update(dados)
            .eq("id", editandoId)
            .eq("tenant_id", TENANT_ID_MACIEL)
        : await supabase.from("produtos").insert([dados]);

      if (error) throw error;

      toast.success(editandoId ? "Item atualizado!" : "Item adicionado!");
      cancelarEdicao();
      window.dispatchEvent(new Event("refreshProducts"));
    } catch (error: unknown) {
      console.dir(error);
      let mensagem = "Erro desconhecido";
      if (error instanceof Error) mensagem = error.message;
      toast.error(`Erro: ${mensagem}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section
      className={`p-8 rounded-[2.5rem] border transition-all duration-500 shadow-2xl ${editandoId ? "bg-[#ffcc00]/10 border-[#ffcc00]" : "bg-white/5 border-white/10"}`}
    >
      <h2 className="text-sm font-black text-[#ffcc00] mb-6 italic uppercase tracking-widest">
        {editandoId ? "📝 Editando Item" : "✚ Novo Item no Cardápio"}
      </h2>

      <form onSubmit={salvar} className="space-y-5">
        {previewUrl && (
          <div className="flex justify-center">
            <img
              src={previewUrl}
              className="h-32 w-32 object-cover rounded-3xl border-2 border-[#ffcc00] shadow-lg"
              alt="Preview"
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black text-white/30 ml-2">
            Nome do Produto
          </label>
          <input
            placeholder="Ex: Burger Clássico"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-[#ffcc00] transition-all text-white font-bold"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black text-white/30 ml-2 italic">
            Ingredientes / Descrição
          </label>
          <textarea
            placeholder="Ex: Pão brioche, blend 180g, queijo cheddar..."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-[#ffcc00] transition-all min-h-[100px] resize-none text-sm text-white"
          />
        </div>

        <div className="bg-black/20 p-6 rounded-[2rem] border border-white/5 space-y-4">
          <div className="flex items-center justify-between px-2">
            <label className="flex items-center gap-3 text-xs font-black uppercase text-white/50 cursor-pointer group">
              <input
                type="checkbox"
                className="w-5 h-5 accent-[#ffcc00] rounded-lg"
                checked={disponivelSempre}
                onChange={() => setDisponivelSempre(!disponivelSempre)}
              />
              <span className="group-hover:text-white transition-colors">
                Disponível o dia todo
              </span>
            </label>
          </div>

          <AnimatePresence>
            {!disponivelSempre && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 gap-4 pt-2"
              >
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-white/20 ml-2">
                    Hora Início
                  </label>
                  <input
                    type="time"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-bold outline-none focus:border-[#ffcc00]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-white/20 ml-2">
                    Hora Fim
                  </label>
                  <input
                    type="time"
                    value={horaFim}
                    onChange={(e) => setHoraFim(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-bold outline-none focus:border-[#ffcc00]"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black text-white/30 ml-2">
            Foto do Produto
          </label>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs text-white/40 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-[#ffcc00] file:text-[#3b013b]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 bg-white/5 p-6 rounded-[2rem] border border-white/5">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-[#ffcc00] ml-2">
              Limite de Sabores
            </label>
            <input
              type="number"
              value={qtdSabores}
              onChange={(e) => setQtdSabores(e.target.value)}
              className="w-full bg-black/20 border border-white/10 p-4 rounded-xl text-white font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-[#ffcc00] ml-2">
              Limite de Extras
            </label>
            <input
              type="number"
              value={qtdExtras}
              onChange={(e) => setQtdExtras(e.target.value)}
              className="w-full bg-black/20 border border-white/10 p-4 rounded-xl text-white font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-white/30 ml-2">
              Preço (R$)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-[#ffcc00] text-white font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-white/30 ml-2">
              Unidade
            </label>
            <select
              value={unidadeMedida}
              onChange={(e) => setUnidadeMedida(e.target.value)}
              className="w-full bg-[#1a011a] border border-white/10 p-5 rounded-2xl outline-none focus:border-[#ffcc00] text-white font-bold appearance-none"
            >
              <option value="unid">UN (Lanches/Vape)</option>
              <option value="kg">KG (Açaí/Peso)</option>
              <option value="bola">BOLA (Sorvete)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-white/30 ml-2">
              Categoria
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full bg-[#1a011a] border border-white/10 p-5 rounded-2xl outline-none focus:border-[#ffcc00] text-white font-bold appearance-none"
            >
              {listaCategorias.map((cat) => (
                <option key={cat.id} value={cat.nome}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-6">
          <button
            type="submit"
            disabled={uploading}
            className="flex-[2] bg-[#ffcc00] text-[#3b013b] p-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest active:scale-95 transition-all shadow-xl shadow-[#ffcc00]/10 disabled:opacity-50"
          >
            {uploading
              ? "Processando..."
              : editandoId
                ? "Salvar Alterações"
                : "Cadastrar no Cardápio"}
          </button>

          {editandoId && (
            <button
              type="button"
              onClick={cancelarEdicao}
              className="flex-1 bg-white/5 border border-white/10 px-6 rounded-[1.5rem] font-black uppercase text-[10px] text-white/50 hover:bg-white/10 hover:text-white transition-all"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </section>
  );
};
