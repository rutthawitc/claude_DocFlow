"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
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

interface BranchDisbursementListProps {
  userBaCode: string;
}

export function BranchDisbursementList({ userBaCode }: BranchDisbursementListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/branch/disbursement-rounds?baCode=${userBaCode}`);
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
        <h1 className="text-3xl font-bold mb-6">รอบเบิกจ่าย</h1>

        {/* Document List */}
        <div className="space-y-4">
          {/* Documents */}
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
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
                    <div className="inline-flex items-center gap-2">
                      <div className="inline-flex items-center justify-center w-8 h-8 bg-yellow-400 rounded-full">
                        <Bitcoin className="h-5 w-5 text-yellow-900" />
                      </div>
                      <span className="text-sm text-muted-foreground">จ่ายเงินแล้ว</span>
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
    </DashboardLayout>
  );
}
