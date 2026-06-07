
-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ENUM de roles
-- ============================================================
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- ============================================================
-- 2. Tabla de perfiles (sincronizada con auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  role public.user_role NOT NULL DEFAULT 'user',
  username text UNIQUE,
  nombre text,
  apellido text,
  edad integer,
  es_indigena boolean,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 3. Trigger para sincronizar auth.users → profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4. Tabla de módulos (10 módulos temáticos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.modules (
  id serial PRIMARY KEY,
  titulo_espanol text NOT NULL,
  titulo_karina text NOT NULL,
  emoji text NOT NULL,
  color text NOT NULL,
  descripcion text NOT NULL,
  orden integer NOT NULL DEFAULT 0
);

-- ============================================================
-- 5. Tabla de palabras Kariña-Español
-- ============================================================
CREATE TABLE IF NOT EXISTS public.words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id integer REFERENCES public.modules(id) ON DELETE CASCADE,
  palabra_karina text NOT NULL,
  traduccion_espanol text NOT NULL,
  audio_url text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 6. Tabla de puntuaciones de juegos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_type text NOT NULL CHECK (game_type IN ('unir_palabras', 'audio_opciones', 'dictado')),
  score integer NOT NULL DEFAULT 0,
  completed_at timestamptz DEFAULT now()
);

-- ============================================================
-- 7. RLS Policies para profiles
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS public.user_role
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = uid;
$$;

CREATE POLICY "Admins have full access to profiles" ON public.profiles
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM get_user_role(auth.uid()));

-- ============================================================
-- 8. RLS Policies para modules (público, solo lectura)
-- ============================================================
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Modules are public readable" ON public.modules
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 9. RLS Policies para words (público, solo lectura)
-- ============================================================
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Words are public readable" ON public.words
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 10. RLS Policies para game_scores
-- ============================================================
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scores" ON public.game_scores
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scores" ON public.game_scores
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
