"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, TrendingUp, TrendingDown, CreditCard, Users, Settings, LogOut, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["basic", "manager", "master"] },
  { name: "Entradas", href: "/cash-flow/entries", icon: TrendingUp, roles: ["basic", "manager", "master"] },
  { name: "Saídas", href: "/cash-flow/exits", icon: TrendingDown, roles: ["basic", "manager", "master"] },
  { name: "Contas a Pagar", href: "/accounts-payable", icon: CreditCard, roles: ["manager", "master"] },
  { name: "Usuários", href: "/users", icon: Users, roles: ["master"] },
  { name: "Configurações", href: "/settings", icon: Settings, roles: ["manager", "master"] },
]

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const { authState, logout, hasPermission } = useAuth()

  const filteredNavigation = navigation.filter((item) => item.roles.some((role) => hasPermission(role as any)))

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-40 bg-card border-r transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-primary">Fluxo de Caixa</h2>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {authState.user?.name} ({authState.user?.role})
                </p>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              {!isCollapsed && <NotificationBell />}
              
              {/* Botão de colapsar/expandir */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-colors group relative",
                  isCollapsed ? "p-3 justify-center" : "px-3 py-2",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
                {!isCollapsed && item.name}
                
                {/* Tooltip para modo colapsado */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User info when collapsed */}
        {isCollapsed && (
          <div className="p-2 border-t">
            <div className="flex justify-center">
              <div 
                className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium cursor-pointer group relative"
                title={`${authState.user?.name} (${authState.user?.role})`}
              >
                {authState.user?.name?.charAt(0).toUpperCase()}
                
                {/* Tooltip com info do usuário */}
                <div className="absolute left-full bottom-0 ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {authState.user?.name} ({authState.user?.role})
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logout */}
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            className={cn(
              "w-full text-muted-foreground hover:text-foreground transition-colors group relative",
              isCollapsed ? "justify-center p-3" : "justify-start"
            )}
            onClick={logout}
            title={isCollapsed ? "Sair" : undefined}
          >
            <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
            {!isCollapsed && "Sair"}
            
            {/* Tooltip para modo colapsado */}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                Sair
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}