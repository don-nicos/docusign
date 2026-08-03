# 🧪 Tests E2E con Playwright

Suite completa de tests end-to-end para Docusing usando Playwright.

## 📋 Prerequisitos

1. **Servicios Docker corriendo:**
   ```bash
   cd /Users/felipe.ibacache/Bitbucket/docusing
   docker-compose up -d
   ```

2. **Frontend en desarrollo:**
   ```bash
   cd frontend
   npm run dev
   ```

## 🚀 Instalación

```bash
cd frontend

# Instalar dependencias (incluye Playwright)
npm install

# Instalar navegadores de Playwright
npx playwright install
```

## ▶️ Ejecutar Tests

### Modo Headless (sin interfaz gráfica)
```bash
npm run test:e2e
```

### Modo UI (interfaz interactiva de Playwright)
```bash
npm run test:e2e:ui
```

### Modo Headed (ver el navegador)
```bash
npm run test:e2e:headed
```

### Modo Debug (paso a paso)
```bash
npm run test:e2e:debug
```

### Ejecutar un test específico
```bash
npx playwright test e2e/01-auth.spec.ts
```

### Ejecutar tests con patrón
```bash
npx playwright test --grep "login"
```

## 📁 Estructura de Tests

```
e2e/
├── helpers/
│   ├── test-data.ts          # Usuarios y datos de prueba
│   └── auth-helper.ts         # Funciones de autenticación
├── fixtures/
│   └── test-document.pdf      # PDF de prueba
├── 01-auth.spec.ts            # Tests de autenticación
├── 02-organizations.spec.ts   # Tests de organizaciones
├── 03-documents.spec.ts       # Tests de documentos
├── 04-signatures.spec.ts      # Tests de firmas
└── 05-complete-flow.spec.ts   # Tests de flujos completos
```

## 🧪 Tests Implementados

### 1. Authentication (01-auth.spec.ts)
- ✅ Redirect to login when not authenticated
- ✅ Login with OWNER credentials
- ✅ Login with ADMIN credentials
- ✅ Login with MEMBER credentials
- ✅ Show error with invalid credentials
- ✅ Logout successfully
- ✅ Persist session after page reload

### 2. Organizations (02-organizations.spec.ts)
- ✅ Display organizations page
- ✅ List user organizations
- ✅ Navigate to organization detail
- ✅ Display organization members
- ✅ OWNER sees add member form
- ✅ ADMIN sees limited add member form
- ✅ MEMBER cannot see admin page
- ✅ Create new organization

### 3. Documents (03-documents.spec.ts)
- ✅ Display documents page
- ✅ Navigate to upload page
- ✅ Display organization selector
- ✅ Upload document with PDF
- ✅ Filter documents by organization
- ✅ View document details
- ✅ MEMBER can view org documents

### 4. Signatures (04-signatures.spec.ts)
- ✅ Display signatures page
- ✅ Navigate to create signature request
- ✅ Create request with multiple signers
- ✅ Display signature request details
- ✅ Show signature canvas for signer
- ✅ Request OTP for signing
- ✅ Download signed document

### 5. Complete Flows (05-complete-flow.spec.ts)
- ✅ Complete signature workflow: upload → create → sign → download
- ✅ Organization workflow: create → add members → upload → verify

## 👥 Usuarios de Prueba

Todos los usuarios tienen la contraseña: `Test1234!`

### TechCorp SpA
- `owner1@techcorp.cl` - OWNER
- `admin1@techcorp.cl` - ADMIN
- `member1@techcorp.cl` - MEMBER

### InnoSoft Limitada
- `owner2@innosoft.cl` - OWNER
- `admin2@innosoft.cl` - ADMIN
- `member2@innosoft.cl` - MEMBER

## 📊 Reportes

Después de ejecutar los tests, se genera un reporte HTML:

```bash
npx playwright show-report
```

El reporte incluye:
- Screenshots de fallos
- Videos de tests fallidos
- Traces para debugging
- Tiempos de ejecución

## 🐛 Debugging

### Ver trace de un test fallido
```bash
npx playwright show-trace test-results/path-to-trace.zip
```

### Ejecutar con inspector de Playwright
```bash
npx playwright test --debug
```

### Pausar en un punto específico
Agregar en el test:
```typescript
await page.pause();
```

## 🔧 Configuración

La configuración está en `playwright.config.ts`:

- **baseURL**: http://localhost:3000
- **Workers**: 1 (secuencial para evitar conflictos)
- **Retries**: 0 en desarrollo, 2 en CI
- **Screenshots**: Solo en fallos
- **Videos**: Solo en fallos
- **Traces**: En primer retry

## 📝 Escribir Nuevos Tests

### Ejemplo básico
```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth-helper';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'owner1');
  });

  test('should do something', async ({ page }) => {
    await page.goto('/my-page');
    await expect(page.locator('h1')).toHaveText('My Page');
  });
});
```

### Helpers disponibles

#### login(page, userKey)
```typescript
await login(page, 'owner1'); // owner1, admin1, member1, owner2, admin2, member2
```

#### logout(page)
```typescript
await logout(page);
```

#### isLoggedIn(page)
```typescript
const loggedIn = await isLoggedIn(page);
```

## 🚨 Troubleshooting

### Error: "Timeout waiting for page"
- Verifica que el frontend esté corriendo en http://localhost:3000
- Verifica que los servicios Docker estén activos

### Error: "Element not found"
- Usa `await page.waitForLoadState('networkidle')` antes de interactuar
- Aumenta timeouts si es necesario: `{ timeout: 10000 }`

### Tests fallan aleatoriamente
- Asegúrate de que `workers: 1` en playwright.config.ts
- Limpia el estado entre tests con `test.beforeEach`

### Base de datos con datos viejos
```bash
# Reiniciar servicios Docker
docker-compose down -v
docker-compose up -d
```

## 📚 Recursos

- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Selectors](https://playwright.dev/docs/selectors)
- [Assertions](https://playwright.dev/docs/test-assertions)

## 🎯 CI/CD

Para ejecutar en CI:

```yaml
# .github/workflows/e2e.yml
- name: Install dependencies
  run: npm ci
  
- name: Install Playwright
  run: npx playwright install --with-deps
  
- name: Run E2E tests
  run: npm run test:e2e
  
- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## ✅ Checklist antes de Commit

- [ ] Todos los tests pasan localmente
- [ ] No hay `test.only()` o `test.skip()`
- [ ] Screenshots/videos de fallos revisados
- [ ] Nuevos tests documentados
- [ ] Helpers reutilizables creados si es necesario
