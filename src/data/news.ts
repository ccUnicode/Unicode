/**
 * news.ts
 * Datos de la sección de Novedades (Home).
 */

export interface NewsItem {
  title: string;
  description: string;
  image: string;
  href: string;
}

export const novedades: NewsItem[] = [
  {
    title: "Próximamente: Tech Day 2026",
    description:
      "Este sábado 18 de abril ven a aprender sobre IA, Data y Cloud en el Auditorio CTIC con expertos de la industria. ¡Regístrate ahora!",
    image: "/projects/thumbnails/techday_thumbnail.webp",
    href: "https://luma.com/mevizytu",
  },
  {
    title: "UNIOpenCourse 25-2: Clases para todos",
    description:
      "Democratizando el acceso al conocimiento. Ya están disponibles las grabaciones de las clases presenciales de la FIIS en nuestro canal.",
    image: "/projects/thumbnails/UNIOPENCOURSE-thumbnail.webp",
    href: "https://www.youtube.com/@ccunicode",
  },
  {
    title: "Éxito en Frontiers AI Summit",
    description:
      "Compartimos experiencias sobre automatización y transformación digital con expertos del BBVA, BCP y Pacífico en el CTIC-UNI.",
    image: "/eventos/frontiers-ai-summit.jpg",
    href: "https://www.linkedin.com/company/unicode-fiis-uni/",
  },
  {
    title: "TrikaWeb: Tu aliado académico",
    description:
      "¿Exámenes resueltos y reseñas de profesores? Todo en un solo lugar para optimizar tu rendimiento y evitar la trika.",
    image: "/projects/thumbnails/trikaweb-thumbnail.webp",
    href: "https://trikaweb.ccunicode.org/",
  },
  {
    title: "BEE INTEGRATION: Disciplina Matemática",
    description:
      "Gran nivel de competitividad en nuestro reciente concurso de integrales que reunió a talentos de todas las facultades.",
    image: "/eventos/bee-integration.jpg",
    href: "https://www.linkedin.com/company/unicode-fiis-uni/",
  },
  {
    title: "Innovación: Mi experiencia con Steve Jobs",
    description:
      "Lecciones invaluables de José Carreón, uno de los 12 evangelistas originales de Apple, en su reciente charla magistral.",
    image: "/eventos/steve-jobs-charla.webp",
    href: "https://www.linkedin.com/company/unicode-fiis-uni/",
  },
];
