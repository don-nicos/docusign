export interface User {
  id: string
  email: string
  fullName: string
  rut?: string
  firstName?: string
  lastName?: string
  secondLastName?: string
  phone?: string
  createdAt?: string
}

export interface SavedSignature {
  id: string
  name: string
  signatureData: string
  isDefault: boolean
  createdAt?: string
}

export interface SignatureUploadResponse {
  message: string
  signatureImagePath: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
  refreshExpiresInSeconds: number
}

export interface AuthSession {
  user: User
  tokens: AuthTokens
  redirectPath?: string
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  LOCKED = 'LOCKED',
  ARCHIVED = 'ARCHIVED',
}

export interface Document {
  id: string
  ownerId: string
  title: string
  status: DocumentStatus
  originalFilename: string
  storageKey: string
  fileSize: number
  contentType?: string
  hashSha256: string
  createdAt: string
  updatedAt: string
}

export enum SignatureRequestStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum SignerStatus {
  PENDING = 'PENDING',
  OTP_SENT = 'OTP_SENT',
  SIGNED = 'SIGNED',
  REJECTED = 'REJECTED',
}

export interface SignaturePosition {
  pageNumber: number
  positionX: number
  positionY: number
  width: number
  height: number
  label?: string
}

export interface Signer {
  id: string
  email: string
  fullName: string
  orderIndex: number
  status: SignerStatus
  signedAt?: string
  rejectionReason?: string
  // Imagen de la firma
  signatureImagePath?: string
  
  // ========== POSICIONAMIENTO DE FIRMA ==========
  
  // @deprecated Legacy: Sistema de una sola posición (mantener para backward compatibility)
  // Usar positions[] en su lugar
  signaturePositionX?: number
  signaturePositionY?: number
  signaturePage?: number
  signatureWidth?: number
  signatureHeight?: number
  
  // Sistema actual: Múltiples posiciones de firma
  // Este es el sistema preferido para nuevas solicitudes
  // NOTA: El backend envía "positions", no "signaturePositions"
  positions?: SignaturePosition[]
  signaturePositions?: SignaturePosition[] // Alias para compatibilidad
}

export interface SignatureRequest {
  id: string
  documentId: string
  ownerId: string
  title: string
  status: SignatureRequestStatus
  expiresAt?: string
  completedAt?: string
  signers: Signer[]
  pdfViewerWidth?: number
  createdAt: string
  updatedAt: string
}

export interface CreateSignatureRequestPayload {
  documentId: string
  title: string
  signers: Array<{
    email: string
    fullName: string
    orderIndex: number
    positions?: Array<{
      pageNumber: number
      positionX: number
      positionY: number
      width: number
      height: number
      label?: string
    }>
  }>
  expirationHours?: number
  pdfViewerWidth?: number
}

export interface ApiError {
  message: string
  status: number
  timestamp?: string
}

export interface DocumentCountResponse {
  count: number
}

export interface PricingConfigResponse {
  currency: string
  ivaRate: string
}

export interface PlanResponse {
  planKey: string
  name: string
  periodMonths: number
  netAmountClp: number
  currency: string
  ivaRate: string
  taxAmountClp: number
  grossAmountClp: number
}

export interface SubscriptionResponse {
  id: string
  userId: string
  planKey: string
  provider: 'MERCADOPAGO' | 'MOCK'
  providerSubscriptionId?: string | null
  status: 'PENDING' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
  startedAt?: string | null
  currentPeriodEnd?: string | null
  cancelAtPeriodEnd: boolean
}

export interface ChargeResponse {
  id: string
  status: 'PENDING' | 'PAID' | 'FAILED'
  currency: string
  amountNetClp: number
  amountTaxClp: number
  amountGrossClp: number
  paidAt?: string | null
}

export interface SubscriptionWithChargeResponse {
  subscription: SubscriptionResponse
  lastCharge?: ChargeResponse | null
  checkoutUrl?: string | null
}

export interface SubscriptionAccessStatusResponse {
  active: boolean
  currentPeriodEnd?: string | null
}

export interface SignerVerificationResponse {
  signerId: string
  fullName: string
  email: string
  status: string
  signedAt?: string | null
  authenticationMethod?: string | null
  ipAddress?: string | null
}

export interface SignatureVerificationResponse {
  requestId: string
  documentTitle: string
  status: string
  documentHash: string | null
  completedAt?: string | null
  signers: SignerVerificationResponse[]
}
