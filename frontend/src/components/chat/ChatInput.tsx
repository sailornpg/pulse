import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Send, Loader2, Command } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  isLoadingMessages: boolean;
  handleInputChange: (
    e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>,
  ) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

export function ChatInput({
  input,
  isLoading,
  isLoadingMessages,
  handleInputChange,
  handleSubmit,
}: ChatInputProps) {
  return (
    <div className="px-8 pb-8 pt-4 bg-gradient-to-t from-background via-background/88 to-transparent">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(e);
        }}
        className="max-w-5xl mx-auto"
      >
        <div className="relative group">
          <div className="absolute inset-0 bg-primary/8 blur-2xl rounded-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
          <div className="relative flex items-center gap-2 rounded-2xl border border-border/80 bg-background/72 p-2 pl-4 shadow-[0_18px_40px_-28px_hsl(var(--foreground)/0.3)] backdrop-blur-xl transition-all duration-200 focus-within:border-primary/20 focus-within:bg-background/86">
            <Input
              className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground/60 h-10 py-0"
              value={input || ""}
              placeholder="有什么可以帮您的？"
              onChange={handleInputChange}
              disabled={isLoading || isLoadingMessages}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const currentInput = (input || "").trim();
                  if (currentInput && !isLoading) {
                    const form = e.currentTarget.closest("form");
                    if (form) form.requestSubmit();
                  }
                }
              }}
            />
            <Button
              type="submit"
              disabled={isLoading || !(input || "").trim() || isLoadingMessages}
              size="icon"
              className={`h-10 w-10 rounded-xl transition-all duration-300 ${
                (input || "").trim()
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_12px_30px_-18px_hsl(var(--primary)/0.85)]"
                  : "bg-muted-foreground/20 text-muted-foreground/40"
              }`}
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between px-2">
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground/70 font-semibold uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className="text-[9px] border-border text-muted-foreground/60 px-1 py-0 h-4 min-w-[32px] justify-center"
              >
                G
              </Badge>
              <span>Gemini 2.0</span>
            </div>
            <Separator orientation="vertical" className="h-2 bg-border" />
            <span className="text-primary/60">Tavily Search active</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
            <Command size={10} />
            <span className="font-medium">Enter 发送 / Shift Enter 换行</span>
          </div>
        </div>
      </form>
    </div>
  );
}
