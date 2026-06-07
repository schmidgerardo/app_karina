
-- Tabla de progreso por módulo
CREATE TABLE IF NOT EXISTS public.module_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  module_id integer REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  exercise_1_done boolean DEFAULT false,
  exercise_2_done boolean DEFAULT false,
  exercise_3_done boolean DEFAULT false,
  completed boolean DEFAULT false,
  score integer DEFAULT 0,
  xp integer DEFAULT 0,
  completed_at timestamptz,
  UNIQUE(user_id, module_id)
);

-- RLS
ALTER TABLE public.module_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress" ON public.module_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON public.module_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON public.module_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Función helper para XP total del usuario
CREATE OR REPLACE FUNCTION public.get_user_xp(uid uuid)
RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(xp), 0)::int FROM public.module_progress WHERE user_id = uid;
$$;

-- Función helper para módulos completados
CREATE OR REPLACE FUNCTION public.get_user_completed_modules(uid uuid)
RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.module_progress WHERE user_id = uid AND completed = true;
$$;
