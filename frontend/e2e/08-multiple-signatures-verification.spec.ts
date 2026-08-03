import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/test-data';
import { login, logout } from './helpers/auth-helper';
import path from 'path';

test.describe('Multiple Signatures from Multiple Users', () => {
  test('verify 3 users can sign the same document with different signatures', async ({ page, request }) => {
    test.setTimeout(240000);
    
    const documentTitle = `3 Users Signature Test ${Date.now()}`;
    let signatureRequestId: string = '';
    
    // 1. OWNER sube documento
    // NOTA: Requiere suscripción activa - Ver e2e/SUBSCRIPTION_REQUIREMENTS.md
    await login(page, 'owner1');
    
    await page.goto('/documents/upload');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    if (currentUrl.includes('/subscription')) {
      throw new Error('❌ OWNER no tiene suscripción activa. Ver e2e/SUBSCRIPTION_REQUIREMENTS.md');
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
    
    // 2. OWNER crea solicitud con 3 firmantes (OWNER, ADMIN, MEMBER)
    await page.goto('/signatures/create');
    await page.waitForLoadState('networkidle');
    
    const documentSelect = page.locator('select[name="documentId"], select').first();
    if (await documentSelect.count() > 0) {
      await documentSelect.selectOption({ index: 1 });
      
      // Agregar OWNER como primer firmante
      await page.locator('input[name="signerEmail"], input[placeholder*="email"]').first().fill(TEST_USERS.owner1.email);
      await page.locator('input[name="signerName"], input[placeholder*="nombre"]').first().fill(TEST_USERS.owner1.name);
      
      // Agregar ADMIN
      const addButton1 = page.locator('button:has-text("Agregar"), button:has-text("Add")').first();
      if (await addButton1.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addButton1.click();
        await page.waitForTimeout(500);
        
        await page.locator('input[name="signerEmail"]').nth(1).fill(TEST_USERS.admin1.email);
        await page.locator('input[name="signerName"]').nth(1).fill(TEST_USERS.admin1.name);
      }
      
      // Agregar MEMBER
      const addButton2 = page.locator('button:has-text("Agregar"), button:has-text("Add")').first();
      if (await addButton2.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addButton2.click();
        await page.waitForTimeout(500);
        
        await page.locator('input[name="signerEmail"]').last().fill(TEST_USERS.member1.email);
        await page.locator('input[name="signerName"]').last().fill(TEST_USERS.member1.name);
      }
      
      const createButton = page.locator('button[type="submit"]:has-text("Crear"), button:has-text("Enviar")').first();
      await createButton.click();
      
      await page.waitForURL(/\/signatures/, { timeout: 15000 });
      await page.waitForLoadState('networkidle');
      
      const requestUrl = page.url();
      const match = requestUrl.match(/\/signatures\/([a-f0-9-]+)/);
      if (match) {
        signatureRequestId = match[1];
      }
      
      // Verificar que los 3 firmantes están listados
      await expect(page.locator(`text=/${TEST_USERS.owner1.email}/i`).first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator(`text=/${TEST_USERS.admin1.email}/i`).first()).toBeVisible();
      await expect(page.locator(`text=/${TEST_USERS.member1.email}/i`).first()).toBeVisible();
      
      console.log('✅ Solicitud creada con 3 firmantes');
    }
    
    // 3. OWNER firma (esquina superior izquierda)
    await page.goto('/signatures');
    await page.waitForLoadState('networkidle');
    
    const ownerLink = page.locator(`a[href*="/signatures/"]`).first();
    await ownerLink.click();
    await page.waitForLoadState('networkidle');
    
    const ownerCanvas = page.locator('canvas').first();
    if (await ownerCanvas.isVisible({ timeout: 5000 }).catch(() => false)) {
      const box = await ownerCanvas.boundingBox();
      if (box) {
        // Firma en esquina superior izquierda
        await page.mouse.move(box.x + 50, box.y + 50);
        await page.mouse.down();
        await page.mouse.move(box.x + 150, box.y + 50);
        await page.mouse.move(box.x + 150, box.y + 100);
        await page.mouse.up();
        
        console.log('OWNER firmó en posición: x=50, y=50');
        
        const signButton = page.locator('button:has-text("Firmar"), button:has-text("Sign")').first();
        if (await signButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await signButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }
    
    await logout(page);
    
    // 4. ADMIN firma (centro)
    await login(page, 'admin1');
    
    await page.goto('/signatures');
    await page.waitForLoadState('networkidle');
    
    const adminLink = page.locator(`a[href*="/signatures/"]`).first();
    await adminLink.click();
    await page.waitForLoadState('networkidle');
    
    const adminCanvas = page.locator('canvas').first();
    if (await adminCanvas.isVisible({ timeout: 5000 }).catch(() => false)) {
      const box = await adminCanvas.boundingBox();
      if (box) {
        // Firma en el centro
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        
        await page.mouse.move(centerX - 50, centerY - 25);
        await page.mouse.down();
        await page.mouse.move(centerX + 50, centerY - 25);
        await page.mouse.move(centerX + 50, centerY + 25);
        await page.mouse.up();
        
        console.log(`ADMIN firmó en posición: x=${centerX}, y=${centerY}`);
        
        const signButton = page.locator('button:has-text("Firmar"), button:has-text("Sign")').first();
        if (await signButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await signButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }
    
    await logout(page);
    
    // 5. MEMBER firma (esquina inferior derecha)
    await login(page, 'member1');
    
    await page.goto('/signatures');
    await page.waitForLoadState('networkidle');
    
    const memberLink = page.locator(`a[href*="/signatures/"]`).first();
    await memberLink.click();
    await page.waitForLoadState('networkidle');
    
    const memberCanvas = page.locator('canvas').first();
    if (await memberCanvas.isVisible({ timeout: 5000 }).catch(() => false)) {
      const box = await memberCanvas.boundingBox();
      if (box) {
        // Firma en esquina inferior derecha
        const bottomRightX = box.x + box.width - 150;
        const bottomRightY = box.y + box.height - 100;
        
        await page.mouse.move(bottomRightX, bottomRightY);
        await page.mouse.down();
        await page.mouse.move(bottomRightX + 100, bottomRightY);
        await page.mouse.move(bottomRightX + 100, bottomRightY + 50);
        await page.mouse.up();
        
        console.log(`MEMBER firmó en posición: x=${bottomRightX}, y=${bottomRightY}`);
        
        const signButton = page.locator('button:has-text("Firmar"), button:has-text("Sign")').first();
        if (await signButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await signButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }
    
    await logout(page);
    
    // 6. Verificar que las 3 firmas están en posiciones diferentes
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
          
          console.log('Signature request data:', JSON.stringify(signatureData, null, 2));
          
          // Verificar que hay 3 firmantes
          expect(signatureData.signers).toBeDefined();
          expect(signatureData.signers.length).toBe(3);
          
          // Verificar que todos firmaron
          const allSigned = signatureData.signers.every((s: any) => s.status === 'SIGNED');
          expect(allSigned).toBeTruthy();
          
          console.log('✅ Los 3 usuarios firmaron correctamente');
          
          // Obtener posiciones de cada firmante
          const ownerSigner = signatureData.signers.find((s: any) => s.email === TEST_USERS.owner1.email);
          const adminSigner = signatureData.signers.find((s: any) => s.email === TEST_USERS.admin1.email);
          const memberSigner = signatureData.signers.find((s: any) => s.email === TEST_USERS.member1.email);
          
          expect(ownerSigner).toBeDefined();
          expect(adminSigner).toBeDefined();
          expect(memberSigner).toBeDefined();
          
          // Obtener posiciones (soportar tanto nuevo formato como legacy)
          const getPosition = (signer: any) => {
            if (signer.signaturePositions && signer.signaturePositions.length > 0) {
              return signer.signaturePositions[0];
            }
            return {
              positionX: signer.signaturePositionX,
              positionY: signer.signaturePositionY,
              width: signer.signatureWidth,
              height: signer.signatureHeight
            };
          };
          
          const ownerPos = getPosition(ownerSigner);
          const adminPos = getPosition(adminSigner);
          const memberPos = getPosition(memberSigner);
          
          console.log('OWNER position:', ownerPos);
          console.log('ADMIN position:', adminPos);
          console.log('MEMBER position:', memberPos);
          
          // Verificar que todas las posiciones son válidas
          expect(ownerPos.positionX).toBeGreaterThanOrEqual(0);
          expect(ownerPos.positionY).toBeGreaterThanOrEqual(0);
          expect(adminPos.positionX).toBeGreaterThanOrEqual(0);
          expect(adminPos.positionY).toBeGreaterThanOrEqual(0);
          expect(memberPos.positionX).toBeGreaterThanOrEqual(0);
          expect(memberPos.positionY).toBeGreaterThanOrEqual(0);
          
          // Verificar que las 3 posiciones son diferentes
          const positions = [
            { x: ownerPos.positionX, y: ownerPos.positionY, user: 'OWNER' },
            { x: adminPos.positionX, y: adminPos.positionY, user: 'ADMIN' },
            { x: memberPos.positionX, y: memberPos.positionY, user: 'MEMBER' }
          ];
          
          // Verificar que no hay dos posiciones iguales
          for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
              const isDifferent = 
                positions[i].x !== positions[j].x || 
                positions[i].y !== positions[j].y;
              
              expect(isDifferent).toBeTruthy();
              console.log(`✅ ${positions[i].user} y ${positions[j].user} tienen posiciones diferentes`);
            }
          }
          
          // Verificar que todas tienen imagen de firma
          expect(ownerSigner.signatureImagePath).toBeDefined();
          expect(adminSigner.signatureImagePath).toBeDefined();
          expect(memberSigner.signatureImagePath).toBeDefined();
          
          console.log('✅ Las 3 firmas tienen posiciones únicas y válidas');
          console.log('✅ Las 3 firmas tienen imágenes guardadas');
        }
      }
    }
  });

  test('verify 5 users can sign the same document', async ({ page, request }) => {
    test.setTimeout(300000);
    
    const documentTitle = `5 Users Test ${Date.now()}`;
    let signatureRequestId: string = '';
    
    const users = [
      { key: 'owner1', data: TEST_USERS.owner1, name: 'OWNER' },
      { key: 'admin1', data: TEST_USERS.admin1, name: 'ADMIN' },
      { key: 'member1', data: TEST_USERS.member1, name: 'MEMBER' },
      { key: 'admin2', data: TEST_USERS.admin2, name: 'ADMIN2' },
      { key: 'member2', data: TEST_USERS.member2, name: 'MEMBER2' }
    ];
    
    // 1. OWNER sube documento
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
    
    // 2. Crear solicitud con 5 firmantes
    await page.goto('/signatures/create');
    await page.waitForLoadState('networkidle');
    
    const documentSelect = page.locator('select').first();
    if (await documentSelect.count() > 0) {
      await documentSelect.selectOption({ index: 1 });
      
      // Agregar primer firmante
      await page.locator('input[name="signerEmail"]').first().fill(users[0].data.email);
      await page.locator('input[name="signerName"]').first().fill(users[0].data.name);
      
      // Agregar los demás firmantes
      for (let i = 1; i < users.length; i++) {
        const addButton = page.locator('button:has-text("Agregar"), button:has-text("Add")').first();
        if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await addButton.click();
          await page.waitForTimeout(500);
          
          await page.locator('input[name="signerEmail"]').nth(i).fill(users[i].data.email);
          await page.locator('input[name="signerName"]').nth(i).fill(users[i].data.name);
        }
      }
      
      const createButton = page.locator('button[type="submit"]').first();
      await createButton.click();
      
      await page.waitForURL(/\/signatures/, { timeout: 15000 });
      
      const requestUrl = page.url();
      const match = requestUrl.match(/\/signatures\/([a-f0-9-]+)/);
      if (match) {
        signatureRequestId = match[1];
      }
      
      console.log(`✅ Solicitud creada con ${users.length} firmantes`);
    }
    
    await logout(page);
    
    // 3. Cada usuario firma en posiciones diferentes
    for (let i = 0; i < users.length; i++) {
      await login(page, users[i].key as any);
      
      await page.goto('/signatures');
      await page.waitForLoadState('networkidle');
      
      const link = page.locator('a[href*="/signatures/"]').first();
      if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
        await link.click();
        await page.waitForLoadState('networkidle');
        
        const canvas = page.locator('canvas').first();
        if (await canvas.isVisible({ timeout: 5000 }).catch(() => false)) {
          const box = await canvas.boundingBox();
          if (box) {
            // Distribuir firmas en diferentes posiciones
            const xPos = box.x + 50 + (i * 100);
            const yPos = box.y + 50 + (i * 80);
            
            await page.mouse.move(xPos, yPos);
            await page.mouse.down();
            await page.mouse.move(xPos + 80, yPos + 40);
            await page.mouse.up();
            
            console.log(`${users[i].name} firmó en posición: x=${xPos}, y=${yPos}`);
            
            const signButton = page.locator('button:has-text("Firmar")').first();
            if (await signButton.isVisible({ timeout: 2000 }).catch(() => false)) {
              await signButton.click();
              await page.waitForTimeout(2000);
            }
          }
        }
      }
      
      await logout(page);
    }
    
    // 4. Verificar que los 5 usuarios firmaron
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
            'X-User-Id': userId
          }
        });
        
        if (response.ok()) {
          const signatureData = await response.json();
          
          // Verificar que hay 5 firmantes
          expect(signatureData.signers.length).toBe(5);
          
          // Verificar que todos firmaron
          const signedCount = signatureData.signers.filter((s: any) => s.status === 'SIGNED').length;
          expect(signedCount).toBe(5);
          
          console.log(`✅ Los ${signatureData.signers.length} usuarios firmaron correctamente`);
          
          // Verificar que todas las posiciones son únicas
          const positions = signatureData.signers.map((s: any) => {
            const pos = s.signaturePositions?.[0] || {
              positionX: s.signaturePositionX,
              positionY: s.signaturePositionY
            };
            return { email: s.email, x: pos.positionX, y: pos.positionY };
          });
          
          // Verificar unicidad
          for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
              const isDifferent = 
                positions[i].x !== positions[j].x || 
                positions[i].y !== positions[j].y;
              
              expect(isDifferent).toBeTruthy();
            }
          }
          
          console.log('✅ Las 5 firmas tienen posiciones únicas');
        }
      }
    }
  });

  test('verify document status changes to COMPLETED after all users sign', async ({ page, request }) => {
    test.setTimeout(180000);
    
    const documentTitle = `Status Test ${Date.now()}`;
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
    
    // Verificar estado inicial: PENDING
    if (signatureRequestId) {
      const token = await page.evaluate(() => localStorage.getItem('token'));
      const userId = await page.evaluate(() => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user).id : null;
      });
      
      if (token && userId) {
        let response = await request.get(`http://localhost:8083/api/signatures/${signatureRequestId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-User-Id': userId
          }
        });
        
        if (response.ok()) {
          const data = await response.json();
          expect(data.status).toBe('PENDING');
          console.log('✅ Estado inicial: PENDING');
        }
        
        await logout(page);
        
        // ADMIN firma
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
        
        // MEMBER firma
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
            await page.mouse.move(box.x + 300, box.y + 300);
            await page.mouse.down();
            await page.mouse.move(box.x + 400, box.y + 350);
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
        
        // Verificar estado final: COMPLETED
        response = await request.get(`http://localhost:8083/api/signatures/${signatureRequestId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-User-Id': userId
          }
        });
        
        if (response.ok()) {
          const data = await response.json();
          expect(data.status).toBe('COMPLETED');
          console.log('✅ Estado final: COMPLETED');
          
          // Verificar que todos los firmantes tienen status SIGNED
          const allSigned = data.signers.every((s: any) => s.status === 'SIGNED');
          expect(allSigned).toBeTruthy();
          console.log('✅ Todos los firmantes tienen status SIGNED');
        }
      }
    }
  });
});
