import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/test-data';
import { login, logout } from './helpers/auth-helper';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should login successfully with OWNER credentials', async ({ page }) => {
    const user = TEST_USERS.owner1;
    
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('nav')).toBeVisible({ timeout: 5000 });
  });

  test('should login successfully with ADMIN credentials', async ({ page }) => {
    await login(page, 'admin1');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should login successfully with MEMBER credentials', async ({ page }) => {
    await login(page, 'member1');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'WrongPassword123!');
    
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should logout successfully', async ({ page }) => {
    await login(page, 'owner1');
    
    await logout(page);
    
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should persist session after page reload', async ({ page }) => {
    await login(page, 'owner1');
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('nav')).toBeVisible({ timeout: 5000 });
  });
});
