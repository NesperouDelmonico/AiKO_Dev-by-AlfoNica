# Imágenes de AiKO — prompt para IA generadora

Cómo usarlo:

1. Genera primero la **hoja de personaje** (sección 0). Después adjúntala como
   imagen de referencia en cada pedido, para que el oso sea siempre el mismo.
2. Pide **una imagen por mensaje**: pega el **bloque de estilo** y luego el
   pedido de esa imagen.
3. Guarda cada PNG con el **nombre exacto** indicado y ponlo en
   `mobile/assets/brand/ia/`. La app las toma por nombre.
4. Si la herramienta no exporta con fondo transparente, pide fondo blanco liso
   y quítalo después (por ejemplo, con remove.bg).

---

## Bloque de estilo (pegar al inicio de cada pedido)

```
Estilo: ilustración 3D tipo "clay"/plastilina suave, acabado mate,
bordes redondeados, iluminación cálida y difusa desde arriba a la izquierda,
sombras muy suaves. Paleta pastel: lila #8B5CFF, violeta #6D28D9,
lavanda #EDE4FF, menta #7FD8BE, celeste #9AD7FF, durazno #FFC9A8,
amarillo estrella #FFD23F, arena #F6E7C8, agua turquesa suave #8FDCE8.
Ambiente confortable, tierno y tranquilo, pensado para rehabilitación
cognitiva de adultos (amable, NO infantil en exceso).
Personaje: "AiKO", osito de peluche color lila #8B5CFF, cara y hocico
crema claro, orejas redondas con interior lavanda, ojos negros brillantes
grandes, mejillas rosadas, sonrisa pequeña. Proporción cabeza grande,
cuerpo pequeño y redondo. Siempre el MISMO personaje que la imagen de
referencia adjunta.
Sin texto, sin letras, sin números, sin logotipos, sin marcos.
Fondo TRANSPARENTE (PNG con canal alfa), objeto centrado con margen del 8 %.
```

---

## 0. Hoja de personaje (generar primero)

| Archivo | Tamaño | Pedido |
|---|---|---|
| `aiko_ref_sheet.png` | 2048×1024 | Hoja de referencia del personaje AiKO: vista de frente, tres cuartos y espalda, de pie, expresión neutra feliz. Fondo blanco liso (esta sí puede tener fondo). |

## 1. Bienvenida y compañero

| Archivo | Tamaño | Pedido |
|---|---|---|
| `bear_welcome_backpack.png` | 1024×1024 | AiKO de pie, de cuerpo entero, con una pequeña mochila marrón claro a la espalda, sujetando las correas, mirando al frente con entusiasmo, listo para un viaje. |
| `welcome_landscape.png` | 1536×1024 | Paisaje suave para la parte baja de la pantalla: orilla de playa con arena clara, agua turquesa en calma, arbustos redondos verde menta y montañas lavanda lejanas. Sin personaje. El tercio superior queda transparente. |
| `bear_wave.png` | 1024×1024 | AiKO de medio cuerpo saludando con una mano, sonrisa amplia (saludo del compañero). |
| `bear_cheer_small.png` | 512×512 | AiKO pequeño, de cuerpo entero, con los puños arriba animando ("¡tú puedes!"). |
| `bear_map_marker.png` | 512×512 | Cabeza de AiKO dentro de un círculo blanco con borde lila, como un marcador de posición en un mapa. |

## 2. Islas de la ruta (una por tipo de ejercicio del día)

Cada isla es una porción de tierra flotando en agua turquesa, vista en ¾
desde arriba, con orilla de arena y un poco de agua alrededor. No tienen
personaje.

| Archivo | Tamaño | Pedido |
|---|---|---|
| `island_atencion.png` | 1024×1024 | Isla con un faro pequeño de franjas blanco y lila, rocas redondas y pasto menta. |
| `island_memoria.png` | 1024×1024 | Isla con un gran árbol redondo de copa verde menta con hojas brillantes, raíces suaves y flores lavanda. |
| `island_reaccion.png` | 1024×1024 | Isla con un molino de viento pastel, pequeños destellos amarillos y una pista curva de arena. |
| `island_palabras.png` | 1024×1024 | Isla con una carpa de campamento color durazno, libros apilados y una fogata apagada con piedras. |
| `island_imagenes.png` | 1024×1024 | Isla con un arco de roca rosado, marcos de fotos pequeños colgando de una cuerda y flores. |
| `island_logica.png` | 1024×1024 | Isla con grandes cristales lila y celeste que brillan suavemente y piezas de rompecabezas de piedra. |
| `island_mixta.png` | 1024×1024 | Isla con una casita de madera redonda con techo lila, jardín y un buzón (días con ejercicios variados). |
| `island_meta.png` | 1024×1024 | Isla final con un trofeo dorado sobre un pedestal y banderines de colores pastel. |
| `sea_tile.png` | 1024×1024 | Textura de agua turquesa en calma, vista desde arriba, con ondas suaves. Mosaico repetible sin costuras y SIN transparencia. |
| `cloud_soft.png` | 768×384 | Nube blanca esponjosa, aislada. |

## 3. Cabeceras del panel de cada día (sin transparencia)

Escena ancha que aparece arriba del panel al tocar una isla. Es la misma isla
del punto 2 vista de lado, con cielo celeste degradado y nubes.

| Archivo | Tamaño |
|---|---|
| `header_atencion.png` | 1536×768 |
| `header_memoria.png` | 1536×768 |
| `header_reaccion.png` | 1536×768 |
| `header_palabras.png` | 1536×768 |
| `header_imagenes.png` | 1536×768 |
| `header_logica.png` | 1536×768 |
| `header_mixta.png` | 1536×768 |

## 4. Osos de cierre por tipo de ejercicio

Por cada juego van dos imágenes: **`_win`** (buen resultado, celebra) y
**`_retry`** (no alcanzó el puntaje, mirada amable que anima a intentarlo de
nuevo, sin tristeza fuerte). Todas de 1024×1024, de cuerpo entero.

| Juego | `_win` | `_retry` |
|---|---|---|
| Atención sostenida → `bear_atencion_` | AiKO saltando de alegría con una lupa en la mano y estrellitas alrededor. | AiKO sentado sosteniendo la lupa, sonriendo con ternura y una mano en el pecho. |
| Secuencias de memoria → `bear_memoria_` | AiKO con audífonos lila, bailando feliz con notas musicales flotando. | AiKO con audífonos, tranquilo, ojos cerrados y sonrisa suave, respirando. |
| Reacción → `bear_reaccion_` | AiKO en pose de corredor ganador con tenis y un rayo amarillo pequeño. | AiKO atándose los tenis, sonriente, como preparándose otra vez. |
| Completar palabras → `bear_palabras_` | AiKO levantando un libro abierto con alegría, letras de bloque de colores a su alrededor (sin letras legibles). | AiKO sentado leyendo un libro con calma, con un lápiz detrás de la oreja. |
| Recordar imágenes → `bear_imagenes_` | AiKO sosteniendo una cámara instantánea, guiñando un ojo, con fotos flotando. | AiKO mirando un álbum de fotos con cariño. |
| Lógica → `bear_logica_` | AiKO con gafas redondas colocando la última pieza de un rompecabezas, brazos arriba. | AiKO con gafas redondas, pensativo, con una pieza de rompecabezas en la mano y una sonrisa. |

Archivos resultantes, por ejemplo: `bear_atencion_win.png` y
`bear_atencion_retry.png`, y así con los demás.

## 5. Rutina, descanso y logros

| Archivo | Tamaño | Pedido |
|---|---|---|
| `bear_routine_done.png` | 1024×1024 | AiKO con audífonos y los brazos abiertos celebrando, notas musicales y confeti pastel. |
| `bear_rest.png` | 1024×1024 | AiKO durmiendo abrazado a una almohada lavanda, una luna pequeña y estrellitas encima (descanso). |
| `bear_streak.png` | 1024×1024 | AiKO sosteniendo un calendario pequeño con una llama naranja suave al lado. |
| `badge_primer_paso.png` | 512×512 | Insignia redonda tipo medalla 3D: huella de oso sobre fondo lila. |
| `badge_constancia.png` | 512×512 | Insignia: llama naranja suave sobre escudo dorado. |
| `badge_compromiso.png` | 512×512 | Insignia: corazón lila con cinta. |
| `badge_precision.png` | 512×512 | Insignia: diana menta con una flecha en el centro. |
| `badge_explorador.png` | 512×512 | Insignia: estrella azul celeste con brújula. |
| `badge_experto.png` | 512×512 | Insignia: trofeo dorado con laurel. |
| `badge_excelencia.png` | 512×512 | Insignia: diamante lila brillante. |
| `badge_locked.png` | 512×512 | Insignia gris lavanda con un candado pequeño. |

## 6. Personalizar a AiKO (cabeza, 512×512, mismo encuadre y posición exactos)

| Archivo | Pedido |
|---|---|
| `avatar_base.png` | Cabeza de AiKO de frente, sin accesorios. |
| `avatar_gorra.png` | La misma cabeza con una gorra negra hacia adelante. |
| `avatar_gafas.png` | La misma cabeza con gafas redondas grandes color durazno. |
| `avatar_audifonos.png` | La misma cabeza con audífonos lila. |
| `avatar_mono.png` | La misma cabeza con un moño rosado en una oreja. |
| `avatar_gorro.png` | La misma cabeza con un gorro de lana menta. |

---

**Total: 52 imágenes.** Si quieres empezar con menos, estas son las
imprescindibles para que la app se vea completa:

1. `bear_welcome_backpack`
2. `welcome_landscape`
3. Las 8 islas
4. `sea_tile`
5. Los 12 osos de cierre
6. `bear_routine_done`
7. `bear_rest`

Mientras no estén todas, la app usa el oso dibujado actual como reemplazo.
