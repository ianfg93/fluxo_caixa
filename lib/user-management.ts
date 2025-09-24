export interface User {
  id: string
  name: string
  email: string
  role: "basic" | "manager" | "master"
  status: "active" | "inactive"
  createdAt: Date
  lastLogin?: Date
  createdBy: string
}

export interface CreateUserData {
  name: string
  email: string
  role: "basic" | "manager" | "master"
  password: string
}

export interface UpdateUserData {
  name?: string
  email?: string
  role?: "basic" | "manager" | "master"
  status?: "active" | "inactive"
}

export class UserManagementService {
  private static STORAGE_KEY = "cash_flow_users"

  static getUsers(): User[] {
    if (typeof window === "undefined") return []
    const stored = localStorage.getItem(this.STORAGE_KEY)
    if (!stored) {
      // Initialize with default users
      const defaultUsers: User[] = [
        {
          id: "1",
          name: "Admin Master",
          email: "admin@empresa.com",
          role: "master",
          status: "active",
          createdAt: new Date(),
          lastLogin: new Date(),
          createdBy: "System",
        },
        {
          id: "2",
          name: "João Manager",
          email: "joao@empresa.com",
          role: "manager",
          status: "active",
          createdAt: new Date(),
          createdBy: "Admin Master",
        },
        {
          id: "3",
          name: "Maria Silva",
          email: "maria@empresa.com",
          role: "basic",
          status: "active",
          createdAt: new Date(),
          createdBy: "Admin Master",
        },
      ]
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(defaultUsers))
      return defaultUsers
    }
    return JSON.parse(stored).map((user: any) => ({
      ...user,
      createdAt: new Date(user.createdAt),
      lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
    }))
  }

  static createUser(userData: CreateUserData, createdBy: string): User {
    const users = this.getUsers()
    const newUser: User = {
      id: Date.now().toString(),
      ...userData,
      status: "active",
      createdAt: new Date(),
      createdBy,
    }

    users.push(newUser)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users))
    return newUser
  }

  static updateUser(id: string, updates: UpdateUserData): User | null {
    const users = this.getUsers()
    const userIndex = users.findIndex((u) => u.id === id)

    if (userIndex === -1) return null

    users[userIndex] = { ...users[userIndex], ...updates }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users))
    return users[userIndex]
  }

  static deleteUser(id: string): boolean {
    const users = this.getUsers()
    const filteredUsers = users.filter((u) => u.id !== id)

    if (filteredUsers.length === users.length) return false

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredUsers))
    return true
  }

  static getUserById(id: string): User | null {
    const users = this.getUsers()
    return users.find((u) => u.id === id) || null
  }

  static getUsersByRole(role: User["role"]): User[] {
    const users = this.getUsers()
    return users.filter((u) => u.role === role)
  }

  static getActiveUsers(): User[] {
    const users = this.getUsers()
    return users.filter((u) => u.status === "active")
  }

  static updateLastLogin(id: string): void {
    const users = this.getUsers()
    const userIndex = users.findIndex((u) => u.id === id)

    if (userIndex !== -1) {
      users[userIndex].lastLogin = new Date()
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users))
    }
  }

  static getRolePermissions(role: User["role"]) {
    const permissions = {
      basic: ["view_dashboard", "add_transactions", "view_own_transactions"],
      manager: [
        "view_dashboard",
        "add_transactions",
        "view_all_transactions",
        "manage_accounts_payable",
        "view_reports",
      ],
      master: ["all_permissions", "manage_users", "system_settings"],
    }
    return permissions[role]
  }
}
