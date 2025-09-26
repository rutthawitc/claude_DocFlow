'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Loader2,
  AlertCircle,
  FileText,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PDFPreviewModalProps {
  file: File | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PDFPreviewModal({ file, isOpen, onClose }: PDFPreviewModalProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfInitialized, setPdfInitialized] = useState<boolean>(false);

  // Use file directly instead of blob URL
  const pdfFile = useMemo(() => {
    return file;
  }, [file]);

  // Initialize PDF.js worker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Initializing PDF.js, version:', pdfjs.version);

      // Use worker that matches the exact API version (same as internal viewer)
      const workerSrc = `/pdf-workers/pdf.worker.${pdfjs.version}.min.mjs`;
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

      console.log('PDF.js worker source set to:', workerSrc);
      setPdfInitialized(true);
      console.log('PDF.js initialized successfully');
    }
  }, []);

  // Reset state when file changes
  useEffect(() => {
    if (file) {
      setPageNumber(1);
      setScale(1.0);
      setRotation(0);
      setLoading(true);
      setError(null);
    }
  }, [file]);

  console.log('PDFPreviewModal state:', { file: file?.name, pdfFile, pdfInitialized, loading });

  // PDF options (same as internal viewer)
  const pdfOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  }), []);

  // No cleanup needed for direct file usage

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log('PDF loaded successfully, pages:', numPages);
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: unknown) => {
    console.error('PDF load error:', error);
    console.error('PDF load error details:', JSON.stringify(error, null, 2));

    let errorMessage = 'ไม่สามารถโหลดเอกสาร PDF ได้';

    if (typeof error === 'object' && error !== null) {
      const errorObj = error as { message?: string; name?: string };
      if (errorObj.name === 'InvalidPDFException') {
        errorMessage = 'ไฟล์ PDF ไม่ถูกต้องหรือเสียหาย';
      } else if (errorObj.name === 'MissingPDFException') {
        errorMessage = 'ไม่พบไฟล์ PDF';
      } else if (errorObj.name === 'UnexpectedResponseException') {
        errorMessage = 'ไม่สามารถโหลดไฟล์ PDF ได้ กรุณาลองใหม่';
      } else if (errorObj.message) {
        errorMessage = `ข้อผิดพลาด: ${errorObj.message}`;
      }
    }

    setLoading(false);
    setError(errorMessage);
  }, []);

  const onDocumentLoadStart = useCallback(() => {
    console.log('Starting to load PDF...');
    console.log('Worker source:', pdfjs.GlobalWorkerOptions.workerSrc);
    console.log('PDF File:', pdfFile?.name);
    setLoading(true);
    setError(null);
  }, [pdfFile]);

  const changePage = useCallback((offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      if (newPageNumber < 1) return 1;
      if (newPageNumber > numPages) return numPages;
      return newPageNumber;
    });
  }, [numPages]);

  const previousPage = useCallback(() => changePage(-1), [changePage]);
  const nextPage = useCallback(() => changePage(1), [changePage]);

  const zoomIn = useCallback(() => {
    setScale(prevScale => Math.min(prevScale + 0.25, 3.0));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prevScale => Math.max(prevScale - 0.25, 0.5));
  }, []);

  const rotateLeft = useCallback(() => {
    setRotation(prevRotation => (prevRotation - 90) % 360);
  }, []);

  const rotateRight = useCallback(() => {
    setRotation(prevRotation => (prevRotation + 90) % 360);
  }, []);

  if (!file || !pdfFile) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              ตัวอย่างเอกสารแก้ไข - {file.name}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={previousPage}
                disabled={pageNumber <= 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[100px] text-center">
                หน้า {pageNumber} จาก {numPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={nextPage}
                disabled={pageNumber >= numPages || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={zoomOut}
                disabled={scale <= 0.5 || loading}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={zoomIn}
                disabled={scale >= 3.0 || loading}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={rotateLeft}
                disabled={loading}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={rotateRight}
                disabled={loading}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* PDF Content */}
          <div className="flex-1 overflow-auto border rounded-lg bg-gray-100 min-h-[500px]">
            <div className="flex justify-center items-start p-4">
              {!pdfInitialized ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mr-2" />
                  <span>กำลังเตรียมความพร้อม...</span>
                </div>
              ) : loading ? (
                <>
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mr-2" />
                    <span>กำลังโหลดเอกสาร...</span>
                  </div>
                  <div className="absolute opacity-0 pointer-events-none">
                    <Document
                      file={pdfFile}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
                      loading=""
                      error=""
                      options={pdfOptions}
                    >
                      <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        rotate={rotation}
                        loading=""
                        error=""
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                      />
                    </Document>
                  </div>
                </>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-red-600">
                  <AlertCircle className="h-8 w-8 mb-2" />
                  <span>{error}</span>
                </div>
              ) : (
                <Document
                  file={pdfFile}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading=""
                  error=""
                  options={pdfOptions}
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    rotate={rotation}
                    loading=""
                    error=""
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                </Document>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}