# Documento de Requisitos

## 1. Descripción General de la Aplicación

**Nombre de la Aplicación:** KARIÑA - Idioma Indígena

**Descripción:** Aplicación móvil educativa para el aprendizaje del idioma indígena Kariña del Estado Bolívar, Venezuela. Incluye sistema de autenticación, 10 módulos de aprendizaje organizados por categorías temáticas, juegos interactivos para reforzar el aprendizaje, y seguimiento de progreso del usuario. Diseño inspirado en la cultura Kariña con soporte bilingüe Kariña-Español.

## 2. Usuarios y Escenarios de Uso

**Usuarios Objetivo:**
- Estudiantes interesados en aprender el idioma Kariña
- Miembros de la comunidad Kariña que desean preservar su lengua
- Educadores e investigadores de lenguas indígenas

**Escenarios Principales:**
- Registrarse e iniciar sesión en la aplicación
- Acceder a 10 módulos de aprendizaje temáticos
- Practicar mediante juegos interactivos
- Visualizar progreso personal de aprendizaje
- Navegar entre diferentes secciones de la aplicación

## 3. Estructura de Pantallas y Funcionalidades

### Estructura de Navegación

```
App Kariña
├── Pantalla de Login
├── Pantalla/Modal de Registro
├── Menú Interactivo (Pantalla Principal)
│   ├── Módulo 1: Pronunciación de verbos
│   ├── Módulo 2: Saludos en Kariña
│   ├── Módulo 3: Nombres de animales en Kariña
│   ├── Módulo 4: Nombres de colores en Kariña
│   ├── Módulo 5: Números en Kariña
│   ├── Módulo 6: Familia y parentesco
│   ├── Módulo 7: Naturaleza y paisaje
│   ├── Módulo 8: Cuerpo humano
│   ├── Módulo 9: Alimentos
│   └── Módulo 10: Frases cotidianas
├── Pantalla de Juegos
│   ├── Juego 1: Unir palabras
│   ├── Juego 2: Escuchar audio con opciones
│   └── Juego 3: Dictado auditivo
├── Pantalla de Diccionario
└── Pantalla de Perfil
```

### 3.1 Pantalla de Login

#### 3.1.1 Imagen Superior
- Imagen de indígenas Kariña en la parte superior de la pantalla
- Representa la cultura y comunidad Kariña

#### 3.1.2 Campos de Entrada
- Campo de texto: Usuario
- Campo de texto: Contraseña (con ocultamiento de caracteres)

#### 3.1.3 Botones de Acción
- Botón principal: \"Entrar\" - inicia sesión con credenciales ingresadas
- Botón secundario: \"Registrarse\" - navega a pantalla/modal de registro
- Botón terciario: \"Entrar con Google\" - autenticación mediante OSS Google Login

#### 3.1.4 Link de Recuperación
- Link: \"¿Olvidó su contraseña?\" - permite recuperar contraseña

### 3.2 Pantalla/Modal de Registro

#### 3.2.1 Campos de Entrada
- Campo de texto: Nombre
- Campo de texto: Apellido
- Campo numérico: Edad
- Campo de selección: ¿Pertenece a comunidad indígena? (opciones: Sí / No)
- Campo de texto: Contraseña (con ocultamiento de caracteres)

#### 3.2.2 Generación Automática de Usuario
- El sistema genera automáticamente un nombre de usuario único para el nuevo usuario
- El usuario generado se muestra al usuario después del registro exitoso

#### 3.2.3 Botón de Acción
- Botón: \"Continuar\" - completa el registro y crea la cuenta

### 3.3 Menú Interactivo (Pantalla Principal)

#### 3.3.1 Header/Banner Visual
- Imagen de fondo representativa de la cultura Kariña
- URL de imagen: image.png
- Muestra elementos culturales: personas indígenas con vestimenta tradicional, selva tropical, tepuyes

#### 3.3.2 Logo y Título
- Título principal: \"KARIÑA - Idioma Indígena\"
- Subtítulo: \"Estado Bolívar, Venezuela\"
- Posicionado sobre el banner visual

#### 3.3.3 Sección de Progreso del Usuario
- Barra de progreso visual que muestra el avance general del usuario
- Indicador numérico o porcentual del progreso

#### 3.3.4 Sección de Módulos (10 módulos)

Cada módulo contiene:
- Emoji representativo
- Título en español
- Título en Kariña
- Color distintivo
- Descripción breve
- Es seleccionable para acceder a su contenido

**Módulo 1: Pronunciación de verbos**
- Enseña la pronunciación correcta de verbos comunes en Kariña

**Módulo 2: Saludos en Kariña**
- Aprende saludos y despedidas en idioma Kariña

**Módulo 3: Nombres de animales en Kariña**
- Vocabulario de animales de la región en Kariña

**Módulo 4: Nombres de colores en Kariña**
- Aprende los colores en idioma Kariña

**Módulo 5: Números en Kariña**
- Sistema numérico en idioma Kariña

**Módulo 6: Familia y parentesco**
- Términos de relaciones familiares en Kariña

**Módulo 7: Naturaleza y paisaje**
- Vocabulario relacionado con elementos naturales y geográficos

**Módulo 8: Cuerpo humano**
- Partes del cuerpo humano en idioma Kariña

**Módulo 9: Alimentos**
- Nombres de alimentos y comidas en Kariña

**Módulo 10: Frases cotidianas**
- Expresiones y frases de uso diario en Kariña

#### 3.3.5 Navegación Inferior
- Barra de navegación fija con 5 tabs:
  - Inicio (navega a Menú Interactivo)
  - Módulos (navega a lista de módulos)
  - Diccionario (navega a Pantalla de Diccionario)
  - Juegos (navega a Pantalla de Juegos)
  - Perfil (navega a Pantalla de Perfil)
- Tab activo visualmente diferenciado

### 3.4 Pantalla de Juegos

#### 3.4.1 Selección de Juegos
- Muestra 3 tipos de juegos disponibles
- Cada juego tiene título, descripción breve e imagen representativa

#### 3.4.2 Juego 1: Unir palabras
- Tipo: Matching/Emparejamiento
- Mecánica: El usuario debe emparejar palabras en Kariña con su traducción en español
- Presenta múltiples pares de palabras para unir
- Retroalimentación visual al emparejar correcta o incorrectamente

#### 3.4.3 Juego 2: Escuchar audio con opciones
- Tipo: Selección múltiple auditiva
- Mecánica: 
  - Se reproduce un audio en idioma Kariña
  - El usuario escucha el audio
  - Se presentan 3 opciones (A, B, C) con posibles traducciones o respuestas
  - El usuario selecciona la opción correcta
- Retroalimentación sobre respuesta correcta o incorrecta

#### 3.4.4 Juego 3: Dictado auditivo
- Tipo: Escritura por dictado
- Mecánica:
  - Se reproduce un audio en idioma Kariña
  - El usuario escucha el audio
  - El usuario escribe lo que escuchó en un campo de texto
  - El sistema valida la respuesta escrita
- Retroalimentación sobre precisión de la escritura

#### 3.4.5 Sistema de Puntuación
- Cada juego registra la puntuación del usuario
- Las puntuaciones se almacenan en la base de datos

### 3.5 Pantalla de Diccionario

- Lista de palabras en Kariña con sus traducciones al español
- Organización por categorías o módulos
- Función de búsqueda de palabras

### 3.6 Pantalla de Perfil

- Muestra información del usuario: nombre, apellido, edad
- Muestra estadísticas de aprendizaje
- Opción de cerrar sesión

### 3.7 Diseño Visual

#### 3.7.1 Paleta de Colores
- Verde selva: #1B5E20
- Naranja atardecer: #F59E0B
- Beige/crema para fondos
- Colores indígenas complementarios: rojo, azul turquesa, amarillo
- Patrones geométricos indígenas como elementos decorativos
- Cada módulo tiene un color distintivo asignado

#### 3.7.2 Diseño Responsive
- Mobile-first con ancho máximo de 430px
- Contenido centrado en pantallas más grandes
- Diseño tipo aplicación móvil nativa

#### 3.7.3 Interacciones
- Animaciones suaves al tocar elementos del menú
- Transiciones fluidas entre pantallas
- Feedback visual al seleccionar módulos o juegos

#### 3.7.4 Referencia Visual
- Diseño de interfaz basado en imagen de referencia: https://miaoda-conversation-file.s3cdn.medo.dev/user-c6js8p49d4ao/app-c6jsx92bbkld/20260607/1000861191.jpg

## 4. Reglas de Negocio y Lógica

### 4.1 Autenticación y Registro

- El usuario debe iniciar sesión para acceder a la aplicación
- Al registrarse, el sistema genera automáticamente un nombre de usuario único basado en nombre y apellido
- La autenticación con Google utiliza OSS Google Login
- Las contraseñas se almacenan de forma segura mediante hash

### 4.2 Navegación

- Después de iniciar sesión exitosamente, el usuario accede al Menú Interactivo
- Al seleccionar un módulo, se accede al contenido de aprendizaje de ese módulo
- Al seleccionar un juego, se inicia la sesión de juego correspondiente
- Los tabs de navegación inferior permiten cambiar entre secciones principales
- El tab \"Inicio\" siempre regresa al Menú Interactivo

### 4.3 Progreso del Usuario

- La barra de progreso se actualiza automáticamente según las lecciones completadas en los 10 módulos
- El progreso se calcula considerando todos los módulos disponibles
- El progreso se almacena en la base de datos y persiste entre sesiones

### 4.4 Contenido Bilingüe

- Todos los títulos de módulos se muestran en español y Kariña
- El idioma Kariña aparece junto al español en los módulos
- La interfaz de usuario está en español

### 4.5 Juegos

- Cada juego tiene su propia mecánica de puntuación
- Las puntuaciones se registran en la base de datos asociadas al usuario
- Los juegos utilizan contenido de palabras almacenadas en la base de datos

## 5. Estructura de Base de Datos (Supabase)

### 5.1 Tabla: users

Almacena información de usuarios registrados.

**Campos:**
- id (UUID, primary key)
- username (texto, único, generado automáticamente)
- nombre (texto)
- apellido (texto)
- edad (entero)
- es_indigena (booleano)
- password_hash (texto)
- created_at (timestamp)

### 5.2 Tabla: modules

Almacena información de los 10 módulos de aprendizaje.

**Campos:**
- id (entero, primary key)
- titulo_espanol (texto)
- titulo_karina (texto)
- emoji (texto)
- color (texto)
- descripcion (texto)
- orden (entero)

### 5.3 Tabla: words

Almacena palabras en Kariña con sus traducciones al español, organizadas por módulo.

**Campos:**
- id (UUID, primary key)
- module_id (entero, foreign key a modules)
- palabra_karina (texto)
- traduccion_espanol (texto)
- audio_url (texto, opcional)
- created_at (timestamp)

### 5.4 Tabla: games

Almacena puntuaciones de juegos de los usuarios.

**Campos:**
- id (UUID, primary key)
- user_id (UUID, foreign key a users)
- game_type (texto: \"unir_palabras\", \"audio_opciones\", \"dictado\")
- score (entero)
- completed_at (timestamp)

## 6. Situaciones Excepcionales y de Borde

| Situación | Comportamiento |
|-----------|----------------|
| Credenciales de login incorrectas | Mostrar mensaje de error: \"Usuario o contraseña incorrectos\" |
| Usuario ya existe al registrarse | Mostrar mensaje: \"El usuario ya está registrado\" |
| Campos de registro vacíos | Mostrar mensaje de validación solicitando completar campos obligatorios |
| Sin conexión a internet | Mostrar mensaje indicando falta de conexión, permitir acceso a contenido previamente descargado |
| Imagen de banner no carga | Mostrar color de fondo sólido (verde selva) con logo y título |
| Usuario sin progreso registrado | Barra de progreso muestra 0%, mensaje motivacional para comenzar |
| Audio de juego no carga | Mostrar mensaje de error y opción de reintentar |
| Pantalla más ancha que 430px | Contenido centrado con márgenes laterales |
| Error al guardar puntuación de juego | Mostrar mensaje de error, permitir continuar jugando |

## 7. Criterios de Aceptación

1. El usuario abre la aplicación y visualiza la pantalla de login con imagen de indígenas Kariña, campos de usuario y contraseña, y botones de acción
2. El usuario toca \"Registrarse\", completa el formulario de registro con nombre, apellido, edad, pertenencia a comunidad indígena y contraseña, y toca \"Continuar\" para crear su cuenta
3. El usuario inicia sesión con sus credenciales y accede al Menú Interactivo
4. El usuario visualiza los 10 módulos de aprendizaje con emoji, títulos bilingües, color y descripción
5. El usuario toca un módulo y accede al contenido de aprendizaje correspondiente
6. El usuario toca el tab \"Juegos\" en la navegación inferior y accede a la Pantalla de Juegos
7. El usuario selecciona y completa uno de los 3 juegos disponibles (unir palabras, audio con opciones, o dictado auditivo)
8. El usuario visualiza su progreso actualizado en el Menú Interactivo

## 8. Funcionalidades No Incluidas en Esta Versión

- Sistema de notificaciones push
- Modo offline completo con descarga de todos los contenidos
- Gamificación con sistema de insignias y recompensas
- Funcionalidad de búsqueda global en toda la app
- Integración con redes sociales para compartir progreso
- Sistema de recordatorios de práctica diaria
- Personalización de temas visuales
- Modo oscuro
- Estadísticas detalladas de aprendizaje por módulo individual
- Certificados de finalización de cursos
- Tabla de clasificación (leaderboard) entre usuarios
- Sistema de amigos o comunidad dentro de la app
- Lecciones con video
- Reconocimiento de voz para pronunciación
- Exportación de progreso o datos del usuario