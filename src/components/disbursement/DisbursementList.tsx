"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DisbursementDateModal } from "./DisbursementDateModal";
import { FileText, Check, Bitcoin } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import Link from "next/link";
import { toast } from "sonner";

interface Document {
  id: number;
  mtNumber: string;
  mtDate: string;
  subject: string;
  branchBaCode: number;
  disbursementDate: string | null;
  disbursementConfirmed: boolean;
  disbursementPaid: boolean;
  status: string;
  branch: {
    id: number;
    baCode: number;
    name: string;
  } | null;
}

export function DisbursementList() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDateModal, setShowDateModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/disbursement-rounds");
      const data = await response.json();

      if (data.success) {
        setDocuments(data.data);
      } else {
        toast.error("ไม่สามารถโหลดข้อมูลได้");
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(documents.map((doc) => doc.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectDocument = (docId: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, docId]);
    } else {
      setSelectedIds(selectedIds.filter((id) => id !== docId));
    }
  };

  const handleSetDate = async (date: Date) => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/disbursement-rounds/set-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentIds: selectedIds,
          disbursementDate: date.toISOString(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("บันทึกรอบเบิกจ่ายเรียบร้อย");
        await fetchDocuments();
        setSelectedIds([]);
      } else {
        toast.error(data.error || "ไม่สามารถบันทึกข้อมูลได้");
      }
    } catch (error) {
      console.error("Error setting date:", error);
      toast.error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDisbursement = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/disbursement-rounds/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: selectedIds }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("ยืนยันรายการจ่ายเรียบร้อย");
        await fetchDocuments();
        setSelectedIds([]);
      } else {
        toast.error(data.error || "ไม่สามารถยืนยันรายการได้");
      }
    } catch (error) {
      console.error("Error confirming:", error);
      toast.error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkPaid = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/disbursement-rounds/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: selectedIds }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("บันทึกการจ่ายเรียบร้อย");
        await fetchDocuments();
        setSelectedIds([]);
      } else {
        toast.error(data.error || "ไม่สามารถบันทึกการจ่ายได้");
      }
    } catch (error) {
      console.error("Error marking as paid:", error);
      toast.error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsProcessing(false);
    }
  };

  // Button enable/disable logic
  const selectedDocs = documents.filter((doc) => selectedIds.includes(doc.id));

  const canSetDate = selectedIds.length > 0;

  const canConfirm =
    selectedIds.length > 0 &&
    selectedDocs.every((doc) => doc.disbursementDate !== null);

  const canMarkPaid =
    selectedIds.length > 0 &&
    selectedDocs.every((doc) => doc.disbursementConfirmed === true);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <div className="text-center">กำลังโหลด...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">บันทึกรอบเบิกจ่าย</h1>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <Button
            onClick={() => setShowDateModal(true)}
            disabled={!canSetDate || isProcessing}
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            บันทึกรอบเบิกจ่าย
          </Button>
          <Button
            onClick={handleConfirmDisbursement}
            disabled={!canConfirm || isProcessing}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            ยืนยันรายการจ่าย
          </Button>
          <Button
            onClick={handleMarkPaid}
            disabled={!canMarkPaid || isProcessing}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            จ่ายแล้ว
          </Button>
        </div>

        {/* Document List */}
        <div className="space-y-4">
          {/* Select All */}
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <Checkbox
              checked={selectedIds.length === documents.length && documents.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="font-medium">Select all</span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="🔍"
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          {/* Documents */}
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={selectedIds.includes(doc.id)}
                onCheckedChange={(checked) =>
                  handleSelectDocument(doc.id, checked as boolean)
                }
              />

              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">
                      {doc.branch?.name || "ไม่ระบุสาขา"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {doc.mtNumber} เรื่อง {doc.subject}
                    </p>
                  </div>

                  <Link href={`/documents/${doc.id}`}>
                    <Button variant="outline" size="sm">
                      ดูรายละเอียด
                    </Button>
                  </Link>
                </div>

                {/* Status Pills */}
                <div className="flex items-center gap-2">
                  <span className="text-sm">รอบเบิกจ่าย</span>

                  {doc.disbursementDate && (
                    <div
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                        doc.disbursementConfirmed
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      <span>
                        {format(new Date(doc.disbursementDate), "dd/MM/yyyy", {
                          locale: th,
                        })}
                      </span>
                      {doc.disbursementConfirmed && (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
                  )}

                  {doc.disbursementPaid && (
                    <div className="inline-flex items-center justify-center w-8 h-8 bg-yellow-400 rounded-full">
                      <Bitcoin className="h-5 w-5 text-yellow-900" />
                    </div>
                  )}

                  {!doc.disbursementDate && (
                    <span className="text-sm text-muted-foreground">
                      ยังไม่ได้กำหนดรอบ
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {documents.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>ไม่มีเอกสารที่ตรวจสอบแล้ว</p>
            </div>
          )}
        </div>
      </div>

      {/* Date Picker Modal */}
      <DisbursementDateModal
        open={showDateModal}
        onClose={() => setShowDateModal(false)}
        onSave={handleSetDate}
        selectedCount={selectedIds.length}
      />
    </DashboardLayout>
  );
}
