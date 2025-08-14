"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  User,
  Settings,
  BarChart3,
  FileText,
  LogOut,
  Menu,
  X,
  Shield,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { LogoutModal } from "@/components/ui/logout-modal";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile
  const [isMinimal, setIsMinimal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleMinimal = () => {
    setIsMinimal(!isMinimal);
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutModal(false);

    // Clear any client-side storage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (error) {
      console.error("Error clearing storage:", error);
    }

    // Sign out with redirect to login
    await signOut({
      callbackUrl: "/login",
      redirect: true,
    });
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  // Two-pass rendering strategy to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle responsive behavior only after client mounting
  useEffect(() => {
    if (!isClient) return;

    const checkScreenSize = () => {
      const isMobileScreen = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(isMobileScreen);

      // On mobile, close sidebar by default
      if (isMobileScreen) {
        setSidebarOpen(false);
      } else {
        // On desktop, open sidebar by default
        setSidebarOpen(true);
      }
    };

    // Check initial screen size
    checkScreenSize();

    // Add resize listener
    window.addEventListener("resize", checkScreenSize);

    // Cleanup
    return () => window.removeEventListener("resize", checkScreenSize);
  }, [isClient]);

  // Check if user has admin or district_manager role
  const userRoles = session?.user?.pwa?.roles || [];
  const isAdmin = userRoles.includes("admin");
  const isDistrictManager = userRoles.includes("district_manager");
  const canAccessAdmin = isAdmin || isDistrictManager;
  const canAccessSettings = isAdmin || isDistrictManager;
  const canAccessReports = isAdmin || isDistrictManager;

  // Check if user can upload documents
  const canUpload =
    userRoles.includes("uploader") ||
    userRoles.includes("admin") ||
    userRoles.includes("district_manager");

  const navItems = [
    {
      title: "เอกสาร",
      href: "/documents",
      icon: <FileText className={isMinimal ? "h-6 w-6" : "h-5 w-5"} />,
    },
    ...(canUpload
      ? [
          {
            title: "อัปโหลดเอกสาร",
            href: "/documents/upload",
            icon: <Upload className={isMinimal ? "h-6 w-6" : "h-5 w-5"} />,
          },
        ]
      : []),
    {
      title: "โปรไฟล์",
      href: "/profile",
      icon: <User className={isMinimal ? "h-6 w-6" : "h-5 w-5"} />,
    },
    ...(canAccessReports ? [{
      title: "รายงาน",
      href: "/reports",
      icon: <BarChart3 className={isMinimal ? "h-6 w-6" : "h-5 w-5"} />,
    }] : []),
    ...(canAccessAdmin
      ? [
          {
            title: "จัดการระบบ",
            href: "/admin",
            icon: <Shield className={isMinimal ? "h-6 w-6" : "h-5 w-5"} />,
          },
        ]
      : []),
    
    // Settings - only for admins and district managers
    ...(canAccessSettings ? [{
      title: "ตั้งค่า",
      href: "/settings",
      icon: <Settings className={isMinimal ? "h-6 w-6" : "h-5 w-5"} />,
    }] : []),
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          className="bg-white shadow-lg"
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile sidebar overlay - only render after client mount */}
      {isClient && isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        lg:translate-x-0 transition-all duration-300 fixed lg:relative 
        z-40 ${
          isMinimal ? "w-20" : "w-64"
        } h-screen bg-white shadow-lg lg:shadow-none`}
      >
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center space-x-2">
                <div className="bg-primary h-10 w-10 rounded-md flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">
                    PWA
                  </span>
                </div>
                {!isMinimal && <div className="font-bold text-xl">DocFlow</div>}
              </div>
              <button
                onClick={toggleMinimal}
                className="hidden lg:flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                aria-label={isMinimal ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isMinimal ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="15 6 9 12 15 18"></polyline>
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
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
                  className={`flex items-center ${
                    isMinimal ? "justify-center" : "gap-3"
                  } rounded-md ${
                    isMinimal ? "px-0 py-3" : "px-3 py-2"
                  } text-sm transition-colors
                    ${
                      pathname === item.href
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

            {/* User Info & Logout Button */}
            <div className="mt-4 px-3 space-y-2">
              {/* User Name */}
              {!isMinimal && session?.user?.pwa?.firstName && (
                <div className="text-sm text-muted-foreground text-right pr-2 pb-2">
                  <div className="truncate">
                    ชื่อผู้ใช้ระบบ : {session.user.pwa.firstName}
                  </div>
                </div>
              )}

              {/* Logout Button */}
              <Button
                variant="outline"
                className={`w-full ${
                  isMinimal ? "justify-center" : "justify-start gap-2"
                }`}
                title={isMinimal ? "ออกจากระบบ" : ""}
                onClick={handleLogoutClick}
              >
                <LogOut className={isMinimal ? "h-6 w-6" : "h-4 w-4"} />
                {!isMinimal && "ออกจากระบบ"}
              </Button>
            </div>
          </SidebarContent>
          <SidebarFooter>
            {/* Empty footer or add other content here if needed */}
          </SidebarFooter>
        </Sidebar>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-4 pt-16 lg:pt-6 lg:p-8">
        {children}
      </div>

      {/* Logout Modal */}
      <LogoutModal
        open={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
}
