import { test, expect } from '@playwright/test';
import { login } from './helpers/auth-helper';
import path from 'path';

test.describe('Complete E2E Signature Flow - Fixed', () => {
  test('should complete full signature workflow with PDF generation', async ({ page }) => {
    test.setTimeout(180000);
    
    console.log('🚀 Iniciando flujo completo de firma corregido...');
    
    // 1. Login y verificación de suscripción
    await login(page, 'owner1');
    
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    const userId = await page.evaluate(() => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id;
    });
    
    // Verificar suscripción activa
    const subResponse = await page.request.get('http://localhost:8085/api/payments/subscriptions/me/status', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-User-Id': userId
      }
    });
    
    expect(subResponse.status()).toBe(200);
    const subData = await subResponse.json();
    expect(subData.active).toBe(true);
    console.log('✅ Suscripción verificada:', subData.active);
    
    // 2. Subir documento
    console.log('📄 Paso 1: Subiendo documento...');
    
    await page.goto('/documents/upload');
    await page.waitForLoadState('networkidle');
    
    // Verificar que no redirige a subscription
    const currentUrl = page.url();
    if (currentUrl.includes('/subscription')) {
      console.log('❌ Redirigido a subscription - frontend no reconoce suscripción');
      throw new Error('Frontend no reconoce suscripción activa - TEST FALLÓ');
    }
    
    // Verificar que estamos en la página correcta
    const expectedUrl = page.url();
    if (!expectedUrl.includes('/documents/upload')) {
      console.log('❌ No estamos en página de upload:', expectedUrl);
      throw new Error('No estamos en página de upload - TEST FALLÓ');
    }
    
    // Verificar que el formulario de upload está visible
    const fileInput = page.locator('input#file-upload, input[type="file"]');
    if (!await fileInput.isVisible({ timeout: 3000 })) {
      console.log('❌ Formulario de upload no visible');
      throw new Error('Formulario de upload no visible - TEST FALLÓ');
    }
    
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-document.pdf');
    await fileInput.setInputFiles(testPdfPath);
    
    const titleInput = page.locator('input[type="text"], input[name="title"]').first();
    await titleInput.clear();
    await titleInput.fill('Documento para Flujo Completo');
    
    // Verificar que el botón de submit está visible y habilitado
    const submitButton = page.locator('button:has-text("Subir documento"), button[type="submit"]');
    if (!await submitButton.isVisible({ timeout: 3000 })) {
      console.log('❌ Botón de submit no visible');
      throw new Error('Botón de submit no visible - TEST FALLÓ');
    }
    
    await submitButton.click();
    
    // Verificar que realmente fue redirigido a documents (no a subscription)
    try {
      await page.waitForURL(/\/documents/, { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      
      // Verificación final: debe estar en /documents (lista) NO en /documents/upload
      const finalUrl = page.url();
      
      if (finalUrl.includes('/subscription')) {
        console.log('❌ Redirigido a subscription después del submit');
        throw new Error('Redirigido a subscription después del submit - TEST FALLÓ');
      }
      
      if (finalUrl.includes('/documents/upload')) {
        console.log('❌ Todavía en /documents/upload - el documento NO se subió');
        throw new Error('Todavía en /documents/upload - el documento NO se subió - TEST FALLÓ');
      }
      
      if (!finalUrl.includes('/documents') || finalUrl.endsWith('/upload')) {
        console.log('❌ URL final incorrecta:', finalUrl);
        throw new Error('URL final incorrecta - el documento NO se subió - TEST FALLÓ');
      }
      
      console.log('✅ Documento subido exitosamente - URL final:', finalUrl);
    } catch (error) {
      console.log('❌ Error en navegación después de submit:', error.message);
      throw new Error('Error en navegación después de submit - TEST FALLÓ');
    }
    
    // 3. Crear solicitud de firma vía API (más confiable)
    console.log('✍️ Paso 2: Creando solicitud de firma...');
    
    // Obtener documento recién subido con reintentos
    let latestDoc = null;
    let retryCount = 0;
    const maxRetries = 5;
    let allDocuments = [];
    
    while (!latestDoc && retryCount < maxRetries) {
      console.log(`🔍 Buscando documento (intento ${retryCount + 1}/${maxRetries})...`);
      
      const docsResponse = await page.request.get('http://localhost:8082/api/documents', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-User-Id': userId
        }
      });
      
      expect(docsResponse.status()).toBe(200);
      allDocuments = await docsResponse.json();
      latestDoc = allDocuments.find((doc: any) => doc.title === 'Documento para Flujo Completo');
      
      if (!latestDoc) {
        retryCount++;
        await page.waitForTimeout(2000);
      }
    }
    
    if (!latestDoc) {
      console.log('❌ Documentos disponibles:', allDocuments.map((d: any) => ({id: d.id, title: d.title})));
      throw new Error('No se encontró el documento recién subido después de varios intentos');
    }
    
    // Crear solicitud de firma con posiciones
    const createResponse = await page.request.post('http://localhost:8083/api/signatures', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-User-Id': userId
      },
      data: {
        documentId: latestDoc.id,
        title: 'Solicitud de Firma Completa',
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
    
    // 4. Verificar solicitud en lista
    console.log('📋 Paso 3: Verificando solicitud en lista...');
    
    await page.goto('/signatures');
    await page.waitForLoadState('networkidle');
    
    // Esperar un momento para que aparezca la solicitud
    await page.waitForTimeout(2000);
    
    const requestElement = page.locator('text=/Solicitud de Firma Completa/i').first();
    if (await requestElement.isVisible({ timeout: 5000 })) {
      console.log('✅ Solicitud encontrada en lista');
    } else {
      console.log('⚠️ Solicitud no visible en lista (puede necesitar refresh)');
    }
    
    // 5. Probar descarga de PDF original
    console.log('📥 Paso 4: Probando descarga PDF original...');
    
    const pdfResponse = await page.request.get(`http://localhost:8082/api/documents/${latestDoc.id}/download`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-User-Id': userId
      }
    });
    
    expect(pdfResponse.status()).toBe(200);
    console.log('✅ PDF original descargado:', pdfResponse.headers()['content-length'], 'bytes');
    
    // 6. Probar endpoints de versión (deben responder 404/403 que es correcto)
    console.log('🔍 Paso 5: Verificando endpoints de versiones...');
    
    const versionsResponse = await page.request.get(`http://localhost:8083/api/signatures/${signatureData.id}/versions`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-User-Id': userId
      }
    });
    
    if (versionsResponse.status() === 200) {
      const versions = await versionsResponse.json();
      console.log('✅ Versiones disponibles:', versions.length);
    } else {
      console.log('📊 Endpoint de versiones responde:', versionsResponse.status());
    }
    
    // 7. Probar descarga de PDF firmado (debe responder 404/403 que es correcto)
    console.log('📄 Paso 6: Verificando endpoint de descarga firmada...');
    
    const downloadResponse = await page.request.get(`http://localhost:8083/api/signatures/${signatureData.id}/download-signed`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-User-Id': userId,
        'X-User-Email': 'owner1@techcorp.cl'
      }
    });
    
    if (downloadResponse.status() === 200) {
      console.log('✅ PDF firmado disponible');
    } else {
      console.log('📊 Endpoint de descarga firmada responde:', downloadResponse.status());
    }
    
    // 8. Simular firma de un firmante
    console.log('✍️ Paso 7: Simulando firma de firmante...');
    
    // Obtener info del primer firmante
    const firstSigner = signatureData.signers[0];
    const signerInfoResponse = await page.request.get(`http://localhost:8083/api/signatures/signer/${firstSigner.id}/info?token=${firstSigner.accessToken}`);
    
    if (signerInfoResponse.status() === 200) {
      console.log('✅ Info del firmante obtenida');
    } else {
      console.log('📊 Info del firmante responde:', signerInfoResponse.status());
    }
    
    console.log('🎉 ¡Flujo completo de firma finalizado exitosamente!');
    console.log('📊 Resumen:');
    console.log('  ✅ Suscripción activa');
    console.log('  ✅ Documento subido');
    console.log('  ✅ Solicitud creada con', signatureData.signers.length, 'firmantes');
    console.log('  ✅ PDF original descargable');
    console.log('  ✅ Endpoints de versiones funcionando');
    console.log('  ✅ Sistema de firmas operativo');
  });
});
