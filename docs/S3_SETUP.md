# 🗄️ Configuración de S3 con LocalStack

## 📋 Resumen

Se ha implementado almacenamiento en S3 usando LocalStack para desarrollo. Los archivos se organizan con estructura de carpetas por usuario.

---

## 🏗️ Estructura de Carpetas en S3

### Bucket: `docusing-signed-pdfs`
```
{ownerId}/
  └── {requestId}/
      ├── v0.pdf          # PDF original
      ├── v1.pdf          # Versión con 1 firma
      ├── v2.pdf          # Versión con 2 firmas
      └── v3.pdf          # Versión final con certificado
```

**Ejemplo**:
```
a1b2c3d4-e5f6-7890-abcd-ef1234567890/
  └── 9ca328ae-9d5e-4253-aa61-13914393294a/
      ├── v0.pdf
      ├── v1.pdf
      ├── v2.pdf
      └── v3.pdf
```

### Bucket: `docusing-signatures`
```
signatures/
  └── {signerId}/
      └── {timestamp}.png
```

**Ejemplo**:
```
signatures/
  └── 027a3292-b9ee-4cb6-86a0-d33a5b6e0411/
      ├── 1760985631986.png
      └── 1760985632123.png
```

---

## 🚀 Levantar LocalStack

### 1. Iniciar con Docker Compose

```bash
cd /Users/felipe.ibacache/Bitbucket/docusing
docker-compose up -d localstack
```

### 2. Verificar que está corriendo

```bash
docker-compose ps localstack
```

Deberías ver:
```
NAME                  STATUS    PORTS
docusing-localstack-1 Up        0.0.0.0:4566->4566/tcp
```

### 3. Verificar buckets creados

```bash
aws --endpoint-url=http://localhost:4566 s3 ls
```

Deberías ver:
```
2025-10-20 17:00:00 docusing-signed-pdfs
2025-10-20 17:00:00 docusing-signatures
```

---

## 🔧 Configuración

### application.properties
```properties
# AWS S3 (LocalStack para desarrollo)
aws.s3.endpoint=http://localhost:4566
aws.s3.region=us-east-1
aws.s3.access-key=test
aws.s3.secret-key=test
aws.s3.bucket.signed-pdfs=docusing-signed-pdfs
aws.s3.bucket.signatures=docusing-signatures
```

### Para Producción (AWS Real)
```properties
# AWS S3 (Producción)
aws.s3.endpoint=  # Dejar vacío para usar AWS real
aws.s3.region=us-east-1
aws.s3.access-key=${AWS_ACCESS_KEY_ID}
aws.s3.secret-key=${AWS_SECRET_ACCESS_KEY}
aws.s3.bucket.signed-pdfs=docusing-prod-signed-pdfs
aws.s3.bucket.signatures=docusing-prod-signatures
```

---

## 📦 Dependencias Agregadas

### build.gradle
```gradle
// AWS SDK para S3
implementation platform('software.amazon.awssdk:bom:2.20.26')
implementation 'software.amazon.awssdk:s3'
```

---

## 🧪 Comandos Útiles de AWS CLI

### Listar archivos en un bucket
```bash
aws --endpoint-url=http://localhost:4566 s3 ls s3://docusing-signed-pdfs/
```

### Listar archivos de un usuario específico
```bash
aws --endpoint-url=http://localhost:4566 s3 ls s3://docusing-signed-pdfs/a1b2c3d4-e5f6-7890-abcd-ef1234567890/
```

### Descargar un archivo
```bash
aws --endpoint-url=http://localhost:4566 s3 cp \
  s3://docusing-signed-pdfs/a1b2c3d4-e5f6-7890-abcd-ef1234567890/9ca328ae-9d5e-4253-aa61-13914393294a/v3.pdf \
  ./downloaded.pdf
```

### Subir un archivo de prueba
```bash
aws --endpoint-url=http://localhost:4566 s3 cp \
  test.pdf \
  s3://docusing-signed-pdfs/test-user/test-request/v0.pdf
```

### Ver metadatos de un archivo
```bash
aws --endpoint-url=http://localhost:4566 s3api head-object \
  --bucket docusing-signed-pdfs \
  --key a1b2c3d4-e5f6-7890-abcd-ef1234567890/9ca328ae-9d5e-4253-aa61-13914393294a/v3.pdf
```

### Eliminar un archivo
```bash
aws --endpoint-url=http://localhost:4566 s3 rm \
  s3://docusing-signed-pdfs/test-user/test-request/v0.pdf
```

### Vaciar un bucket
```bash
aws --endpoint-url=http://localhost:4566 s3 rm \
  s3://docusing-signed-pdfs/ --recursive
```

---

## 🔍 Verificar Integración

### 1. Crear solicitud de firma
```bash
# El sistema creará automáticamente la estructura de carpetas en S3
```

### 2. Firmar documento
```bash
# Cada firma generará una nueva versión en S3
# Estructura: {ownerId}/{requestId}/v{N}.pdf
```

### 3. Verificar en S3
```bash
aws --endpoint-url=http://localhost:4566 s3 ls \
  s3://docusing-signed-pdfs/{ownerId}/{requestId}/
```

Deberías ver:
```
2025-10-20 17:10:00  123456 v1.pdf
2025-10-20 17:15:00  234567 v2.pdf
2025-10-20 17:20:00  345678 v3.pdf
```

---

## 🐛 Troubleshooting

### LocalStack no inicia
```bash
# Ver logs
docker-compose logs localstack

# Reiniciar
docker-compose restart localstack
```

### Buckets no se crean
```bash
# Verificar script de inicialización
cat scripts/localstack-init.sh

# Ejecutar manualmente
docker-compose exec localstack bash
awslocal s3 mb s3://docusing-signed-pdfs
awslocal s3 mb s3://docusing-signatures
```

### Error de conexión desde signature-service
```bash
# Verificar que LocalStack está accesible
curl http://localhost:4566/_localstack/health

# Verificar configuración en application.properties
cat backend/signature-service/src/main/resources/application.properties | grep aws.s3
```

### Limpiar datos de LocalStack
```bash
# Detener y eliminar volumen
docker-compose down -v
docker volume rm docusing_localstack-data

# Reiniciar
docker-compose up -d localstack
```

---

## 📊 Ventajas de S3

| Ventaja | Descripción |
|---------|-------------|
| **Escalabilidad** | Almacenamiento ilimitado |
| **Organización** | Estructura de carpetas por usuario |
| **Durabilidad** | 99.999999999% (11 nueves) |
| **Acceso directo** | URLs presignadas para descarga |
| **Versionado** | Historial completo de cambios |
| **Costos** | Pago por uso real |

---

## 🔐 Seguridad

### Políticas de Bucket (Producción)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT-ID:role/docusing-backend"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::docusing-prod-signed-pdfs/*"
    }
  ]
}
```

### Encriptación
```properties
# Habilitar encriptación en reposo (producción)
aws.s3.encryption.enabled=true
aws.s3.encryption.kms-key-id=arn:aws:kms:us-east-1:ACCOUNT-ID:key/KEY-ID
```

---

## 📝 Archivos Creados

- ✅ `docker-compose.yml` - Servicio LocalStack
- ✅ `scripts/localstack-init.sh` - Inicialización de buckets
- ✅ `S3Config.kt` - Configuración de cliente S3
- ✅ `S3SignedPdfStorage.kt` - Storage de PDFs en S3
- ✅ `S3SignatureImageStorage.kt` - Storage de imágenes en S3
- ✅ `application.properties` - Configuración de S3

---

**LocalStack está listo para desarrollo. Para producción, cambiar endpoint a AWS real** ✅🗄️☁️
