// src/types/index.ts

/* ================= COMPONENTES DO PEDIDO ================= */

export interface ItemPedido {
  id: string | number;
  nome: string;
  qtd: number;
  preco: number;
  detalhes?: string;
  imagem_url?: string;
}

export type StatusPedido = "novo" | "preparando" | "pronto" | "finalizado";
export type TipoPedido = "delivery" | "retirada" | "mesa";

/* ================= INTERFACES PRINCIPAIS ================= */

export interface Pedido {
  id: string;
  cliente_nome: string;
  cliente_telefone?: string;
  tipo_pedido: TipoPedido;
  mesa_numero?: string;
  endereco?: string;
  itens: ItemPedido[] | null; 
  total_pedido: number;
  status: StatusPedido;
  metodo_pagamento?: string;
  created_at: string;
  tenant_id: string;
  pontos_processados: boolean; 
  
}

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
  disponivel?: boolean;

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
  disponivel?: boolean; 
  tipo?: 'sabor' | 'extra'; 
}

export interface ComplementoSelecao extends Complemento {
  quantidade_selecionada: number;
}

export interface FidelidadeData {
  pontos_acumulados: number;
  cliente_nome: string;
}