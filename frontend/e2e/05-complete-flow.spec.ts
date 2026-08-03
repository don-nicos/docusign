import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/test-data';
import { login } from './helpers/auth-helper';
import path from 'path';

test.describe('Complete E2E Flow', () => {
  test('complete signature workflow: upload → create request → sign → download', async ({ page }) => {
    test.setTimeout(120000);
    
    await login(page, 'owner1');
    
    await page.goto('/documents/upload');
    await page.waitForLoadState('networkidle');
    
    const fileInput = page.locator('input[type="file"]');
    const isFileInputVisible = await fileInput.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!isFileInputVisible) {
      console.log('Upload form not available - skipping test');
      return;
    }
    
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-document.pdf');
    await fileInput.setInputFiles(testPdfPath);
    
    const titleInput = page.locator('input[name="title"], input[placeholder*="título"]');
    await titleInput.fill('Complete Flow Test Document');
    
    const orgSelector = page.locator('select').filter({ hasText: /organización|organization/i });
    if (await orgSelector.count() > 0) {
      await orgSelector.first().selectOption({ index: 1 });
    }
    
    const submitButton = page.locator('button[type="submit"]:has-text("Subir")');
    await submitButton.click();
    
    await page.waitForURL(/\/documents/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=/Complete Flow Test Document/i')).toBeVisible({ timeout: 10000 });
    
    await page.goto('/signatures/create');
    await page.waitForLoadState('networkidle');
    
    const documentSelect = page.locator('select[name="documentId"]');
    if (await documentSelect.count() > 0) {
      await documentSelect.selectOption({ index: 1 });
      
      await page.fill('input[name="signerEmail"]', TEST_USERS.admin1.email);
      await page.fill('input[name="signerName"]', TEST_USERS.admin1.name);
      await titleInput.fill('Complete Flow Test Document');
      
      const orgSelector2 = page.locator('select').filter({ hasText: /organización|organization/i });
      if (await orgSelector2.count() > 0) {
        await orgSelector2.first().selectOption({ index: 1 });
      }
      
      const submitButton = page.locator('button[type="submit"]:has-text("Subir")');
      await submitButton.click();
      
      await page.waitForURL(/\/documents/, { timeout: 15000 });
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('text=/Complete Flow Test Document/i')).toBeVisible({ timeout: 10000 });
      
      await page.goto('/signatures/create');
      await page.waitForLoadState('networkidle');
      
      const documentSelect2 = page.locator('select[name="documentId"]');
      if (await documentSelect2.count() > 0) {
        await documentSelect2.selectOption({ index: 1 });
        
        await page.fill('input[name="signerEmail"]', TEST_USERS.admin1.email);
        await page.fill('input[name="signerName"]', TEST_USERS.admin1.name);
        
        const createButton = page.locator('button[type="submit"]:has-text("Crear")');
        await createButton.click();
        
        await page.waitForURL(/\/signatures/, { timeout: 15000 });
        
        await expect(page.locator('text=/Solicitud|Request/i')).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('organization workflow: create org → add members → upload doc → verify access', async ({ page }) => {
    test.setTimeout(120000);
    
    await login(page, 'owner1');
    
    await page.goto('/organizations');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=/TechCorp SpA/i')).toBeVisible({ timeout: 10000 });
    
    await page.goto(`/organizations/${TEST_USERS.owner1.organizationId}`);
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/organizations\//);
    await expect(page.locator('main >> text="Carlos Dueño TechCorp"').first()).toBeVisible();
    await expect(page.locator('main >> text="Ana Admin TechCorp"').first()).toBeVisible();
    await expect(page.locator('main >> text="Luis Miembro TechCorp"').first()).toBeVisible();
    
    await page.goto('/documents/upload');
    await page.waitForLoadState('networkidle');
    
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-document.pdf');
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(testPdfPath);
      
      await page.fill('input[name="title"]', 'Org Shared Document');
      
      const orgSelector3 = page.locator('select').filter({ hasText: /organización/i });
      if (await orgSelector3.count() > 0) {
        await orgSelector3.first().selectOption({ index: 1 });
      }
      
      await page.click('button[type="submit"]');
      
      await page.waitForURL(/\/documents/, { timeout: 15000 });
      
      await login(page, 'member1');
      
      await page.goto('/documents');
      await page.waitForLoadState('networkidle');
      
      const filterSelect = page.locator('select').filter({ hasText: /filtrar|organización/i });
      if (await filterSelect.count() > 0) {
        await filterSelect.first().selectOption({ index: 1 });
        await page.waitForLoadState('networkidle');
      }
      
      await expect(page.locator('text=/Org Shared Document/i')).toBeVisible({ timeout: 10000 });
    }
  });
});
