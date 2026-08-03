-- Agregar trace_id para trazabilidad end-to-end en document-service

-- Tabla principal de documentos
ALTER TABLE documents 
ADD COLUMN trace_id VARCHAR(36);

CREATE INDEX idx_documents_trace_id ON documents(trace_id);

-- Tabla de logs de integración HTTP
ALTER TABLE http_integration_logs 
ADD COLUMN trace_id VARCHAR(36);

CREATE INDEX idx_http_integration_logs_trace_id ON http_integration_logs(trace_id);

-- Comentarios
COMMENT ON COLUMN documents.trace_id IS 'UUID de trazabilidad end-to-end generado en el frontend';
COMMENT ON COLUMN http_integration_logs.trace_id IS 'UUID de trazabilidad para correlacionar llamadas HTTP';
