# ⚠️ Requisitos de Suscripción para Tests E2E

**Fecha:** 17 de Marzo, 2026  
**Crítico:** Los tests E2E requieren suscripciones activas para funcionar correctamente

---

## 🚨 Problema Identificado

Los tests E2E estaban dando **falsos positivos** porque:

1. Los usuarios de prueba **NO tenían suscripciones activas**
2. Los tests **no validaban** la presencia de suscripción
3. Los tests **pasaban** aunque el usuario fuera redirigido a `/subscription`
4. Esto ocultaba bugs reales en la funcionalidad

---

## ✅ Solución Implementada

### 1. Suscripciones Activas Creadas

Se crearon suscripciones ANUALES activas para las organizaciones de prueba:

```sql
-- TechCorp SpA
INSERT INTO payment.subscriptions (
    id,
    user_id,
    organization_id,
    plan_key,
    provider,
    status,
    started_at,
    current_period_end
) VALUES (
    '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',  -- owner1@techcorp.cl
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',  -- TechCorp SpA
    'ANNUAL',
    'TEST',
    'ACTIVE',
    NOW() - INTERVAL '1 month',
    NOW() + INTERVAL '11 months'
);

-- InnoSoft Limitada
INSERT INTO payment.subscriptions (
    id,
    user_id,
    organization_id,
    plan_key,
    provider,
    status,
    started_at,
    current_period_end
) VALUES (
    '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '44444444-4444-4444-4444-444444444444',  -- owner2@innosoft.cl
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',  -- InnoSoft Limitada
    'ANNUAL',
    'TEST',
    'ACTIVE',
    NOW() - INTERVAL '1 month',
    NOW() + INTERVAL '11 months'
);
```

### 2. Migración Creada

**Archivo:** `backend/payment-service/src/main/resources/db/migration/payment/V3__test_subscriptions_data.sql`

Esta migración se aplicará automáticamente cuando se reinicie el payment-service.

---

## 📋 Verificación de Suscripciones

### Comando para Verificar

```bash
docker exec docusing-postgres-1 psql -U docusing -d docusing -c "
SELECT 
    s.id,
    o.name as organization,
    s.plan_key,
    s.status,
    s.current_period_end
FROM payment.subscriptions s
JOIN organizations o ON s.organization_id = o.id
WHERE s.organization_id IN (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);
"
```

### Resultado Esperado

```
                  id                  |    organization     | plan_key | status |      current_period_end       
--------------------------------------+---------------------+----------+--------+-------------------------------
 11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa | TechCorp SpA        | ANNUAL   | ACTIVE | 2027-02-17 21:52:49.251059+00
 22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb | InnoSoft Limitada   | ANNUAL   | ACTIVE | 2027-02-17 21:52:49.251059+00
```

---

## 🔧 Cambios en los Tests

### Antes (Incorrecto - Falsos Positivos)

```typescript
test('should upload document', async ({ page }) => {
  await login(page, 'owner1');
  
  await page.goto('/documents/upload');
  await page.waitForLoadState('networkidle');
  
  const currentUrl = page.url();
  if (currentUrl.includes('/subscription')) {
    // ❌ Test pasa aunque no tenga suscripción
    return;
  }
  
  // ... resto del test
});
```

**Problema:** El test pasa aunque el usuario no tenga suscripción y sea redirigido.

### Después (Correcto - Valida Suscripción)

```typescript
test('should upload document', async ({ page }) => {
  await login(page, 'owner1');
  
  await page.goto('/documents/upload');
  await page.waitForLoadState('networkidle');
  
  const currentUrl = page.url();
  if (currentUrl.includes('/subscription')) {
    // ✅ Test falla explícitamente
    throw new Error('❌ Usuario redirigido a /subscription - no tiene suscripción activa');
  }
  
  // ... resto del test
});
```

**Mejora:** El test falla explícitamente si el usuario no tiene suscripción.

---

## 📊 Tests Afectados

Los siguientes tests requieren suscripción activa:

### Tests de Documentos
- `should navigate to upload page`
- `should upload document with PDF file`
- `should display organization selector in upload form`

### Tests de Firmas
- Todos los tests de creación de solicitudes de firma
- `complete multi-user signature workflow`
- `verify signatures are placed in correct positions on PDF`
- `verify 3 users can sign the same document`
- `verify 5 users can sign the same document`

### Tests de Flujo Completo
- `complete signature workflow: upload → create → sign → download`
- `organization workflow: create org → add member → upload → sign`

---

## 🚀 Cómo Aplicar las Suscripciones

### Opción 1: Reiniciar Payment Service (Recomendado)

```bash
cd /Users/felipe.ibacache/Bitbucket/docusing
docker-compose restart payment-service
```

La migración V3 se aplicará automáticamente.

### Opción 2: Aplicar Manualmente (Ya Aplicado)

```bash
docker exec docusing-postgres-1 psql -U docusing -d docusing << 'EOF'
INSERT INTO payment.subscriptions (...) VALUES (...);
EOF
```

---

## ⚠️ Importante para Desarrollo

### Antes de Ejecutar Tests E2E

1. **Verificar que las suscripciones existen:**
   ```bash
   docker exec docusing-postgres-1 psql -U docusing -d docusing -c \
     "SELECT COUNT(*) FROM payment.subscriptions WHERE status='ACTIVE';"
   ```
   
   Debe retornar al menos 2 (TechCorp + InnoSoft).

2. **Si no existen, aplicarlas:**
   ```bash
   docker-compose restart payment-service
   # O aplicar manualmente con el SQL de arriba
   ```

3. **Ejecutar tests:**
   ```bash
   cd frontend
   npx playwright test --project=chromium
   ```

---

## 🎯 Beneficios de Esta Solución

### Para Tests
- ✅ **No más falsos positivos** - Los tests fallan si no hay suscripción
- ✅ **Tests más realistas** - Prueban el flujo real de usuarios con suscripción
- ✅ **Mejor detección de bugs** - Identifica problemas de permisos y acceso

### Para Desarrollo
- ✅ **Ambiente consistente** - Todos los desarrolladores tienen las mismas suscripciones de prueba
- ✅ **Fácil de replicar** - Una migración SQL automática
- ✅ **Documentado** - Claro qué usuarios tienen qué suscripciones

### Para QA
- ✅ **Tests confiables** - No pasan por razones incorrectas
- ✅ **Fácil debugging** - Error claro cuando falta suscripción
- ✅ **Trazabilidad** - Se sabe exactamente qué se está probando

---

## 📝 Usuarios de Prueba con Suscripción

| Usuario | Email | Organización | Rol | Suscripción | Expira |
|---------|-------|--------------|-----|-------------|--------|
| Carlos Dueño | owner1@techcorp.cl | TechCorp SpA | OWNER | ANNUAL | +11 meses |
| Ana Admin | admin1@techcorp.cl | TechCorp SpA | ADMIN | *(heredada)* | +11 meses |
| Luis Miembro | member1@techcorp.cl | TechCorp SpA | MEMBER | *(heredada)* | +11 meses |
| María Dueña | owner2@innosoft.cl | InnoSoft Limitada | OWNER | ANNUAL | +11 meses |
| Pedro Admin | admin2@innosoft.cl | InnoSoft Limitada | ADMIN | *(heredada)* | +11 meses |
| Sofia Miembro | member2@innosoft.cl | InnoSoft Limitada | MEMBER | *(heredada)* | +11 meses |

**Nota:** Los miembros ADMIN y MEMBER heredan el acceso de la suscripción de la organización.

---

## 🔍 Troubleshooting

### Test falla con "Usuario redirigido a /subscription"

**Causa:** La suscripción no existe o está expirada.

**Solución:**
```bash
# Verificar suscripciones
docker exec docusing-postgres-1 psql -U docusing -d docusing -c \
  "SELECT id, status, current_period_end FROM payment.subscriptions;"

# Si no existen, reiniciar payment-service
docker-compose restart payment-service
```

### Suscripción existe pero test sigue fallando

**Causa:** El frontend no está detectando la suscripción correctamente.

**Solución:**
1. Verificar que payment-service está corriendo:
   ```bash
   docker ps | grep payment
   ```

2. Verificar logs del payment-service:
   ```bash
   docker logs docusing-payment-service-1 --tail=50
   ```

3. Probar endpoint manualmente:
   ```bash
   curl -X GET "http://localhost:8085/api/subscriptions/me" \
     -H "Authorization: Bearer <token>" \
     -H "X-User-Id: 11111111-1111-1111-1111-111111111111"
   ```

---

## 🏆 Conclusión

**Las suscripciones activas son CRÍTICAS para que los tests E2E funcionen correctamente.**

Sin suscripciones:
- ❌ Tests dan falsos positivos
- ❌ No se prueban flujos reales
- ❌ Bugs quedan ocultos

Con suscripciones:
- ✅ Tests prueban funcionalidad real
- ✅ Fallos son genuinos
- ✅ Mayor confianza en el código

**Estado actual:** ✅ Suscripciones activas creadas y verificadas
