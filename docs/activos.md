# Manejo de Activos (Imágenes)

Para mantener el alto rendimiento del sitio (LCP < 2.5s), es fundamental seguir estas reglas para las imágenes.

## 1. Formato WebP
**No uses PNG o JPG directamente en el código.** Todas las imágenes deben ser convertidas a WebP.
- **Reducción**: WebP ofrece una reducción de hasta el 90% en peso comparado con PNG sin pérdida visible de calidad.
- **Transparencia**: WebP soporta transparencias mejor que PNG.

## 2. Dimensiones y Pesos
- **Thumbnails de Proyectos**: ~800x450px (Relación 16:9). Peso máximo: 100KB.
- **Fotos de Equipo/Directores**: ~400x400px (Cuadrado). Peso máximo: 50KB.
- **Hero Images / Fondos**: ~1920x1080px. Peso máximo: 300KB.

## 3. Directorios de Organización
- `/public/areas/AreasImages/`: Fotos de directores y thumbnails de áreas.
- `/public/projects/thumbnails/`: Imagen de portada de cada proyecto.
- `/public/projects/screenshots/`: Capturas del interior del proyecto para el modal.
- `/public/`: Logos principales y assets generales (`favicon.png` es la única excepción que suele mantenerse en PNG).

## 4. Lazy Loading
El sitio usa `loading="lazy"` para todas las imágenes que no aparecen en la pantalla inicial. Si agregas un nuevo componente con imágenes, asegúrate de incluir este atributo a menos que la imagen sea parte del Hero (pantalla de bienvenida).
