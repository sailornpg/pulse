import React from 'react';
import { ExternalLink, Globe, Image as ImageIcon, Quote } from 'lucide-react';

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score?: number;
  published_date?: string;
}

interface TavilyImage {
  url: string;
  description?: string;
}

interface SearchResultProps {
  result: any;
  args?: any;
}

export function SearchResult({ result, args }: SearchResultProps) {
  // 处理可能的结果格式
  // Tavily MCP 通常返回 content 数组，其中第一项可能是 JSON 字符串，也可能是结构化对象
  let data: TavilyResult[] = [];
  let images: TavilyImage[] = [];

  try {
    // 假设 result 是 MCP 返回的原始 content 数组
    const content = Array.isArray(result) ? result[0]?.text || result[0] : result;
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    
    // Tavily 的返回结构通常是 { results: [...], images: [...] }
    data = parsed.results || (Array.isArray(parsed) ? parsed : []);
    images = parsed.images || [];
  } catch (e) {
    console.warn('Failed to parse search results', e);
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-3 space-y-2">
        <div className="text-zinc-500 text-[11px] italic">
          以下是本次搜索的参数：
        </div>
        <div className="bg-black/30 rounded-lg p-3 border border-zinc-800/50">
           <pre className="text-[10px] text-zinc-400 font-mono whitespace-pre-wrap">
             {JSON.stringify(args, null, 2)}
           </pre>
        </div>
        <div className="text-zinc-500 text-[11px] italic">
          以下是本次搜索的结果：
        </div>
        <div className="bg-black/30 rounded-lg p-3 border border-zinc-800/50">
           <pre className="text-[10px] text-zinc-400 font-mono whitespace-pre-wrap">
             {JSON.stringify(result, null, 2)}
           </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. 来源引用卡片 (Citations) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.slice(0, 4).map((item, idx) => (
          <a
            key={idx}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 p-3 bg-zinc-900/40 rounded-xl border border-zinc-800/50 hover:bg-zinc-800/40 hover:border-zinc-700/50 transition-all duration-300"
          >
            <div className="mt-1 p-1.5 bg-zinc-800 rounded-lg group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
              <Globe size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[12px] font-medium text-zinc-200 line-clamp-1 group-hover:text-blue-400">
                {item.title}
              </h4>
              <p className="text-[10px] text-zinc-500 mt-0.5 truncate flex items-center gap-1">
                {new URL(item.url).hostname}
                <ExternalLink size={8} />
              </p>
            </div>
          </a>
        ))}
      </div>

      {/* 2. 图片展示 (如果有) */}
      {images.length > 0 && (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-400 text-[11px] font-medium uppercase tracking-wider">
                <ImageIcon size={12} />
                <span>相关图片资源</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {images.map((img, idx) => (
                    <div key={idx} className="flex-shrink-0 w-32 h-24 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 group relative">
                        <img 
                            src={img.url} 
                            alt={img.description} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <ExternalLink size={14} className="text-white" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* 3. 详细片段 (Snippets) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 text-zinc-400 text-[11px] font-medium uppercase tracking-wider border-b border-zinc-800/50 pb-2">
            <Quote size={12} />
            <span>深入搜索摘要</span>
        </div>
        <div className="space-y-4">
          {data.slice(0, 3).map((item, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] w-4 h-4 flex items-center justify-center bg-zinc-800 text-zinc-500 rounded font-mono">
                    {idx + 1}
                </span>
                <h5 className="text-[13px] font-semibold text-zinc-200">{item.title}</h5>
              </div>
              <p className="text-[12px] leading-relaxed text-zinc-400 line-clamp-3 pl-6">
                {item.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
