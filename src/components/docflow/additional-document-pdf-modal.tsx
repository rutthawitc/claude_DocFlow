'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Loader2, FileText, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const AdditionalPDFViewerClient = dynamic(
  () => import('./additional-pdf-viewer-client').then(mod => ({ default: mod.AdditionalPDFViewerClient })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-12 h-[600px] bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>กำลังเตรียมระบบ PDF...</span>
      </div>
    )
  }
);

interface AdditionalDocumentPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
  itemIndex: number;
  itemName: string;
  filename: string;
}

export function AdditionalDocumentPDFModal({
  isOpen,
  onClose,
  documentId,
  itemIndex,
  itemName,
  filename
}: AdditionalDocumentPDFModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {itemName}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-1">{filename}</p>
        </DialogHeader>
        
        <div className="px-6 pb-6">
          <div className="h-[70vh] overflow-auto">
            <AdditionalPDFViewerClient
              documentId={documentId}
              itemIndex={itemIndex}
              filename={filename}
              className="w-full h-full"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}