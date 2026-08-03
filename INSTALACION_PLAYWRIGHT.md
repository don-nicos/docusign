# 🎭 Instalación de Playwright - Guía de Troubleshooting

## ⚠️ Problema Actual: Timeout al Descargar Navegadores

El CDN de Playwright (`cdn.playwright.dev`) está experimentando problemas de conectividad.

**Error:**
```
Error: connect ETIMEDOUT 13.107.226.70:443
Failed to download Chrome for Testing
```

---

## ✅ Soluciones

### Opción 1: Reintentar más tarde (Recomendado)

Espera unos minutos y vuelve a intentar:

```bash
cd /Users/felipe.ibacache/Bitbucket/docusing/frontend

# Reintentar instalación
npx playwright install chromium
```

### Opción 2: Usar Variable de Entorno para Mirror

Si tienes problemas persistentes, puedes usar un mirror alternativo:

```bash
# Configurar mirror alternativo (China mirror)
export PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright

# Instalar navegadores
npx playwright install chromium
```

### Opción 3: Instalar con Homebrew (macOS)

```bash
# Instalar Chromium con Homebrew
brew install --cask chromium

# Configurar Playwright para usar Chromium del sistema
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/Applications/Chromium.app/Contents/MacOS/Chromium
```

### Opción 4: Usar Navegador del Sistema

Modifica `playwright.config.ts` para usar Chrome instalado en tu sistema:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // ... otras configuraciones
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Usar Chrome del sistema si está instalado
        channel: 'chrome'  // o 'msedge' para Edge
      },
    },
  ],
});
```

### Opción 5: Descargar Manualmente

1. Descarga Chromium desde: https://download-chromium.appspot.com/
2. Extrae el archivo
3. Configura la variable de entorno:

```bash
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/ruta/a/chromium
```

---

## 🔍 Verificar Instalación

Después de instalar, verifica que funcione:

```bash
cd frontend

# Verificar versión
npx playwright --version

# Listar navegadores instalados
npx playwright install --dry-run
```

---

## 🚀 Ejecutar Tests (Una vez instalado)

### Modo UI (Interactivo)
```bash
npm run test:e2e:ui
```

### Modo Headless
```bash
npm run test:e2e
```

### Modo Headed (Ver navegador)
```bash
npm run test:e2e:headed
```

---

## 🐛 Troubleshooting Adicional

### Error: "Executable doesn't exist"

```bash
# Reinstalar navegadores
npx playwright install --force chromium
```

### Error: "Browser closed unexpectedly"

```bash
# Instalar dependencias del sistema (Linux)
npx playwright install-deps chromium
```

### Limpiar caché y reinstalar

```bash
# Limpiar caché de Playwright
rm -rf ~/Library/Caches/ms-playwright

# Reinstalar
npx playwright install chromium
```

---

## 📊 Estado Actual

✅ **Dependencias npm instaladas** - Playwright está en `node_modules`
❌ **Navegadores pendientes** - Problema de red al descargar Chromium

---

## ⏭️ Próximos Pasos

1. **Espera 5-10 minutos** para que mejore la conectividad
2. **Reintenta:** `npx playwright install chromium`
3. **Si persiste:** Usa una de las opciones alternativas arriba
4. **Una vez instalado:** Ejecuta `npm run test:e2e:ui`

---

## 🔗 Recursos

- [Playwright Installation Docs](https://playwright.dev/docs/intro)
- [Playwright Browsers](https://playwright.dev/docs/browsers)
- [System Requirements](https://playwright.dev/docs/library#system-requirements)

---

## 💡 Alternativa Temporal: Tests sin Playwright

Mientras tanto, puedes probar manualmente los flujos:

1. **Login:** http://localhost:3000/auth/login
   - Email: `owner1@techcorp.cl`
   - Password: `Test1234!`

2. **Organizaciones:** http://localhost:3000/organizations

3. **Documentos:** http://localhost:3000/documents

4. **Firmas:** http://localhost:3000/signatures

Los tests automatizados replicarán exactamente estos flujos una vez que Chromium esté instalado.
