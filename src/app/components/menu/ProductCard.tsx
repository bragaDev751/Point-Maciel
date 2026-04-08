'use client';
import { motion } from 'framer-motion';
import { Produto } from '@/app/types/Index';

interface ProductCardProps {
  produto: Produto; 
  onAdd: (p: Produto) => void; 
}

export const ProductCard = ({ produto, onAdd }: ProductCardProps) => {
  // Placeholder caso o produto não tenha foto cadastrada
  const imagemFinal = produto.imagem_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white/5 border border-white/10 rounded-[2rem] p-3 flex items-center gap-4 group active:bg-white/10 transition-all"
    >
      {/* 📷 Foto do Produto */}
      <div className="relative h-24 w-24 flex-shrink-0">
        <img 
          src={imagemFinal} 
          className="h-full w-full rounded-2xl object-cover border border-white/10 shadow-lg" 
          alt={produto.nome} 
        />
        {produto.emoji && (
          <span className="absolute -top-2 -left-2 bg-[#1a011a] border border-white/10 w-7 h-7 flex items-center justify-center rounded-full text-sm shadow-xl">
            {produto.emoji}
          </span>
        )}
      </div>
      
      {/* 📝 Info e Descrição */}
      <div className="flex-1 min-w-0">
        <h3 className="font-black text-sm uppercase italic leading-tight text-white mb-1 truncate">
          {produto.nome}
        </h3>
        
        {/* Descrição do Produto (Ex: Ingredientes do Cuscuz) */}
        {produto.descricao ? (
          <p className="text-[10px] text-white/40 leading-relaxed line-clamp-2 mb-2 font-medium">
            {produto.descricao}
          </p>
        ) : (
          <p className="text-[10px] text-white/20 italic mb-2">Sem descrição disponível</p>
        )}

        <p className="text-[#ffcc00] font-black italic text-lg leading-none">
          R$ {produto.preco.toFixed(2)}
        </p>
      </div>

      {/* ➕ Botão Adicionar */}
      <button 
        onClick={() => onAdd(produto)}
        className="bg-[#ffcc00] text-[#3b013b] h-12 w-12 rounded-2xl font-black text-2xl transition-all shadow-[0_0_15px_rgba(255,204,0,0.2)] active:scale-90 flex-shrink-0 flex items-center justify-center"
      >
        +
      </button>
    </motion.div>
  );
};