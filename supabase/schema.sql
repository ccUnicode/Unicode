CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--Creando la tabla de postulates de la convocatoria

CREATE TABLE postulantes(
--ID único
  postulantes_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

--Información del postulantes:
  nombres VARCHAR(150) NOT NULL,
  apellidos VARCHAR(150) NOT NULL,
  correo VARCHAR(150) NOT NULL UNIQUE,
  telefono VARCHAR(20) NOT NULL,
  carrera VARCHAR(150) NOT NULL,
  opcion1 VARCHAR(150) NOT NULL,
  universidad VARCHAR(150) NOT NULL,
  ciclo_universidad VARCHAR(20) NOT NULL,
  motivo_postulacion TEXT NOT NULL,
  opcion2 VARCHAR(150),

  --Metadatos
  --Esto es para que se guarde la fecha y hora en la que se creó el registro
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL

);

-- ==============================================
-- Row Level Security (RLS)
-- Solo el service_role puede insertar y leer datos.
-- La anon key NO tiene acceso a esta tabla.
-- ==============================================

ALTER TABLE postulantes ENABLE ROW LEVEL SECURITY;

-- Política: Solo el backend (service_role) puede insertar postulaciones
CREATE POLICY "Servidor puede insertar postulaciones"
  ON postulantes
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Política: Solo el backend (service_role) puede leer postulaciones
CREATE POLICY "Servidor puede leer postulaciones"
  ON postulantes
  FOR SELECT
  TO service_role
  USING (true);

-- Política: Bloquear actualizaciones (nadie puede editar postulaciones)
CREATE POLICY "Bloquear actualizaciones"
  ON postulantes
  FOR UPDATE
  USING (false);

-- Política: Bloquear eliminaciones (nadie puede borrar postulaciones)
CREATE POLICY "Bloquear eliminaciones"
  ON postulantes
  FOR DELETE
  USING (false);