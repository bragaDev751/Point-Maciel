"use client";

import { createBrowserClient } from '@supabase/ssr';
import { Produto } from "@/app/types/Index"; // Importando sua interface

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "🚨 ERRO: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não encontradas!"
  );
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export const TENANT_ID_MACIEL = "656f416f-3cf7-4c2e-97b4-53e1d13bc00d";

/**
 * Verifica se o produto está disponível com base no horário atual.
 * Tipado com a interface Produto para evitar o erro 'any'.
 */
export const isProductAvailable = (p: Produto): boolean => {
  if (p.disponivel_sempre) return true;
  if (!p.hora_inicio || !p.hora_fim) return true;

  const agora = new Date();
  const horaAtual = agora.getHours() * 100 + agora.getMinutes();

  // Remove os ":" e converte para número (ex: "18:00" -> 1800)
  const inicio = parseInt(p.hora_inicio.replace(/:/g, '').slice(0, 4));
  const fim = parseInt(p.hora_fim.replace(/:/g, '').slice(0, 4));

  // Lógica para horários que atravessam a meia-noite (ex: 18:00 às 02:00)
  if (fim < inicio) {
    return horaAtual >= inicio || horaAtual <= fim;
  }

  return horaAtual >= inicio && horaAtual <= fim;
};