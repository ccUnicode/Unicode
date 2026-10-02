/**
 * Faculties and careers of the best-known universities, keyed by the acronym used in universities.ts.
 * They only feed the form's suggestions: any other faculty or career can still be typed.
 * UNI matches the official vacancy table for admission 2026-2 (34 careers, 11 faculties).
 */
type Faculty = readonly [name: string, acronym: string, careers: readonly string[]];

export const FACULTIES: Readonly<Record<string, readonly Faculty[]>> = {
  UNI: [
    ['Facultad de Arquitectura, Urbanismo y Artes', 'FAUA', ['Arquitectura', 'Urbanismo']],
    ['Facultad de Ciencias', 'FC', ['Física', 'Matemática', 'Química', 'Ingeniería Física', 'Ciencia de la Computación']],
    ['Facultad de Ingeniería Ambiental', 'FIA', ['Ingeniería Sanitaria', 'Ingeniería de Higiene y Seguridad Industrial', 'Ingeniería Ambiental']],
    ['Facultad de Ingeniería Civil', 'FIC', ['Ingeniería Civil']],
    ['Facultad de Ingeniería Económica, Estadística y Ciencias Sociales', 'FIEECS', ['Ingeniería Económica', 'Ingeniería Estadística']],
    ['Facultad de Ingeniería Eléctrica y Electrónica', 'FIEE', ['Ingeniería Eléctrica', 'Ingeniería Electrónica', 'Ingeniería de Telecomunicaciones', 'Ingeniería de Ciberseguridad', 'Ingeniería Biomédica']],
    ['Facultad de Ingeniería Geológica, Minera y Metalúrgica', 'FIGMM', ['Ingeniería Geológica', 'Ingeniería Metalúrgica', 'Ingeniería de Minas']],
    ['Facultad de Ingeniería Industrial y de Sistemas', 'FIIS', ['Ingeniería Industrial', 'Ingeniería de Sistemas', 'Ingeniería de Software', 'Ingeniería de Inteligencia Artificial']],
    ['Facultad de Ingeniería Mecánica', 'FIM', ['Ingeniería Mecánica', 'Ingeniería Mecánica Eléctrica', 'Ingeniería Naval', 'Ingeniería Mecatrónica', 'Ingeniería Aeroespacial']],
    ['Facultad de Ingeniería de Petróleo, Gas Natural y Petroquímica', 'FIP', ['Ingeniería de Petróleo y Gas Natural', 'Ingeniería Petroquímica']],
    ['Facultad de Ingeniería Química y Textil', 'FIQT', ['Ingeniería Química', 'Ingeniería Textil']],
  ],
  UNMSM: [
    ['Facultad de Medicina', '', ['Medicina Humana', 'Obstetricia', 'Enfermería', 'Tecnología Médica', 'Nutrición']],
    ['Facultad de Farmacia y Bioquímica', '', ['Farmacia y Bioquímica', 'Ciencia de los Alimentos', 'Toxicología']],
    ['Facultad de Odontología', '', ['Odontología']],
    ['Facultad de Medicina Veterinaria', '', ['Medicina Veterinaria']],
    ['Facultad de Psicología', '', ['Psicología', 'Psicología Organizacional y de la Gestión Humana']],
    ['Facultad de Ciencias Biológicas', '', ['Ciencias Biológicas', 'Genética y Biotecnología', 'Microbiología y Parasitología']],
    ['Facultad de Ciencias Físicas', '', ['Física', 'Ingeniería Mecánica de Fluidos']],
    ['Facultad de Ciencias Matemáticas', '', ['Matemática', 'Estadística', 'Investigación Operativa', 'Computación Científica']],
    ['Facultad de Ingeniería Geológica, Minera, Metalúrgica y Geográfica', 'FIGMMG', ['Ingeniería Geológica', 'Ingeniería Geográfica', 'Ingeniería de Minas', 'Ingeniería Metalúrgica', 'Ingeniería Civil', 'Ingeniería Ambiental']],
    ['Facultad de Ingeniería Industrial', 'FII', ['Ingeniería Industrial', 'Ingeniería Textil y Confecciones', 'Ingeniería de Seguridad y Salud en el Trabajo', 'Ingeniería Logística y Cadena de Suministro Digital', 'Ingeniería de Transportes y Sistemas Ferroviarios']],
    ['Facultad de Ingeniería Electrónica y Eléctrica', 'FIEE', ['Ingeniería Electrónica', 'Ingeniería Eléctrica', 'Ingeniería de Telecomunicaciones', 'Ingeniería Biomédica']],
    ['Facultad de Ingeniería de Sistemas e Informática', 'FISI', ['Ingeniería de Sistemas', 'Ingeniería de Software', 'Ciencia de la Computación']],
    ['Facultad de Química e Ingeniería Química', 'FQIQ', ['Química', 'Ingeniería Química', 'Ingeniería Agroindustrial']],
    ['Facultad de Ciencias Administrativas', '', ['Administración', 'Administración de Turismo', 'Administración de Negocios Internacionales', 'Administración Marítima y Portuaria', 'Administración de la Gastronomía', 'Marketing']],
    ['Facultad de Ciencias Contables', '', ['Contabilidad', 'Gestión Tributaria', 'Auditoría Empresarial y del Sector Público', 'Presupuesto y Finanzas Públicas']],
    ['Facultad de Ciencias Económicas', '', ['Economía', 'Economía Pública', 'Economía Internacional']],
    ['Facultad de Letras y Ciencias Humanas', '', ['Literatura', 'Filosofía', 'Lingüística', 'Comunicación Social', 'Arte', 'Conservación y Restauración', 'Bibliotecología y Ciencias de la Información', 'Danza', 'Lenguas, Traducción e Interpretación']],
    ['Facultad de Educación', '', ['Educación', 'Educación Física']],
    ['Facultad de Derecho y Ciencia Política', '', ['Derecho', 'Ciencia Política']],
    ['Facultad de Ciencias Sociales', '', ['Historia', 'Sociología', 'Antropología', 'Arqueología', 'Trabajo Social', 'Geografía']],
  ],
  PUCP: [
    ['Facultad de Arquitectura y Urbanismo', '', ['Arquitectura']],
    ['Facultad de Arte y Diseño', '', ['Educación Artística', 'Diseño Gráfico', 'Diseño Industrial', 'Escultura', 'Pintura', 'Arte, Moda y Diseño Textil', 'Grabado']],
    ['Facultad de Artes Escénicas', '', ['Danza', 'Teatro', 'Música', 'Creación y Producción Escénica']],
    ['Facultad de Ciencias Contables', '', ['Contabilidad']],
    ['Facultad de Ciencias e Ingeniería', '', ['Estadística', 'Física', 'Matemáticas', 'Química', 'Ingeniería Ambiental y Sostenible', 'Ingeniería Biomédica', 'Ingeniería Civil', 'Ingeniería de las Telecomunicaciones', 'Ingeniería de Minas', 'Ingeniería Electrónica', 'Ingeniería Geológica', 'Ingeniería Industrial', 'Ingeniería Informática', 'Ingeniería Mecánica', 'Ingeniería Mecatrónica', 'Ingeniería Química']],
    ['Facultad de Ciencias Sociales', '', ['Antropología', 'Ciencia Política y Gobierno', 'Economía', 'Finanzas', 'Relaciones Internacionales', 'Sociología']],
    ['Facultad de Ciencias y Artes de la Comunicación', '', ['Comunicación Audiovisual', 'Comunicación para el Desarrollo', 'Publicidad', 'Periodismo']],
    ['Facultad de Derecho', '', ['Derecho']],
    ['Facultad de Educación', '', ['Educación Inicial', 'Educación Primaria', 'Educación Secundaria']],
    ['Facultad de Gastronomía, Hotelería y Turismo', '', ['Gastronomía', 'Hotelería', 'Turismo']],
    ['Facultad de Gestión y Alta Dirección', '', ['Gestión']],
    ['Facultad de Letras y Ciencias Humanas', '', ['Arqueología', 'Ciencias de la Información', 'Filosofía', 'Geografía y Medio Ambiente', 'Historia', 'Humanidades', 'Lingüística y Literatura']],
    ['Facultad de Psicología', '', ['Psicología']],
  ],
  UTEC: [
    ['Facultad de Ciencias Básicas', '', ['Física']],
    ['Facultad de Negocios', '', ['Administración y Negocios Digitales', 'Business Analytics']],
    ['Facultad de Computación', '', ['Sistemas de Información', 'Ciencia de Datos e Inteligencia Artificial', 'Ciencia de la Computación', 'Ciberseguridad']],
    ['Facultad de Ingeniería', '', ['Ingeniería Industrial', 'Bioingeniería', 'Ingeniería de la Energía', 'Ingeniería Mecánica', 'Ingeniería Química', 'Ingeniería Ambiental', 'Ingeniería Civil', 'Ingeniería Electrónica', 'Ingeniería Mecatrónica']],
  ],
  ULIMA: [
    ['Facultad de Ciencias Empresariales', '', ['Administración', 'Contabilidad y Finanzas', 'Marketing', 'Negocios Internacionales']],
    ['Facultad de Arquitectura', '', ['Arquitectura']],
    ['Facultad de Comunicación', '', ['Comunicación']],
    ['Facultad de Derecho', '', ['Derecho']],
    ['Facultad de Economía', '', ['Economía']],
    ['Facultad de Ingeniería', '', ['Ingeniería Ambiental', 'Ingeniería Civil', 'Ingeniería Industrial', 'Ingeniería Mecatrónica', 'Ingeniería de Sistemas']],
    ['Facultad de Psicología', '', ['Psicología']],
  ],
  UPC: [
    ['Facultad de Administración en Hotelería y Turismo', '', ['Hotelería y Administración', 'Turismo y Administración', 'Gastronomía y Gestión Culinaria']],
    ['Facultad de Arquitectura', '', ['Arquitectura']],
    ['Facultad de Artes Contemporáneas', '', ['Artes Escénicas', 'Música']],
    ['Facultad de Ciencias de la Salud', '', ['Medicina', 'Medicina Veterinaria', 'Nutrición y Dietética', 'Odontología', 'Terapia Física', 'Biología', 'Ciencias de la Actividad Física y el Deporte']],
    ['Facultad de Ciencias Humanas', '', ['Traducción e Interpretación Profesional']],
    ['Facultad de Comunicaciones', '', ['Comunicación Audiovisual y Medios Interactivos', 'Comunicación e Imagen Empresarial', 'Comunicación y Fotografía', 'Comunicación y Marketing', 'Comunicación y Periodismo', 'Comunicación y Publicidad']],
    ['Facultad de Derecho', '', ['Derecho', 'Relaciones Internacionales']],
    ['Facultad de Diseño', '', ['Diseño Industrial', 'Diseño Profesional de Interiores', 'Diseño Profesional Gráfico', 'Diseño y Gestión en Moda']],
    ['Facultad de Economía', '', ['Economía Gerencial', 'Economía y Finanzas', 'Economía y Negocios Internacionales', 'Ciencias Políticas']],
    ['Facultad de Educación', '', ['Educación y Gestión del Aprendizaje']],
    ['Facultad de Ingeniería', '', ['Ciencias de la Computación', 'Ingeniería Ambiental', 'Ingeniería Biomédica', 'Ingeniería Civil', 'Ingeniería de Gestión Empresarial', 'Ingeniería de Gestión Minera', 'Ingeniería de Redes y Comunicaciones', 'Ingeniería de Sistemas', 'Ingeniería de Sistemas de Información', 'Ingeniería de Software', 'Ingeniería Electrónica', 'Ingeniería Industrial', 'Ingeniería Mecatrónica']],
    ['Facultad de Negocios', '', ['Administración y Negocios del Deporte', 'Administración y Negocios Internacionales', 'Administración y Recursos Humanos', 'Contabilidad y Administración', 'Contabilidad y Finanzas']],
    ['Facultad de Psicología', '', ['Psicología']],
  ],
};

/** Careers known without their faculty. */
export const CAREERS_WITHOUT_FACULTY: Readonly<Record<string, readonly string[]>> = {
  UP: ['Administración', 'Contabilidad', 'Derecho', 'Economía', 'Finanzas', 'Humanidades Digitales', 'Ingeniería de la Información', 'Ingeniería Empresarial', 'Ingeniería en Innovación y Diseño', 'Marketing', 'Negocios Internacionales', 'Política, Filosofía y Economía'],
};

/** Every known career, used when the place of study is not in the list. */
export const ALL_CAREERS: readonly string[] = [...new Set([
  ...Object.values(FACULTIES).flatMap(faculties => faculties.flatMap(([, , careers]) => careers)),
  ...Object.values(CAREERS_WITHOUT_FACULTY).flat(),
])].sort((a, b) => a.localeCompare(b, 'es'));
