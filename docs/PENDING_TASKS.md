# 📝 TAREAS PENDIENTES
**Última actualización:** 2025-12-19 11:40

---

## 🔴 PRIORIDAD CRÍTICA

### TASK-001: ✅ RESUELTO - Login con Password
**Estado:** ✅ COMPLETADO  
**Fecha:** 2025-12-19

**Solución:**
- Migración V1 actualizada con extensión pgcrypto
- Migración V10 carga usuarios de prueba de organizaciones
- Sistema migrado a PostgreSQL con Docker
- Login funcionando correctamente con nuevos usuarios

**Usuarios de prueba actuales:**
- owner1@techcorp.cl / Test1234!
- admin1@techcorp.cl / Test1234!
- member1@techcorp.cl / Test1234!
- owner2@innosoft.cl / Test1234!
- admin2@innosoft.cl / Test1234!
- member2@innosoft.cl / Test1234!

---

## 🆕 NUEVAS TAREAS - ORGANIZACIONES

### TASK-ORG-001: Selector de Organización en Upload
**Estado:** ⚠️ Pendiente  
**Prioridad:** 🟡 ALTA  
**Estimación:** 1-2 horas

**Descripción:**
Agregar dropdown en página de upload para seleccionar a qué organización subir el documento.

**Implementación:**
```typescript
// En /app/documents/upload/page.tsx

// 1. Agregar estados
const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>()
const [myOrganizations, setMyOrganizations] = useState<UserOrganization[]>([])

// 2. Cargar organizaciones al montar
useEffect(() => {
  const loadOrgs = async () => {
    const orgs = await organizationApi.getMyOrganizations()
    setMyOrganizations(orgs)
  }
  loadOrgs()
}, [])

// 3. Agregar selector en formulario
<div className="mb-4">
  <label className="block text-sm font-medium mb-2">Organización</label>
  <select
    value={selectedOrgId || ''}
    onChange={(e) => setSelectedOrgId(e.target.value || undefined)}
    className="w-full border rounded px-3 py-2"
  >
    <option value="">Personal (sin organización)</option>
    {myOrganizations.map(org => (
      <option key={org.organizationId} value={org.organizationId}>
        {org.organizationName}
      </option>
    ))}
  </select>
</div>

// 4. Pasar organizationId al upload
const document = await documentApi.upload(file, title, selectedOrgId)
```

**Archivos a modificar:**
- `frontend/src/app/documents/upload/page.tsx`

**Criterio de aceptación:**
- Dropdown muestra organizaciones del usuario
- Opción "Personal" disponible
- Document se sube con organizationId correcto
- Miembros de la org pueden ver el documento

---

### TASK-ORG-002: Filtro por Organización en Listado
**Estado:** ⚠️ Pendiente  
**Prioridad:** 🟡 ALTA  
**Estimación:** 1-2 horas

**Descripción:**
Agregar filtro en página de documentos para ver solo docs de una organización específica.

**Implementación:**
```typescript
// En /app/documents/page.tsx

// 1. Agregar estados
const [orgFilter, setOrgFilter] = useState<string>('')
const [myOrganizations, setMyOrganizations] = useState<UserOrganization[]>([])

// 2. Cargar organizaciones
useEffect(() => {
  const loadOrgs = async () => {
    const orgs = await organizationApi.getMyOrganizations()
    setMyOrganizations(orgs)
  }
  loadOrgs()
}, [])

// 3. Agregar filtro en UI
<div className="mb-4">
  <label className="block text-sm font-medium mb-2">Filtrar por:</label>
  <select
    value={orgFilter}
    onChange={(e) => setOrgFilter(e.target.value)}
    className="border rounded px-3 py-2"
  >
    <option value="">Todos los documentos</option>
    <option value="personal">Solo personales</option>
    {myOrganizations.map(org => (
      <option key={org.organizationId} value={org.organizationId}>
        {org.organizationName}
      </option>
    ))}
  </select>
</div>

// 4. Usar filtro al listar
const loadDocuments = async () => {
  const data = await documentApi.list(
    orgFilter === 'personal' ? undefined : (orgFilter || undefined)
  )
  setDocuments(data)
}
```

**Archivos a modificar:**
- `frontend/src/app/documents/page.tsx`

**Criterio de aceptación:**
- Filtro muestra todas las organizaciones del usuario
- Opción "Todos" muestra personales + organizacionales
- Opción "Solo personales" solo muestra docs sin org
- Filtro por org específica funciona correctamente

---

### TASK-ORG-003: Resolver Compilación Docker Services
**Estado:** ⚠️ Pendiente  
**Prioridad:** 🟡 ALTA  
**Estimación:** 2-3 horas

**Descripción:**
document-service y signature-service tienen errores de compilación en Docker por configuración de Feign/KAPT.

**Errores actuales:**
- document-service: Error KAPT NonExistentClass
- signature-service: Error KAPT en SecurityConfig

**Solución temporal:**
Levantar servicios localmente con gradlew bootRun

**Solución definitiva:**
1. Revisar configuración de Feign en ambos servicios
2. Verificar que dependencyManagement esté correcto
3. Revisar anotaciones @EnableFeignClients
4. Probar build local antes de Docker

**Archivos involucrados:**
- `backend/document-service/build.gradle`
- `backend/document-service/src/main/kotlin/com/docusing/document/DocumentServiceApplication.kt`
- `backend/signature-service/build.gradle`
- `backend/signature-service/src/main/kotlin/com/docusing/signature/SignatureServiceApplication.kt`

---

## 🟡 PRIORIDAD ALTA

### TASK-002: Hash SHA-256 del Documento Firmado
**Estado:** ✅ COMPLETADO  
**Estimación:** 2-3 horas

**Descripción:**
Generar hash SHA-256 del PDF final después de insertar todas las firmas para garantizar integridad del documento.

**Implementación:**
```kotlin
// 1. Agregar campo a SignatureRequestEntity
@Column(length = 64)
var documentHash: String? = null

// 2. En SignatureService.kt después de insertar firmas
private fun generateDocumentHash(pdfBytes: ByteArray): String {
    val digest = MessageDigest.getInstance("SHA-256")
    val hashBytes = digest.digest(pdfBytes)
    return hashBytes.joinToString("") { "%02x".format(it) }
}

// 3. Guardar hash al completar solicitud
request.documentHash = generateDocumentHash(finalPdfBytes)
```

**Archivos a modificar:**
- `backend/signature-service/src/main/kotlin/com/docusing/signature/domain/model/SignatureRequestEntity.kt`
- `backend/signature-service/src/main/kotlin/com/docusing/signature/domain/service/SignatureService.kt`
- `backend/signature-service/src/main/kotlin/com/docusing/signature/application/dto/SignatureRequestResponse.kt`

**Criterio de aceptación:**
- Hash se genera después de insertar última firma
- Hash se guarda en BD
- Hash se expone en API response
- Hash tiene 64 caracteres hexadecimales

---

### TASK-003: Certificado de Auditoría en PDF
**Estado:** ✅ COMPLETADO  
**Estimación:** 4-5 horas

**Descripción:**
Generar página final en PDF con certificado de auditoría estilo DocuSign con todos los metadatos de trazabilidad.

**Implementación:**
Crear `PDFAuditCertificate.kt`:
```kotlin
class PDFAuditCertificate {
    fun addAuditCertificate(
        document: PDDocument,
        signatureRequest: SignatureRequestEntity
    ) {
        val page = PDPage(PDRectangle.A4)
        document.addPage(page)
        
        PDPageContentStream(document, page).use { content ->
            // Header
            content.setFont(PDType1Font.HELVETICA_BOLD, 16f)
            content.beginText()
            content.newLineAtOffset(50f, 750f)
            content.showText("CERTIFICADO DE FIRMA DIGITAL")
            content.endText()
            
            // Document info
            content.setFont(PDType1Font.HELVETICA, 10f)
            content.beginText()
            content.newLineAtOffset(50f, 700f)
            content.showText("Documento: ${signatureRequest.title}")
            content.newLine()
            content.showText("Hash SHA-256: ${signatureRequest.documentHash}")
            content.newLine()
            content.showText("Completado: ${signatureRequest.completedAt}")
            content.endText()
            
            // Signers table
            var yPos = 650f
            signatureRequest.signers.forEach { signer ->
                content.beginText()
                content.newLineAtOffset(50f, yPos)
                content.showText("${signer.fullName} <${signer.email}>")
                content.newLine()
                content.showText("  Firmado: ${signer.signedAt}")
                content.newLine()
                content.showText("  IP: ${signer.signerIpAddress}")
                content.newLine()
                content.showText("  Método: ${signer.authenticationMethod}")
                content.endText()
                yPos -= 60f
            }
        }
    }
}
```

**Archivos a crear:**
- `backend/signature-service/src/main/kotlin/com/docusing/signature/infrastructure/pdf/PDFAuditCertificate.kt`

**Archivos a modificar:**
- `backend/signature-service/src/main/kotlin/com/docusing/signature/infrastructure/pdf/PDFSignatureInserter.kt`
- `backend/signature-service/src/main/kotlin/com/docusing/signature/domain/service/SignatureService.kt`

**Criterio de aceptación:**
- Página final agregada al PDF
- Contiene: título, hash, fecha completado
- Lista todos los firmantes con timestamps
- Muestra IP, User-Agent, método autenticación
- Formato profesional y legible

---

### TASK-004: AuditLogEntity para Trazabilidad Completa
**Estado:** ⚪ Pendiente  
**Estimación:** 3-4 horas

**Descripción:**
Crear entidad y servicio para registrar TODOS los accesos y acciones en el sistema (quién vio qué, cuándo, desde dónde).

**Implementación:**
```kotlin
@Entity
@Table(name = "audit_logs")
class AuditLogEntity(
    @Id @GeneratedValue
    val id: UUID? = null,
    
    @Column(nullable = false)
    val userId: UUID,
    
    @Column(nullable = false, length = 50)
    val action: String, // VIEW_DOCUMENT, REQUEST_OTP, SIGN, REJECT, etc.
    
    @Column(nullable = false)
    val resourceType: String, // DOCUMENT, SIGNATURE_REQUEST, SIGNER
    
    @Column(nullable = false)
    val resourceId: UUID,
    
    @Column(length = 64)
    val ipAddress: String?,
    
    @Column(length = 500)
    val userAgent: String?,
    
    @Column(length = 1000)
    val metadata: String?, // JSON con datos adicionales
    
    @CreationTimestamp
    @Column(nullable = false)
    val timestamp: Instant? = null
)
```

**Eventos a registrar:**
- `DOCUMENT_UPLOADED` - Usuario sube documento
- `DOCUMENT_VIEWED` - Usuario ve documento
- `SIGNATURE_REQUEST_CREATED` - Solicitud creada
- `SIGNATURE_REQUEST_VIEWED` - Solicitud vista
- `OTP_REQUESTED` - OTP solicitado por firmante
- `OTP_VALIDATED` - OTP validado correctamente
- `SIGNATURE_CAPTURED` - Firma capturada
- `DOCUMENT_SIGNED` - Firma aplicada
- `SIGNATURE_REJECTED` - Firma rechazada
- `DOCUMENT_DOWNLOADED` - PDF descargado

**Archivos a crear:**
- `backend/signature-service/src/main/kotlin/com/docusing/signature/domain/model/AuditLogEntity.kt`
- `backend/signature-service/src/main/kotlin/com/docusing/signature/domain/repository/AuditLogRepository.kt`
- `backend/signature-service/src/main/kotlin/com/docusing/signature/domain/service/AuditService.kt`

**Criterio de aceptación:**
- Todos los endpoints críticos registran acciones
- IP y User-Agent capturados
- Logs consultables por usuario, recurso, fecha
- Metadata en JSON para flexibilidad

---

### TASK-005: Endpoint PUT /api/documents/{id}/file
**Estado:** ✅ COMPLETADO  
**Estimación:** 2 horas

**Descripción:**
Crear endpoint en document-service para actualizar el archivo PDF de un documento (usado cuando se insertan firmas).

**Implementación:**
```kotlin
@PutMapping("/{documentId}/file")
fun updateDocumentFile(
    @PathVariable documentId: UUID,
    @RequestHeader("X-User-Id") userId: String,
    @RequestParam("file") file: MultipartFile
): ResponseEntity<DocumentResponse> {
    // Validar que el usuario tenga permisos
    // Actualizar archivo en storage
    // Actualizar metadata (tamaño, hash)
    // Mantener versión anterior como backup
}
```

**Archivos a modificar:**
- `backend/document-service/src/main/kotlin/com/docusing/document/application/controller/DocumentController.kt`
- `backend/document-service/src/main/kotlin/com/docusing/document/domain/service/DocumentService.kt`

**Criterio de aceptación:**
- Valida permisos del usuario
- Reemplaza archivo en storage
- Actualiza tamaño y metadata
- Retorna documento actualizado

---

## 🟢 PRIORIDAD MEDIA

### TASK-006: Firma Digital Certificada (PKI)
**Estado:** ⚪ Pendiente  
**Estimación:** 8-10 horas

**Descripción:**
Agregar firma digital criptográfica (no visual) al PDF usando certificado PKI para máxima seguridad legal.

**Complejidad:** Alta - Requiere certificado digital y KeyStore

---

### TASK-007: Versionado de Documentos
**Estado:** ⚪ Pendiente  
**Estimación:** 4-5 horas

**Descripción:**
Mantener historial de versiones del documento cada vez que se aplica una firma.

---

### TASK-008: Editor Visual de Posicionamiento
**Estado:** ⚪ Pendiente  
**Estimación:** 6-8 horas

**Descripción:**
Interfaz drag-and-drop en frontend para posicionar campos de firma visualmente sobre el PDF.

---

## 🔵 TESTING Y VALIDACIÓN

### TASK-009: Prueba E2E Completa
**Estado:** ⚪ Pendiente  
**Estimación:** 3-4 horas

**Flujo a probar:**
1. Login con password
2. Upload PDF
3. Crear solicitud 2 firmantes
4. Firmante 1: solicitar OTP → firmar → verificar auditoría
5. Firmante 2: solicitar OTP → firmar → verificar auditoría
6. Verificar inserción física de firmas en PDF
7. Verificar certificado de auditoría en última página
8. Descargar PDF firmado
9. Verificar hash SHA-256

---

## 📊 Resumen de Prioridades

| Tarea | Prioridad | Estado | Estimación |
|-------|-----------|--------|------------|
| TASK-001 | 🔴 CRÍTICA | ✅ Completado | - |
| TASK-ORG-001 | 🟡 ALTA | Pendiente | 1-2h |
| TASK-ORG-002 | 🟡 ALTA | Pendiente | 1-2h |
| TASK-ORG-003 | 🟡 ALTA | Pendiente | 2-3h |
| TASK-002 | 🟡 ALTA | ✅ Completado | - |
| TASK-003 | 🟡 ALTA | ✅ Completado | - |
| TASK-004 | 🟡 ALTA | Pendiente | 3-4h |
| TASK-005 | 🟡 ALTA | ✅ Completado | - |
| TASK-006 | 🟢 MEDIA | Pendiente | 8-10h |
| TASK-007 | 🟢 MEDIA | Pendiente | 4-5h |
| TASK-008 | 🟢 MEDIA | Pendiente | 6-8h |
| TASK-009 | 🔵 TEST | Pendiente | 3-4h |

**Tiempo total estimado pendiente:** 28-38 horas

## 🆕 Sistema de Organizaciones

**Estado:** ✅ 95% Completado

**Completado:**
- ✅ Backend completo (migraciones, entidades, servicios, controllers)
- ✅ Validación de permisos a nivel de backend
- ✅ Renovación de suscripciones suma tiempo restante
- ✅ Frontend (páginas de administración)
- ✅ API client completo
- ✅ Datos de prueba en migración V10

**Pendiente:**
- ⚠️ Selector de organización en upload (TASK-ORG-001)
- ⚠️ Filtro por organización en listado (TASK-ORG-002)
- ⚠️ Resolver compilación Docker (TASK-ORG-003)
- ⚠️ Testing E2E completo

**Ver documentación:** `docs/ORGANIZATIONS_SYSTEM.md`
