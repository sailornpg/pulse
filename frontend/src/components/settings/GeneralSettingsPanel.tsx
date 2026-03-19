import { Monitor, Palette } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Theme } from "@/contexts/ThemeContext"

interface GeneralSettingsPanelProps {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const THEME_OPTIONS: { id: Theme; label: string; hint: string }[] = [
  { id: "dark", label: "深色模式", hint: "适合长时间工作和低光环境" },
  { id: "light", label: "浅色模式", hint: "适合白天和明亮屏幕环境" },
  { id: "system", label: "跟随系统", hint: "自动同步设备主题设置" },
]

export function GeneralSettingsPanel({
  theme,
  setTheme,
}: GeneralSettingsPanelProps) {
  return (
    <div className="space-y-4">
      <Card className="border-border/80 bg-card/80 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-emerald-500" />
            主题设置
          </CardTitle>
          <CardDescription>切换系统的视觉风格，当前选择会持久化到本地。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
              className={`min-h-28 rounded-2xl border p-4 text-left transition-colors ${
                theme === option.id
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : "border-border bg-background hover:border-emerald-500/30 hover:bg-accent/40"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{option.label}</span>
                {theme === option.id ? <Badge>已启用</Badge> : null}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{option.hint}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/80 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Monitor className="h-4 w-4 text-emerald-500" />
            语言偏好
          </CardTitle>
          <CardDescription>当前界面语言固定为简体中文，后续可扩展多语言。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="border-border text-foreground">
            简体中文
          </Button>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            默认语言
          </Badge>
        </CardContent>
      </Card>
    </div>
  )
}
