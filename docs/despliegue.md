# Guía de Despliegue

Este documento detalla el proceso para desplegar la Landing Page de UNICODE en producción. La plataforma está optimizada para su despliegue en entornos estáticos/Serverless modernos como **Vercel** o **Netlify**.

## 1. Ambientes Existentes

El proyecto se maneja bajo los siguientes ambientes:
- **Desarrollo (Local)**: Entorno local del desarrollador. Se ejecuta con `npm run dev`.
- **Producción (Main)**: Entorno público en vivo. Se despliega automáticamente al hacer un *merge* hacia la rama `main` en GitHub, asumiendo que está conectado a un proveedor como Vercel o Netlify.

## 2. Variables de Entorno

El panel de administración requiere conexión a Supabase. Configura estas variables obligatoriamente en tu plataforma de hosting (Project Settings > Environment Variables):

- `PUBLIC_SUPABASE_URL`: URL del proyecto en Supabase.
- `PUBLIC_SUPABASE_ANON_KEY`: Clave pública (anon) para consultas.
- `ADMIN_PASSWORD`: Contraseña maestra para acceder al panel `/admin`.

## 3. Comandos de Construcción

Si se requiere desplegar manualmente o configurar un pipeline CI/CD desde cero, estos son los comandos exactos a utilizar en orden:

```bash
# 1. Instalar dependencias exactas
npm install

# 2. Construir la aplicación (Genera la carpeta ./dist)
npm run build
```

*Nota: Puedes previsualizar el resultado de la construcción localmente utilizando `npm run preview`.*

## 4. Proceso Exacto de Deploy (Automático)

El método estándar para desplegar es mediante integración continua:

1. El desarrollador completa su funcionalidad en una rama `feat/*` o `fix/*`.
2. Se abre un Pull Request (PR) hacia la rama `main`.
3. Una vez aprobado y fusionado (merge) en `main`, el proveedor de hosting (ej. Vercel) detectará el commit.
4. El proveedor instalará las dependencias y ejecutará `npm run build` automáticamente.
5. El sitio estará disponible globalmente en unos minutos.

## 5. Procedimiento de Rollback

Si una subida a producción falla, rompe la interfaz o causa caídas (Downtime), el procedimiento para revertir es el siguiente:

### Desde Vercel (Recomendado y Rápido)
1. Ingresa al panel de control de Vercel del proyecto.
2. Dirígete a la pestaña **Deployments**.
3. Localiza el último despliegue exitoso previo al error.
4. Haz clic en los tres puntos de ese despliegue y selecciona **"Promote to Production"** o **"Rollback"**.
5. El sitio volverá inmediatamente a la versión anterior estable sin necesidad de tocar código.

### Desde Git / GitHub (A nivel de código)
Si el error requiere revertir un cambio en el repositorio de manera permanente:
1. En tu rama local, usa el comando `git revert <commit_hash>` del commit defectuoso.
2. Crea un nuevo commit de reversión: `git commit -m "fix: revert previous breaking commit"`.
3. Sube los cambios con `git push`.
4. Este push desencadenará un nuevo despliegue automático limpio.
