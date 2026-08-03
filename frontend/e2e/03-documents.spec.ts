import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/test-data';
import { login, logout } from './helpers/auth-helper';
import { hasActiveSubscription } from './helpers/subscription-helper';
import path from 'path';

test.describe('Document Management', () => {
  test('should display documents page', async ({ page }) => {
    await login(page, 'owner1');
    
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL('/documents');
    await expect(page.locator('h1').filter({ hasText: /Documentos/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to upload page', async ({ page }) => {
    await login(page, 'owner1');
    
    await page.goto('/documents/upload');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    if (currentUrl.includes('/subscription')) {
      throw new Error('❌ OWNER no tiene suscripción activa. Ver e2e/SUBSCRIPTION_REQUIREMENTS.md');
    }
    
    await expect(page).toHaveURL('/documents/upload');
  });

  test('should display organization selector in upload form', async ({ page }) => {
    await page.goto('/documents/upload');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    if (currentUrl.includes('/subscription')) {
      return;
    }
    
    const orgSelector = page.locator('select, [role="combobox"]').first();
    await expect(orgSelector).toBeVisible({ timeout: 5000 });
    
    const options = await orgSelector.locator('option').count();
    expect(options).toBeGreaterThan(0);
  });

  test('should upload document with PDF file', async ({ page }) => {
    await login(page, 'owner1');
    // Verificar que el usuario tiene suscripción activa
    const hasSubscription = await hasActiveSubscription(page);
    if (!hasSubscription) {
      throw new Error('❌ OWNER no tiene suscripción activa. Ver e2e/SUBSCRIPTION_REQUIREMENTS.md');
    }
    console.log('✅ OWNER tiene suscripción activa');
    
    await page.goto('/documents/upload');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('URL después de navegar a /documents/upload:', currentUrl);
    
    if (currentUrl.includes('/subscription')) {
      throw new Error('❌ Usuario redirigido a /subscription a pesar de tener suscripción activa. URL: ' + currentUrl);
    }
    
    // El input tiene className="sr-only" (oculto), usar el label visible
    const fileLabel = page.locator('label[for="file-upload"]');
    await expect(fileLabel).toBeVisible({ timeout: 5000 });
    
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-document.pdf');
    
    // Encontrar el input oculto y asignar el archivo
    const fileInput = page.locator('input#file-upload');
    await fileInput.setInputFiles(testPdfPath);
    
    const titleInput = page.locator('input[type="text"], input[name="title"]').first();
    await expect(titleInput).toBeVisible();
    await titleInput.clear();
    await titleInput.fill('Test Document E2E Upload');
    
    const orgSelector = page.locator('select[name="organizationId"], select').first();
    if (await orgSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      await orgSelector.selectOption({ index: 1 });
    }
    
    const submitButton = page.locator('button[type="submit"]:has-text("Subir"), button:has-text("Cargar"), button[type="submit"]').first();
    await submitButton.click();
    
    await page.waitForURL(/\/documents/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/documents/);
    
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/Test Document E2E Upload|test-document/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should filter documents by organization', async ({ page }) => {
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    
    const filterSelect = page.locator('select').filter({ hasText: /filtrar|filter|organización/i });
    
    if (await filterSelect.count() > 0) {
      await filterSelect.first().selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('text=/TechCorp/i')).toBeVisible();
    }
  });

  test('should view document details', async ({ page }) => {
    await login(page, 'owner1');
    
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    
    const firstDocument = page.locator('a[href*="/documents/"]').first();
    const documentCount = await page.locator('a[href*="/documents/"]').count();
    
    if (documentCount > 0) {
      await expect(firstDocument).toBeVisible({ timeout: 5000 });
      await firstDocument.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/documents\/[a-f0-9-]+/);
      
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('text=/PDF|Documento|Document/i').first()).toBeVisible();
    }
  });

  test('MEMBER can view organization documents', async ({ page }) => {
    await login(page, 'member1');
    
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL('/documents');
    await expect(page.locator('h1').filter({ hasText: /Documentos/i }).first()).toBeVisible();
  });
});
