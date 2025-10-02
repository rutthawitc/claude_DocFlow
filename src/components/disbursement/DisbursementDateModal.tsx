"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface DisbursementDateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (date: Date) => Promise<void>;
  selectedCount: number;
}

export function DisbursementDateModal({
  open,
  onClose,
  onSave,
  selectedCount,
}: DisbursementDateModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!selectedDate) return;

    setIsLoading(true);
    try {
      await onSave(selectedDate);
      onClose();
    } catch (error) {
      console.error("Error saving disbursement date:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>บันทึกรอบเบิกจ่าย</DialogTitle>
          <DialogDescription>
            เลือกวันที่สำหรับรอบเบิกจ่าย ({selectedCount} รายการ)
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">

          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={th}
              className="rounded-md border"
            />
          </div>

          {selectedDate && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-sm">
                <span className="font-semibold">วันที่เลือก:</span>{" "}
                {format(selectedDate, "d MMMM yyyy", { locale: th })}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave} disabled={!selectedDate || isLoading}>
            {isLoading ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
