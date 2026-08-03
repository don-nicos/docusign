import { Page } from '@playwright/test';
import { TEST_USERS } from './test-data';

export async function login(page: Page, userKey: keyof typeof TEST_USERS) {
  const user = TEST_USERS[userKey];
  
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');
  
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  
  await page.click('button[type="submit"]');
  
  await page.waitForURL('/dashboard', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

export async function logout(page: Page) {
  const logoutButton = page.locator('button:has-text("Cerrar sesión"), button:has-text("Logout")');
  
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForURL('/auth/login', { timeout: 5000 });
  }
}

export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector('text=/Bienvenido|Dashboard|Documentos/i', { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
