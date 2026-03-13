REQUERIMIENTOS  

1. REQUERIMIENTOS FUNCIONALES  


1.1. 	Home:  

RF-01. Navbar: Se incluye una barra de navegación o navbar que incluye el acceso a las páginas de Áreas, Eventos, Proyectos y  

Convocatoria  

RF-02. Hero Section: El sistema incluye una Hero Section la cual, dentro un recuadro, contiene el nombre del centro cultural, la tagline y CTA (botón)  

RF-03. Novedades: En sistema debe mostrar las noticias sobre los nuevos acontecimientos e información nueva del centro cultural. RF-04. Datos del Centro Cultural: El sistema debe mostrar la cantidad de miembros activos del centro cultural, la cantidad de proyectos completados, la cantidad de eventos realizados y la cantidad de años de trayectoria.  

RF-05. Nosotros: El sistema mostrará una breve descripción del centro cultural, además de su misión y visión  

RF-06. Alianzas: El sistema mostrará los logos de las instituciones (posiblemente empresas, marcas, facultades, universidades, etc) asociadas con el centro cultural.  

RF-07. Tarjetas de invitación a exploración: El sistema se muestra el acceso a las páginas visibles en la Hero Section (Las páginas de Áreas, Eventos Proyectos y Convocatoria) mediante tarjetas. 

RF-08. Redes sociales: El sistema debe incluir los enlaces a las redes sociales del centro cultural y los íconos de las respectivas redes RF-09. Footer (© 2026 UNICODE — FIIS UNI): El sistema debe mostrar un footer en la parte inferior de todas las páginas del sitio que incluya el año, el nombre del centro cultural y la facultad asociada.  

  

1.2. 	Página de Áreas  

RF-10. Encabezado de la página de Áreas: El sistema debe mostrar un encabezado principal con el texto “Conoce todas las áreas de Unicode” en la parte superior de la página de áreas.   

RF-11. Listado de áreas: El sistema debe mostrar un listado de áreas del centro cultural en formato de tarjeta.  

  

RF-12. Contenido de tarjeta de área: Cada tarjeta de área debe incluir el nombre del área, una imagen y su descripción.  

RF-13. Acceso a página individual de área: El sistema debe permitir acceder a la página individual de cada área desde su tarjeta.  

  

  

1.2.1. 	Página individual de cada área:   

RF-14. Información del área: El sistema debe mostrar el nombre, descripción y objetivos del área seleccionada.  

RF-15. Directores o responsables: El sistema debe mostrar la foto y nombre de los directores del área.  

RF-16. Proyectos del área: El sistema debe mostrar los proyectos relacionados con el área.  

  

1.3. 	Página de Proyectos  

RF-17. Encabezado de la página de Proyectos: El sistema debe mostrar un encabezado principal con el texto “Nuestros Proyectos” en la parte superior de la página de proyectos.  

RF-18. Listado de proyectos: El sistema debe mostrar un listado de proyectos del centro cultural en formato de tarjeta.  

RF-19. Clasificación de proyectos: El sistema debe mostrar los proyectos divididos en activos y pasados (los activos aparecen primero). Los proyectos activos son aquellos que siguen en desarrollo y los pasados son aquellos en los que todas sus actividades ya han sido culminadas. 

RF-20. Contenido de tarjeta de proyecto: Cada proyecto debe mostrar el nombre del proyecto, una descripción breve (de qué se trata el proyecto y para qué se trabaja en él) de este, el estado del proyecto y el tag o categoría.  

RF-21. Acceso a página individual del proyecto: El sistema debe permitir acceder a la página individual de cada proyecto mediante la tarjeta.  

  

1.3.1. 	Página individual de cada proyecto:   

RF-22. Información del proyecto: El sistema debe mostrar el nombre del proyecto, la descripción completa, los objetivos y el estado del proyecto (activo o pasado)  

RF-23. Equipo del proyecto: El sistema debe la información del equipo responsable del proyecto (nombres y cargos o responsabilidades que tuvieron). 

RF-24. Galería del proyecto: El sistema debe permitir mostrar imágenes o videos sobre el proyecto.  

  

1.4. 	Página de Eventos  

RF-25. Portada de eventos: El sistema debe mostrar una portada de eventos con una imagen y la descripción general.  

RF-26. Próximos eventos: El sistema debe mostrar una lista de próximos eventos en formato tarjetas que contengan una imagen relacionada al evento, el nombre, su descripción, la fecha y hora de realización y el tipo de evento.  

RF-27. Eventos realizados: El sistema debe mostrar los eventos ya realizados en formato de tarjetas que contengan una imagen relacionada al evento, el nombre y su descripción.  

RF-28. Calendario de eventos: El sistema muestra un calendario dentro de la sección de próximos eventos en el cual se visualizan las fechas de los eventos futuros.  

  

  

1.5. 	Página de Convocatoria  

RF-29. Encabezado de la página de Convocatoria: El sistema debe mostrar un encabezado principal con el texto “CONVOCATORIA UNICODE” en la parte superior de la página de proyectos.  

RF-30. Información de convocatoria: El sistema debe mostrar descripción, el estado de la convocatoria y la fecha límite para la postulación.  

RF-31. Botón de postulación: El sistema debe incluir un botón “Postula ahora” que redirija al formulario de postulación.  

  

  

2. REQUERIMIENTOS NO FUNCIONALES  

  

2.1. 	Usabilidad de la Landing page  

RNF-01. Facilidad de navegación: La interfaz debe ser autoexplicativa, permitiendo que un usuario nuevo identifique la acción de cada botón y enlace mediante el uso de etiquetas claras e iconos estándar, sin necesidad de ayuda externa o manuales. 

RNF-02. Acceso rápido: El usuario debe poder acceder a cualquier sección principal en 2 o 3 clicks.  

  

2.2. 	Rendimiento de la Landing page  

RNF-03. Tiempo de carga: La landing page debe tener un tiempo de carga inicial (Largest Contentful Paint) menor a 2.5 segundos en una red 4G estándar o conexión de 10 Mbps. 

RNF-04. Optimización de recursos: Para garantizar una carga fluida, el peso total de la página no debe exceder los 2.5 MB. Las imágenes deben estar en formato WebP con un peso máximo de 300 KB por archivo de alta resolución. 

  

2.3. 	Compatibilidad de la Landing page  

RNF-05. Diseño responsive: La interfaz debe ajustarse dinámicamente a los siguientes breakpoints: 

Móvil: 320px - 480px. 

Tablet: 481px - 1024px. 

Desktop: >1025px. 

 

RNF-06. Compatibilidad con navegadores: El sistema debe funcionar correctamente en Google Chrome, Microsoft Edge y Mozilla Firefox.  

  

2.4. 	Seguridad de la Landing page  

RNF-07. Protocolo seguro: El sistema obligatoriamente debe utilizar HTTPS.  

RNF-08. Validación de formularios: Los formularios deben validar los datos antes de enviarlos.  

  

3. STACK TECNOLÓGICO  

El frontend será desarrollado utilizando Astro como framework principal, debido a su enfoque en la generación de sitios web optimizados y su capacidad de enviar al navegador únicamente el JavaScript necesario. Esto permite reducir los tiempos de carga, mejorar el rendimiento del sistema y favorecer el posicionamiento en motores de búsqueda (SEO). Asimismo, Astro facilita la creación de rutas dinámicas para páginas como áreas, proyectos y eventos.  

Para el diseño de la interfaz de usuario se utilizará Tailwind CSS, framework de estilos basado en utilidades que permite desarrollar interfaces responsivas, consistentes y de fácil mantenimiento.  

El diseño y prototipado de la interfaz se realizará mediante Figma, herramienta que permitirá la creación de wireframes y prototipos interactivos, facilitando la validación del diseño y el trabajo colaborativo del equipo.  

La gestión inicial del contenido se realizará mediante archivos de datos estáticos, permitiendo una implementación simple y escalable. Finalmente, el sistema será desplegado en plataformas de hosting como Vercel o Netlify, las cuales ofrecen integración continua, soporte para HTTPS y una adecuada disponibilidad del servicio. El control de versiones se gestionará mediante Git y GitHub.  