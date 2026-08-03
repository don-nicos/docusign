import { Page } from '@playwright/test';

/**
 * Verifica si el usuario tiene una suscripción activa
 * @param page - Página de Playwright
 * @returns true si tiene suscripción activa, false si no
 */
export async function hasActiveSubscription(page: Page): Promise<boolean> {
  try {
    // Ver todo el contenido de localStorage
    const localStorageContent = await page.evaluate(() => {
      const data: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key) || '';
        }
      }
      return data;
    });
    console.log('localStorage content:', localStorageContent);
    
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const userId = await page.evaluate(() => {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user).id : null;
    });
    
    // Por ahora, usar una organización por defecto si no hay defaultOrganizationId
    const organizationId = await page.evaluate(() => {
      const user = localStorage.getItem('user');
      if (user) {
        const parsed = JSON.parse(user);
        return parsed.defaultOrganizationId || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; // TechCorp por defecto
      }
      return 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    });

    console.log('Auth data check:', { hasToken: !!token, hasUserId: !!userId, hasOrgId: !!organizationId, userId, organizationId });

    if (!token || !userId) {
      console.log('Missing auth data:', { hasToken: !!token, hasUserId: !!userId });
      return false;
    }

    const response = await page.request.get('http://localhost:8085/api/payments/subscriptions/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-User-Id': userId,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok()) {
      console.log('Subscription check failed:', response.status());
      return false;
    }

    const data = await response.json();
    console.log('Subscription data:', data);
    return data && data.subscription && data.subscription.status === 'ACTIVE';
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
}

/**
 * Verifica si la organización tiene una suscripción activa
 * @param page - Página de Playwright
 * @param organizationId - ID de la organización (opcional, usa la default del usuario)
 * @returns true si la organización tiene suscripción activa
 */
export async function organizationHasActiveSubscription(
  page: Page,
  organizationId?: string
): Promise<boolean> {
  try {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const userId = await page.evaluate(() => {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user).id : null;
    });

    if (!token || !userId) {
      return false;
    }

    // Si no se proporciona organizationId, usar la default del usuario
    if (!organizationId) {
      organizationId = await page.evaluate(() => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user).defaultOrganizationId : null;
      });
    }

    if (!organizationId) {
      return false;
    }

    const response = await fetch('http://localhost:8085/api/subscriptions/my-subscription', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-User-Id': userId,
        'X-Organization-Id': organizationId,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return false;
    }

    const subscription = await response.json();
    return subscription && subscription.status === 'ACTIVE';
  } catch (error) {
    console.error('Error checking organization subscription:', error);
    return false;
  }
}

/**
 * Verifica si el usuario puede subir documentos (tiene suscripción activa)
 * @param page - Página de Playwright
 * @returns true si puede subir documentos
 */
export async function canUploadDocuments(page: Page): Promise<boolean> {
  return await hasActiveSubscription(page);
}

/**
 * Verifica si el usuario puede crear solicitudes de firma (tiene suscripción activa)
 * @param page - Página de Playwright
 * @returns true si puede crear solicitudes de firma
 */
export async function canCreateSignatureRequests(page: Page): Promise<boolean> {
  return await hasActiveSubscription(page);
}

/**
 * Obtiene información de la suscripción del usuario
 * @param page - Página de Playwright
 * @returns Objeto con información de la suscripción o null
 */
export async function getSubscriptionInfo(page: Page): Promise<any | null> {
  try {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const userId = await page.evaluate(() => {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user).id : null;
    });

    if (!token || !userId) {
      return null;
    }

    const response = await fetch('http://localhost:8085/api/subscriptions/my-subscription', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-User-Id': userId,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting subscription info:', error);
    return null;
  }
}
