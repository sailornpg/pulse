import { memo } from "react";
import type { Message } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ToolRenderer } from "../ToolRenderer";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  isLoadingMessages?: boolean;
}

export const MessageList = memo(function MessageList({
  messages,
  isLoading,
  isLoadingMessages,
}: MessageListProps) {
  const showLoading = isLoading || isLoadingMessages;

  return (
    <>
      <AnimatePresence initial={false}>
        {messages.length === 0 && !showLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/5 flex items-center justify-center border border-emerald-500/10 mb-6">
              <Sparkles size={32} className="text-emerald-500/50" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              有什么我可以帮您的吗？
            </h2>
            <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
              我可以帮您分析代码、撰写文档或回答任何技术问题。
            </p>
          </motion.div>
        )}

        {messages.map((m: Message) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`flex gap-5 ${m.role === "user" ? "flex-row-reverse max-w-[85%]" : "w-full"}`}
            >
              <div className="flex-1 space-y-4 min-w-0">
                {m.role !== "user" && (m as any).parts ? (
                  (m as any).parts.map((part: any, i: number) => {
                    if (part.type === "text") {
                      return (
                        <div
                          key={`text-${i}`}
                          className="text-foreground leading-relaxed prose prose-zinc dark:prose-invert max-w-none"
                        >
                          <ReactMarkdown>{part.text}</ReactMarkdown>
                        </div>
                      );
                    }
                    if (part.type === "tool-invocation") {
                      const ti = part.toolInvocation;
                      return (
                        <div
                          key={ti.toolCallId || `tool-invocation-${i}`}
                          className="animate-in fade-in duration-300"
                        >
                          <ToolRenderer
                            toolName={ti.toolName}
                            toolCallId={ti.toolCallId}
                            state={ti.state === "result" ? "result" : "call"}
                            args={ti.args}
                            result={ti.result}
                          />
                        </div>
                      );
                    }
                    return null;
                  })
                ) : (
                  <>
                    <div
                      className={`prose prose-zinc dark:prose-invert max-w-none ${
                        m.role === "user"
                          ? "bg-muted border border-border px-5 py-3 rounded-2xl rounded-tr-sm text-foreground shadow-sm"
                          : "text-foreground leading-relaxed"
                      }`}
                    >
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {showLoading &&
        (messages.length === 0 ||
          messages[messages.length - 1]?.role !== "assistant") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="flex items-center gap-3 text-muted-foreground bg-muted/30 px-4 py-2 rounded-xl border border-border/50">
              <Loader2 className="animate-spin text-emerald-500/60" size={14} />
              <span className="text-xs font-medium tracking-tight">
                思考中...
              </span>
            </div>
          </motion.div>
        )}
    </>
  );
});
