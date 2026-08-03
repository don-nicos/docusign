import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/test-data';
import { login } from './helpers/auth-helper';

test.describe('Organization Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'owner1');
  });

  test('should display organizations page', async ({ page }) => {
    await page.goto('/organizations');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=/Organizaciones|Organizations/i')).toBeVisible();
  });

  test('should list user organizations', async ({ page }) => {
    await page.goto('/organizations');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=/TechCorp SpA/i')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/OWNER/i')).toBeVisible();
  });

  test('should navigate to organization detail page', async ({ page }) => {
    await page.goto('/organizations');
    await page.waitForLoadState('networkidle');
    
    const adminButton = page.locator('button:has-text("Administrar"), a:has-text("Administrar")').first();
    await adminButton.click();
    
    await page.waitForURL(/\/organizations\/[a-f0-9-]+/, { timeout: 5000 });
    
    await expect(page.locator('text=/Miembros|Members/i')).toBeVisible();
  });

  test('should display organization members', async ({ page }) => {
    await login(page, 'owner1');
    
    await page.goto(`/organizations/${TEST_USERS.owner1.organizationId}`);
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/organizations\//);
    
    await expect(page.locator('text=/Carlos Dueño TechCorp/i').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/Ana Admin TechCorp/i').first()).toBeVisible();
    await expect(page.locator('text=/Luis Miembro TechCorp/i').first()).toBeVisible();
    
    await expect(page.locator('text=/OWNER/i').first()).toBeVisible();
    await expect(page.locator('text=/ADMIN/i').first()).toBeVisible();
    await expect(page.locator('text=/MEMBER/i').first()).toBeVisible();
  });

  test('OWNER should see add member form', async ({ page }) => {
    await login(page, 'owner1');
    
    await page.goto(`/organizations/${TEST_USERS.owner1.organizationId}`);
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/organizations\//);
    
    await expect(page.locator('input[type="email"], input[placeholder*="email"], input[placeholder*="Email"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Agregar"), button:has-text("Invitar"), button:has-text("Add")').first()).toBeVisible();
  });

  test('ADMIN should see limited add member form', async ({ page }) => {
    await login(page, 'admin1');
    
    await page.goto(`/organizations/${TEST_USERS.admin1.organizationId}`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=/Agregar|Add/i')).toBeVisible();
  });

  test('MEMBER should not see organization admin page', async ({ page }) => {
    await login(page, 'member1');
    
    await page.goto('/organizations');
    await page.waitForLoadState('networkidle');
    
    const adminButton = page.locator('button:has-text("Administrar")');
    await expect(adminButton).not.toBeVisible();
  });

  test('should create new organization', async ({ page }) => {
    await login(page, 'owner1');
    
    await page.goto('/organizations');
    await page.waitForLoadState('networkidle');
    
    const initialOrgs = await page.locator('text=/TechCorp|InnoSoft/i').count();
    
    const createButton = page.locator('button:has-text("Crear"), a:has-text("Nueva"), button:has-text("Nueva")');
    
    if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(1000);
      
      const nameInput = page.locator('input[name="name"], input[placeholder*="nombre"], input[placeholder*="Nombre"]').first();
      
      await expect(nameInput).toBeVisible({ timeout: 5000 });
      
      await nameInput.fill('Test Organization E2E');
      await page.fill('input[name="taxId"], input[placeholder*="RUT"]', '12.345.678-9');
      
      const submitButton = page.locator('button[type="submit"]:has-text("Crear"), button:has-text("Guardar")');
      await submitButton.click();
      
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=/Test Organization E2E/i')).toBeVisible({ timeout: 5000 });
      
      const finalOrgs = await page.locator('text=/TechCorp|InnoSoft|Test Organization/i').count();
      expect(finalOrgs).toBeGreaterThan(initialOrgs);
    }
  });
});
