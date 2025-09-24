"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Check, Trash2, AlertCircle, Calendar, DollarSign } from "lucide-react"
import { NotificationService, type Notification } from "@/lib/notifications"
import { useAuth } from "@/hooks/use-auth"

export default function NotificationsPage() {
  const { hasPermission } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    const loadNotifications = () => {
      const allNotifications = NotificationService.getNotifications()
      setNotifications(allNotifications)
    }

    loadNotifications()
    const interval = setInterval(loadNotifications, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const handleMarkAsRead = (id: string) => {
    NotificationService.markAsRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const handleDelete = (id: string) => {
    NotificationService.deleteNotification(id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const getTypeIcon = (type: Notification["type"]) => {
    switch (type) {
      case "payment_due":
        return <Calendar className="h-4 w-4" />
      case "payment_overdue":
        return <AlertCircle className="h-4 w-4" />
      case "low_balance":
        return <DollarSign className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: Notification["type"]) => {
    switch (type) {
      case "payment_due":
        return "bg-yellow-100 text-yellow-800"
      case "payment_overdue":
        return "bg-red-100 text-red-800"
      case "low_balance":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-blue-100 text-blue-800"
    }
  }

  if (!hasPermission("manager")) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Você não tem permissão para acessar as notificações.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notificações</h1>
        <p className="text-muted-foreground">Gerencie suas notificações e alertas do sistema</p>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma notificação encontrada</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card key={notification.id} className={`${!notification.read ? "border-primary" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${getTypeColor(notification.type)}`}>
                      {getTypeIcon(notification.type)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{notification.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {new Date(notification.createdAt).toLocaleString("pt-BR")}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <Badge variant="secondary" className="text-xs">
                        Nova
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(notification.id)}
                      disabled={notification.read}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(notification.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{notification.message}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
