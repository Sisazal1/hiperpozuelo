# Objetivo
E-commerce de supermercado/hogar creíble y premium. Referencias: Zara (limpieza e imagen), IKEA (categorías y precio claros), Amazon (entrega junto al botón de compra), Huel (packs y upsell claros).

# Diseño
- Un solo sistema con tokens CSS: color, espaciado (4/8/12/16/24/32/48/64), radios (8/12/999), 2 niveles de sombra, UNA familia tipográfica, 5 tamaños. Prohibidos los valores sueltos.
- Una acción primaria por vista. Botones primary/secondary/ghost, 3 tamaños, mínimo 44px de alto en móvil.
- Un ancho de contenido único (1200px), gutters 16/24.
- Secciones 56–72px en desktop y 40px en móvil. Nunca huecos vacíos mayores de 96px.
- PROHIBIDO: placeholders tipo "Imagen pendiente", textos "demo", emojis como iconos, degradados decorativos, sombras pesadas, texto menor de 14px, contraste menor de 4.5:1, más de 2 pesos tipográficos por bloque.
- En las cards el precio tiene más jerarquía que el nombre.
- Todo elemento interactivo tiene hover, focus-visible (anillo 2px), active, disabled y loading.

# Movimiento (Emil Kowalski)
- 150–250ms, ease-out. Entradas con opacity + translateY ≤ 8px. Solo transform y opacity.
- Respetar prefers-reduced-motion. Nada que bloquee la interacción. No animar listas largas al cargar.

# Confianza
- NUNCA inventar reseñas, stock, descuentos, datos de empresa ni fotos.
- Los datos desconocidos viven en src/config/site.ts como null. La UI los oculta, sin mensajes "pendiente" por todas partes.
- Los costes se calculan en UN módulo. Carrito, drawer, checkout y confirmación lo importan.

# Verificación
Cada tarea termina con capturas reales (Playwright, 1440px y 390px) antes/después, y con una lista honesta de lo que sigue mal.

# Marca
Posicionamiento: "Tu casa lista en un pack". Para quien empieza en casa (mudanza, primer piso, estudiantes) y quiere resolverlo sin pensar. Precio claro, cero sorpresas.
Voz: cercana, directa, con un toque de humor suave en español de España. Frases cortas. Verbos de acción. Ejemplos: "Cocina lista. Sin dar mil vueltas." / "Lo que necesitas, sin lo que no." Nunca corporativa, nunca exagerada, nunca promesas que no podamos cumplir.

# Dirección visual (Huel / Dr. Squatch, adaptada)
- Fondo cálido off-white (#FAF7F2), tinta casi negra (#1A1A1A), acento: el rojo del logo (#C8102E) SOLO para CTA principal y detalles puntuales. Un segundo color de apoyo suave (verde salvia o arena) para fondos de sección.
- Titulares grandes y con carácter: display bold (Bricolage Grotesque) en titulares, Inter en texto. Escala tipográfica generosa, line-height ajustado en titulares, tracking negativo leve.
- Composición: mucho producto, bloques tipo bento para categorías, esquinas 12–16px, bordes finos en vez de sombras pesadas.
- Fotografía: producto sobre fondo neutro cálido + fotos de uso. Ratios fijos: cards 4:5, galería 1:1, hero 16:9. Si no hay foto, tile de categoría con icono de línea, sin texto. Nunca foto de stock, nunca generada por IA, nunca copiada de otra tienda.
- Prueba social: no mostrar estrellas, reseñas ni contadores hasta que existan reseñas reales verificadas. Dejar los huecos de componente preparados pero ocultos.

# Movimiento
Reveal de secciones al hacer scroll (opacity + translateY 8px, 200ms, una sola vez, sin retraso acumulado), hover de card con elevación sutil (translateY -2px), cambio de imagen en hover solo si hay segunda foto.

# Stageshow
Para escenas de producto, demos visuales o walkthroughs: una sola idea por escena, contexto suficiente para reconocerla, palabras reales solo donde aporten significado y movimiento con causa. El resultado debe funcionar como póster antes de animarse. Los cambios de estado se mantienen montados y se animan con transform/opacity, con pausas breves, sin resets arbitrarios ni cursores decorativos.
