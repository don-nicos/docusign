-- Script de inicialización de Postgres para producción.
-- Crea un usuario de aplicación, las cuatro bases de datos y las extensiones necesarias.
--
-- Ejemplo de uso:
--   psql -U postgres -v app_password='ContraseñaSegura123!' -f scripts/postgres-init-prod.sql
--
-- Si lo ejecutás dentro de un contenedor Docker con variables de entorno,
-- podés usar el wrapper scripts/postgres-init-prod.sh o pasar las variables con:
--   psql -v app_password="$DB_APP_PASSWORD" -f scripts/postgres-init-prod.sql

-- Conectarse a la base por defecto para poder crear nuevas bases de datos
\c postgres

-- Crear rol de aplicación con contraseña desde variable :app_password
CREATE ROLE docusing_app WITH LOGIN PASSWORD :'app_password';

-- Crear bases de datos, una por servicio
CREATE DATABASE docusing_auth OWNER docusing_app;
CREATE DATABASE docusing_document OWNER docusing_app;
CREATE DATABASE docusing_signature OWNER docusing_app;
CREATE DATABASE docusing_payment OWNER docusing_app;

-- Configurar seguridad por defecto del esquema public
-- (evita que cualquier usuario conectado cree objetos en public)
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- Crear extensión pgcrypto y asignar permisos en cada base
\c docusing_auth
CREATE EXTENSION IF NOT EXISTS pgcrypto;
GRANT USAGE, CREATE ON SCHEMA public TO docusing_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO docusing_app;

\c docusing_document
CREATE EXTENSION IF NOT EXISTS pgcrypto;
GRANT USAGE, CREATE ON SCHEMA public TO docusing_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO docusing_app;

\c docusing_signature
CREATE EXTENSION IF NOT EXISTS pgcrypto;
GRANT USAGE, CREATE ON SCHEMA public TO docusing_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO docusing_app;

\c docusing_payment
CREATE EXTENSION IF NOT EXISTS pgcrypto;
GRANT USAGE, CREATE ON SCHEMA public TO docusing_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO docusing_app;
