# 📊 ESTADO ACTUAL DEL SISTEMA
**Última actualización:** 2025-12-19 11:40

---

## 🟢 Servicios en Ejecución (Docker)

```yaml
Backend Services (Docker Compose):
  auth-service:         http://localhost:8081  ✅ FUNCIONANDO
  payment-service:      http://localhost:8085  ✅ FUNCIONANDO
  notification-service: http://localhost:8084  ✅ FUNCIONANDO
  document-service:     http://localhost:8082  ⚠️ Error compilación
  signature-service:    http://localhost:8083  ⚠️ Error compilación

Frontend:
  Next.js (Turbopack): http://localhost:3000

Infrastructure:
  PostgreSQL (Docker): localhost:5432          ✅ FUNCIONANDO
  MailHog (Docker):    http://localhost:8025   ✅ FUNCIONANDO
  LocalStack S3:       http://localhost:4566   ✅ FUNCIONANDO
```

---

## 🏗️ Arquitectura del Sistema

### Microservicios
1. **auth-service** - Autenticación, usuarios, JWT, magic links, **ORGANIZACIONES**
2. **document-service** - Gestión de documentos PDF con soporte organizacional
3. **signature-service** - Solicitudes de firma, OTP, auditoría con soporte organizacional
4. **notification-service** - Envío de emails (vía MailHog)
5. **payment-service** - Suscripciones, Mercado Pago, renovaciones

### Base de Datos
- **PostgreSQL (Docker):** Base única para todos los servicios
- **Flyway:** Migraciones en auth-service, document-service, signature-service, payment-service
- **Tablas Organizaciones:** organizations, user_organizations con roles OWNER/ADMIN/MEMBER
- **Persistencia:** Docker volume `pgdata`

### Frontend
- **Framework:** Next.js 15 con Turbopack
- **Librerías PDF:** react-pdf ^9.1.1
- **Firma digital:** react-signature-canvas ^1.0.6

---

## ⚙️ Configuraciones Activas

### auth-service
```properties
PostgreSQL: jdbc:postgresql://postgres:5432/docusing
Flyway: HABILITADO
  - V1: Schema inicial + pgcrypto extension
  - V2-V8: Features anteriores
  - V9: Organizaciones (organizations, user_organizations)
  - V10: Datos de prueba (2 empresas, 6 usuarios)
JWT expiration: 60 min
Refresh token: 7 días
Organizations: OWNER/ADMIN/MEMBER roles
```

### signature-service
```properties
enforce-order: FALSE (permite firmar fuera de orden)
OTP length: 6 dígitos
OTP expiration: 10 minutos
Storage: data/signatures/ (PNG files)
```

### document-service
```properties
Storage: data/documents/
```

---

## 👥 Usuarios de Prueba - ORGANIZACIONES

**Password común:** `Test1234!`  
**Hash BCrypt:** `$2a$10$N9qo8uLOickgx2ZMRZoMye1JxDfO7jXgwBpCF/kVFNgk6oYLLLaLS`

### Empresa 1: TechCorp SpA (RUT: 76.123.456-7)
| Email | Nombre | Rol ORG |
|-------|--------|----------|
| owner1@techcorp.cl | Carlos Dueño TechCorp | OWNER |
| admin1@techcorp.cl | Ana Admin TechCorp | ADMIN |
| member1@techcorp.cl | Luis Miembro TechCorp | MEMBER |

### Empresa 2: InnoSoft Limitada (RUT: 77.654.321-9)
| Email | Nombre | Rol ORG |
|-------|--------|----------|
| owner2@innosoft.cl | María Dueña InnoSoft | OWNER |
| admin2@innosoft.cl | Pedro Admin InnoSoft | ADMIN |
| member2@innosoft.cl | Sofia Miembro InnoSoft | MEMBER |

**Ver:** `USUARIOS_PRUEBA.md` para ejemplos de API

---

## 📦 Versiones de Dependencias Clave

### Backend (Kotlin + Spring Boot)
```gradle
Kotlin: 1.9.25
Spring Boot: 3.5.6
Java: 21 (Corretto)
Hibernate: 6.6.29
Flyway: (Spring Boot managed)
Apache PDFBox: 3.0.1
kotlin-logging: 3.0.5
java-jwt: 4.4.0
```

### Frontend (Next.js + TypeScript)
```json
Next.js: 15.5.4
React: 19
TypeScript: 5
react-pdf: ^9.1.1
react-signature-canvas: ^1.0.6
Tailwind CSS: 3.x
```

---

## 🔄 Estado de Implementación

### ✅ Completado (92%)
- ✅ Autenticación con JWT y magic links
- ✅ Gestión de documentos PDF
- ✅ Solicitudes de firma multi-firmante
- ✅ Captura de firmas (canvas, typed, upload)
- ✅ Visor de PDF con posicionamiento de firmas
- ✅ OTP único por firmante
- ✅ Inserción física de firmas en PDF (PDFBox)
- ✅ Auditoría legal: IP, User-Agent, método autenticación
- ✅ Flyway para migraciones en PostgreSQL
- ✅ **SISTEMA DE ORGANIZACIONES EMPRESARIALES:**
  - ✅ Roles: OWNER, ADMIN, MEMBER
  - ✅ Backend completo con validación de permisos
  - ✅ Endpoints API para gestión de organizaciones
  - ✅ Renovación de suscripciones suma tiempo restante
  - ✅ Frontend con páginas de administración
  - ✅ Datos de prueba en migración V10

### ⚠️ En Progreso (5%)
- ⚠️ document-service y signature-service con errores de compilación Docker
- ⚠️ Selector de organización en upload de documentos
- ⚠️ Filtros por organización en listado documentos

### 📝 Pendiente (3%)
- Hash SHA-256 del documento firmado
- Certificado de auditoría embebido en PDF
- Pruebas E2E organizaciones

---

## 🎯 Objetivo del Proyecto

**Docusing:** Sistema de firma digital estilo DocuSign con:
- ✅ Trazabilidad legal completa
- ✅ Auditoría de cada acción
- ✅ OTP seguro por firmante
- ✅ Inserción física de firmas en PDF
- ✅ **Multi-tenant con organizaciones empresariales**
- ✅ Roles y permisos granulares
- ✅ Suscripciones con renovación inteligente
- ⚠️ Certificado de integridad embebido (pendiente)

## 🆕 NUEVO: Sistema de Organizaciones

**Ver documentación completa:** `docs/ORGANIZATIONS_SYSTEM.md`

### Características Implementadas:
- 🏢 Múltiples usuarios por organización
- 👥 3 Roles: OWNER (dueño), ADMIN (administrador), MEMBER (miembro)
- 📊 OWNER compra suscripciones para toda la organización
- ✏️ ADMIN puede agregar usuarios (excepto otros admins)
- 📄 Todos los miembros comparten acceso a documentos organizacionales
- 🔄 Renovación de suscripción suma tiempo restante
- 🔐 Validación de permisos a nivel de backend

### APIs Disponibles:
```bash
POST /api/organizations - Crear organización
GET /api/organizations/my - Mis organizaciones
GET /api/organizations/{id}/members - Listar miembros
POST /api/organizations/{id}/members - Agregar usuario
PUT /api/organizations/{id}/members/{userId}/role - Cambiar rol
DELETE /api/organizations/{id}/members/{userId} - Remover usuario
```

### Frontend:
- `/organizations` - Lista de organizaciones del usuario
- `/organizations/{id}` - Panel de administración
- Botones «Administrar» solo para OWNER/ADMIN
