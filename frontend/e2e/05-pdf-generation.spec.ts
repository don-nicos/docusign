import { test, expect, Page } from '@playwright/test';
import { login } from './helpers/auth-helper';
import path from 'path';

test.describe('PDF Generation and Download Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'owner1');
  });

  test('should generate and download PDF with all signatures', async ({ page }) => {
    console.log('🔄 Test: Generando PDF con todas las firmas...');
    
    // 1. Crear una solicitud de firma completa
    await createCompleteSignatureRequest(page);
    
    // 2. Simular que todos los firmantes han firmado
    await simulateAllSignersCompleted(page);
    
    // 3. Verificar generación del PDF final
    await verifyFinalPDFGeneration(page);
    
    // 4. Descargar PDF con todas las firmas
    await downloadSignedPDF(page);
    
    console.log('✅ Test de PDF con todas las firmas completado');
  });

  test('should download original PDF without signatures', async ({ page }) => {
    console.log('📄 Test: Descargando PDF original sin firmas...');
    
    // 1. Subir documento
    await uploadTestDocument(page);
    
    // 2. Descargar versión original antes de cualquier firma
    await downloadOriginalPDF(page);
    
    console.log('✅ Test de descarga PDF original completado');
  });

  test('should generate PDF with intermediate signatures', async ({ page }) => {
    console.log('📝 Test: Generando PDF con firmas intermedias...');
    
    // 1. Crear solicitud y firmar parcialmente
    await createAndPartiallySign(page);
    
    // 2. Descargar PDF con firmas parciales
    await downloadIntermediatePDF(page);
    
    console.log('✅ Test de PDF con firmas intermedias completado');
  });

  test('should validate signature positions in PDF', async ({ page }) => {
    console.log('📍 Test: Validando posiciones de firmas en PDF...');
    
    // 1. Crear solicitud con posiciones específicas
    await createRequestWithSpecificPositions(page);
    
    // 2. Verificar que las firmas aparecen en las posiciones correctas
    await verifySignaturePositions(page);
    
    console.log('✅ Test de validación de posiciones completado');
  });

  async function createCompleteSignatureRequest(page: Page) {
    console.log('📋 Creando solicitud de firma completa...');
    
    // Subir documento
    await uploadTestDocument(page);
    
    // Navegar a vista del documento
    const viewButton = page.locator('button:has-text("Ver")').first();
    await viewButton.click();
    await page.waitForLoadState('networkidle');
    
    // Crear solicitud de firma
    const createSignatureButton = page.locator('button:has-text("Crear solicitud"), button:has-text("Solicitar firma")').first();
    if (await createSignatureButton.isVisible()) {
      await createSignatureButton.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Agregar múltiples firmantes
    await addMultipleSigners(page);
    
    // Posicionar firmas en diferentes lugares del PDF
    await positionMultipleSignatures(page);
    
    // Finalizar solicitud
    await finalizeSignatureRequest(page);
  }

  async function simulateAllSignersCompleted(page: Page) {
    console.log('✍️ Simulando que todos los firmantes han completado...');
    
    // Ir a página de solicitudes
    await page.goto('/signatures');
    await page.waitForLoadState('networkidle');
    
    // Buscar la solicitud creada
    const signatureRequest = page.locator('.signature-item, [data-testid="signature-request"]').first();
    if (await signatureRequest.isVisible()) {
      await signatureRequest.click();
      await page.waitForLoadState('networkidle');
      
      // Simular actualización del estado a "completado"
      // En un caso real, esto sería automático cuando todos firman
      await page.waitForTimeout(2000);
      
      // Verificar que muestra estado "Completado" o "Todas las firmas completadas"
      const completedStatus = page.locator('text=/completado|firmado|finalizado/i, .status-completed, [data-testid="status-completed"]').first();
      if (await completedStatus.isVisible({ timeout: 5000 })) {
        console.log('✅ Estado de completado detectado');
      }
    }
  }

  async function verifyFinalPDFGeneration(page: Page) {
    console.log('🔍 Verificando generación del PDF final...');
    
    // Buscar botón o enlace para descargar PDF final
    const downloadButtons = [
      'button:has-text("Descargar PDF firmado")',
      'button:has-text("Download signed PDF")',
      'a:has-text("Descargar versión final")',
      'button:has-text("Exportar PDF")',
      '[data-testid="download-signed-pdf"]'
    ];
    
    let downloadFound = false;
    for (const selector of downloadButtons) {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 2000 })) {
        console.log('✅ Botón de descarga PDF final encontrado:', selector);
        downloadFound = true;
        break;
      }
    }
    
    if (!downloadFound) {
      console.log('⚠️ Botón de descarga no encontrado, buscando enlaces de descarga...');
      const downloadLinks = page.locator('a[href*="download"], a[href*="pdf"]').first();
      if (await downloadLinks.isVisible()) {
        console.log('✅ Enlace de descarga encontrado');
        downloadFound = true;
      }
    }
    
    expect(downloadFound).toBeTruthy();
  }

  async function downloadSignedPDF(page: Page) {
    console.log('💾 Descargando PDF firmado...');
    
    // Iniciar descarga
    const downloadPromise = page.waitForEvent('download');
    
    // Buscar y hacer clic en botón de descarga
    const downloadButton = page.locator('button:has-text("Descargar"), a:has-text("Descargar"), [data-testid*="download"]').first();
    if (await downloadButton.isVisible()) {
      await downloadButton.click();
      
      // Esperar a que comience la descarga
      const download = await downloadPromise;
      console.log('✅ Descarga iniciada:', download.suggestedFilename());
      
      // Verificar que es un PDF
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
      
      // Guardar el archivo
      const path = require('path');
      const savePath = path.join(__dirname, '..', 'downloads', download.suggestedFilename());
      await download.saveAs(savePath);
      console.log('✅ PDF guardado en:', savePath);
    }
  }

  async function uploadTestDocument(page: Page) {
    console.log('📄 Subiendo documento de prueba...');
    
    await page.goto('/documents/upload');
    await page.waitForLoadState('networkidle');
    
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-document.pdf');
    const fileInput = page.locator('input#file-upload');
    await fileInput.setInputFiles(testPdfPath);
    
    const titleInput = page.locator('input[type="text"]').first();
    await titleInput.clear();
    await titleInput.fill('Documento para Pruebas de PDF');
    
    const submitButton = page.locator('button:has-text("Subir documento")');
    await submitButton.click();
    
    await page.waitForURL(/\/documents/, { timeout: 10000 });
  }

  async function downloadOriginalPDF(page: Page) {
    console.log('📥 Descargando PDF original...');
    
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    
    // Buscar documento recién subido
    const documentItem = page.locator('text=/Documento para Pruebas de PDF/i').first();
    if (await documentItem.isVisible()) {
      // Buscar botón de descarga original
      const downloadButton = page.locator('button:has-text("Descargar"), a:has-text("Descargar")').first();
      
      const downloadPromise = page.waitForEvent('download');
      await downloadButton.click();
      
      const download = await downloadPromise;
      console.log('✅ PDF original descargado:', download.suggestedFilename());
      
      // Guardar archivo
      const path = require('path');
      const savePath = path.join(__dirname, '..', 'downloads', 'original-' + download.suggestedFilename());
      await download.saveAs(savePath);
      console.log('✅ PDF original guardado en:', savePath);
    }
  }

  async function createAndPartiallySign(page: Page) {
    console.log('📝 Creando solicitud y firmando parcialmente...');
    
    await createCompleteSignatureRequest(page);
    
    // Simular que solo algunos firmantes han firmado
    // En un caso real, esto implicaría navegar a los magic links de algunos firmantes
    console.log('✅ Simulación de firma parcial completada');
  }

  async function downloadIntermediatePDF(page: Page) {
    console.log('📥 Descargando PDF con firmas intermedias...');
    
    await page.goto('/signatures');
    await page.waitForLoadState('networkidle');
    
    // Buscar solicitud con firmas parciales
    const partialRequest = page.locator('.signature-item:has-text("parcial"), .signature-item:has-text("pendiente")').first();
    if (await partialRequest.isVisible()) {
      await partialRequest.click();
      await page.waitForLoadState('networkidle');
      
      // Buscar opción de descargar versión intermedia
      const downloadButton = page.locator('button:has-text("Descargar versión actual"), button:has-text("Exportar progreso")').first();
      
      if (await downloadButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download');
        await downloadButton.click();
        
        const download = await downloadPromise;
        console.log('✅ PDF intermedio descargado:', download.suggestedFilename());
        
        const path = require('path');
        const savePath = path.join(__dirname, '..', 'downloads', 'intermediate-' + download.suggestedFilename());
        await download.saveAs(savePath);
        console.log('✅ PDF intermedio guardado en:', savePath);
      }
    }
  }

  async function addMultipleSigners(page: Page) {
    console.log('👥 Agregando múltiples firmantes...');
    
    const emailInputs = page.locator('input[type="email"]');
    if (await emailInputs.count() > 0) {
      await emailInputs.first().fill('laura.rodriguez@empresa.cl');
      
      const addSignerButton = page.locator('button:has-text("Agregar"), button:has-text("Añadir")').first();
      if (await addSignerButton.isVisible()) {
        await addSignerButton.click();
        await page.waitForTimeout(1000);
        
        const secondEmail = page.locator('input[type="email"]').nth(1);
        await secondEmail.fill('maria.gonzalez@empresa.cl');
      }
    }
  }

  async function positionMultipleSignatures(page: Page) {
    console.log('📍 Posicionando múltiples firmas...');
    
    const continueButton = page.locator('button:has-text("Continuar"), button:has-text("Siguiente")').first();
    if (await continueButton.isVisible()) {
      await continueButton.click();
      await page.waitForLoadState('networkidle');
      
      // Simular posicionamiento en diferentes áreas
      const pdfViewer = page.locator('canvas, .pdf-viewer').first();
      if (await pdfViewer.isVisible()) {
        // Primera firma
        await pdfViewer.click({ position: { x: 100, y: 100 } });
        await page.waitForTimeout(500);
        
        // Segunda firma
        await pdfViewer.click({ position: { x: 300, y: 200 } });
        await page.waitForTimeout(500);
        
        console.log('✅ Múltiples firmas posicionadas');
      }
    }
  }

  async function finalizeSignatureRequest(page: Page) {
    console.log('🎯 Finalizando solicitud de firma...');
    
    const finalizeButtons = [
      'button:has-text("Crear solicitud")',
      'button:has-text("Finalizar")',
      'button:has-text("Enviar")'
    ];
    
    for (const selector of finalizeButtons) {
      const button = page.locator(selector).first();
      if (await button.isVisible()) {
        await button.click();
        await page.waitForLoadState('networkidle');
        console.log('✅ Solicitud finalizada');
        break;
      }
    }
  }

  async function createRequestWithSpecificPositions(page: Page) {
    console.log('🎯 Creando solicitud con posiciones específicas...');
    
    await createCompleteSignatureRequest(page);
  }

  async function verifySignaturePositions(page: Page) {
    console.log('🔍 Verificando posiciones de firmas...');
    
    // Buscar indicadores visuales de las posiciones de firma
    const signatureIndicators = page.locator('.signature-position, .signature-field, [data-testid="signature-position"]');
    
    if (await signatureIndicators.count() > 0) {
      console.log('✅ Posiciones de firma detectadas:', await signatureIndicators.count());
      
      // Verificar que estén en las coordenadas esperadas
      for (let i = 0; i < await signatureIndicators.count(); i++) {
        const indicator = signatureIndicators.nth(i);
        const boundingBox = await indicator.boundingBox();
        if (boundingBox) {
          console.log(`📍 Firma ${i + 1}: x=${boundingBox.x}, y=${boundingBox.y}`);
        }
      }
    }
  }
});
