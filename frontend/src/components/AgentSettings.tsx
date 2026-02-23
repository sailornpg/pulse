import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

interface AgentFile {
  id: string;
  file_path: string;
  content: string;
  file_type: string;
  updated_at: string;
}

interface AgentSettingsProps {
  userId: string | null;
  onClose: () => void;
}

export function AgentSettings({ userId, onClose }: AgentSettingsProps) {
  const [files, setFiles] = useState<AgentFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<AgentFile | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userId) {
      loadFiles();
    }
  }, [userId]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/agent/files', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
        if (data.length > 0 && !selectedFile) {
          setSelectedFile(data[0]);
          setEditContent(data[0].content);
        }
      }
    } catch (error) {
      console.error('加载文件失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/agent/files/${selectedFile.file_path}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          content: editContent,
          reason: '用户在设置中手动修改'
        })
      });
      if (res.ok) {
        await loadFiles();
        alert('保存成功！');
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const getFileName = (path: string) => {
    const names: Record<string, string> = {
      'soul.md': '🧠 灵魂',
      'rules.md': '📋 规则',
      'memory.md': '💭 记忆',
      'user.md': '👤 用户'
    };
    return names[path] || path;
  };

  if (!userId) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="py-8 text-center text-zinc-500">
          请先登录以查看 AI 记忆设置
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🧠 AI 记忆设置</span>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <div className="flex flex-col gap-1 w-40">
            {files.map(file => (
              <button
                key={file.id}
                onClick={() => {
                  setSelectedFile(file);
                  setEditContent(file.content);
                }}
                className={`text-left px-3 py-2 rounded text-sm transition-colors ${
                  selectedFile?.id === file.id 
                    ? 'bg-emerald-600 text-white' 
                    : 'hover:bg-zinc-800 text-zinc-400'
                }`}
              >
                {getFileName(file.file_path)}
              </button>
            ))}
          </div>
          
          <div className="flex-1">
            {selectedFile ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{selectedFile.file_path}</Badge>
                  <span className="text-xs text-zinc-500">
                    更新于 {new Date(selectedFile.updated_at).toLocaleString()}
                  </span>
                </div>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-96 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <div className="flex justify-end mt-2">
                  <Button 
                    onClick={saveFile} 
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {saving ? '保存中...' : '保存修改'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="h-96 flex items-center justify-center text-zinc-500">
                {loading ? '加载中...' : '选择要查看的文件'}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
