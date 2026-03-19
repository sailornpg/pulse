CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_documents (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE rag_documents
  ADD COLUMN IF NOT EXISTS scope TEXT GENERATED ALWAYS AS (
    COALESCE(NULLIF(metadata->>'scope', ''), 'user')
  ) STORED;

ALTER TABLE rag_documents
  ADD COLUMN IF NOT EXISTS owner_user_id TEXT GENERATED ALWAYS AS (
    NULLIF(metadata->>'user_id', '')
  ) STORED;

ALTER TABLE rag_documents
  ADD COLUMN IF NOT EXISTS document_id TEXT GENERATED ALWAYS AS (
    COALESCE(NULLIF(metadata->>'document_id', ''), SPLIT_PART(id, ':', 1), id)
  ) STORED;

ALTER TABLE rag_documents
  ADD COLUMN IF NOT EXISTS knowledge_base_id TEXT GENERATED ALWAYS AS (
    COALESCE(NULLIF(metadata->>'knowledge_base_id', ''), 'default_kb')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_rag_documents_metadata_gin
  ON rag_documents
  USING gin (metadata);

CREATE INDEX IF NOT EXISTS idx_rag_documents_user_updated
  ON rag_documents (owner_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_rag_documents_scope_updated
  ON rag_documents (scope, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_rag_documents_document_id
  ON rag_documents (document_id);

CREATE INDEX IF NOT EXISTS idx_rag_documents_kb_id
  ON rag_documents (knowledge_base_id, updated_at DESC);

CREATE OR REPLACE FUNCTION set_rag_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rag_documents_updated_at ON rag_documents;

CREATE TRIGGER trg_rag_documents_updated_at
  BEFORE UPDATE ON rag_documents
  FOR EACH ROW
  EXECUTE FUNCTION set_rag_documents_updated_at();

ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户可读取自己的知识和默认知识" ON rag_documents;
DROP POLICY IF EXISTS "用户只能写自己的知识库文档" ON rag_documents;
DROP POLICY IF EXISTS "用户只能更新自己的知识库文档" ON rag_documents;
DROP POLICY IF EXISTS "用户只能删除自己的知识库文档" ON rag_documents;

CREATE POLICY "用户可读取自己的知识和默认知识" ON rag_documents
  FOR SELECT
  USING (scope = 'default' OR owner_user_id = auth.uid()::text);

CREATE POLICY "用户只能写自己的知识库文档" ON rag_documents
  FOR INSERT
  WITH CHECK (scope = 'user' AND owner_user_id = auth.uid()::text);

CREATE POLICY "用户只能更新自己的知识库文档" ON rag_documents
  FOR UPDATE
  USING (scope = 'user' AND owner_user_id = auth.uid()::text)
  WITH CHECK (scope = 'user' AND owner_user_id = auth.uid()::text);

CREATE POLICY "用户只能删除自己的知识库文档" ON rag_documents
  FOR DELETE
  USING (scope = 'user' AND owner_user_id = auth.uid()::text);

CREATE OR REPLACE FUNCTION match_rag_documents(
  query_embedding vector(1536),
  match_count INT DEFAULT 4,
  filter JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id TEXT,
  content TEXT,
  metadata JSONB,
  embedding vector(1536),
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rag_documents.id,
    rag_documents.content,
    rag_documents.metadata,
    rag_documents.embedding,
    1 - (rag_documents.embedding <=> query_embedding) AS similarity
  FROM rag_documents
  WHERE rag_documents.metadata @> filter
  ORDER BY rag_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
