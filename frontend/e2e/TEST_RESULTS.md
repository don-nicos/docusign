# 📊 Resultados de Tests E2E - Playwright

**Fecha:** 17 de Marzo, 2026  
**Total de Tests:** 31  
**Pasaron:** 20/31 (64.5%)  
**Fallaron:** 11/31 (35.5%)

---

## ✅ Tests que PASARON (20)

### Authentication (7/7) ✓
- ✓ should redirect to login when not authenticated
- ✓ should login successfully with OWNER credentials
- ✓ should login successfully with ADMIN credentials
- ✓ should login successfully with MEMBER credentials
- ✓ should show error with invalid credentials
- ✓ should logout successfully
- ✓ should persist session after page reload

### Organizations (5/8)
- ✓ should display organizations page
- ✓ should list user organizations
- ✓ should navigate to organization detail page
- ✓ ADMIN should see limited add member form
- ✓ MEMBER should not see organization admin page

### Documents (2/7)
- ✓ should display organization selector in upload form
- ✓ should filter documents by organization

### Signatures (6/7)
- ✓ should navigate to create signature request
- ✓ should create signature request with multiple signers
- ✓ should display signature request details
- ✓ should show signature canvas for signer
- ✓ should request OTP for signing
- ✓ should download signed document

### Complete Flows (0/2)
- (Ninguno pasó)

---

## ❌ Tests que FALLARON (11)

### Organizations (3 fallos)

**1. should display organization members**
- **Error:** `TimeoutError: page.waitForSelector: Timeout 5000ms exceeded`
- **Selector:** `text=/miembros|members/i`
- **Causa:** La página de detalle de organización no muestra ese texto
- **Solución:** Actualizar selector o verificar que la página tenga la sección de miembros

**2. OWNER should see add member form**
- **Error:** `TimeoutError: page.waitForSelector: Timeout 5000ms exceeded`
- **Selector:** `text=/agregar|añadir|add.*member/i`
- **Causa:** El formulario de agregar miembros no está visible o tiene texto diferente
- **Solución:** Verificar el texto real del botón/formulario

**3. should create new organization**
- **Error:** `Test timeout of 30000ms exceeded`
- **Selector:** `input[name="name"], input[placeholder*="nombre"]`
- **Causa:** El formulario de crear organización no existe o tiene campos diferentes
- **Solución:** Verificar si existe la funcionalidad de crear organización en el frontend

---

### Documents (5 fallos)

**1. should display documents page**
- **Error:** `TimeoutError: page.waitForSelector: Timeout 5000ms exceeded`
- **Selector:** `text=/Mis Documentos|My Documents/i`
- **Causa:** El título de la página es diferente (probablemente solo "Documentos")
- **Solución:** Actualizar selector a `h1:has-text("Documentos")`

**2. should navigate to upload page**
- **Error:** `TimeoutError: page.waitForSelector: Timeout 5000ms exceeded`
- **Selector:** `text=/subir|upload/i`
- **Causa:** El botón de subir tiene texto diferente o no está visible
- **Solución:** Verificar el texto real del botón (podría ser "Nuevo", "Cargar", etc.)

**3. should upload document with PDF file**
- **Error:** `TimeoutError: page.waitForSelector: Timeout 30000ms exceeded`
- **Selector:** `input[type="file"]`
- **Causa:** No puede acceder al formulario de upload
- **Solución:** Primero debe navegar correctamente a la página de upload

**4. should view document details**
- **Error:** `TimeoutError: page.waitForSelector: Timeout 5000ms exceeded`
- **Selector:** Primer documento en la lista
- **Causa:** No hay documentos en la lista o el selector es incorrecto
- **Solución:** Primero subir un documento o usar datos de prueba existentes

**5. MEMBER can view organization documents**
- **Error:** `strict mode violation: resolved to 4 elements`
- **Selector:** `text=/Documentos|Documents/i`
- **Causa:** Selector ambiguo - encuentra múltiples elementos
- **Solución:** Usar selector más específico como `h1:has-text("Documentos")`

---

### Signatures (1 fallo)

**1. should display signatures page**
- **Error:** `strict mode violation: resolved to 3 elements`
- **Selector:** `text=/Firmas|Signatures|Solicitudes/i`
- **Causa:** Selector ambiguo - encuentra el link en nav, el h1 y el texto de "no hay solicitudes"
- **Solución:** Usar `h1:has-text("Solicitudes de Firma")`

---

### Complete Flows (2 fallos)

**1. complete signature workflow: upload → create request → sign → download**
- **Error:** `TimeoutError: page.waitForSelector: Timeout 30000ms exceeded`
- **Selector:** `input[type="file"]`
- **Causa:** No puede acceder al formulario de upload (depende de test de documentos)
- **Solución:** Arreglar primero los tests de documentos

**2. organization workflow: create org → add members → upload doc → verify access**
- **Error:** `strict mode violation: resolved to 2 elements`
- **Selector:** `text=/Carlos Dueño TechCorp/i`
- **Causa:** El nombre aparece en navegación y en contenido principal
- **Solución:** Usar selector más específico con contexto (ej: `main >> text="Carlos Dueño TechCorp"`)

---

## 🔧 Problemas Comunes Identificados

### 1. **Selectores Ambiguos** (5 casos)
El mismo texto aparece en múltiples lugares (nav, títulos, contenido).

**Solución:**
```typescript
// ❌ Malo
page.locator('text=/Documentos/i')

// ✅ Bueno
page.locator('h1:has-text("Documentos")')
page.locator('main >> text="Documentos"')
page.locator('h1, h2').filter({ hasText: /Documentos/i }).first()
```

### 2. **Timeouts en Navegación** (4 casos)
Los tests no pueden encontrar botones/links para navegar.

**Causa:** Texto de botones diferente al esperado.

**Solución:** Inspeccionar la UI real y actualizar selectores.

### 3. **Formularios No Encontrados** (3 casos)
No puede encontrar inputs de formularios.

**Causa:** La página de formulario no existe o no se navegó correctamente.

**Solución:** Verificar que la funcionalidad existe en el frontend.

---

## 📋 Próximos Pasos Sugeridos

### Prioridad Alta
1. **Arreglar selectores ambiguos** - Rápido y fácil (5 tests)
2. **Actualizar selectores de navegación** - Verificar textos reales (4 tests)

### Prioridad Media
3. **Verificar funcionalidad de upload** - Crítico para flujos completos
4. **Verificar formulario de crear organización** - Puede no estar implementado

### Prioridad Baja
5. **Tests de flujos completos** - Dependen de que los otros funcionen

---

## 🎯 Tasa de Éxito por Módulo

| Módulo | Pasaron | Total | % |
|--------|---------|-------|---|
| **Authentication** | 7 | 7 | **100%** ✅ |
| **Signatures** | 6 | 7 | **86%** ✅ |
| **Organizations** | 5 | 8 | **63%** ⚠️ |
| **Documents** | 2 | 7 | **29%** ❌ |
| **Complete Flows** | 0 | 2 | **0%** ❌ |
| **TOTAL** | **20** | **31** | **64.5%** |

---

## 💡 Notas

- Los tests de **autenticación funcionan perfectamente** (100%)
- Los tests de **firmas están casi completos** (86%)
- Los tests de **documentos necesitan más trabajo** (29%)
- Los **flujos completos** dependen de que los módulos individuales funcionen
