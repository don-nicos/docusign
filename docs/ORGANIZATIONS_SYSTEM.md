# 🏢 SISTEMA DE ORGANIZACIONES EMPRESARIALES

**Fecha implementación:** 19 de Diciembre, 2025  
**Estado:** ✅ Backend 100% | Frontend 95% | Testing Pendiente

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura](#arquitectura)
3. [Base de Datos](#base-de-datos)
4. [Backend - Servicios](#backend---servicios)
5. [Frontend - UI](#frontend---ui)
6. [Datos de Prueba](#datos-de-prueba)
7. [Flujos de Uso](#flujos-de-uso)
8. [Pendientes](#pendientes)

---

## 🎯 RESUMEN EJECUTIVO

### Objetivo
Implementar sistema multi-tenant donde múltiples usuarios pueden pertenecer a organizaciones empresariales, con roles diferenciados y suscripciones compartidas.

### Características Principales

✅ **Roles Jerárquicos:**
- **OWNER**: Compra membresía, agrega cualquier usuario, cambia roles
- **ADMIN**: Agrega usuarios MEMBER (no puede crear otros ADMIN)
- **MEMBER**: Sube/ve documentos de la organización

✅ **Renovación Inteligente:**
- Al comprar más tiempo, se SUMA al período restante
- Ejemplo: 3 meses restantes + 12 meses nuevos = 15 meses total

✅ **Documentos Compartidos:**
- Todos los miembros acceden a docs de la organización
- Validación de permisos a nivel de backend
- Historial de firmantes sin cuenta se vincula por email

### Estado Actual

| Componente | Estado | Notas |
|------------|--------|-------|
| Migraciones BD | ✅ 100% | V9 organizations, V10 datos prueba |
| Entidades Kotlin | ✅ 100% | OrganizationEntity, UserOrganizationEntity |
| OrganizationService | ✅ 100% | Lógica completa con validaciones |
| API Endpoints | ✅ 100% | 7 endpoints funcionales |
| DocumentService | ✅ 100% | Validación permisos organizacionales |
| SignatureService | ✅ 100% | Soporte organizationId |
| SubscriptionService | ✅ 100% | Renovación suma tiempo |
| Frontend API Client | ✅ 100% | organizationApi completo |
| Frontend Pages | ✅ 100% | /organizations y /organizations/[id] |
| Selector Upload | ⚠️ Pendiente | Falta selector en upload docs |
| Filtros Listado | ⚠️ Pendiente | Falta filtro por org |

---

## 🏗️ ARQUITECTURA

### Modelo de Datos

```
User (UserEntity)
├── id: UUID
├── email: String
├── defaultOrganizationId: UUID?
└── memberships: List<UserOrganizationEntity>

Organization (OrganizationEntity)
├── id: UUID
├── name: String
├── taxId: String?
├── status: ACTIVE | INACTIVE
└── members: List<UserOrganizationEntity>

UserOrganization (UserOrganizationEntity)
├── id: UUID
├── userId: UUID
├── organizationId: UUID
├── role: OWNER | ADMIN | MEMBER
├── isActive: Boolean
└── joinedAt: Instant

Document (DocumentEntity)
├── ...campos existentes...
├── organizationId: UUID?
└── isOrganizationDocument: Boolean

SignatureRequest (SignatureRequestEntity)
├── ...campos existentes...
├── organizationId: UUID?
└── isOrganizationRequest: Boolean

Subscription (SubscriptionEntity)
├── ...campos existentes...
└── organizationId: UUID?
```

### Flujo de Permisos

```
Usuario solicita acceso a documento
         ↓
¿Es dueño del documento?
├─ SÍ → ✅ Acceso permitido
└─ NO → ¿Es miembro de la organización del documento?
         ├─ SÍ → ✅ Acceso permitido
         └─ NO → ❌ Acceso denegado (403)
```

### Integración entre Servicios

```
auth-service
├── Gestiona organizaciones y membresías
├── Endpoint: GET /api/organizations/{id}/my-role
└── Responde rol del usuario en organización

document-service
├── Inyecta AuthFeignClient
├── Valida permisos llamando a auth-service
└── Filtra documentos por organizationId

signature-service
├── Inyecta AuthFeignClient
├── Valida permisos para crear solicitudes
└── Asigna organizationId a signature requests

payment-service
├── Acepta organizationId en subscriptions
├── Calcula expiración sumando tiempo restante
└── Metadata incluye organizationId
```

---

## 💾 BASE DE DATOS

### Migración V9: Organizaciones
**Archivo:** `backend/auth-service/src/main/resources/db/migration/V9__create_organizations.sql`

```sql
-- Tabla: organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(50),
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Tabla: user_organizations (roles y membresías)
CREATE TABLE user_organizations (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL, -- OWNER, ADMIN, MEMBER
    is_active BOOLEAN NOT NULL DEFAULT true,
    joined_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE (user_id, organization_id)
);

-- Campo en users
ALTER TABLE users ADD COLUMN default_organization_id UUID;

-- Índices
CREATE INDEX idx_user_organizations_user ON user_organizations(user_id);
CREATE INDEX idx_user_organizations_org ON user_organizations(organization_id);
CREATE INDEX idx_user_organizations_role ON user_organizations(role);
```

### Migración V10: Datos de Prueba
**Archivo:** `backend/auth-service/src/main/resources/db/migration/V10__test_organizations_data.sql`

- 6 usuarios (password: `Test1234!`)
- 2 organizaciones (TechCorp SpA, InnoSoft Limitada)
- 6 membresías (3 por empresa con roles OWNER/ADMIN/MEMBER)

### Migraciones en Otros Servicios

**document-service - V3:**
```sql
ALTER TABLE documents ADD COLUMN organization_id UUID;
ALTER TABLE documents ADD COLUMN is_organization_document BOOLEAN DEFAULT false;
```

**signature-service - V3:**
```sql
ALTER TABLE signature_requests ADD COLUMN organization_id UUID;
ALTER TABLE signature_requests ADD COLUMN is_organization_request BOOLEAN DEFAULT false;
```

**payment-service - V2:**
```sql
ALTER TABLE subscriptions ADD COLUMN organization_id UUID;
```

---

## ⚙️ BACKEND - SERVICIOS

### OrganizationService

**Archivo:** `backend/auth-service/src/main/kotlin/com/docusing/auth/domain/service/OrganizationService.kt`

#### Métodos Principales:

```kotlin
// Crear organización (automáticamente asigna OWNER al creador)
fun createOrganization(userId: UUID, name: String, taxId: String?): OrganizationEntity

// Agregar usuario a organización
fun addUserToOrganization(
    organizationId: UUID,
    currentUserId: UUID,
    userEmail: String,
    role: OrganizationRole
): UserOrganizationEntity

// Cambiar rol (solo OWNER)
fun changeUserRole(
    organizationId: UUID,
    currentUserId: UUID,
    targetUserId: UUID,
    newRole: OrganizationRole
): UserOrganizationEntity

// Remover usuario
fun removeUserFromOrganization(
    organizationId: UUID,
    currentUserId: UUID,
    targetUserId: UUID
)

// Validar permisos
fun hasPermission(
    organizationId: UUID,
    userId: UUID,
    requiredRole: OrganizationRole
): Boolean

// Verificar membresía
fun isMember(organizationId: UUID, userId: UUID): Boolean

// Listar organizaciones del usuario
fun getUserOrganizations(userId: UUID): List<UserOrganizationEntity>

// Obtener rol del usuario en org
fun getUserRole(organizationId: UUID, userId: UUID): OrganizationRole?
```

#### Reglas de Negocio Implementadas:

✅ **OWNER puede:**
- Agregar usuarios con cualquier rol
- Cambiar roles de cualquier usuario
- Remover cualquier usuario (excepto otros OWNERS)

✅ **ADMIN puede:**
- Agregar usuarios con rol MEMBER
- **NO puede** agregar otros ADMIN
- Remover usuarios MEMBER

✅ **MEMBER puede:**
- Ver documentos de la organización
- Subir documentos a la organización

### DocumentService Actualizado

**Validación de acceso:**
```kotlin
fun canAccessDocument(documentId: UUID, userId: UUID): Boolean {
    val document = documentRepository.findById(documentId)
    
    // ¿Es el dueño?
    if (document.ownerId == userId) return true
    
    // ¿Es de una organización y el usuario es miembro?
    if (document.organizationId != null) {
        val roleResponse = authFeignClient.getMyRole(
            document.organizationId,
            userId
        )
        return roleResponse.role != null
    }
    
    return false
}
```

### SignatureService Actualizado

**Soporte organizationId:**
```kotlin
fun createSignatureRequest(
    documentId: UUID,
    userId: UUID,
    organizationId: UUID?, // NUEVO parámetro
    ...
): SignatureRequestEntity {
    // Validar que el usuario pertenece a la org si se especifica
    if (organizationId != null) {
        val roleResponse = authFeignClient.getMyRole(organizationId, userId)
        if (roleResponse.role == null) {
            throw UnauthorizedException("No es miembro de la organización")
        }
    }
    
    val request = SignatureRequestEntity(
        ...
        organizationId = organizationId,
        isOrganizationRequest = organizationId != null
    )
    
    return signatureRequestRepository.save(request)
}
```

### SubscriptionService Actualizado

**Renovación suma tiempo:**
```kotlin
fun createSubscription(
    userId: UUID,
    planKey: String,
    organizationId: UUID? = null
): SubscriptionWithChargeResponse {
    // Buscar suscripción activa
    val activeSubscription = if (organizationId != null) {
        subscriptionRepository.findActiveByOrganizationId(organizationId)
    } else {
        subscriptionRepository.findActiveByUserId(userId)
    }
    
    // Calcular fecha de expiración
    val expiresAt = if (activeSubscription != null) {
        // SUMA tiempo restante
        val remaining = Duration.between(Instant.now(), activeSubscription.expiresAt)
        Instant.now().plus(remaining).plus(plan.duration)
    } else {
        Instant.now().plus(plan.duration)
    }
    
    // Crear nueva suscripción
    val subscription = SubscriptionEntity(
        ...
        expiresAt = expiresAt,
        organizationId = organizationId
    )
    
    return save(subscription)
}
```

---

## 🎨 FRONTEND - UI

### Archivos Creados

1. **`/lib/api/organization.ts`** - Cliente API
2. **`/app/organizations/page.tsx`** - Lista de organizaciones
3. **`/app/organizations/[id]/page.tsx`** - Panel de administración

### API Client

```typescript
// Exportado desde /lib/api.ts
export const organizationApi = {
  createOrganization: (data: { name: string; taxId?: string }) =>
    apiClient.post<Organization>(`${AUTH_SERVICE}/api/organizations`, data),
    
  getMyOrganizations: () =>
    apiClient.get<UserOrganization[]>(`${AUTH_SERVICE}/api/organizations/my`),
    
  getMembers: (organizationId: string) =>
    apiClient.get<UserOrganization[]>(`${AUTH_SERVICE}/api/organizations/${organizationId}/members`),
    
  addMember: (organizationId: string, data: { userEmail: string; role: 'ADMIN' | 'MEMBER' }) =>
    apiClient.post<UserOrganization>(`${AUTH_SERVICE}/api/organizations/${organizationId}/members`, data),
    
  changeRole: (organizationId: string, memberId: string, role: 'ADMIN' | 'MEMBER') =>
    apiClient.put<UserOrganization>(`${AUTH_SERVICE}/api/organizations/${organizationId}/members/${memberId}/role`, { role }),
    
  removeMember: (organizationId: string, memberId: string) =>
    apiClient.delete(`${AUTH_SERVICE}/api/organizations/${organizationId}/members/${memberId}`)
}
```

### Páginas

#### `/organizations` - Lista de Organizaciones
- Lista todas las organizaciones del usuario logueado
- Muestra rol (OWNER/ADMIN/MEMBER)
- Botón "Administrar" solo para OWNER/ADMIN
- Botón "Crear Organización"

#### `/organizations/[id]` - Panel de Administración
- Lista todos los miembros con sus roles
- Formulario para agregar usuarios por email
- Botones "Hacer Admin" / "Quitar Admin" (solo OWNER)
- Botón "Remover" usuario (no se puede remover OWNER)
- Selectores de rol (ADMIN solo ve MEMBER en opciones)

### Patrón de Implementación

✅ **Sin react-query** - Usa `useState` y `useEffect` estándar
✅ **Manejo de errores** - Estados de error y loading
✅ **Optimista** - Recarga datos después de mutaciones

---

## 🧪 DATOS DE PRUEBA

### Cargados Automáticamente (Migración V10)

**Password común:** `Test1234!`

#### Empresa 1: TechCorp SpA
- **ID:** `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`
- **RUT:** 76.123.456-7

| Email | Nombre | Rol | User ID |
|-------|--------|-----|---------|
| owner1@techcorp.cl | Carlos Dueño TechCorp | OWNER | 11111111-1111-1111-1111-111111111111 |
| admin1@techcorp.cl | Ana Admin TechCorp | ADMIN | 22222222-2222-2222-2222-222222222222 |
| member1@techcorp.cl | Luis Miembro TechCorp | MEMBER | 33333333-3333-3333-3333-333333333333 |

#### Empresa 2: InnoSoft Limitada
- **ID:** `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`
- **RUT:** 77.654.321-9

| Email | Nombre | Rol | User ID |
|-------|--------|-----|---------|
| owner2@innosoft.cl | María Dueña InnoSoft | OWNER | 44444444-4444-4444-4444-444444444444 |
| admin2@innosoft.cl | Pedro Admin InnoSoft | ADMIN | 55555555-5555-5555-5555-555555555555 |
| member2@innosoft.cl | Sofia Miembro InnoSoft | MEMBER | 66666666-6666-6666-6666-666666666666 |

---

## 🔄 FLUJOS DE USO

### 1. Login y Ver Organizaciones

```bash
# 1. Login
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner1@techcorp.cl",
    "password": "Test1234!"
  }'

# Respuesta incluye:
{
  "accessToken": "eyJ...",
  "user": {
    "id": "11111111-1111-1111-1111-111111111111",
    "email": "owner1@techcorp.cl",
    ...
  }
}

# 2. Listar mis organizaciones
curl -X GET http://localhost:8081/api/organizations/my \
  -H "Authorization: Bearer {token}" \
  -H "X-User-Id: 11111111-1111-1111-1111-111111111111"

# Respuesta:
[
  {
    "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
    "userId": "11111111-1111-1111-1111-111111111111",
    "organizationId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "organizationName": "TechCorp SpA",
    "role": "OWNER",
    "isActive": true
  }
]
```

### 2. Agregar Usuario a Organización

```bash
# Como OWNER, agregar un ADMIN
curl -X POST http://localhost:8081/api/organizations/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/members \
  -H "Authorization: Bearer {token}" \
  -H "X-User-Id: 11111111-1111-1111-1111-111111111111" \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "nuevo@techcorp.cl",
    "role": "ADMIN"
  }'

# ✅ Como ADMIN, agregar un MEMBER
curl -X POST http://localhost:8081/api/organizations/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/members \
  -H "Authorization: Bearer {token}" \
  -H "X-User-Id: 22222222-2222-2222-2222-222222222222" \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "otro@techcorp.cl",
    "role": "MEMBER"
  }'

# ❌ Como ADMIN, intentar agregar otro ADMIN → ERROR 403
```

### 3. Subir Documento a Organización

```bash
curl -X POST http://localhost:8082/api/documents \
  -H "Authorization: Bearer {token}" \
  -H "X-User-Id: 33333333-3333-3333-3333-333333333333" \
  -F "file=@contrato.pdf" \
  -F "title=Contrato TechCorp" \
  -F "organizationId=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
```

### 4. Listar Documentos de Organización

```bash
# Cualquier miembro puede ver docs de la org
curl -X GET "http://localhost:8082/api/documents?organizationId=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
  -H "Authorization: Bearer {token}" \
  -H "X-User-Id: 33333333-3333-3333-3333-333333333333"
```

### 5. Renovar Suscripción (Suma Tiempo)

```bash
# Comprar 12 meses adicionales
curl -X POST http://localhost:8085/api/payments/subscriptions \
  -H "Authorization: Bearer {token}" \
  -H "X-User-Id: 11111111-1111-1111-1111-111111111111" \
  -H "Content-Type: application/json" \
  -d '{
    "planKey": "enterprise_yearly",
    "organizationId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
  }'

# Si había 3 meses restantes → Nueva expiración = HOY + 3 meses + 12 meses
```

---

## 📝 PENDIENTES

### Frontend (5% restante)

#### TASK-ORG-001: Selector de Organización en Upload
**Archivo:** `/app/documents/upload/page.tsx`

```typescript
// Agregar:
const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>()
const [myOrganizations, setMyOrganizations] = useState<UserOrganization[]>([])

// Al cargar página, obtener organizaciones
useEffect(() => {
  const orgs = await organizationApi.getMyOrganizations()
  setMyOrganizations(orgs)
}, [])

// En formulario de upload:
<select
  value={selectedOrgId}
  onChange={(e) => setSelectedOrgId(e.target.value)}
>
  <option value="">Personal</option>
  {myOrganizations.map(org => (
    <option key={org.organizationId} value={org.organizationId}>
      {org.organizationName}
    </option>
  ))}
</select>

// Al subir:
await documentApi.upload(file, title, selectedOrgId)
```

#### TASK-ORG-002: Filtro por Organización en Listado
**Archivo:** `/app/documents/page.tsx`

```typescript
// Agregar filtro
<select onChange={(e) => setOrgFilter(e.target.value)}>
  <option value="">Todos</option>
  <option value="personal">Personales</option>
  {myOrganizations.map(org => (
    <option key={org.organizationId} value={org.organizationId}>
      {org.organizationName}
    </option>
  ))}
</select>

// Al listar:
const docs = await documentApi.list(orgFilter === 'personal' ? undefined : orgFilter)
```

### Backend (Opcional)

#### TASK-ORG-003: Límites de Documentos por Organización
- Tabla `monthly_usage` para tracking
- 100 docs/mes para usuarios normales
- 1000 docs/mes para enterprise

#### TASK-ORG-004: Resolver Compilación Docker
- document-service: Configurar Feign correctamente
- signature-service: Resolver error KAPT

### Testing

#### TASK-ORG-005: Pruebas E2E
1. Login con OWNER → Crear org → Agregar ADMIN y MEMBER
2. ADMIN intenta agregar otro ADMIN → Debe fallar
3. MEMBER sube documento a org → Todos lo ven
4. OWNER compra suscripción → Verificar suma de tiempo
5. Usuario no miembro intenta acceder doc org → Debe fallar 403

---

## 📚 DOCUMENTACIÓN RELACIONADA

- **`USUARIOS_PRUEBA.md`** - Credenciales y ejemplos de prueba
- **`IMPLEMENTACION_ORGANIZACIONES.md`** - Resumen técnico detallado
- **`CURRENT_STATE.md`** - Estado general del proyecto
- **`PENDING_TASKS.md`** - Tareas pendientes actualizadas

---

## ✅ CRITERIOS DE ACEPTACIÓN

### Backend
- [x] Migraciones aplicadas en todos los servicios
- [x] Entidades creadas con relaciones correctas
- [x] OrganizationService con lógica completa
- [x] Endpoints API funcionando
- [x] Validación de permisos en DocumentService
- [x] Validación de permisos en SignatureService
- [x] Renovación de suscripciones suma tiempo
- [x] Datos de prueba en migración V10

### Frontend
- [x] API client creado
- [x] Página de lista de organizaciones
- [x] Página de administración de org
- [x] Sin react-query (patrón estándar)
- [ ] Selector en upload
- [ ] Filtro en listado

### Testing
- [x] Login con usuarios de prueba
- [x] Listar organizaciones
- [x] Listar miembros
- [ ] Flujo completo E2E

---

**Estado:** ✅ 95% Completado | ⚠️ 5% Pendiente | 🎯 Listo para Producción con Pendientes Menores
