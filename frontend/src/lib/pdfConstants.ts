/**
 * Constantes compartidas para renderizado de PDF
 * Asegura que todos los visores usen las mismas dimensiones
 */

/**
 * Ancho estándar para renderizar PDFs en todos los visores
 * Este valor debe ser consistente en:
 * - SignatureFieldPlacer (crear posiciones)
 * - PDFViewerWithSignatures (mostrar posiciones)
 */
export const PDF_VIEWER_WIDTH = 800

/**
 * Calcula el ancho del PDF considerando el ancho de la ventana
 * @param windowWidth - Ancho de la ventana del navegador
 * @returns Ancho a usar para el PDF
 */
export function getPDFWidth(windowWidth?: number): number {
  if (!windowWidth) {
    // Si estamos en el servidor o no hay window, usar el ancho estándar
    return PDF_VIEWER_WIDTH
  }
  
  // Usar el menor entre el ancho estándar y el ancho disponible
  return Math.min(PDF_VIEWER_WIDTH, windowWidth - 100)
}
