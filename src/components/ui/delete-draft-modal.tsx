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
import { Trash2, AlertTriangle } from "lucide-react"

interface DeleteDraftModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  documentTitle?: string
  mtNumber?: string
}

export function DeleteDraftModal({ 
  open, 
  onClose, 
  onConfirm, 
  documentTitle,
  mtNumber 
}: DeleteDraftModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <DialogTitle className="text-xl font-semibold text-center">
            ลบเอกสารร่าง
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            คุณต้องการลบเอกสารร่างนี้หรือไม่?
          </DialogDescription>
          
          {/* Document Information - Outside DialogDescription */}
          {(documentTitle || mtNumber) && (
            <div className="bg-gray-50 p-3 rounded-md text-sm mt-4">
              {mtNumber && (
                <p className="font-medium text-gray-700">เลขที่ มท: {mtNumber}</p>
              )}
              {documentTitle && (
                <p className="text-gray-600 mt-1 line-clamp-2">{documentTitle}</p>
              )}
            </div>
          )}
          
          {/* Warning Message - Outside DialogDescription */}
          <p className="text-red-600 font-medium text-center mt-4">
            การดำเนินการนี้ไม่สามารถย้อนกลับได้
          </p>
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
            <Trash2 className="w-4 h-4 mr-2" />
            ลบเอกสาร
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}