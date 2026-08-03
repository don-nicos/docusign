// Validadores de formularios y datos

// Lista de dominios de email válidos/permitidos
const VALID_EMAIL_DOMAINS = [
  // Dominios corporativos chilenos comunes
  'empresa.cl',
  'empresa.com',
  'corporativo.cl',
  'legal.cl',
  'techco.cl',
  'rrhh.cl',
  
  // Dominios de email profesionales
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
  'protonmail.com',
  'icloud.com',
  
  // Dominios educacionales chilenos
  'uc.cl',
  'uchile.cl',
  'uai.cl',
  'udp.cl',
  'usach.cl',
  'puc.cl',
  
  // Dominios corporativos internacionales
  'company.com',
  'business.com',
  'corporate.com',
]

// Dominios explícitamente NO permitidos (ejemplos de prueba)
const INVALID_DOMAINS = [
  'asd.cl',
  'asd.com',
  'test.cl',
  'test.com',
  'example.com',
  'example.cl',
  'prueba.cl',
  'prueba.com',
  'temp.cl',
  'temp.com',
]

export function validateEmail(email: string): { valid: boolean; message?: string } {
  // Verificar formato básico
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Formato de email inválido' }
  }
  
  const domain = email.toLowerCase().split('@')[1]
  
  // Verificar dominios explícitamente inválidos
  if (INVALID_DOMAINS.includes(domain)) {
    return { 
      valid: false, 
      message: `El dominio ${domain} no es válido. Por favor usa un email corporativo o profesional.` 
    }
  }
  
  // Verificar estructura del dominio
  const domainParts = domain.split('.')
  if (domainParts.length < 2) {
    return { valid: false, message: 'El dominio del email debe tener al menos una extensión (.cl, .com, etc)' }
  }
  
  // No permitir dominios con solo 3 caracteres antes del punto (ej: asd.cl, xyz.com)
  if (domainParts[0].length <= 3 && !VALID_EMAIL_DOMAINS.includes(domain)) {
    return { 
      valid: false, 
      message: 'Por favor usa un email con un dominio corporativo válido' 
    }
  }
  
  // Si queremos ser más estrictos, podemos verificar que esté en la lista de permitidos
  // Descomentear las siguientes líneas para activar lista blanca estricta:
  /*
  if (!VALID_EMAIL_DOMAINS.includes(domain)) {
    return { 
      valid: false, 
      message: `El dominio ${domain} no está en la lista de dominios permitidos` 
    }
  }
  */
  
  return { valid: true }
}

export function validateRUT(rut: string): { valid: boolean; message?: string } {
  // Eliminar puntos y guión
  const cleanRut = rut.replace(/\./g, '').replace(/-/g, '')
  
  if (cleanRut.length < 8 || cleanRut.length > 9) {
    return { valid: false, message: 'RUT inválido' }
  }
  
  const body = cleanRut.slice(0, -1)
  const dv = cleanRut.slice(-1).toUpperCase()
  
  // Calcular dígito verificador
  let sum = 0
  let multiplier = 2
  
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }
  
  const expectedDV = 11 - (sum % 11)
  const calculatedDV = expectedDV === 11 ? '0' : expectedDV === 10 ? 'K' : expectedDV.toString()
  
  if (calculatedDV !== dv) {
    return { valid: false, message: 'Dígito verificador del RUT incorrecto' }
  }
  
  return { valid: true }
}

export function validatePhone(phone: string): { valid: boolean; message?: string } {
  // Formato chileno: +56 9 xxxx xxxx o 9 xxxx xxxx
  const cleanPhone = phone.replace(/\s+/g, '').replace(/-/g, '')
  
  // Verificar formato chileno
  const chilePhoneRegex = /^(\+56)?9\d{8}$/
  
  if (!chilePhoneRegex.test(cleanPhone)) {
    return { valid: false, message: 'Número de teléfono inválido. Formato: +56 9 XXXX XXXX' }
  }
  
  return { valid: true }
}

export function validateBirthDate(date: string): { valid: boolean; message?: string } {
  const birthDate = new Date(date)
  const today = new Date()
  const age = today.getFullYear() - birthDate.getFullYear()
  
  if (age < 18) {
    return { valid: false, message: 'Debes ser mayor de 18 años' }
  }
  
  if (age > 120) {
    return { valid: false, message: 'Fecha de nacimiento inválida' }
  }
  
  return { valid: true }
}
