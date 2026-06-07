
-- Agregar columna de imagen a módulos
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS imagen_url text;

-- Agregar columna de título en inglés
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS titulo_ingles text;

-- Agregar columna de descripción en inglés
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS descripcion_ingles text;

-- Agregar columna de idioma preferido al perfil
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS idioma text DEFAULT 'es';

-- Actualizar todos los módulos a color naranja y asignar imágenes
UPDATE public.modules SET color = '#F59E0B';

UPDATE public.modules SET imagen_url = 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_ac386622-8325-48b8-b803-a8e57eb76a55.jpg' WHERE orden = 1;
UPDATE public.modules SET imagen_url = 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_95e768a5-63e9-4f0b-8ffa-3c3c627d6191.jpg' WHERE orden = 2;
UPDATE public.modules SET imagen_url = 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_e96a23ed-9ac8-41c4-8c5b-c06fb2c3bc81.jpg' WHERE orden = 3;
UPDATE public.modules SET imagen_url = 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_61e2fa05-ca14-4c3e-a239-96b12184b5da.jpg' WHERE orden = 4;
UPDATE public.modules SET imagen_url = 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_dfaf3fd1-c250-437b-b10b-8ad34891a08a.jpg' WHERE orden = 5;
UPDATE public.modules SET imagen_url = 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_40b2b3f9-2c76-43c1-a569-48ab7acb0bcd.jpg' WHERE orden = 6;
UPDATE public.modules SET imagen_url = 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_f7b08c31-db15-40a2-a44e-2fe76b2e74c4.jpg' WHERE orden = 7;
UPDATE public.modules SET imagen_url = 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_e1b14afb-6bff-4cc8-b3a2-4f6240072c12.jpg' WHERE orden = 8;
UPDATE public.modules SET imagen_url = 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_9f237c26-a6e2-4a2d-b7b1-5e65c3ffbe99.jpg' WHERE orden = 9;
UPDATE public.modules SET imagen_url = 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_853beeec-9120-480f-b3a1-bd87192b6ee9.jpg' WHERE orden = 10;

-- Actualizar títulos en inglés
UPDATE public.modules SET titulo_ingles = 'Greetings and Family' WHERE orden = 1;
UPDATE public.modules SET titulo_ingles = 'Animals and Nature' WHERE orden = 2;
UPDATE public.modules SET titulo_ingles = 'Food and Drink' WHERE orden = 3;
UPDATE public.modules SET titulo_ingles = 'Colors' WHERE orden = 4;
UPDATE public.modules SET titulo_ingles = 'Body Parts' WHERE orden = 5;
UPDATE public.modules SET titulo_ingles = 'Numbers and Counting' WHERE orden = 6;
UPDATE public.modules SET titulo_ingles = 'Time and Weather' WHERE orden = 7;
UPDATE public.modules SET titulo_ingles = 'Home and Objects' WHERE orden = 8;
UPDATE public.modules SET titulo_ingles = 'Common Verbs' WHERE orden = 9;
UPDATE public.modules SET titulo_ingles = 'Emotions' WHERE orden = 10;

-- Actualizar descripciones en inglés
UPDATE public.modules SET descripcion_ingles = 'Learn basic greetings and family terms' WHERE orden = 1;
UPDATE public.modules SET descripcion_ingles = 'Animals, plants, and nature words' WHERE orden = 2;
UPDATE public.modules SET descripcion_ingles = 'Traditional food and drink vocabulary' WHERE orden = 3;
UPDATE public.modules SET descripcion_ingles = 'Colors in Kariña language' WHERE orden = 4;
UPDATE public.modules SET descripcion_ingles = 'Names of body parts' WHERE orden = 5;
UPDATE public.modules SET descripcion_ingles = 'Numbers and counting words' WHERE orden = 6;
UPDATE public.modules SET descripcion_ingles = 'Days, months, and weather terms' WHERE orden = 7;
UPDATE public.modules SET descripcion_ingles = 'Household objects and furniture' WHERE orden = 8;
UPDATE public.modules SET descripcion_ingles = 'Common action verbs' WHERE orden = 9;
UPDATE public.modules SET descripcion_ingles = 'Feelings and emotions' WHERE orden = 10;
