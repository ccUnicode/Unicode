# Guía de Despliegue

La landing page de UNICODE está optimizada para ser desplegada en plataformas de hosting estático modernas como **Vercel** o **Netlify**.

## 1. Requisitos Previos
- Cuenta en GitHub con acceso al repositorio.
- Variables de entorno configuradas (ver `.env.example`).

## 2. Variables de Env (Supabase)
El panel de administración requiere conexión a Supabase. Configura estas variables en tu plataforma de hosting:
- `PUBLIC_SUPABASE_URL`: La URL del proyecto en Supabase.
- `PUBLIC_SUPABASE_ANON_KEY`: La clave anónima para consultas públicas.
- `ADMIN_PASSWORD`: La contraseña para acceder al panel `/admin`.

## 3. Comandos de Construcción
Si despliegas manualmente o configuras un CI/CD:

```bash
# Instalar dependencias
npm install

# Construir para producción
npm run build

# Previsualizar resultado
npm run preview
```
