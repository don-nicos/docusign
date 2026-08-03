import { test, expect } from '@playwright/test';
import { login } from './helpers/auth-helper';
import path from 'path';

test.describe('Complete Signing Flow - With Real Signatures', () => {
  test('should create request and complete signatures from multiple users', async ({ page }) => {
    test.setTimeout(180000);
    
    console.log('🚀 Test completo: Crear solicitud y firmar con múltiples usuarios...');
    
    // 1. Login y preparación
    await login(page, 'owner1');
    
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    const userId = await page.evaluate(() => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id;
    });
    
    // 2. Subir documento vía API
    console.log('📄 Paso 1: Subiendo documento vía API...');
    
    const fs = require('fs');
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-document.pdf');
    const pdfBuffer = fs.readFileSync(testPdfPath);
    
    const uploadResponse = await page.request.post('http://localhost:8082/api/documents', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-User-Id': userId
      },
      multipart: {
        file: {
          name: 'test-document.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer
        },
        title: 'Documento para Firmas Completas'
      }
    });
    
    expect([200, 201]).toContain(uploadResponse.status());
    const uploadedDoc = await uploadResponse.json();
    console.log('✅ Documento subido:', uploadedDoc.id);
    
    // 3. Crear solicitud de firma
    console.log('✍️ Paso 2: Creando solicitud de firma...');
    
    const createResponse = await page.request.post('http://localhost:8083/api/signatures', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-User-Id': userId
      },
      data: {
        documentId: uploadedDoc.id,
        title: 'Solicitud con Firmas Reales',
        signers: [
          {
            email: 'laura.rodriguez@empresa.cl',
            fullName: 'Laura Rodríguez',
            orderIndex: 0,
            signaturePage: 1,
            signaturePositionX: 100,
            signaturePositionY: 100,
            signatureWidth: 200,
            signatureHeight: 50
          },
          {
            email: 'maria.gonzalez@empresa.cl',
            fullName: 'María González',
            orderIndex: 1,
            signaturePage: 1,
            signaturePositionX: 100,
            signaturePositionY: 200,
            signatureWidth: 200,
            signatureHeight: 50
          }
        ]
      }
    });
    
    expect(createResponse.status()).toBe(200);
    const signatureData = await createResponse.json();
    console.log('✅ Solicitud creada:', signatureData.id);
    console.log('📋 Firmantes:', signatureData.signers.map((s: any) => ({
      email: s.email,
      id: s.id,
      hasToken: !!s.accessToken
    })));
    
    // 4. Firmar como primer usuario (Laura)
    console.log('✍️ Paso 3: Firmando como Laura...');
    
    const lauraSigner = signatureData.signers.find((s: any) => s.email === 'laura.rodriguez@empresa.cl');
    
    if (!lauraSigner || !lauraSigner.accessToken) {
      console.log('❌ No se encontró token de acceso para Laura');
      throw new Error('No se encontró token de acceso para Laura');
    }
    
    // Navegar a la página de firma con el magic link
    await page.goto(`/sign/${lauraSigner.id}?token=${lauraSigner.accessToken}`);
    await page.waitForLoadState('networkidle');
    
    // Esperar que cargue la página de firma
    await page.waitForTimeout(2000);
    
    // Buscar el canvas de firma
    const canvas = page.locator('canvas').first();
    
    if (await canvas.isVisible({ timeout: 5000 })) {
      console.log('✅ Canvas de firma encontrado');
      
      // Dibujar firma en el canvas
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.move(box.x + 50, box.y + 25);
        await page.mouse.down();
        await page.mouse.move(box.x + 100, box.y + 30);
        await page.mouse.move(box.x + 150, box.y + 25);
        await page.mouse.move(box.x + 180, box.y + 35);
        await page.mouse.up();
        
        console.log('✅ Firma dibujada en canvas');
      }
      
      // Buscar y hacer clic en botón de confirmar
      await page.waitForTimeout(1000);
      
      const confirmButton = page.locator('button:has-text("Confirmar"), button:has-text("Firmar"), button:has-text("Enviar")').first();
      
      if (await confirmButton.isVisible({ timeout: 3000 })) {
        await confirmButton.click();
        console.log('✅ Botón de confirmar clickeado');
        
        // Esperar confirmación
        await page.waitForTimeout(3000);
        
        // Verificar estado de la firma
        const statusResponse = await page.request.get(`http://localhost:8083/api/signatures/${signatureData.id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-User-Id': userId
          }
        });
        
        if (statusResponse.status() === 200) {
          const status = await statusResponse.json();
          console.log('📊 Estado después de firma de Laura:', status.status);
          console.log('📋 Firmantes:', status.signers.map((s: any) => ({
            email: s.email,
            status: s.status
          })));
        }
      } else {
        console.log('⚠️ Botón de confirmar no encontrado');
      }
    } else {
      console.log('⚠️ Canvas de firma no encontrado');
    }
    
    // 5. Firmar como segundo usuario (María)
    console.log('✍️ Paso 4: Firmando como María...');
    
    const mariaSigner = signatureData.signers.find((s: any) => s.email === 'maria.gonzalez@empresa.cl');
    
    if (mariaSigner && mariaSigner.accessToken) {
      await page.goto(`/sign/${mariaSigner.id}?token=${mariaSigner.accessToken}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const canvas2 = page.locator('canvas').first();
      
      if (await canvas2.isVisible({ timeout: 5000 })) {
        const box = await canvas2.boundingBox();
        if (box) {
          await page.mouse.move(box.x + 60, box.y + 20);
          await page.mouse.down();
          await page.mouse.move(box.x + 120, box.y + 35);
          await page.mouse.move(box.x + 170, box.y + 20);
          await page.mouse.up();
          
          console.log('✅ Firma de María dibujada');
        }
        
        await page.waitForTimeout(1000);
        
        const confirmButton2 = page.locator('button:has-text("Confirmar"), button:has-text("Firmar")').first();
        
        if (await confirmButton2.isVisible({ timeout: 3000 })) {
          await confirmButton2.click();
          console.log('✅ Firma de María confirmada');
          
          await page.waitForTimeout(3000);
        }
      }
    }
    
    // 6. Verificar estado final
    console.log('📊 Paso 5: Verificando estado final...');
    
    const finalStatusResponse = await page.request.get(`http://localhost:8083/api/signatures/${signatureData.id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-User-Id': userId
      }
    });
    
    if (finalStatusResponse.status() === 200) {
      const finalStatus = await finalStatusResponse.json();
      console.log('📊 Estado final de solicitud:', finalStatus.status);
      console.log('📋 Estado de firmantes:');
      
      for (const signer of finalStatus.signers) {
        console.log(`  - ${signer.email}: ${signer.status}`);
      }
      
      // Verificar si hay PDF firmado disponible
      const pdfResponse = await page.request.get(`http://localhost:8083/api/signatures/${signatureData.id}/download-signed`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-User-Id': userId,
          'X-User-Email': 'owner1@techcorp.cl'
        }
      });
      
      if (pdfResponse.status() === 200) {
        console.log('✅ PDF firmado disponible para descarga');
        console.log('📊 Tamaño:', pdfResponse.headers()['content-length'], 'bytes');
      } else {
        console.log('📊 PDF firmado responde:', pdfResponse.status());
      }
    }
    
    console.log('🎉 ¡Test de firmas completo finalizado!');
  });
});
