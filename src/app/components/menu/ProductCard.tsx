'use client';
import { motion } from 'framer-motion';
import { Produto } from '@/app/types/Index';

interface ProductCardProps {
  produto: Produto; 
  onAdd: (p: Produto) => void; 
}

export const ProductCard = ({ produto, onAdd }: ProductCardProps) => {
  
  const estaDisponivelAgora = () => {
    if (produto.disponivel === false) return false;
    if (produto.disponivel_sempre) return true;
    if (!produto.hora_inicio || !produto.hora_fim) return true;

    const agora = new Date();
    const horaAtual = agora.getHours().toString().padStart(2, '0') + ':' + 
                      agora.getMinutes().toString().padStart(2, '0');

    const inicio = produto.hora_inicio.slice(0, 5);
    const fim = produto.hora_fim.slice(0, 5);

    if (fim < inicio) {
        return horaAtual >= inicio || horaAtual <= fim;
    }
    return horaAtual >= inicio && horaAtual <= fim;
  };

  const disponivel = estaDisponivelAgora();
  const imagemFinal = produto.imagem_url || produto.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      // Troquei gap-4 por gap-3 para ganhar espaço no mobile
      className={`bg-white/5 border border-white/10 rounded-[2rem] p-3 flex items-center gap-3 group transition-all ${
        !disponivel ? 'opacity-40 grayscale' : 'active:bg-white/10 hover:border-white/20'
      }`}
    >
      {/* IMAGEM: flex-none garante que ela mantenha o tamanho */}
      <div className="relative h-20 w-20 flex-none"> 
        <img 
          src={imagemFinal} 
          className="h-full w-full rounded-2xl object-cover border border-white/10 shadow-lg" 
          alt={produto.nome} 
        />
        {produto.unidade_medida && disponivel && (
          <div className="absolute -top-1 -right-1 bg-[#ffcc00] text-[#3b013b] px-2 py-0.5 rounded-lg font-black text-[8px] uppercase shadow-lg">
            {produto.unidade_medida}
          </div>
        )}
        
        {!disponivel && (
           <div className="absolute inset-0 bg-black/70 rounded-2xl flex items-center justify-center backdrop-blur-[2px]">
              <span className="text-[8px] font-black uppercase text-white bg-red-600 px-2 py-1 rounded-lg tracking-tighter">
                {produto.disponivel === false ? 'Esgotado' : 'Fechado'}
              </span>
           </div>
        )}
      </div>
      
      {/* TEXTO: flex-1 e min-w-0 são essenciais para o truncate funcionar */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex flex-col">
          <h3 className={`font-black text-sm uppercase italic leading-tight mb-1 truncate ${!disponivel ? 'text-white/40' : 'text-white'}`}>
            {produto.nome}
          </h3>
          
          {!disponivel && produto.disponivel !== false && (
            <p className="text-[8px] font-black text-yellow-500 uppercase mb-0.5 tracking-tight">
              Abre às {produto.hora_inicio?.slice(0, 5)}
            </p>
          )}

          {produto.disponivel === false && (
            <p className="text-[8px] font-black text-red-500 uppercase mb-0.5 tracking-tight">
              Indisponível
            </p>
          )}
        </div>
        
        {produto.descricao ? (
          <p className="text-[10px] text-white/40 leading-tight line-clamp-2 mb-1 font-medium break-words">
            {produto.descricao}
          </p>
        ) : (
          <p className="text-[10px] text-white/20 italic mb-1">Sem descrição</p>
        )}

        <p className={`font-black italic text-base leading-none ${!disponivel ? 'text-white/20' : 'text-[#ffcc00]'}`}>
          R$ {produto.preco.toFixed(2)}
        </p>
      </div>

      {/* BOTÃO: flex-none para ele NUNCA encolher ou sumir */}
      <button 
        onClick={() => disponivel && onAdd(produto)}
        disabled={!disponivel}
        className={`h-11 w-11 rounded-2xl font-black text-xl transition-all flex-none flex items-center justify-center ${
          disponivel 
          ? "bg-[#ffcc00] text-[#3b013b] shadow-[0_4px_15px_rgba(255,204,0,0.2)] active:scale-90" 
          : "bg-white/5 text-white/10 cursor-not-allowed"
        }`}
      >
        {disponivel ? '+' : '🔒'}
      </button>
    </motion.div>
  );
};