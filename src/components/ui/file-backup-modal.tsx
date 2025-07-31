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
  Archive, 
  HardDrive,
  Clock,
  Info,
  FolderOpen
} from "lucide-react";

interface FileBackupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  fileStats?: {
    totalFiles: number;
    totalSize: string;
    estimatedTime?: string;
  };
}

export function FileBackupModal({ 
  open, 
  onOpenChange, 
  onConfirm,
  fileStats 
}: FileBackupModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const currentDate = new Date().toLocaleString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Archive className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-left text-lg">
                สำรองข้อมูลไฟล์
              </DialogTitle>
              <DialogDescription className="text-left text-sm text-muted-foreground">
                สร้างสำเนาสำรองไฟล์ทั้งหมด
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Statistics */}
          {fileStats && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <HardDrive className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      จำนวนไฟล์
                    </span>
                  </div>
                  <p className="text-lg font-bold text-blue-600">
                    {fileStats.totalFiles.toLocaleString()}
                  </p>
                </div>

                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Archive className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">
                      ขนาดรวม
                    </span>
                  </div>
                  <p className="text-lg font-bold text-green-600">
                    {fileStats.totalSize}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      ตำแหน่งสำรอง
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-1 font-mono">
                  ./backups/backup-{currentDate.replace(/[/:]/g, '-')}
                </p>
              </div>

              {fileStats.estimatedTime && (
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-900">
                      เวลาโดยประมาณ
                    </span>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      {fileStats.estimatedTime}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info Alert */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="space-y-1">
                <div>• คัดลอกไฟล์ทั้งหมดไปยังโฟลเดอร์สำรอง</div>
                <div>• รักษาโครงสร้างโฟลเดอร์เดิม</div>
                <div>• สร้างชื่อโฟลเดอร์ตามวันที่และเวลา</div>
                <div>• ไม่มีผลต่อไฟล์ต้นฉบับ</div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Warning for large files */}
          {fileStats && fileStats.totalFiles > 100 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>หมายเหตุ:</strong> การสำรองไฟล์จำนวนมากอาจใช้เวลานาน กรุณารอจนกว่าจะเสร็จสิ้น
              </AlertDescription>
            </Alert>
          )}
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
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Archive className="h-4 w-4 mr-2" />
            เริ่มสำรอง
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}