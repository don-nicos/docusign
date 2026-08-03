# 👥 Usuarios de Prueba

**Contraseña para todos**: `Test1234!`

---

## 📋 Lista de Usuarios

### 1. Juan Pérez González
- **Email**: `juan.perez@empresa.cl`
- **Contraseña**: `Test1234!`
- **RUT**: `12.345.678-9`
- **Nombre**: Juan
- **Apellido Paterno**: Pérez
- **Apellido Materno**: González
- **Teléfono**: `+56912345678`
- **Rol**: Administrador

### 2. María Silva Rodríguez
- **Email**: `maria.silva@empresa.cl`
- **Contraseña**: `Test1234!`
- **RUT**: `15.678.901-2`
- **Nombre**: María
- **Apellido Paterno**: Silva
- **Apellido Materno**: Rodríguez
- **Teléfono**: `+56923456789`
- **Rol**: Contadora

### 3. Carlos López Martínez
- **Email**: `carlos.lopez@empresa.cl`
- **Contraseña**: `Test1234!`
- **RUT**: `18.234.567-8`
- **Nombre**: Carlos
- **Apellido Paterno**: López
- **Apellido Materno**: Martínez
- **Teléfono**: `+56934567890`
- **Rol**: Gerente

### 4. Ana Torres Pinto
- **Email**: `ana.torres@legal.cl`
- **Contraseña**: `Test1234!`
- **RUT**: `14.567.890-1`
- **Nombre**: Ana
- **Apellido Paterno**: Torres
- **Apellido Materno**: Pinto
- **Teléfono**: `+56945678901`
- **Rol**: Legal

### 5. Pedro Morales Castillo
- **Email**: `pedro.morales@techco.cl`
- **Contraseña**: `Test1234!`
- **RUT**: `16.789.012-3`
- **Nombre**: Pedro
- **Apellido Paterno**: Morales
- **Apellido Materno**: Castillo
- **Teléfono**: `+56956789012`
- **Rol**: Desarrollador

### 6. Sofía Ramírez Fuentes
- **Email**: `sofia.ramirez@rrhh.cl`
- **Contraseña**: `Test1234!`
- **RUT**: `17.890.123-4`
- **Nombre**: Sofía
- **Apellido Paterno**: Ramírez
- **Apellido Materno**: Fuentes
- **Teléfono**: `+56967890123`
- **Rol**: Recursos Humanos

---

## 🧪 Cómo Probar

### Opción 1: Desde el Frontend
1. Ir a http://localhost:3000/auth/login
2. Ingresar email: `juan.perez@empresa.cl`
3. Ingresar contraseña: `Test1234!`
4. Click en "Ingresar"

### Opción 2: Con cURL
```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"juan.perez@empresa.cl","password":"Test1234!"}'
```

**Respuesta esperada**:
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "juan.perez@empresa.cl",
    "fullName": "Juan Pérez González",
    "rut": "12.345.678-9",
    "firstName": "Juan",
    "lastName": "Pérez",
    "secondLastName": "González",
    "phone": "+56912345678"
  }
}
```

---

## ✅ Verificaciones Realizadas

- [x] Migración V7: Agregar columnas de perfil
- [x] Migración V8: Actualizar nombres de usuarios
- [x] AuthMapper: Incluir nuevos campos en respuesta
- [x] UserEntity: Campos opcionales definidos
- [x] UserResponse: DTO actualizado

---

## 🔧 Si el Login Falla

1. **Verificar que auth-service esté corriendo**:
   ```bash
   curl http://localhost:8081/actuator/health
   ```

2. **Ver logs del servicio**:
   - Buscar errores en la consola donde corre `./gradlew bootRun`

3. **Verificar base de datos**:
   - Conectarse a PostgreSQL
   - Verificar que la tabla `users` tenga las columnas nuevas
   - Verificar que los usuarios existan

---

## 📝 Notas

- Todos los usuarios tienen el mismo hash de contraseña BCrypt
- Hash: `$2a$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WrxJgccpkRJLWPCQvGIa`
- Contraseña en texto plano: `Test1234!`
- Los campos `rut`, `firstName`, `lastName`, `secondLastName` son opcionales
- El campo `phone` también es opcional
