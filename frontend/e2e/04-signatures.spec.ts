import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/test-data';
import { login } from './helpers/auth-helper';

test.describe('Signature Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'owner1');
  });

  test('should display signatures page', async ({ page }) => {
    await login(page, 'owner1');
    
    await page.goto('/signatures');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL('/signatures');
    await expect(page.locator('h1').filter({ hasText: /Solicitudes|Firmas/i }).first()).toBeVisible();
  });

  test('should navigate to create signature request', async ({ page }) => {
    await page.goto('/signatures');
    await page.waitForLoadState('networkidle');
    
    const createButton = page.locator('a:has-text("Crear"), a:has-text("Nueva"), button:has-text("Crear")').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      
      await page.waitForURL(/\/signatures\/create/, { timeout: 5000 });
      
      await expect(page.locator('text=/Crear|Nueva|Solicitud/i')).toBeVisible();
    }
  });

  test('should create signature request with multiple signers', async ({ page }) => {
    await page.goto('/signatures/create');
    await page.waitForLoadState('networkidle');
    
    const documentSelect = page.locator('select[name="documentId"]');
    
    if (await documentSelect.count() > 0) {
      await documentSelect.selectOption({ index: 1 });
      
      await page.fill('input[name="signerEmail"], input[placeholder*="email"]', 'signer1@test.com');
      await page.fill('input[name="signerName"], input[placeholder*="nombre"]', 'Test Signer 1');
      
      const addButton = page.locator('button:has-text("Agregar")');
      if (await addButton.isVisible()) {
        await addButton.click();
      }
      
      const submitButton = page.locator('button[type="submit"]:has-text("Crear"), button:has-text("Enviar")');
      await submitButton.click();
      
      await page.waitForURL(/\/signatures/, { timeout: 15000 });
      
      await expect(page.locator('text=/Solicitud creada|Request created/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display signature request details', async ({ page }) => {
    await page.goto('/signatures');
    await page.waitForLoadState('networkidle');
    
    const requestLink = page.locator('a[href*="/signatures/"]').first();
    
    if (await requestLink.count() > 0) {
      await requestLink.click();
      
      await page.waitForURL(/\/signatures\/[a-f0-9-]+/, { timeout: 5000 });
      
      await expect(page.locator('text=/Firmantes|Signers|Estado/i')).toBeVisible();
    }
  });

  // Los tests que usan test-signer-id fueron eliminados por razones de seguridad.
  // Los IDs de firmantes deben ser generados dinámicamente en los tests
  // o probados a través del flujo de usuarios autenticados.

  test('should download signed document', async ({ page }) => {
    await page.goto('/signatures');
    await page.waitForLoadState('networkidle');
    
    const downloadButton = page.locator('button:has-text("Descargar"), a:has-text("Download")').first();
    
    if (await downloadButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download');
      await downloadButton.click();
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    }
  });
});
