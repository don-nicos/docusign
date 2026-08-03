# 🧪 Guía de Testing - Docusing

Documentación completa para ejecutar tests automatizados en el proyecto Docusing.

## 📋 Tabla de Contenidos

1. [Tests E2E con Playwright](#tests-e2e-con-playwright)
2. [Setup Rápido](#setup-rápido)
3. [Comandos Principales](#comandos-principales)
4. [Usuarios de Prueba](#usuarios-de-prueba)
5. [Troubleshooting](#troubleshooting)

---

## 🎭 Tests E2E con Playwright

Los tests E2E (End-to-End) navegan automáticamente por la aplicación web simulando un usuario real.

### ✨ Características

- ✅ **Navegación automática** del navegador
- ✅ **Tests de todos los flujos** principales
- ✅ **Screenshots y videos** de fallos
- ✅ **Modo interactivo** para debugging
- ✅ **Reportes HTML** detallados

### 📦 Cobertura de Tests

#### Authentication (7 tests)
- Login con diferentes roles (OWNER, ADMIN, MEMBER)
- Validación de credenciales inválidas
- Logout y persistencia de sesión

#### Organizations (8 tests)
- Listar organizaciones
- Ver miembros
- Crear organizaciones
- Permisos por rol

#### Documents (7 tests)
- Subir documentos
- Filtrar por organización
- Selector de organización
- Acceso de miembros

#### Signatures (7 tests)
- Crear solicitudes de firma
- Canvas de firma
- Solicitar OTP
- Descargar documentos firmados

#### Complete Flows (2 tests)
- Flujo completo de firma
- Flujo completo de organizaciones

**Total: 31 tests automatizados**

---

## 🚀 Setup Rápido

### 1. Levantar servicios Docker

```bash
cd /Users/felipe.ibacache/Bitbucket/docusing
docker-compose up -d
```

Verifica que todos estén healthy:
```bash
docker-compose ps
```

### 2. Instalar Playwright

```bash
cd frontend

# Instalar dependencias
npm install

# Instalar navegadores de Playwright
npx playwright install
```

### 3. Ejecutar tests

```bash
# Modo headless (rápido)
npm run test:e2e

# Modo UI (recomendado para desarrollo)
npm run test:e2e:ui

# Modo headed (ver el navegador)
npm run test:e2e:headed
```

---

## ⚡ Comandos Principales

### Ejecutar todos los tests
```bash
npm run test:e2e
```

### Modo UI interactivo (RECOMENDADO)
```bash
npm run test:e2e:ui
```
- Ver tests en tiempo real
- Pausar y reanudar
- Inspeccionar elementos
- Time travel debugging

### Ver el navegador mientras corre
```bash
npm run test:e2e:headed
```

### Debug paso a paso
```bash
npm run test:e2e:debug
```

### Ejecutar test específico
```bash
npx playwright test e2e/01-auth.spec.ts
npx playwright test e2e/02-organizations.spec.ts
npx playwright test e2e/03-documents.spec.ts
npx playwright test e2e/04-signatures.spec.ts
npx playwright test e2e/05-complete-flow.spec.ts
```

### Ejecutar tests con patrón
```bash
npx playwright test --grep "login"
npx playwright test --grep "organization"
npx playwright test --grep "OWNER"
```

### Ver reporte HTML
```bash
npx playwright show-report
```

---

## 👥 Usuarios de Prueba

**Contraseña para TODOS:** `Test1234!`

### 🏢 TechCorp SpA

| Email | Rol | Permisos |
|-------|-----|----------|
| `owner1@techcorp.cl` | OWNER | Compra suscripciones, agrega usuarios, cambia roles |
| `admin1@techcorp.cl` | ADMIN | Agrega usuarios MEMBER |
| `member1@techcorp.cl` | MEMBER | Sube/ve documentos |

### 🏢 InnoSoft Limitada

| Email | Rol | Permisos |
|-------|-----|----------|
| `owner2@innosoft.cl` | OWNER | Compra suscripciones, agrega usuarios, cambia roles |
| `admin2@innosoft.cl` | ADMIN | Agrega usuarios MEMBER |
| `member2@innosoft.cl` | MEMBER | Sube/ve documentos |

---

## 🎯 Flujos de Prueba Manual

### Flujo 1: Login y Dashboard
1. Ir a http://localhost:3000
2. Login con `owner1@techcorp.cl` / `Test1234!`
3. Verificar dashboard

### Flujo 2: Organizaciones
1. Login como OWNER
2. Ir a `/organizations`
3. Ver TechCorp SpA
4. Click en "Administrar"
5. Ver 3 miembros

### Flujo 3: Subir Documento
1. Login como OWNER
2. Ir a `/documents/upload`
3. Seleccionar organización TechCorp
4. Subir PDF
5. Verificar en listado

### Flujo 4: Crear Solicitud de Firma
1. Subir documento
2. Ir a `/signatures/create`
3. Seleccionar documento
4. Agregar firmantes
5. Enviar solicitud

### Flujo 5: Firmar Documento
1. Abrir MailHog: http://localhost:8025
2. Ver email con magic link
3. Click en link
4. Solicitar OTP
5. Firmar documento
6. Descargar PDF firmado

---

## 🐛 Troubleshooting

### ❌ Error: "Timeout waiting for page"

**Causa:** Frontend no está corriendo

**Solución:**
```bash
cd frontend
npm run dev
```

### ❌ Error: "Services not available"

**Causa:** Docker services no están corriendo

**Solución:**
```bash
docker-compose up -d
docker-compose ps  # Verificar que todos estén healthy
```

### ❌ Tests fallan aleatoriamente

**Causa:** Tests corriendo en paralelo

**Solución:** Ya configurado con `workers: 1` en `playwright.config.ts`

### ❌ Error: "Element not found"

**Causa:** Página no cargó completamente

**Solución:** Ya incluido `waitForLoadState('networkidle')` en helpers

### ❌ Base de datos con datos viejos

**Solución:**
```bash
docker-compose down -v
docker-compose up -d
# Esperar 30 segundos para que migraciones corran
```

### ❌ Playwright no instalado

**Solución:**
```bash
cd frontend
npm install
npx playwright install
```

---

## 📊 Interpretar Resultados

### ✅ Test Passed
```
✓ should login successfully with OWNER credentials (2.5s)
```
Todo funcionó correctamente.

### ❌ Test Failed
```
✗ should upload document (5.2s)
  Error: Timeout 5000ms exceeded
```
- Ver screenshot en `test-results/`
- Ver video si está disponible
- Ver trace con `npx playwright show-trace`

### ⏭️ Test Skipped
```
- should create organization (skipped)
```
Test marcado con `test.skip()`.

---

## 🎨 Modo UI Interactivo

El modo UI es la mejor forma de desarrollar y debuggear tests:

```bash
npm run test:e2e:ui
```

**Características:**
- ✅ Ver tests en tiempo real
- ✅ Pausar en cualquier momento
- ✅ Inspeccionar DOM
- ✅ Ver screenshots paso a paso
- ✅ Time travel (volver atrás en el test)
- ✅ Copiar selectores
- ✅ Ver console logs

---

## 📸 Screenshots y Videos

### Screenshots
Se toman automáticamente en fallos:
```
test-results/
  03-documents-should-upload-document/
    test-failed-1.png
```

### Videos
Se graban en fallos:
```
test-results/
  03-documents-should-upload-document/
    video.webm
```

### Traces
Para debugging avanzado:
```bash
npx playwright show-trace test-results/.../trace.zip
```

---

## 🔄 Integración Continua (CI)

Para ejecutar en GitHub Actions u otro CI:

```yaml
- name: Install dependencies
  run: |
    cd frontend
    npm ci

- name: Install Playwright
  run: |
    cd frontend
    npx playwright install --with-deps

- name: Start services
  run: docker-compose up -d

- name: Wait for services
  run: sleep 30

- name: Run E2E tests
  run: |
    cd frontend
    npm run test:e2e

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: frontend/playwright-report/
```

---

## 📚 Recursos Adicionales

- **Playwright Docs:** https://playwright.dev
- **Documentación del proyecto:** `docs/README.md`
- **Usuarios de prueba:** `docs/USUARIOS_PRUEBA.md`
- **Tests E2E:** `frontend/e2e/README.md`

---

## ✅ Checklist de Testing

Antes de hacer commit:

- [ ] Todos los tests pasan localmente
- [ ] No hay `test.only()` en el código
- [ ] Servicios Docker corriendo
- [ ] Frontend en modo dev
- [ ] Screenshots de fallos revisados
- [ ] Nuevos tests documentados

---

## 🎯 Próximos Pasos

1. **Ejecutar tests ahora:**
   ```bash
   cd frontend
   npm install
   npx playwright install
   npm run test:e2e:ui
   ```

2. **Ver tests en acción** en modo UI

3. **Explorar reportes** con `npx playwright show-report`

4. **Agregar nuevos tests** según necesites

---

**¡Happy Testing! 🚀**
