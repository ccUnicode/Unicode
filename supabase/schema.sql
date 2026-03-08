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

)