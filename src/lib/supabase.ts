import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export const TENANT_ID_MACIEL = "656f416f-3cf7-4c2e-97b4-53e1d13bc00d";

import { Produto } from "@/app/types/Index";

export const isProductAvailable = (p: Produto): boolean => {
  if (p.disponivel_sempre) return true;
  if (!p.hora_inicio || !p.hora_fim) return true;

  const agora = new Date();
  const horaAtual = agora.getHours() * 100 + agora.getMinutes();

  const inicio = parseInt(p.hora_inicio.replace(/:/g, '').slice(0, 4));
  const fim = parseInt(p.hora_fim.replace(/:/g, '').slice(0, 4));

  if (fim < inicio) {
    return horaAtual >= inicio || horaAtual <= fim;
  }
  return horaAtual >= inicio && horaAtual <= fim;
};