"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Sidebar, 
  SidebarHeader, 
  SidebarContent, 
  SidebarFooter,
  SidebarGroup 
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { 
  LayoutDashboard, 
  User, 
  Settings, 
  BarChart3, 
  FileText,
  LogOut,
  Menu,
  X
} from "lucide-react"
import { useState } from "react"
import { signOut } from "next-auth/react"

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMinimal, setIsMinimal] = useState(false)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }
  
  const toggleMinimal = () => {
    setIsMinimal(!isMinimal)
  }

  const navItems = [
    {
      title: "แดชบอร์ด",
      href: "/dashboard",
      icon: <LayoutDashboard className={isMinimal ? "h-6 w-6" : "h-5 w-5"} />
    },
    {
      title: "โปรไฟล์", 
      href: "/profile",
      icon: <User className={isMinimal ? "h-6 w-6" : "h-5 w-5"} />
    },
    {
      title: "รายงาน",
      href: "/reports", 
      icon: <BarChart3 className={isMinimal ? "h-6 w-6" : "h-5 w-5"} />
    },
    {
      title: "เอกสาร",
      href: "/documents",
      icon: <FileText className={isMinimal ? "h-6 w-6" : "h-5 w-5"} />
    },
    {
      title: "ตั้งค่า",
      href: "/settings",
      icon: <Settings className={isMinimal ? "h-6 w-6" : "h-5 w-5"} />
    }
  ]

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        lg:translate-x-0 transition-all duration-300 fixed lg:relative 
        z-40 ${isMinimal ? "w-20" : "w-64"} h-screen`}>
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center space-x-2">
                <div className="bg-primary h-10 w-10 rounded-md flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">A</span>
                </div>
                {!isMinimal && <div className="font-bold text-xl">PWA DocFlow</div>}
              </div>
              <button 
                onClick={toggleMinimal}
                className="hidden lg:flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                aria-label={isMinimal ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isMinimal ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 6 9 12 15 18"></polyline>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 6 15 12 9 18"></polyline>
                  </svg>
                )}
              </button>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              {!isMinimal && (
                <div className="text-xs font-semibold text-muted-foreground px-2 mb-2">
                  เมนูหลัก
                </div>
              )}
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center ${isMinimal ? "justify-center" : "gap-3"} rounded-md ${isMinimal ? "px-0 py-3" : "px-3 py-2"} text-sm transition-colors
                    ${pathname === item.href 
                      ? "bg-muted font-medium text-foreground" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  title={isMinimal ? item.title : ""}
                >
                  {item.icon}
                  {!isMinimal && item.title}
                </Link>
              ))}
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <div className="px-3 py-2">
              <Button 
                variant="outline" 
                className={`w-full ${isMinimal ? "justify-center" : "justify-start gap-2"}`}
                title={isMinimal ? "ออกจากระบบ" : ""}
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className={isMinimal ? "h-6 w-6" : "h-4 w-4"} />
                {!isMinimal && "ออกจากระบบ"}
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6 lg:p-8">
        {children}
      </div>
    </div>
  )
}
