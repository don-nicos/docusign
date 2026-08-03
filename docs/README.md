# 📚 DOCUMENTACIÓN - DOCUSING

**Última actualización:** 19 de Diciembre, 2025  
**Estado del proyecto:** 97% completado

---

## 🐳 Docker + Ngrok Quickstart (recommended)

1. **Start the full stack**
   ```bash
   docker-compose up -d --build
   ```

2. **Create public URLs for Mercado Pago (frontend + backend)**
   ```bash
   bash scripts/ngrok_up.sh
   ```
   This script:
   - Starts tunnels for frontend (3000) and backend (8085).
   - Updates `env/payment-service.env` with `APP_FRONTEND_BASE_URL` and `MERCADOPAGO_NOTIFICATION_URL`.
   - Automatically recreates `payment-service`.

3. **Validate service health**
   ```bash
   docker-compose ps
   ```
   All services should show **healthy** (actuator enabled).

4. **Open UI and MailHog**
   - Frontend: http://localhost:3000
   - MailHog: http://localhost:8025

5. **Test subscription and signing**
   - Subscription: return URL includes `?mp=success&ref=<chargeId>`
   - Signing: create a request and download “Original” (version 0)

---

## � INICIO RÁPIDO

**Si eres un modelo de IA que necesita continuar este proyecto:**

1. **EMPEZAR AQUÍ:** Lee [CURRENT_STATE.md](./CURRENT_STATE.md)
2. **FEATURE NUEVO:** Revisa [ORGANIZATIONS_SYSTEM.md](./ORGANIZATIONS_SYSTEM.md)
3. **TAREAS:** Consulta [PENDING_TASKS.md](./PENDING_TASKS.md)
4. **CONFIGURACIÓN:** Mira [TECHNICAL_CONFIG.md](./TECHNICAL_CONFIG.md)

---

## 📋 Estructura de la Documentación

```
docs/
├── README.md                    ← ESTÁS AQUÍ
├── CURRENT_STATE.md            ← Estado actual completo del sistema
├── ORGANIZATIONS_SYSTEM.md     ← Sistema de organizaciones empresariales
├── PENDING_TASKS.md            ← Tareas pendientes
├── TECHNICAL_CONFIG.md         ← Configuraciones técnicas
├── S3_SETUP.md                 ← Setup de S3/LocalStack
└── USUARIOS_PRUEBA.md          ← Usuarios de prueba con ejemplos
```

---

## ⚡ Resumen Ejecutivo de 1 Minuto

### Qué es Docusing
Sistema de firma digital estilo DocuSign con:
- Auditoría legal completa (IP, timestamps, método autenticación)
- OTP único por firmante
- Inserción física de firmas en PDF
- Multi-firmante con orden configurable

### Stack Técnico
- **Backend:** Kotlin + Spring Boot 3.5 + H2
- **Frontend:** Next.js 15 + TypeScript + Tailwind
- **PDF:** Apache PDFBox 3.0.1
- **Migraciones:** Flyway

### Estado Actual
✅ **Completado (85%):**
- Autenticación JWT + Magic Links
- Gestión de documentos
- Solicitudes multi-firmante
- Captura de firmas (canvas/typed/upload)
- OTP seguro
- Auditoría legal (IP, User-Agent, método)
- Flyway + H2 persistente

🔴 **Error Crítico:**
- Login con password fallando (Flyway V2 no carga usuarios correctamente)
- **Solución temporal:** Usar `/api/dev/login`

📝 **Pendiente (15%):**
- Resolver login con password ⚠️
- Hash SHA-256 del documento
- Certificado de auditoría en PDF
- AuditLogEntity completa
- Endpoint PUT para actualizar PDF

### Servicios Activos
```
auth-service:       http://localhost:8081
document-service:   http://localhost:8082  
signature-service:  http://localhost:8083
notification-service: http://localhost:8084
frontend:           http://localhost:3000
MailHog:            http://localhost:8025
```

### Usuarios de Prueba
```
📧 USUARIOS DE PRUEBA (Contraseña para todos: Test1234!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. juan.perez@empresa.cl    - Juan Pérez González
2. maria.silva@empresa.cl   - María Silva Rodríguez  
3. carlos.lopez@empresa.cl  - Carlos López Martínez
4. ana.torres@legal.cl      - Ana Torres Pinto
5. pedro.morales@techco.cl  - Pedro Morales Castillo
6. sofia.ramirez@rrhh.cl    - Sofía Ramírez Fuentes
```

---

## 🎯 Próxima Acción Recomendada

### Prioridad #1: Resolver Login
```bash
# 1. Verificar usuarios en H2
open http://localhost:8081/h2-console
# JDBC URL: jdbc:h2:file:./data/authdb

# 2. Query
SELECT email, password_hash FROM users;

# 3. Si vacío, limpiar y recrear
cd backend/auth-service
pkill -f 'auth-service'
rm -rf data/authdb*
./gradlew bootRun

# 4. Verificar logs Flyway
grep -i "Successfully validated" logs
```

### Prioridad #2: Hash SHA-256
Ver [PENDING_TASKS.md](./PENDING_TASKS.md#task-002) para implementación completa.

---

## 📞 Información de Contacto

**Proyecto:** Docusing - Sistema de Firma Digital  
**Cliente/Equipo:** Felipe Ibacache  
**Repositorio:** /Users/felipe.ibacache/Bitbucket/docusing/  
**Documentación generada por:** Cascade AI

---

## ✅ Checklist de Continuación

Antes de continuar, asegúrate de:

- [ ] Leer SESSION_INDEX.md completo
- [ ] Entender el error crítico en CRITICAL_ISSUES.md
- [ ] Revisar arquitectura en CURRENT_STATE.md
- [ ] Verificar que los servicios estén corriendo
- [ ] Confirmar acceso a H2 Console
- [ ] Tener comandos de COMMANDS_PROCEDURES.md a mano
- [ ] Conocer los archivos clave de CODE_REFERENCES.md

---

## 🆘 ¿Perdido? Guía Rápida

**Quiero entender el proyecto:**
→ Lee [CURRENT_STATE.md](./CURRENT_STATE.md)

**Quiero continuar desarrollando:**
→ Lee [PENDING_TASKS.md](./PENDING_TASKS.md)

**Algo no funciona:**
→ Revisa [CRITICAL_ISSUES.md](./CRITICAL_ISSUES.md) y [COMMANDS_PROCEDURES.md](./COMMANDS_PROCEDURES.md)

**Necesito ver el código:**
→ Consulta [CODE_REFERENCES.md](./CODE_REFERENCES.md)

**Necesito configurar algo:**
→ Mira [TECHNICAL_CONFIG.md](./TECHNICAL_CONFIG.md)

---

**¡Éxito en el desarrollo! 🚀**
