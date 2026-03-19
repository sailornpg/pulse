CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE rag_documents
  ALTER COLUMN embedding TYPE vector(2560);

DROP FUNCTION IF EXISTS match_rag_documents(vector(1536), INT, JSONB);
DROP FUNCTION IF EXISTS match_rag_documents(vector(2560), INT, JSONB);

CREATE OR REPLACE FUNCTION match_rag_documents(
  query_embedding vector(2560),
  match_count INT DEFAULT 4,
  filter JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id TEXT,
  content TEXT,
  metadata JSONB,
  embedding vector(2560),
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
