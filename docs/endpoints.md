# Especificación de Endpoints (API)

Este documento contiene la especificación técnica de los endpoints de la API local de la plataforma, detallando métodos HTTP, cabeceras, parámetros, payloads de petición, códigos de estado HTTP y ejemplos de respuesta.

---

## 1. `POST /api/postular`

Registra la postulación de un candidato para el proceso de convocatoria actual.

*   **Autenticación**: Ninguna (Acceso público).
*   **Cabeceras Requeridas**:
    *   `Content-Type: application/json`
    *   `X-Requested-With: XMLHttpRequest` (Protección básica CSRF)
*   **Cuerpo de la Petición (JSON)**:
    ```json
    {
      "first_name": "string (obligatorio, máx. 150 caracteres)",
      "last_name": "string (obligatorio, máx. 150 caracteres)",
      "email": "string (obligatorio, formato correo electrónico, máx. 150 caracteres)",
      "phone": "string (obligatorio, exactamente 9 dígitos numéricos)",
      "university": "string (obligatorio, máx. 150 caracteres)",
      "career": "string (obligatorio, máx. 150 caracteres)",
      "university_semester": "string (obligatorio, ciclo académico: '1'-'10' o '0' para egresado)",
      "first_choice_area": "string (obligatorio, área: GTH|ACD|RRPP|DCC|ID)",
      "second_choice_area": "string (opcional, área: GTH|ACD|RRPP|DCC|ID)",
      "application_reason": "string (obligatorio, máx. 2000 caracteres)"
    }
    ```

### Respuestas:
*   **200 OK**: Registro exitoso.
    ```json
    {
      "message": "¡Inscripción recibida correctamente!"
    }
    ```
*   **400 Bad Request**: Datos obligatorios faltantes o con formato/longitud no válida.
    ```json
    {
      "error": "El formato del correo electrónico no es válido."
    }
    ```
*   **403 Forbidden**: Solicitud no iniciada desde el cliente oficial (falta cabecera CSRF).
    ```json
    {
      "error": "Solicitud no autorizada."
    }
    ```
*   **409 Conflict**: Candidato ya registrado (restricción por correo electrónico único).
    ```json
    {
      "error": "Este correo electrónico ya ha sido registrado."
    }
    ```
*   **429 Too Many Requests**: Límite de envíos excedido (máx. 3 por IP en 10 minutos).
    ```json
    {
      "error": "Has enviado demasiadas postulaciones. Intenta de nuevo en unos minutos."
    }
    ```

---

## 2. `POST /api/admin-login`

Autentica al administrador y genera una sesión sin estado.

*   **Autenticación**: Ninguna.
*   **Cabeceras Requeridas**: `Content-Type: application/json`
*   **Cuerpo de la Petición (JSON)**:
    ```json
    {
      "password": "string (obligatorio)"
    }
    ```

### Respuestas:
*   **200 OK**: Credencial correcta. Retorna el token firmado HMAC.
    ```json
    {
      "success": true,
      "token": "payloadBase64.firmaHexadecimal"
    }
    ```
*   **401 Unauthorized**: Contraseña incorrecta. Indica intentos restantes antes del bloqueo.
    ```json
    {
      "error": "Contraseña incorrecta.",
      "attemptsRemaining": 4
    }
    ```
*   **429 Too Many Requests**: Bloqueo activo tras 5 intentos fallidos (bloqueo por 15 minutos).
    ```json
    {
      "error": "Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.",
      "locked": true,
      "remainingSeconds": 900
    }
    ```

---

## 3. `POST /api/admin-logout`

Invalida la sesión activa en el cliente.

*   **Autenticación**: Requiere token de sesión (opcional en esta capa debido al diseño stateless).
*   **Respuesta**:
    ```json
    {
      "success": true
    }
    ```

---

## 4. `GET /api/admin-postulantes`

Retorna la lista de postulantes registrados con opciones de filtrado y ordenamiento.

*   **Autenticación**: Requiere token de sesión en la cabecera.
*   **Cabeceras Requeridas**: `Authorization: Bearer <token>`
*   **Parámetros de Consulta (Query Params)**:
    *   `area` (GTH|ACD|RRPP|DCC|ID) - Filtra por área de interés.
    *   `opcion` (todas|1ra|2da) - Filtra por prioridad de opción seleccionada.
    *   `orden` (reciente|1ra-2da) - Criterio de ordenamiento (por fecha de registro o por prioridad de opción).

### Respuestas:
*   **200 OK**: Retorna el listado estructurado de postulantes.
    ```json
    {
      "data": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "first_name": "Pedro",
          "last_name": "Ramos",
          "email": "pedro.ramos@uni.pe",
          "phone": "987654321",
          "university": "UNI",
          "career": "Ingeniería de Sistemas",
          "university_semester": "6",
          "first_choice_area": "ID",
          "second_choice_area": "DCC",
          "application_reason": "Motivación para aprender desarrollo...",
          "created_at": "2026-06-14T21:30:00.000Z"
        }
      ],
      "total": 1
    }
    ```
*   **401 Unauthorized**: Token de sesión ausente, inválido o expirado.
    ```json
    {
      "error": "No autorizado. Inicia sesión nuevamente."
    }
    ```
