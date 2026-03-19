import {
  memo,
  isValidElement,
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import type { Message } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import ReactMarkdown, {
  type Components,
  type ExtraProps,
} from "react-markdown";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import powershell from "react-syntax-highlighter/dist/esm/languages/prism/powershell";
import diff from "react-syntax-highlighter/dist/esm/languages/prism/diff";
import { Logo } from "@/components/ui/Logo";
import { ToolRenderer } from "../ToolRenderer";
import { StreamChartCard } from "../charts/StreamChartCard";
import type { ChartModel } from "@/types/chart";
import type { AlgorithmSceneModel } from "@/types/scene";
import { StreamAlgorithmSceneCard } from "../scenes/StreamAlgorithmSceneCard";

SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("markup", markup);
SyntaxHighlighter.registerLanguage("yaml", yaml);
SyntaxHighlighter.registerLanguage("powershell", powershell);
SyntaxHighlighter.registerLanguage("diff", diff);

type MarkdownCodeProps = ComponentPropsWithoutRef<"code"> & ExtraProps;
type MarkdownPreProps = ComponentPropsWithoutRef<"pre"> & ExtraProps;

const LANGUAGE_ALIASES: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  json: "json",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  bash: "bash",
  md: "markdown",
  py: "python",
  html: "markup",
  xml: "markup",
  svg: "markup",
  yml: "yaml",
  ps1: "powershell",
  ps: "powershell",
};

const extractTextContent = (children: ReactNode): string => {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(extractTextContent).join("");
  }

  if (isValidElement(children)) {
    return extractTextContent(children.props.children);
  }

  return "";
};

const getCodeLanguage = (className?: string) => {
  const match = /language-([\w-]+)/.exec(className || "");
  const detected = match?.[1]?.toLowerCase();

  if (!detected) {
    return undefined;
  }

  return LANGUAGE_ALIASES[detected] ?? detected;
};

const MarkdownPre = ({ node: _node, children }: MarkdownPreProps) => <>{children}</>;

const MarkdownCode = ({
  node: _node,
  className,
  children,
  style: _style,
  ...props
}: MarkdownCodeProps) => {
  const code = extractTextContent(children).replace(/\n$/, "");
  const language = getCodeLanguage(className);
  const isBlockCode = Boolean(language) || code.includes("\n");

  if (!isBlockCode) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  const lineCount = code.split("\n").length;

  return (
    <div className="markdown-code-block">
      <div className="markdown-code-header">
        <span className="markdown-code-language">{language ?? "text"}</span>
      </div>
      <div className="markdown-code-body">
        <SyntaxHighlighter
          language={language}
          style={syntaxHighlightTheme}
          PreTag="div"
          customStyle={{
            margin: 0,
            background: "transparent",
            padding: "1rem 1.25rem",
            fontSize: "0.875rem",
            lineHeight: 1.7,
          }}
          codeTagProps={{
            className: "font-mono",
          }}
          lineNumberStyle={{
            minWidth: "2.25rem",
            paddingRight: "1rem",
            color: "rgba(148, 163, 184, 0.5)",
            userSelect: "none",
          }}
          showLineNumbers={lineCount > 4}
          wrapLongLines={false}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

const markdownComponents: Components = {
  pre: MarkdownPre,
  code: MarkdownCode,
};

const syntaxHighlightTheme = oneDark as { [key: string]: CSSProperties };

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  isLoadingMessages?: boolean;
  charts?: ChartModel[];
  scenes?: AlgorithmSceneModel[];
}

export const MessageList = memo(function MessageList({
  messages,
  isLoading,
  isLoadingMessages,
  charts = [],
  scenes = [],
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
            <div className="flex items-center justify-center mb-6">
              <Logo size={160} showBackground={false} />
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
                          <ReactMarkdown components={markdownComponents}>
                            {part.text}
                          </ReactMarkdown>
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
                      <ReactMarkdown components={markdownComponents}>
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {charts.filter((chart) => chart.status !== "done").length > 0 && (
        <div className="space-y-4">
          {charts
            .filter((chart) => chart.status !== "done")
            .map((chart) => (
            <motion.div
              key={chart.chartId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <StreamChartCard model={chart} />
            </motion.div>
          ))}
        </div>
      )}
      {scenes.filter((scene) => scene.status !== "ready").length > 0 && (
        <div className="space-y-4">
          {scenes
            .filter((scene) => scene.status !== "ready")
            .map((scene) => (
              <motion.div
                key={scene.sceneId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <StreamAlgorithmSceneCard model={scene} />
              </motion.div>
            ))}
        </div>
      )}

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
