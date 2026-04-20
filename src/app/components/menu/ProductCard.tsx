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
      // Reduzi o padding de p-3 para p-2.5 para ganhar 8px extras de largura no mobile
      className={`bg-white/5 border border-white/10 rounded-[1.8rem] p-2.5 flex items-center gap-2.5 group transition-all w-full max-w-full overflow-hidden ${
        !disponivel ? 'opacity-40 grayscale' : 'active:bg-white/10 hover:border-white/20'
      }`}
    >
      {/* IMAGEM: flex-none com tamanho fixo */}
      <div className="relative h-[72px] w-[72px] flex-none"> 
        <img 
          src={imagemFinal} 
          className="h-full w-full rounded-2xl object-cover border border-white/5 shadow-md" 
          alt={produto.nome} 
        />
        {produto.unidade_medida && disponivel && (
          <div className="absolute -top-1 -right-1 bg-[#ffcc00] text-[#3b013b] px-1.5 py-0.5 rounded-lg font-black text-[7px] uppercase shadow-lg z-10">
            {produto.unidade_medida}
          </div>
        )}
        
        {!disponivel && (
           <div className="absolute inset-0 bg-black/70 rounded-2xl flex items-center justify-center backdrop-blur-[2px]">
              <span className="text-[7px] font-black uppercase text-white bg-red-600 px-1.5 py-0.5 rounded-md tracking-tighter">
                {produto.disponivel === false ? 'Esgotado' : 'Fechado'}
              </span>
           </div>
        )}
      </div>
      
      {/* TEXTO: min-w-0 e flex-1 garantem que ele se ajuste ao espaço que sobra */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h3 className={`font-black text-xs uppercase italic leading-tight truncate ${!disponivel ? 'text-white/40' : 'text-white'}`}>
          {produto.nome}
        </h3>
        
        <div className="flex flex-col gap-0.5 mt-0.5">
          {!disponivel && produto.disponivel !== false && (
            <p className="text-[7px] font-black text-yellow-500 uppercase tracking-tight">
              Abre às {produto.hora_inicio?.slice(0, 5)}
            </p>
          )}

          {produto.disponivel === false && (
            <p className="text-[7px] font-black text-red-500 uppercase tracking-tight">
              Indisponível
            </p>
          )}

          {produto.descricao ? (
            <p className="text-[9px] text-white/40 leading-[1.1] line-clamp-2 font-medium pr-1">
              {produto.descricao}
            </p>
          ) : (
            <p className="text-[8px] text-white/20 italic">Sabor inconfundível</p>
          )}
        </div>

        <p className={`font-black italic text-[13px] mt-1 leading-none ${!disponivel ? 'text-white/20' : 'text-[#ffcc00]'}`}>
          R$ {produto.preco.toFixed(2)}
        </p>
      </div>

      {/* BOTÃO: flex-none é obrigatório aqui para ele NÃO sumir */}
      <div className="flex-none pl-1">
        <button 
          onClick={() => disponivel && onAdd(produto)}
          disabled={!disponivel}
          className={`h-10 w-10 rounded-2xl font-black text-lg transition-all flex items-center justify-center ${
            disponivel 
            ? "bg-[#ffcc00] text-[#3b013b] shadow-lg active:scale-90" 
            : "bg-white/5 text-white/10 cursor-not-allowed"
          }`}
        >
          {disponivel ? '+' : '🔒'}
        </button>
      </div>
    </motion.div>
  );
};