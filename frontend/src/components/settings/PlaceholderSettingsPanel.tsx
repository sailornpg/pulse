import { Card, CardContent } from "@/components/ui/card"

interface PlaceholderSettingsPanelProps {
  title: string
  description: string
}

export function PlaceholderSettingsPanel({
  title,
  description,
}: PlaceholderSettingsPanelProps) {
  return (
    <Card className="border-dashed border-border/80 bg-card/60 shadow-sm">
      <CardContent className="flex min-h-72 flex-col items-center justify-center py-10 text-center">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {title}
          </p>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}
