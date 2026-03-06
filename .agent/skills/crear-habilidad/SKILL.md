---
name: crear-habilidad
description: Crea nuevas agentic skills (habilidades) para el agente en el formato correcto de AntiGravity (SKILL.md con YAML frontmatter) en español.
---

# Crear Habilidad (Skill Creator)

Esta habilidad te capacita (a ti, el agente) para crear correctamente nuevas capacidades o "skills" que el usuario solicite, siguiendo estrictamente la documentación de AntiGravity.

## Cuándo usar esta habilidad
Debes usar esta habilidad SIEMPRE que el usuario te pida crear, generar, programar o implementar una nueva "skill", "habilidad", "agentic skill" o "capacidad".

## Reglas para crear una nueva habilidad (Skill)
Cuando el usuario solicite una nueva habilidad, DEBES ejecutar los siguientes pasos de forma secuencial:

### 1. Determinar el nombre y la ubicación
*   **Nombre de la Carpeta:** Convierte el nombre de la habilidad solicitada a un formato minúsculas, usando guiones en vez de espacios (por ejemplo, `optimizar-imagen` o `crear-evento`).
*   **Directorio:**  A menos que el usuario especifique que es global (en cuyo caso iría a `~/.gemini/antigravity/skills/<nombre-skill>/`), asume que es una habilidad local o de "workspace" y crea la ruta:
    `<workspace-root>/.agent/skills/<nombre-skill>/`

### 2. Crear el archivo `SKILL.md` (Obligatorio)
*   Dentro de la carpeta creada, utiliza la herramienta `write_to_file` para crear un archivo llamado exactamente `SKILL.md`. Este es el único archivo estrictamente necesario.

### 3. Redactar el Frontmatter YAML (Obligatorio)
*   El archivo DEBE comenzar ineludiblemente con un bloque de metadatos YAML rodeado de líneas con tres guiones (`---`).
*   **`name`** (opcional pero recomendado): El mismo nombre que le diste a la carpeta.
*   **`description`** (OBLIGATORIO): Debes escribir una descripción clara, corta y **en tercera persona** (en español) sobre lo que hace la habilidad. El agente usará esta descripción en el futuro para saber automáticamente si debe aplicar la habilidad para resolver una petición del usuario.

### 4. Redactar el cuerpo del SKILL.md en Markdown
El contenido que le sigue al frontmatter debe estar **100% en español** y debe incluir:
*   **Propósito:** Una breve explicación de qué resuelve la habilidad.
*   **Cuándo Usar / Triggers:** Escenarios específicos de los mensajes del usuario que deberían disparar esta habilidad.
*   **Instrucciones para el Agente:** Una guía de pasos detallada, imperativa y secuencial que el agente deberá seguir ciegamente cuando ejecute la habilidad (ej. "Usa la herramienta `view_file` para...", "Genera el código y usa `write_to_file` en la ruta...", "Ejecuta el script con `run_command`...").

### 5. Archivos Complementarios (Opcional)
Si la nueva habilidad es compleja o el usuario lo pide, puedes crear carpetas adicionales dentro del directorio de la habilidad, como:
*   `scripts/`: Para guardar scripts auxiliares (.bash, .js, .py).
*   `examples/`: Para guardar ejemplos de entradas/salidas que le den contexto al agente.
*   `resources/`: Para templates y recursos adicionales.

---

## Plantilla Estándar para escribir el `SKILL.md`
Cuando uses recursivamente la herramienta `write_to_file`, básate en este formato exacto para el código proporcionado:

```markdown
---
name: [nombre-de-la-habilidad]
description: [Descripción en tercera persona de la habilidad para el context window del agente]
---

# [Nombre Legible de la Habilidad]

## Contexto y Propósito
[Breve explicación de por qué existe la habilidad]

## Cuándo Activar
- [Condición 1]
- [Condición 2]

## Instrucciones de Ejecución
Sigue estos pasos sistemáticamente:
1. Asegúrate de pedir información faltante si es necesario.
2. [Instrucciones específicas sobre herramientas a usar]
3. [Instrucción final de verificación]
```
