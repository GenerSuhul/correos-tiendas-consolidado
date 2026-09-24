// La llave publishable es pública por diseño; el acceso a los datos depende de Auth y RLS.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://edgbiulsnqxkfouvhoiu.supabase.co';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Rno2ShjLiGbOrwWEHpPDxw_IMtPqXXj';
export const ADMIN_EMAIL = 'it.agrisystem@gmail.com';
