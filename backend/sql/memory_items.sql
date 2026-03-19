CREATE TABLE IF NOT EXISTS memory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (
    kind IN (
      'preference',
      'constraint',
      'project_context',
      'open_loop',
      'long_term_fact'
    )
  ),
  canonical_key TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'superseded', 'archived')
  ),
  confidence DOUBLE PRECISION DEFAULT 0.7,
  source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  source_message_id UUID,
  embedding JSONB,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  supersedes_id UUID REFERENCES memory_items(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_items_user_status
  ON memory_items(user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_items_user_kind
  ON memory_items(user_id, kind, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_items_user_active_key
  ON memory_items(user_id, canonical_key)
  WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_files_user_path_unique
  ON agent_files(user_id, file_path);

ALTER TABLE memory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户只能管理自己的结构化记忆" ON memory_items;

CREATE POLICY "用户只能管理自己的结构化记忆" ON memory_items
  FOR ALL USING (auth.uid() = user_id);
