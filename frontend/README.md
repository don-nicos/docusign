# Docusing - Plataforma de Firma Electrónica

Plataforma chilena de firma electrónica simple para gestión de documentos PDF y flujos de firma secuencial con validación OTP.

## 🏗️ Arquitectura

El proyecto está organizado como una arquitectura de microservicios:

```
docusing/
├── backend/
│   ├── auth-service/          # Autenticación con Magic Link y JWT
│   ├── document-service/      # Gestión de documentos PDF
│   ├── signature-service/     # Workflow de firmas con OTP
│   └── notification-service/  # Envío de notificaciones (emails)
├── frontend/                  # Next.js 14 + TypeScript + Tailwind CSS
└── docker-compose.yml         # Orquestación de servicios
```

### Servicios Backend (Spring Boot + Kotlin)

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| **auth-service** | 8081 | Autenticación con Magic Link, JWT access/refresh tokens |
| **document-service** | 8082 | Upload, storage local, descarga y gestión de PDFs |
| **signature-service** | 8083 | Solicitudes de firma, workflow secuencial, OTP |
| **notification-service** | 8084 | Envío de emails (magic link, OTP, notificaciones) |

### Frontend (Next.js)

| Puerto | Descripción |
|--------|-------------|
| **3000** | Aplicación web con autenticación, dashboard, upload y firmas |

## 🚀 Inicio Rápido

### Requisitos

- **Java 21** (para ejecución local de servicios backend)
- **Node.js 20+** (para frontend)
- **Docker & Docker Compose** (para ejecución con contenedores)
- **Gradle 8.5+** (incluido via wrapper)

### Opción 1: Docker Compose (Recomendado)

```bash
# Clonar el repositorio
git clone <repo-url>
cd docusing

# Iniciar todos los servicios
docker-compose up --build

# La aplicación estará disponible en:
# - Frontend: http://localhost:3000
# - Auth Service: http://localhost:8081
# - Document Service: http://localhost:8082
# - Signature Service: http://localhost:8083
# - Notification Service: http://localhost:8084
```

### Opción 2: Ejecución Local

#### Backend

```bash
# Auth Service
cd backend/auth-service
./gradlew bootRun

# Document Service
cd backend/document-service
./gradlew bootRun

# Signature Service
cd backend/signature-service
./gradlew bootRun

# Notification Service
cd backend/notification-service
./gradlew bootRun
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 🔐 Autenticación

El sistema utiliza **Magic Link** para autenticación sin contraseñas:

1. Usuario ingresa su email
2. Sistema envía un enlace único por correo
3. Usuario hace clic en el enlace
4. Sistema genera tokens JWT (access + refresh)
5. Frontend almacena tokens en localStorage

### Tokens JWT

- **Access Token**: 15 minutos de validez
- **Refresh Token**: 7 días de validez
- **Algoritmo**: HS256
- **Payload**: userId, email, tipo de token

## 📄 Gestión de Documentos

### Upload de Documentos

```bash
POST /api/documents
Content-Type: multipart/form-data
Authorization: Bearer <access-token>

file: [PDF file]
title: "Mi Documento"
```

### Descarga de Documentos

```bash
GET /api/documents/{documentId}/download
Authorization: Bearer <access-token>
```

### Estados de Documento

- **DRAFT**: Documento editable, puede ser eliminado
- **LOCKED**: Documento bloqueado para firma, no se puede modificar
- **ARCHIVED**: Documento archivado

## ✍️ Workflow de Firmas

### 1. Crear Solicitud de Firma

```bash
POST /api/signatures
Authorization: Bearer <access-token>

{
  "documentId": "uuid",
  "title": "Solicitud de firma - Contrato",
  "signers": [
    {"email": "firmante1@ejemplo.com", "fullName": "Juan Pérez"},
    {"email": "firmante2@ejemplo.com", "fullName": "María López"}
  ],
  "expirationHours": 72
}
```

### 2. Solicitar OTP

```bash
POST /api/signatures/signer/{signerId}/request-otp
```

### 3. Firmar con OTP

```bash
POST /api/signatures/signer/{signerId}/sign

{
  "otp": "123456"
}
```

### Estados de Solicitud

- **PENDING**: Esperando primera firma
- **IN_PROGRESS**: En proceso de firma
- **COMPLETED**: Todas las firmas completadas
- **REJECTED**: Rechazada por un firmante
- **EXPIRED**: Expirada sin completar

### Estados de Firmante

- **PENDING**: Esperando su turno
- **OTP_SENT**: OTP enviado al firmante
- **SIGNED**: Firmado exitosamente
- **REJECTED**: Rechazado por el firmante

## 📧 Notificaciones

El `notification-service` actualmente registra notificaciones en logs (modo stub):

```bash
POST /notifications/magic-link
POST /notifications/signature-otp
POST /notifications/signature-completed
```

Para producción, implementar envío real de emails usando `JavaMailSender`.

## 🗄️ Base de Datos

Los servicios utilizan **H2 en memoria** para desarrollo:

- Acceso a consola H2: `http://localhost:808X/h2-console`
- JDBC URL: `jdbc:h2:mem:<service>db`
- Usuario: `sa`
- Password: (vacío)

Para producción, migrar a **PostgreSQL** actualizando `application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/docusing
spring.datasource.username=postgres
spring.datasource.password=secret
spring.jpa.hibernate.ddl-auto=validate
```

## 🔧 Configuración

### Variables de Entorno Backend

#### Auth Service

```properties
JWT_SECRET=tu-secreto-jwt-super-seguro-cambiar-en-produccion
MAGIC_LINK_TTL_MINUTES=15
NOTIFICATION_SERVICE_BASE_URL=http://notification-service:8084
FRONTEND_BASE_URL=http://localhost:3000
```

#### Document Service

```properties
STORAGE_LOCAL_BASE_PATH=./data/documents
```

#### Signature Service

```properties
OTP_LENGTH=6
OTP_EXPIRATION_MINUTES=10
DOCUMENT_SERVICE_BASE_URL=http://document-service:8082
NOTIFICATION_SERVICE_BASE_URL=http://notification-service:8084
```

### Variables de Entorno Frontend

Crear archivo `.env.local` en `frontend/`:

```env
NEXT_PUBLIC_API_AUTH_URL=http://localhost:8081
NEXT_PUBLIC_API_DOCUMENT_URL=http://localhost:8082
NEXT_PUBLIC_API_SIGNATURE_URL=http://localhost:8083
```

## 🧪 Testing

```bash
# Backend - Ejecutar tests unitarios
cd backend/<service-name>
./gradlew test

# Frontend - Ejecutar tests
cd frontend
npm test
```

## 📚 Endpoints API

### Auth Service (`:8081`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registrar nuevo usuario |
| POST | `/api/auth/magic-link/request` | Solicitar magic link |
| POST | `/api/auth/magic-link/exchange` | Intercambiar token por JWT |
| POST | `/api/auth/refresh` | Refrescar access token |
| GET | `/api/auth/me` | Obtener usuario actual |

### Document Service (`:8082`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/documents` | Upload documento |
| GET | `/api/documents` | Listar documentos del usuario |
| GET | `/api/documents/{id}` | Obtener documento |
| GET | `/api/documents/{id}/download` | Descargar PDF |
| PUT | `/api/documents/{id}/title` | Actualizar título |
| POST | `/api/documents/{id}/lock` | Bloquear documento |
| DELETE | `/api/documents/{id}` | Eliminar documento |

### Signature Service (`:8083`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/signatures` | Crear solicitud de firma |
| GET | `/api/signatures` | Listar solicitudes del usuario |
| GET | `/api/signatures/{id}` | Obtener solicitud |
| GET | `/api/signatures/document/{docId}` | Solicitudes por documento |
| POST | `/api/signatures/signer/{signerId}/request-otp` | Solicitar OTP |
| POST | `/api/signatures/signer/{signerId}/sign` | Firmar con OTP |
| POST | `/api/signatures/signer/{signerId}/reject` | Rechazar firma |

## 🛡️ Seguridad

- ✅ CORS configurado para `localhost:3000` y `localhost:3001`
- ✅ JWT con secret configurable y expiración
- ✅ Magic Link con throttling (1 email cada 2 minutos)
- ✅ OTP de 6 dígitos con expiración de 10 minutos
- ✅ Validación de propiedad de documentos
- ✅ Workflow secuencial de firmas (turnos)
- ⚠️ **Cambiar JWT_SECRET en producción**
- ⚠️ **Implementar HTTPS en producción**
- ⚠️ **Migrar a PostgreSQL en producción**

## 📂 Estructura del Proyecto

### Backend (Kotlin + Spring Boot)

```
backend/<service>/src/main/kotlin/com/docusing/<service>/
├── application/
│   ├── controller/       # REST Controllers
│   └── dto/             # DTOs de request/response
├── domain/
│   ├── model/           # Entidades JPA
│   ├── repository/      # Spring Data repositories
│   └── service/         # Lógica de negocio
├── infrastructure/
│   ├── client/          # Clientes REST externos
│   ├── mapper/          # Mappers DTO <-> Entity
│   ├── security/        # Filtros y config de seguridad
│   └── storage/         # Storage de archivos
└── config/              # Configuración Spring
```

### Frontend (Next.js + TypeScript)

```
frontend/src/
├── app/                  # App Router de Next.js
│   ├── auth/            # Páginas de autenticación
│   ├── dashboard/       # Dashboard principal
│   ├── documents/       # Gestión de documentos
│   └── signatures/      # Gestión de firmas
├── components/
│   ├── ui/              # Componentes UI reutilizables
│   └── layout/          # Componentes de layout
├── contexts/            # React Context (Auth)
├── lib/                 # Utilidades (API, config, auth)
└── types/               # Tipos TypeScript
```

## 🚧 Próximos Pasos (Roadmap)

- [ ] Implementar envío real de emails en notification-service
- [ ] Migrar a PostgreSQL en producción
- [ ] Añadir almacenamiento S3 para documentos
- [ ] Implementar firma electrónica avanzada (certificados digitales)
- [ ] Dashboard de administración
- [ ] Métricas y monitoreo (Prometheus + Grafana)
- [ ] Tests de integración con Testcontainers
- [ ] CI/CD con GitHub Actions
- [ ] Documentación OpenAPI/Swagger
- [ ] Internacionalización (i18n)

## 📝 Licencia

[MIT License](LICENSE)

## 👥 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue para discutir cambios mayores.

## 📞 Soporte

Para preguntas o soporte, abre un issue en GitHub.

---

**Desarrollado con ❤️ en Chile**
