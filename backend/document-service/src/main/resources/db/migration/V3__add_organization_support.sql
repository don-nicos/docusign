-- Add organization support to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_organization_document BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON documents(organization_id);
