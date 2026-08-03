# ⚙️ CONFIGURACIÓN TÉCNICA DETALLADA
**Última actualización:** 2025-10-14 17:27

---

## 📦 Dependencias por Servicio

### auth-service (build.gradle)
```gradle
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-security'
    implementation 'org.springframework.boot:spring-boot-starter-oauth2-resource-server'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-webflux'
    implementation 'com.fasterxml.jackson.module:jackson-module-kotlin'
    implementation 'org.jetbrains.kotlin:kotlin-reflect'
    implementation 'io.github.microutils:kotlin-logging-jvm:3.0.5'
    implementation 'com.auth0:java-jwt:4.4.0'
    implementation 'com.michael-bull.kotlin-result:kotlin-result:1.1.18'
    implementation 'org.flywaydb:flyway-core'
    runtimeOnly 'com.h2database:h2'
}
```

### signature-service (build.gradle)
```gradle
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-webflux'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    implementation 'com.fasterxml.jackson.module:jackson-module-kotlin'
    implementation 'org.jetbrains.kotlin:kotlin-reflect'
    implementation 'io.github.microutils:kotlin-logging-jvm:3.0.5'
    implementation 'org.apache.pdfbox:pdfbox:3.0.1'
    runtimeOnly 'com.h2database:h2'
}
```

### frontend (package.json)
```json
{
  "dependencies": {
    "next": "15.5.4",
    "react": "^19",
    "react-dom": "^19",
    "react-pdf": "^9.1.1",
    "react-signature-canvas": "^1.0.6"
  }
}
```

---

## 🔧 application.properties Completos

### auth-service
```properties
spring.application.name=auth-service
server.port=8081

# H2 Database (Persistente)
spring.datasource.url=jdbc:h2:file:./data/authdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
spring.datasource.username=sa
spring.datasource.password=
spring.jpa.hibernate.ddl-auto=none
spring.jpa.open-in-view=false
spring.jpa.properties.hibernate.format_sql=true

# Flyway
spring.flyway.enabled=true
spring.flyway.baseline-on-migrate=true
spring.flyway.locations=classpath:db/migration

# H2 Console
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console

# JWT
jwt.secret=change-this-secret
jwt.expiration-minutes=60
jwt.refresh-expiration-minutes=10080

# External Services
notification.service.base-url=http://localhost:8084
app.frontend.base-url=http://localhost:3000

# Magic Links
magic-link.expiration-minutes=15
magic-link.resend-minutes=5

# Development Mode
auth.dev-mode=false
```

### signature-service
```properties
spring.application.name=signature-service
server.port=8083

# H2 Database
spring.datasource.url=jdbc:h2:mem:signaturedb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
spring.datasource.username=sa
spring.datasource.password=
spring.jpa.hibernate.ddl-auto=update
spring.jpa.open-in-view=false
spring.jpa.properties.hibernate.format_sql=true

# H2 Console
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console

# External Services
document.service.base-url=http://localhost:8082
notification.service.base-url=http://localhost:8084

# OTP Configuration
otp.length=6
otp.expiration-minutes=10

# Frontend
app.frontend.base-url=http://localhost:3000

# Signature Policy
signature.enforce-order=false
```

### document-service
```properties
spring.application.name=document-service
server.port=8082

# H2 Database
spring.datasource.url=jdbc:h2:mem:documentdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
spring.datasource.username=sa
spring.datasource.password=
spring.jpa.hibernate.ddl-auto=update

# H2 Console
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console

# File Storage
storage.documents.base-path=./data/documents
```

### notification-service
```properties
spring.application.name=notification-service
server.port=8084

# Email (MailHog)
spring.mail.host=localhost
spring.mail.port=1025
spring.mail.username=
spring.mail.password=
spring.mail.properties.mail.smtp.auth=false
spring.mail.properties.mail.smtp.starttls.enable=false

# Email Templates
email.from=noreply@docusing.com
email.base-url=http://localhost:3000
```

---

## 🗄️ Esquema de Base de Datos

### auth-service (users)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    rut VARCHAR(20),
    phone VARCHAR(20),
    address VARCHAR(500),
    birth_date DATE,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE magic_link_tokens (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    redirect_path VARCHAR(500),
    created_at TIMESTAMP NOT NULL
);
```

### signature-service (signers)
```sql
CREATE TABLE signature_requests (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL,
    expires_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE signers (
    id UUID PRIMARY KEY,
    signature_request_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    order_index INT NOT NULL,
    status VARCHAR(32) NOT NULL,
    otp_code VARCHAR(16),
    otp_expires_at TIMESTAMP,
    otp_last_sent_at TIMESTAMP,
    signed_at TIMESTAMP,
    signature_image_path VARCHAR(500),
    signature_position_x DOUBLE,
    signature_position_y DOUBLE,
    signature_page INT,
    signature_width DOUBLE,
    signature_height DOUBLE,
    rejection_reason VARCHAR(255),
    -- Auditoría
    signer_ip_address VARCHAR(64),
    authentication_method VARCHAR(32),
    signer_user_agent VARCHAR(500),
    --
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (signature_request_id) REFERENCES signature_requests(id)
);
```

---

## 🌐 API Endpoints

### auth-service (8081)
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
GET    /api/auth/me
POST   /api/auth/magic-link/request
POST   /api/auth/magic-link/exchange

# Development only
POST   /api/dev/login
```

### document-service (8082)
```
POST   /api/documents                 (upload)
GET    /api/documents
GET    /api/documents/{id}
GET    /api/documents/{id}/download
PUT    /api/documents/{id}/title
POST   /api/documents/{id}/lock
DELETE /api/documents/{id}

# Pendiente
PUT    /api/documents/{id}/file
```

### signature-service (8083)
```
POST   /api/signatures                         (create request)
GET    /api/signatures
GET    /api/signatures/{id}
GET    /api/signatures/document/{documentId}
POST   /api/signatures/signer/{signerId}/request-otp
POST   /api/signatures/signer/{signerId}/sign
POST   /api/signatures/signer/{signerId}/reject
POST   /api/signatures/signer/{signerId}/upload-signature
GET    /api/signatures/signer/{signerId}/info
GET    /api/signatures/{requestId}/download-signed
GET    /api/signatures/images/{filename}
```

### notification-service (8084)
```
POST   /api/notifications/email/otp
POST   /api/notifications/email/magic-link
POST   /api/notifications/email/signature-completed
```

---

## 🔐 Seguridad y Autenticación

### JWT Token Structure
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "fullName": "User Name",
  "exp": 1697654321,
  "iat": 1697650721
}
```

### Headers Requeridos
```
Authorization: Bearer {jwt-token}
X-User-Id: {user-uuid}
```

### Password Hashing
```kotlin
// BCrypt con salt automático
val encoder = BCryptPasswordEncoder()
val hash = encoder.encode(rawPassword)
val matches = encoder.matches(rawPassword, hash)
```

---

## 📁 Estructura de Directorios

```
docusing/
├── backend/
│   ├── auth-service/
│   │   ├── data/authdb.*          (H2 persistente)
│   │   └── src/main/resources/
│   │       └── db/migration/      (Flyway)
│   ├── document-service/
│   │   └── data/documents/        (PDFs)
│   ├── signature-service/
│   │   └── data/signatures/       (PNGs)
│   └── notification-service/
├── frontend/
│   ├── src/
│   │   ├── app/                   (Next.js App Router)
│   │   ├── components/
│   │   ├── lib/
│   │   └── types/
│   └── public/
└── docs/                          (Esta documentación)
```

---

## 🐳 Docker Compose (MailHog)

```yaml
services:
  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
```

**Acceso:** http://localhost:8025
