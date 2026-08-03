-- Create documents table for document-service
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY,
    content_type VARCHAR(255) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    file_size BIGINT NOT NULL,
    hash_sha256 VARCHAR(64) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('DRAFT', 'LOCKED', 'ARCHIVED')),
    storage_key VARCHAR(512) NOT NULL,
    title VARCHAR(180) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
