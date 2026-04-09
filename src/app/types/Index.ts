// src/types/index.ts

export interface Produto {
  id: string | number; 
  nome: string;
  preco: number;
  
  categoria_nome: string; 
  descricao?: string; 
  imagem_url?: string; 
  image?: string; 
  emoji?: string;
  tenant_id?: string; 
  hora_inicio?: string; 
  hora_fim?: string;
  disponivel_sempre?: boolean;
  unidade_medida?: string;
}

export interface Categoria {
  id?: string; 
  nome: string;
  emoji: string;
  ordem?: number; 
  tenant_id?: string;
}
export interface Complemento {
  id: string;
  nome: string;
  preco: number;
  categoria_pai: string;
  tenant_id: string;
}
export interface ComplementoSelecao extends Complemento {
  quantidade_selecionada: number;
}