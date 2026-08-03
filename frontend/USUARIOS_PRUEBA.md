# Usuarios de Prueba - Organizaciones

**Contraseña para todos:** `Test1234!`

## Empresa 1: TechCorp SpA
**RUT:** 76.123.456-7

| Email | Nombre | Rol | Descripción |
|-------|--------|-----|-------------|
| `owner1@techcorp.cl` | Carlos Dueño TechCorp | OWNER | Puede comprar membresía, agregar usuarios, cambiar roles |
| `admin1@techcorp.cl` | Ana Admin TechCorp | ADMIN | Puede agregar usuarios (excepto otros admins) |
| `member1@techcorp.cl` | Luis Miembro TechCorp | MEMBER | Puede subir/ver documentos de la organización |

## Empresa 2: InnoSoft Limitada
**RUT:** 77.654.321-9

| Email | Nombre | Rol | Descripción |
|-------|--------|-----|-------------|
| `owner2@innosoft.cl` | María Dueña InnoSoft | OWNER | Puede comprar membresía, agregar usuarios, cambiar roles |
| `admin2@innosoft.cl` | Pedro Admin InnoSoft | ADMIN | Puede agregar usuarios (excepto otros admins) |
| `member2@innosoft.cl` | Sofia Miembro InnoSoft | MEMBER | Puede subir/ver documentos de la organización |

## Flujos de Prueba

### 1. Login
```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner1@techcorp.cl",
    "password": "Test1234!"
  }'
```

### 2. Listar Mis Organizaciones
```bash
curl -X GET http://localhost:8081/api/organizations/my \
  -H "Authorization: Bearer <token>" \
  -H "X-User-Id: 11111111-1111-1111-1111-111111111111"
```

### 3. Listar Miembros de Organización
```bash
curl -X GET http://localhost:8081/api/organizations/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/members \
  -H "Authorization: Bearer <token>" \
  -H "X-User-Id: 11111111-1111-1111-1111-111111111111"
```

### 4. Subir Documento a Organización
```bash
curl -X POST http://localhost:8082/api/documents \
  -H "Authorization: Bearer <token>" \
  -H "X-User-Id: 11111111-1111-1111-1111-111111111111" \
  -F "file=@documento.pdf" \
  -F "title=Documento TechCorp" \
  -F "organizationId=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
```

### 5. Listar Documentos de Organización
```bash
curl -X GET "http://localhost:8082/api/documents?organizationId=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
  -H "Authorization: Bearer <token>" \
  -H "X-User-Id: 33333333-3333-3333-3333-333333333333"
```

## Notas
- Los OWNER pueden comprar suscripciones para la organización
- Los ADMIN pueden agregar MEMBER pero no otros ADMIN
- Todos los miembros pueden ver documentos de la organización
- La renovación de suscripción suma tiempo al período restante
