export const API_CONFIG = {
  AUTH_SERVICE: process.env.NEXT_PUBLIC_API_AUTH_URL || 'http://localhost:8081',
  DOCUMENT_SERVICE: process.env.NEXT_PUBLIC_API_DOCUMENT_URL || 'http://localhost:8082',
  SIGNATURE_SERVICE: process.env.NEXT_PUBLIC_API_SIGNATURE_URL || 'http://localhost:8083',
  PAYMENT_SERVICE: process.env.NEXT_PUBLIC_API_PAYMENT_URL || 'http://localhost:8085',
}

export const APP_CONFIG = {
  NAME: 'Docusing',
  DESCRIPTION: 'Plataforma de firma electrónica simple',
}
