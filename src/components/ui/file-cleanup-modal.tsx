"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Trash2, 
  FileX, 
  Clock,
  HardDrive,
  Info
} from "lucide-react";

interface FileCleanupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  fileStats?: {
    totalFiles: number;
    oldFiles?: number;
    retentionDays: number;
    spaceToFree?: string;
  };
}

export function FileCleanupModal({ 
  open, 
  onOpenChange, 
  onConfirm,
  fileStats 
}: FileCleanupModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-left text-lg">
                ทำความสะอาดไฟล์เก่า
              </DialogTitle>
              <DialogDescription className="text-left text-sm text-muted-foreground">
                การดำเนินการนี้ไม่สามารถย้อนกลับได้
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Alert */}
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>คำเตือน:</strong> ไฟล์ที่ถูกลบจะไม่สามารถกู้คืนได้
            </AlertDescription>
          </Alert>

          {/* File Statistics */}
          {fileStats && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <HardDrive className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      ไฟล์ทั้งหมด
                    </span>
                  </div>
                  <p className="text-lg font-bold text-blue-600">
                    {fileStats.totalFiles.toLocaleString()}
                  </p>
                </div>

                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <FileX className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-900">
                      ไฟล์เก่า
                    </span>
                  </div>
                  <p className="text-lg font-bold text-red-600">
                    {fileStats.oldFiles?.toLocaleString() || '?'}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      เกณฑ์การลบ
                    </span>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    เก่ากว่า {fileStats.retentionDays} วัน
                  </Badge>
                </div>
                {fileStats.spaceToFree && (
                  <p className="text-xs text-gray-600 mt-1">
                    พื้นที่ที่จะได้รับคืน: ~{fileStats.spaceToFree}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Info Alert */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="space-y-1">
                <div>• ลบไฟล์ที่เก่ากว่าระยะเวลาที่กำหนด</div>
                <div>• ลบไฟล์ที่ไม่มีข้อมูลในระบบ (orphaned files)</div>
                <div>• รายงานผลการดำเนินการหลังเสร็จสิ้น</div>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="bg-gray-100 hover:bg-gray-200"
          >
            ยกเลิก
          </Button>
          <Button 
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            ทำความสะอาด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}