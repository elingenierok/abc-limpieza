import { supabase } from '../../core/supabase.js';

export async function iniciarSesion({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw { code: 'AUTH_ERROR', detalle: error.message };
  return data.session;
}

export async function cerrarSesion() {
  const { error } = await supabase.auth.signOut();
  if (error) throw { code: 'AUTH_ERROR', detalle: error.message };
}

export async function obtenerSesionActual() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}