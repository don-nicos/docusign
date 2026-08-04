CREATE DATABASE docusing_auth;
CREATE DATABASE docusing_document;
CREATE DATABASE docusing_signature;
CREATE DATABASE docusing_payment;

-- Asegurar permisos sobre el esquema public en cada base
\c docusing_auth
GRANT ALL ON SCHEMA public TO docusing;

\c docusing_document
GRANT ALL ON SCHEMA public TO docusing;

\c docusing_signature
GRANT ALL ON SCHEMA public TO docusing;

\c docusing_payment
GRANT ALL ON SCHEMA public TO docusing;
