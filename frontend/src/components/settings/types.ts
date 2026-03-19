import type { LucideIcon } from "lucide-react"

export type SettingsTabId =
  | "general"
  | "account"
  | "rag"
  | "security"
  | "notifications"

export interface SettingsTab {
  id: SettingsTabId
  label: string
  description: string
  icon: LucideIcon
}
