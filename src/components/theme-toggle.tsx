"use client"

import * as React from "react"
import { Icon } from "@iconify/react"
import { useTheme } from "next-themes"
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react"

const themes = [
  { key: "light", label: "Light", icon: "lucide:sun" },
  { key: "dark", label: "Dark", icon: "lucide:moon" },
  { key: "minimalist", label: "Minimalist", icon: "lucide:circle" },
  { key: "rich", label: "Rich", icon: "lucide:palette" },
  { key: "tech", label: "Tech", icon: "lucide:monitor" },
  { key: "system", label: "System", icon: "lucide:laptop" },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button isIconOnly variant="light" aria-label="Toggle theme">
        <Icon icon="lucide:sun" width={18} />
      </Button>
    )
  }

  const currentTheme = themes.find(t => t.key === theme) || themes[0]

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button 
          isIconOnly 
          variant="light" 
          aria-label="Toggle theme"
          className="bg-background/50 hover:bg-background/70 border border-divider"
        >
          <Icon icon={currentTheme.icon} width={18} />
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Theme selection"
        selectedKeys={[theme || "light"]}
        selectionMode="single"
        onSelectionChange={(keys) => {
          const selectedTheme = Array.from(keys)[0] as string
          setTheme(selectedTheme)
        }}
        className="min-w-32"
      >
        {themes.map((themeOption) => (
          <DropdownItem
            key={themeOption.key}
            startContent={<Icon icon={themeOption.icon} width={16} />}
            className="data-[selected=true]:bg-primary/10"
          >
            {themeOption.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  )
}