import { LogIn, Mail, Sparkles, User } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface AccountSettingsPanelProps {
  user: { email: string } | null
  onLogout: () => void | Promise<void>
}

export function AccountSettingsPanel({
  user,
  onLogout,
}: AccountSettingsPanelProps) {
  if (!user) {
    return (
      <Card className="border-dashed border-border/80 bg-card/60 shadow-sm">
        <CardContent className="flex min-h-60 flex-col items-center justify-center gap-3 py-10 text-center">
          <LogIn className="h-10 w-10 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">登录后可查看账号信息</p>
            <p className="text-sm text-muted-foreground">包含身份信息、订阅状态和知识库同步权限。</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const userName = user.email.split("@")[0]

  return (
    <Card className="border-border/80 bg-card/80 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="h-4 w-4 text-emerald-500" />
          个人账号
        </CardTitle>
        <CardDescription>当前登录账号可用于同步会话、记忆和知识库文档。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar className="h-16 w-16 border border-border">
          <AvatarFallback className="bg-muted text-lg font-semibold text-foreground">
            {user.email.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-lg font-semibold text-foreground">{userName}</p>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="truncate">{user.email}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              脉冲会员
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              云端同步已启用
            </Badge>
          </div>
        </div>

        <Button variant="outline" onClick={() => void onLogout()}>
          退出当前账号
        </Button>
      </CardContent>
    </Card>
  )
}
