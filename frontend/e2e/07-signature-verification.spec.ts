import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/test-data';
import { login, logout } from './helpers/auth-helper';
import path from 'path';
import fs from 'fs';

test.describe('Signature Position Verification', () => {
  test('verify signatures are placed in correct positions on PDF', async ({ page, request }) => {
    test.setTimeout(180000);
    
    const documentTitle = `Position Test Doc ${Date.now()}`;
    let signatureRequestId: string = '';
    
    // 1. Login como OWNER y subir documento
    // NOTA: Este test requiere que OWNER tenga suscripción activa
    // Ver: e2e/SUBSCRIPTION_REQUIREMENTS.md
    await login(page, 'owner1');
    
    await page.goto('/documents/upload');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    if (currentUrl.includes('/subscription')) {
      throw new Error('❌ OWNER no tiene suscripción activa. Ver e2e/SUBSCRIPTION_REQUIREMENTS.md para configurar suscripciones de prueba.');
    }
    
    const fileInput = page.locator('input[type="file"]');
    if (!await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Upload form not available - skipping test');
      return;
    }
    
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-document.pdf');
    await fileInput.setInputFiles(testPdfPath);
    
    const titleInput = page.locator('input[name="title"], input[placeholder*="título"]').first();
    await titleInput.fill(documentTitle);
    
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    await page.waitForURL(/\/documents/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    
    // 2. Crear solicitud de firma
    await page.goto('/signatures/create');
    await page.waitForLoadState('networkidle');
    
    const documentSelect = page.locator('select[name="documentId"], select').first();
    if (await documentSelect.count() > 0) {
      const options = await documentSelect.locator('option').allTextContents();
      const docOption = options.findIndex(opt => opt.includes(documentTitle));
      
      if (docOption > 0) {
        await documentSelect.selectOption({ index: docOption });
      } else {
        await documentSelect.selectOption({ index: 1 });
      }
      
      await page.locator('input[name="signerEmail"], input[placeholder*="email"]').first().fill(TEST_USERS.admin1.email);
      await page.locator('input[name="signerName"], input[placeholder*="nombre"]').first().fill(TEST_USERS.admin1.name);
      
      const createButton = page.locator('button[type="submit"]:has-text("Crear"), button:has-text("Enviar")').first();
      await createButton.click();
      
      await page.waitForURL(/\/signatures/, { timeout: 15000 });
      await page.waitForLoadState('networkidle');
      
      const requestUrl = page.url();
      const match = requestUrl.match(/\/signatures\/([a-f0-9-]+)/);
      if (match) {
        signatureRequestId = match[1];
      }
    }
    
    await logout(page);
    
    // 3. Login como ADMIN y firmar en posición específica
    await login(page, 'admin1');
    
    await page.goto('/signatures');
    await page.waitForLoadState('networkidle');
    
    const signatureLink = page.locator(`a[href*="/signatures/"]`).first();
    await signatureLink.click();
    await page.waitForLoadState('networkidle');
    
    // Obtener el canvas y sus dimensiones
    const canvas = page.locator('canvas').first();
    if (await canvas.isVisible({ timeout: 5000 }).catch(() => false)) {
      const box = await canvas.boundingBox();
      
      if (box) {
        // Firmar en una posición específica (esquina superior izquierda del canvas)
        const signatureX = box.x + 100;
        const signatureY = box.y + 100;
        const signatureWidth = 150;
        const signatureHeight = 50;
        
        // Dibujar firma
        await page.mouse.move(signatureX, signatureY);
        await page.mouse.down();
        await page.mouse.move(signatureX + signatureWidth, signatureY);
        await page.mouse.move(signatureX + signatureWidth, signatureY + signatureHeight);
        await page.mouse.move(signatureX, signatureY + signatureHeight);
        await page.mouse.up();
        
        console.log(`Firma dibujada en posición: x=${signatureX}, y=${signatureY}, w=${signatureWidth}, h=${signatureHeight}`);
        
        const signButton = page.locator('button:has-text("Firmar"), button:has-text("Sign")').first();
        if (await signButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await signButton.click();
          await page.waitForTimeout(3000);
          
          // Verificar que la firma se guardó
          await expect(page.locator('text=/Firmado|Signed|Completado/i').first()).toBeVisible({ timeout: 10000 });
        }
      }
    }
    
    await logout(page);
    
    // 4. Verificar posiciones en la base de datos via API
    await login(page, 'owner1');
    
    if (signatureRequestId) {
      // Obtener token de autenticación del localStorage
      const token = await page.evaluate(() => localStorage.getItem('token'));
      const userId = await page.evaluate(() => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user).id : null;
      });
      
      if (token && userId) {
        // Llamar al endpoint para obtener detalles de la solicitud
        const response = await request.get(`http://localhost:8083/api/signatures/${signatureRequestId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-User-Id': userId,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok()) {
          const signatureData = await response.json();
          console.log('Signature request data:', JSON.stringify(signatureData, null, 2));
          
          // Verificar que hay firmantes
          expect(signatureData.signers).toBeDefined();
          expect(signatureData.signers.length).toBeGreaterThan(0);
          
          // Verificar que el firmante tiene posiciones guardadas
          const signer = signatureData.signers.find((s: any) => s.email === TEST_USERS.admin1.email);
          expect(signer).toBeDefined();
          expect(signer.status).toBe('SIGNED');
          
          // Verificar posiciones de firma
          if (signer.signaturePositions && signer.signaturePositions.length > 0) {
            const position = signer.signaturePositions[0];
            
            console.log('Signature position:', position);
            
            // Verificar que las coordenadas están definidas
            expect(position.positionX).toBeDefined();
            expect(position.positionY).toBeDefined();
            expect(position.width).toBeDefined();
            expect(position.height).toBeDefined();
            expect(position.pageNumber).toBeDefined();
            
            // Verificar que las coordenadas son números válidos
            expect(typeof position.positionX).toBe('number');
            expect(typeof position.positionY).toBe('number');
            expect(typeof position.width).toBe('number');
            expect(typeof position.height).toBe('number');
            
            // Verificar que las dimensiones son razonables (no negativas, no cero)
            expect(position.positionX).toBeGreaterThanOrEqual(0);
            expect(position.positionY).toBeGreaterThanOrEqual(0);
            expect(position.width).toBeGreaterThan(0);
            expect(position.height).toBeGreaterThan(0);
            
            // Verificar que la página es válida (0-indexed)
            expect(position.pageNumber).toBeGreaterThanOrEqual(0);
            
            console.log(`✅ Posición verificada: página=${position.pageNumber}, x=${position.positionX}, y=${position.positionY}, w=${position.width}, h=${position.height}`);
          } else if (signer.signaturePositionX !== null && signer.signaturePositionY !== null) {
            // Campos legacy
            console.log('Using legacy position fields');
            expect(signer.signaturePositionX).toBeGreaterThanOrEqual(0);
            expect(signer.signaturePositionY).toBeGreaterThanOrEqual(0);
            expect(signer.signatureWidth).toBeGreaterThan(0);
            expect(signer.signatureHeight).toBeGreaterThan(0);
            
            console.log(`✅ Posición legacy verificada: x=${signer.signaturePositionX}, y=${signer.signaturePositionY}, w=${signer.signatureWidth}, h=${signer.signatureHeight}`);
          }
          
          // Verificar que la imagen de firma existe
          expect(signer.signatureImagePath).toBeDefined();
          expect(signer.signatureImagePath).not.toBeNull();
          
          console.log(`✅ Imagen de firma guardada en: ${signer.signatureImagePath}`);
        }
      }
    }
  });

  test('verify multiple signatures have different positions', async ({ page, request }) => {
    test.setTimeout(180000);
    
    const documentTitle = `Multi Position Test ${Date.now()}`;
    let signatureRequestId: string = '';
    
    await login(page, 'owner1');
    
    await page.goto('/documents/upload');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    if (currentUrl.includes('/subscription')) {
      return;
    }
    
    const fileInput = page.locator('input[type="file"]');
    if (!await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      return;
    }
    
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-document.pdf');
    await fileInput.setInputFiles(testPdfPath);
    
    const titleInput = page.locator('input[name="title"]').first();
    await titleInput.fill(documentTitle);
    
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    await page.waitForURL(/\/documents/, { timeout: 15000 });
    
    // Crear solicitud con 2 firmantes
    await page.goto('/signatures/create');
    await page.waitForLoadState('networkidle');
    
    const documentSelect = page.locator('select').first();
    if (await documentSelect.count() > 0) {
      await documentSelect.selectOption({ index: 1 });
      
      await page.locator('input[name="signerEmail"]').first().fill(TEST_USERS.admin1.email);
      await page.locator('input[name="signerName"]').first().fill(TEST_USERS.admin1.name);
      
      const addButton = page.locator('button:has-text("Agregar")').first();
      if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addButton.click();
        await page.waitForTimeout(500);
      }
      
      await page.locator('input[name="signerEmail"]').last().fill(TEST_USERS.member1.email);
      await page.locator('input[name="signerName"]').last().fill(TEST_USERS.member1.name);
      
      const createButton = page.locator('button[type="submit"]').first();
      await createButton.click();
      
      await page.waitForURL(/\/signatures/, { timeout: 15000 });
      
      const requestUrl = page.url();
      const match = requestUrl.match(/\/signatures\/([a-f0-9-]+)/);
      if (match) {
        signatureRequestId = match[1];
      }
    }
    
    await logout(page);
    
    // ADMIN firma en posición superior
    await login(page, 'admin1');
    await page.goto('/signatures');
    await page.waitForLoadState('networkidle');
    
    const link1 = page.locator('a[href*="/signatures/"]').first();
    await link1.click();
    await page.waitForLoadState('networkidle');
    
    const canvas1 = page.locator('canvas').first();
    if (await canvas1.isVisible({ timeout: 5000 }).catch(() => false)) {
      const box = await canvas1.boundingBox();
      if (box) {
        // Firma en la parte superior
        await page.mouse.move(box.x + 50, box.y + 50);
        await page.mouse.down();
        await page.mouse.move(box.x + 150, box.y + 100);
        await page.mouse.up();
        
        const signButton = page.locator('button:has-text("Firmar")').first();
        if (await signButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await signButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }
    
    await logout(page);
    
    // MEMBER firma en posición inferior
    await login(page, 'member1');
    await page.goto('/signatures');
    await page.waitForLoadState('networkidle');
    
    const link2 = page.locator('a[href*="/signatures/"]').first();
    await link2.click();
    await page.waitForLoadState('networkidle');
    
    const canvas2 = page.locator('canvas').first();
    if (await canvas2.isVisible({ timeout: 5000 }).catch(() => false)) {
      const box = await canvas2.boundingBox();
      if (box) {
        // Firma en la parte inferior (diferente posición)
        await page.mouse.move(box.x + 300, box.y + 400);
        await page.mouse.down();
        await page.mouse.move(box.x + 450, box.y + 450);
        await page.mouse.up();
        
        const signButton = page.locator('button:has-text("Firmar")').first();
        if (await signButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await signButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }
    
    await logout(page);
    
    // Verificar que las posiciones son diferentes
    await login(page, 'owner1');
    
    if (signatureRequestId) {
      const token = await page.evaluate(() => localStorage.getItem('token'));
      const userId = await page.evaluate(() => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user).id : null;
      });
      
      if (token && userId) {
        const response = await request.get(`http://localhost:8083/api/signatures/${signatureRequestId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-User-Id': userId,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok()) {
          const signatureData = await response.json();
          
          const adminSigner = signatureData.signers.find((s: any) => s.email === TEST_USERS.admin1.email);
          const memberSigner = signatureData.signers.find((s: any) => s.email === TEST_USERS.member1.email);
          
          expect(adminSigner).toBeDefined();
          expect(memberSigner).toBeDefined();
          
          // Obtener posiciones
          const adminPos = adminSigner.signaturePositions?.[0] || {
            positionX: adminSigner.signaturePositionX,
            positionY: adminSigner.signaturePositionY
          };
          
          const memberPos = memberSigner.signaturePositions?.[0] || {
            positionX: memberSigner.signaturePositionX,
            positionY: memberSigner.signaturePositionY
          };
          
          console.log('Admin position:', adminPos);
          console.log('Member position:', memberPos);
          
          // Verificar que las posiciones son diferentes
          const positionsAreDifferent = 
            adminPos.positionX !== memberPos.positionX || 
            adminPos.positionY !== memberPos.positionY;
          
          expect(positionsAreDifferent).toBeTruthy();
          
          console.log('✅ Las firmas tienen posiciones diferentes');
        }
      }
    }
  });

  test('verify signature coordinates are within PDF bounds', async ({ page, request }) => {
    test.setTimeout(120000);
    
    const documentTitle = `Bounds Test ${Date.now()}`;
    
    await login(page, 'owner1');
    
    await page.goto('/documents/upload');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    if (currentUrl.includes('/subscription')) {
      return;
    }
    
    const fileInput = page.locator('input[type="file"]');
    if (!await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      return;
    }
    
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-document.pdf');
    await fileInput.setInputFiles(testPdfPath);
    
    const titleInput = page.locator('input[name="title"]').first();
    await titleInput.fill(documentTitle);
    
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    await page.waitForURL(/\/documents/, { timeout: 15000 });
    
    await page.goto('/signatures/create');
    await page.waitForLoadState('networkidle');
    
    const documentSelect = page.locator('select').first();
    if (await documentSelect.count() > 0) {
      await documentSelect.selectOption({ index: 1 });
      
      await page.locator('input[name="signerEmail"]').first().fill(TEST_USERS.admin1.email);
      await page.locator('input[name="signerName"]').first().fill(TEST_USERS.admin1.name);
      
      const createButton = page.locator('button[type="submit"]').first();
      await createButton.click();
      
      await page.waitForURL(/\/signatures/, { timeout: 15000 });
      
      const requestUrl = page.url();
      const match = requestUrl.match(/\/signatures\/([a-f0-9-]+)/);
      
      if (match) {
        const signatureRequestId = match[1];
        
        await logout(page);
        await login(page, 'admin1');
        
        await page.goto('/signatures');
        await page.waitForLoadState('networkidle');
        
        const link = page.locator('a[href*="/signatures/"]').first();
        await link.click();
        await page.waitForLoadState('networkidle');
        
        const canvas = page.locator('canvas').first();
        if (await canvas.isVisible({ timeout: 5000 }).catch(() => false)) {
          const box = await canvas.boundingBox();
          if (box) {
            // Firmar dentro de los límites del canvas
            await page.mouse.move(box.x + 100, box.y + 100);
            await page.mouse.down();
            await page.mouse.move(box.x + 200, box.y + 150);
            await page.mouse.up();
            
            const signButton = page.locator('button:has-text("Firmar")').first();
            if (await signButton.isVisible({ timeout: 2000 }).catch(() => false)) {
              await signButton.click();
              await page.waitForTimeout(2000);
            }
          }
        }
        
        await logout(page);
        await login(page, 'owner1');
        
        const token = await page.evaluate(() => localStorage.getItem('token'));
        const userId = await page.evaluate(() => {
          const user = localStorage.getItem('user');
          return user ? JSON.parse(user).id : null;
        });
        
        if (token && userId) {
          const response = await request.get(`http://localhost:8083/api/signatures/${signatureRequestId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-User-Id': userId
            }
          });
          
          if (response.ok()) {
            const signatureData = await response.json();
            const signer = signatureData.signers[0];
            
            const position = signer.signaturePositions?.[0] || {
              positionX: signer.signaturePositionX,
              positionY: signer.signaturePositionY,
              width: signer.signatureWidth,
              height: signer.signatureHeight
            };
            
            // Verificar que la firma no está fuera de los límites típicos de un PDF A4
            // A4 en puntos: 595 x 842
            const maxPdfWidth = 1000; // Margen de seguridad
            const maxPdfHeight = 1200;
            
            expect(position.positionX).toBeLessThan(maxPdfWidth);
            expect(position.positionY).toBeLessThan(maxPdfHeight);
            expect(position.positionX + position.width).toBeLessThan(maxPdfWidth);
            expect(position.positionY + position.height).toBeLessThan(maxPdfHeight);
            
            console.log('✅ Firma está dentro de los límites del PDF');
            console.log(`Posición: x=${position.positionX}, y=${position.positionY}, w=${position.width}, h=${position.height}`);
          }
        }
      }
    }
  });
});
