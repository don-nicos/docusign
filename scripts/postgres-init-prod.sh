#!/bin/bash
set -e

# Wrapper para ejecutar scripts/postgres-init-prod.sql usando variables de entorno.
# Útil en contenedores Docker de producción o en pipelines.
#
# Variables requeridas:
#   PGHOST, PGPORT, PGUSER, PGPASSWORD  -> credenciales de superusuario de Postgres
#   DB_APP_PASSWORD                      -> contraseña del usuario docusing_app
#
# Ejemplo:
#   export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGPASSWORD='...'
#   export DB_APP_PASSWORD='ContraseñaSegura123!'
#   ./scripts/postgres-init-prod.sh

: "${DB_APP_PASSWORD:?Falta la variable DB_APP_PASSWORD}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

psql \
  -v ON_ERROR_STOP=1 \
  -v app_password="$DB_APP_PASSWORD" \
  -f "${SCRIPT_DIR}/postgres-init-prod.sql"
