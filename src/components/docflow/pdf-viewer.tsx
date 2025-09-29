import React from 'react';
import dynamic from 'next/dynamic';
import { Loader2, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PDFViewerClient = dynamic(
  () => import('./pdf-viewer-client').then(mod => ({ default: mod.PDFViewerClient })),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            บันทึกต้นฉบับ
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex items-center justify-center py-12 h-[600px] bg-gray-50">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>กำลังเตรียมระบบ PDF...</span>
          </div>
        </CardContent>
      </Card>
    )
  }
);

interface PDFViewerProps {
  documentId: number;
  filename: string;
  className?: string;
  additionalFileIndex?: number; // For additional files
  compact?: boolean; // For compact view
}

export function PDFViewer({ documentId, filename, className, additionalFileIndex, compact }: PDFViewerProps) {
  return (
    <PDFViewerClient
      documentId={documentId}
      filename={filename}
      className={className}
      additionalFileIndex={additionalFileIndex}
      compact={compact}
    />
  );
}