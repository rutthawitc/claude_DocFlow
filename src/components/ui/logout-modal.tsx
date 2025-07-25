"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LogOut, AlertTriangle } from "lucide-react"

interface LogoutModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function LogoutModal({ open, onClose, onConfirm }: LogoutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
          <DialogTitle className="text-xl font-semibold text-center">
            ออกจากระบบ
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            คุณต้องการออกจากระบบจริงหรือไม่?
            <br />
            คุณจะต้องเข้าสู่ระบบใหม่เพื่อใช้งานอีกครั้ง
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            ยกเลิก
          </Button>
          <Button
            onClick={onConfirm}
            className="w-full sm:w-auto order-1 sm:order-2 bg-red-600 hover:bg-red-700 text-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            ออกจากระบบ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}