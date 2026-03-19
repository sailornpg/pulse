import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Bell, BrainCircuit, Monitor, Settings, Shield, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { useTheme } from "@/contexts/ThemeContext"
import { AccountSettingsPanel } from "./settings/AccountSettingsPanel"
import { GeneralSettingsPanel } from "./settings/GeneralSettingsPanel"
import { PlaceholderSettingsPanel } from "./settings/PlaceholderSettingsPanel"
import { RagKnowledgeSettingsPanel } from "./settings/RagKnowledgeSettingsPanel"
import { SettingsNav } from "./settings/SettingsNav"
import type { SettingsTab, SettingsTabId } from "./settings/types"

const SETTINGS_TABS: SettingsTab[] = [
  {
    id: "general",
    label: "通用设置",
    description: "调整主题和基础使用偏好。",
    icon: Monitor,
  },
  {
    id: "account",
    label: "个人账号",
    description: "查看当前登录身份和同步状态。",
    icon: User,
  },
  {
    id: "rag",
    label: "RAG 知识库",
    description: "管理个人知识文档，并查看默认共享知识。",
    icon: BrainCircuit,
  },
  {
    id: "security",
    label: "安全隐私",
    description: "安全能力正在补充中。",
    icon: Shield,
  },
  {
    id: "notifications",
    label: "消息通知",
    description: "通知偏好正在补充中。",
    icon: Bell,
  },
]

export default function SettingsDialog() {
  const [activeTab, setActiveTab] = useState<SettingsTabId>("general")
  const { theme, setTheme } = useTheme()
  const { user, token, logout } = useAuth()

  const activeTabMeta =
    SETTINGS_TABS.find((tab) => tab.id === activeTab) ?? SETTINGS_TABS[0]

  function renderPanel() {
    switch (activeTab) {
      case "general":
        return <GeneralSettingsPanel theme={theme} setTheme={setTheme} />
      case "account":
        return <AccountSettingsPanel user={user} onLogout={logout} />
      case "rag":
        return <RagKnowledgeSettingsPanel token={token} />
      case "security":
        return (
          <PlaceholderSettingsPanel
            title="安全隐私"
            description="这里后续适合放登录设备、敏感操作审计和默认文档管理员入口。当前后端能力已经准备好，前端权限面板还没展开。"
          />
        )
      case "notifications":
        return (
          <PlaceholderSettingsPanel
            title="消息通知"
            description="消息通知面板暂未接入。后续可在这里增加任务提醒、失败告警和系统变更通知。"
          />
        )
      default:
        return null
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Settings size={14} />
        </Button>
      </DialogTrigger>

      <DialogContent className="flex h-[min(88vh,760px)] max-w-6xl flex-col gap-0 overflow-hidden border-border bg-background p-0 md:flex-row">
        <SettingsNav
          tabs={SETTINGS_TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
          showLogout={Boolean(user)}
          onLogout={logout}
        />

        <main className="flex flex-1 flex-col overflow-hidden bg-background">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle className="text-lg text-foreground">{activeTabMeta.label}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {activeTabMeta.description}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">{renderPanel()}</div>
        </main>
      </DialogContent>
    </Dialog>
  )
}
