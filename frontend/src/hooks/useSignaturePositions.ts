import { useMemo } from 'react'
import type { Signer } from '@/types'
import { API_CONFIG } from '@/lib/config'

/**
 * Tipo de posición de firma para el visor PDF
 */
export interface SignatureViewPosition {
  signerId: string
  signerName: string
  signerEmail: string
  x: number
  y: number
  width: number
  height: number
  page: number
  status: 'SIGNED' | 'PENDING' | 'PREVIEW'
  signatureImageUrl?: string
}

/**
 * Hook para mapear firmantes a posiciones de firma para el visor PDF
 * Centraliza la lógica de conversión de datos del backend al formato del visor
 * 
 * Soporta:
 * - Múltiples posiciones por firmante (nuevo sistema)
 * - Una posición por firmante (sistema legacy)
 * - Vista previa de firma temporal
 * 
 * @param signers - Lista de firmantes del backend
 * @param previewSignature - Firma temporal para vista previa (opcional)
 * @returns Array de posiciones de firma para el visor
 */
export function useSignaturePositions(
  signers: Signer[],
  previewSignature?: {
    signerId: string
    signatureDataUrl: string
  }
) {
  return useMemo(() => {
    const result: SignatureViewPosition[] = []

    signers.forEach(signer => {
      // Si tiene múltiples posiciones (nuevo sistema)
      // El backend envía "positions", pero también soportamos "signaturePositions" por compatibilidad
      const signerPositions = signer.positions || signer.signaturePositions
      
      if (signerPositions && signerPositions.length > 0) {
        signerPositions.forEach(pos => {
          // Determinar estado y URL de imagen
          let status: 'SIGNED' | 'PENDING' | 'PREVIEW' = signer.status === 'SIGNED' ? 'SIGNED' : 'PENDING'
          let imageUrl: string | undefined

          // Si está firmado, usar la imagen del servidor (prioridad)
          if (signer.status === 'SIGNED' && signer.signatureImagePath) {
            if (signer.signatureImagePath.includes('/')) {
              imageUrl = `${API_CONFIG.SIGNATURE_SERVICE}/api/signatures/images/${signer.signatureImagePath}?t=${Date.now()}`
            }
          } 
          // Si es vista previa para este firmante Y no está firmado aún
          else if (previewSignature && previewSignature.signerId === signer.id && signer.status !== 'SIGNED') {
            status = 'PREVIEW'
            imageUrl = previewSignature.signatureDataUrl
          }

          result.push({
            signerId: signer.id,
            signerName: signer.fullName,
            signerEmail: signer.email,
            x: pos.positionX,
            y: pos.positionY,
            width: pos.width,
            height: pos.height,
            page: pos.pageNumber,
            status,
            signatureImageUrl: imageUrl
          })
        })
      } else {
        // Fallback a sistema legacy (una sola posición)
        let status: 'SIGNED' | 'PENDING' | 'PREVIEW' = signer.status === 'SIGNED' ? 'SIGNED' : 'PENDING'
        let imageUrl: string | undefined

        // Si está firmado, usar la imagen del servidor (prioridad)
        if (signer.status === 'SIGNED' && signer.signatureImagePath) {
          if (signer.signatureImagePath.includes('/')) {
            imageUrl = `${API_CONFIG.SIGNATURE_SERVICE}/api/signatures/images/${signer.signatureImagePath}?t=${Date.now()}`
          }
        }
        // Si es vista previa para este firmante Y no está firmado aún
        else if (previewSignature && previewSignature.signerId === signer.id && signer.status !== 'SIGNED') {
          status = 'PREVIEW'
          imageUrl = previewSignature.signatureDataUrl
        }

        result.push({
          signerId: signer.id,
          signerName: signer.fullName,
          signerEmail: signer.email,
          x: signer.signaturePositionX || 100,
          y: signer.signaturePositionY || 100,
          width: signer.signatureWidth || 200,
          height: signer.signatureHeight || 80,
          page: signer.signaturePage || 1,
          status,
          signatureImageUrl: imageUrl
        })
      }
    })

    return result
  }, [signers, previewSignature])
}

/**
 * Hook simplificado para cuando solo necesitas las posiciones sin vista previa
 */
export function useSignaturePositionsSimple(signers: Signer[]) {
  return useSignaturePositions(signers)
}
