import { useMemo } from 'react'
import type { SignaturePosition } from '@/types'
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
 * Subconjunto mínimo de datos de firmante necesario para posicionar la firma en el visor.
 * Es flexible para aceptar tanto Signer (backend) como objetos legacy/parciales.
 */
interface SignerPositionSource {
  id: string
  email: string
  fullName: string
  orderIndex?: number
  status: string
  signatureImagePath?: string
  signaturePositionX?: number
  signaturePositionY?: number
  signaturePage?: number
  signatureWidth?: number
  signatureHeight?: number
  positions?: SignaturePosition[]
  signaturePositions?: SignaturePosition[]
}

const getStatusAndImageUrl = (
  signer: SignerPositionSource,
  previewSignature?: { signerId: string; signatureDataUrl: string }
): Pick<SignatureViewPosition, 'status' | 'signatureImageUrl'> => {
  if (signer.status === 'SIGNED' && signer.signatureImagePath?.includes('/')) {
    return {
      status: 'SIGNED',
      signatureImageUrl: `${API_CONFIG.SIGNATURE_SERVICE}/api/signatures/images/${signer.signatureImagePath}?t=${Date.now()}`
    }
  }

  if (previewSignature && previewSignature.signerId === signer.id && signer.status !== 'SIGNED') {
    return {
      status: 'PREVIEW',
      signatureImageUrl: previewSignature.signatureDataUrl
    }
  }

  return { status: 'PENDING', signatureImageUrl: undefined }
}

/**
 * Hook para mapear firmantes a posiciones de firma para el visor PDF.
 * Centraliza la lógica de conversión de datos del backend al formato del visor.
 *
 * Soporta:
 * - Múltiples posiciones por firmante (nuevo sistema)
 * - Una posición por firmante (sistema legacy)
 * - Vista previa de firma temporal
 */
export function useSignaturePositions(
  signers: SignerPositionSource[],
  previewSignature?: {
    signerId: string
    signatureDataUrl: string
  }
) {
  return useMemo(() => {
    const result: SignatureViewPosition[] = []

    signers.forEach(signer => {
      const { status, signatureImageUrl } = getStatusAndImageUrl(signer, previewSignature)
      const signerPositions = signer.positions || signer.signaturePositions

      if (signerPositions && signerPositions.length > 0) {
        signerPositions.forEach(pos => {
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
            signatureImageUrl
          })
        })
      } else {
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
          signatureImageUrl
        })
      }
    })

    return result
  }, [signers, previewSignature])
}
