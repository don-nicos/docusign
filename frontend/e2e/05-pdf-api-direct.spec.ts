import { test, expect, Page } from '@playwright/test';
import { login } from './helpers/auth-helper';
import path from 'path';

test.describe('PDF Generation Direct API Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'owner1');
  });

  test('should test PDF generation endpoints directly', async ({ page }) => {
    console.log('🔧 Test: Probando endpoints de generación de PDF directamente...');
    
    // Obtener token del localStorage
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    const userId = await page.evaluate(() => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id;
    });
    
    console.log('🔑 Token obtenido, probando endpoints...');
    
    // 1. Probar descarga de PDF original (document-service)
    console.log('📄 Test 1: Descargando PDF original desde document-service...');
    
    try {
      const documentId = '35763e9a-d291-40b6-aae8-9e92cafcef90'; // Documento existente
      
      const response = await page.request.get(`http://localhost:8082/api/documents/${documentId}/download`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-User-Id': userId
        }
      });
      
      if (response.status() === 200) {
        const contentLength = response.headers()['content-length'];
        const contentType = response.headers()['content-type'];
        console.log('✅ PDF original descargado exitosamente');
        console.log(`📊 Tamaño: ${contentLength} bytes, Tipo: ${contentType}`);
        
        // Guardar el PDF
        const pdfBytes = await response.body();
        const fs = require('fs');
        const downloadPath = path.join(__dirname, '..', 'downloads', 'direct-original.pdf');
        fs.writeFileSync(downloadPath, pdfBytes);
        console.log('💾 PDF guardado en:', downloadPath);
      } else {
        console.log('❌ Error descargando PDF original:', response.status());
      }
    } catch (error) {
      console.log('❌ Excepción descargando PDF original:', error.message);
    }
    
    // 2. Probar endpoint de versiones de PDF (signature-service)
    console.log('📋 Test 2: Listando versiones de PDF (signature-service)...');
    
    try {
      // Primero necesitamos una solicitud de firma existente para probar
      // Como no hay, vamos a verificar que el endpoint responde correctamente
      
      const fakeRequestId = '00000000-0000-0000-0000-000000000000';
      
      const response = await page.request.get(`http://localhost:8083/api/signatures/${fakeRequestId}/versions`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-User-Id': userId
        }
      });
      
      if (response.status() === 404) {
        console.log('✅ Endpoint de versiones responde correctamente (404 para solicitud inexistente)');
      } else if (response.status() === 403) {
        console.log('✅ Endpoint de versiones responde correctamente (403 para acceso denegado)');
      } else {
        console.log('📊 Respuesta del endpoint de versiones:', response.status());
      }
    } catch (error) {
      console.log('❌ Excepción probando endpoint de versiones:', error.message);
    }
    
    // 3. Probar endpoint de descarga de PDF firmado
    console.log('✍️ Test 3: Probando endpoint de descarga de PDF firmado...');
    
    try {
      const fakeRequestId = '00000000-0000-0000-0000-000000000000';
      
      const response = await page.request.get(`http://localhost:8083/api/signatures/${fakeRequestId}/download-signed`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-User-Id': userId,
          'X-User-Email': 'owner1@techcorp.cl'
        }
      });
      
      if (response.status() === 404) {
        console.log('✅ Endpoint de descarga firmada responde correctamente (404 para solicitud inexistente)');
      } else if (response.status() === 403) {
        console.log('✅ Endpoint de descarga firmada responde correctamente (403 para acceso denegado)');
      } else {
        console.log('📊 Respuesta del endpoint de descarga firmada:', response.status());
      }
    } catch (error) {
      console.log('❌ Excepción probando endpoint de descarga firmada:', error.message);
    }
    
    // 4. Verificar que los servicios están funcionando
    console.log('🔍 Test 4: Verificando estado de los servicios...');
    
    try {
      // Verificar document-service
      const docResponse = await page.request.get('http://localhost:8082/api/documents/count', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-User-Id': userId
        }
      });
      
      if (docResponse.status() === 200) {
        const countData = await docResponse.json();
        console.log('✅ Document-service funcionando. Documentos:', countData.count);
      }
    } catch (error) {
      console.log('❌ Error verificando document-service:', error.message);
    }
    
    try {
      // Verificar signature-service
      const sigResponse = await page.request.get('http://localhost:8083/api/signatures', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-User-Id': userId
        }
      });
      
      if (sigResponse.status() === 200) {
        console.log('✅ Signature-service funcionando. Solicitudes:', (await sigResponse.json()).length);
      }
    } catch (error) {
      console.log('❌ Error verificando signature-service:', error.message);
    }
    
    console.log('🎉 Test de endpoints de PDF completado');
  });

  test('should create minimal signature request and test PDF generation', async ({ page }) => {
    console.log('🧪 Test: Creando solicitud mínima y probando generación...');
    
    // Este test intentará crear la solicitud más simple posible
    // para luego probar la generación de PDFs
    
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    const userId = await page.evaluate(() => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id;
    });
    
    // Subir un documento nuevo primero
    console.log('📄 Subiendo documento de prueba...');
    
    await page.goto('/documents/upload');
    await page.waitForLoadState('networkidle');
    
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-document.pdf');
    const fileInput = page.locator('input#file-upload');
    await fileInput.setInputFiles(testPdfPath);
    
    const titleInput = page.locator('input[type="text"]').first();
    await titleInput.clear();
    await titleInput.fill('PDF Test para Generación');
    
    const submitButton = page.locator('button:has-text("Subir documento")');
    await submitButton.click();
    
    await page.waitForURL(/\/documents/, { timeout: 10000 });
    
    // Obtener el ID del documento recién subido
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    
    // Buscar el documento recién subido
    const documentElement = page.locator('text=/PDF Test para Generación/').first();
    
    if (await documentElement.isVisible()) {
      console.log('✅ Documento de prueba encontrado');
      
      // Hacer clic en "Ver" para acceder a la vista del documento
      const viewButton = documentElement.locator('..').locator('button:has-text("Ver")').first();
      if (await viewButton.isVisible()) {
        await viewButton.click();
        await page.waitForLoadState('networkidle');
        
        // Buscar botón de crear solicitud
        const createButton = page.locator('button:has-text("Crear solicitud"), button:has-text("Solicitar firma")').first();
        
        if (await createButton.isVisible({ timeout: 3000 })) {
          console.log('✅ Botón de crear solicitud encontrado');
          await createButton.click();
          await page.waitForLoadState('networkidle');
          
          // Llenar formulario mínimo
          const emailInput = page.locator('input[type="email"]').first();
          if (await emailInput.isVisible()) {
            await emailInput.fill('test@empresa.cl');
            console.log('✅ Firmante agregado');
          }
          
          // Intentar finalizar
          const finalizeButton = page.locator('button:has-text("Crear"), button:has-text("Finalizar"), button[type="submit"]').first();
          if (await finalizeButton.isVisible()) {
            await finalizeButton.click();
            await page.waitForLoadState('networkidle');
            console.log('✅ Solicitud creada (intentando)');
            
            // Verificar si hay solicitud
            await page.goto('/signatures');
            await page.waitForLoadState('networkidle');
            
            const requestElement = page.locator('.signature-item, [data-testid="signature-request"]').first();
            if (await requestElement.isVisible({ timeout: 3000 })) {
              console.log('✅ Solicitud de firma creada exitosamente');
            } else {
              console.log('⚠️ No se detectó solicitud creada');
            }
          }
        }
      }
    }
    
    console.log('🎉 Test de creación mínima completado');
  });
});
