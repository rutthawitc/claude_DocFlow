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
  Download,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Loader2,
  AlertCircle,
  FileText,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface PDFViewerClientProps {
  documentId: number;
  filename: string;
  className?: string;
  additionalFileIndex?: number; // For additional files
  emendationFileId?: number; // For emendation files
  compact?: boolean; // For compact view
}

export function PDFViewerClient({ documentId, filename, className, additionalFileIndex, emendationFileId, compact = false }: PDFViewerClientProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfInitialized, setPdfInitialized] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(compact); // For compact mode, start collapsed

  const pdfUrl = emendationFileId !== undefined
    ? `/api/documents/${documentId}/emendation-files/${emendationFileId}/view`
    : additionalFileIndex !== undefined
    ? `/api/documents/${documentId}/additional-files/${additionalFileIndex}/view`
    : `/api/documents/${documentId}/download`;
  
  // Initialize PDF.js worker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Initializing PDF.js, version:', pdfjs.version);
      
      // Use worker that matches the exact API version
      const workerSrc = `/pdf-workers/pdf.worker.${pdfjs.version}.min.mjs`;
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      
      console.log('PDF.js worker source set to:', workerSrc);
      setPdfInitialized(true);
      console.log('PDF.js initialized successfully');
    }
  }, []);
  
  console.log('PDFViewer state:', { documentId, pdfUrl, pdfInitialized, loading });

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: unknown) => {
    console.error('PDF load error:', error);
    console.error('PDF load error details:', JSON.stringify(error, null, 2));
    
    let errorMessage = 'ไม่สามารถโหลดเอกสาร PDF ได้';
    
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ResponseException') {
      const responseError = error as { status?: number };
      console.log('ResponseException status:', responseError.status);
      if (responseError.status === 403) {
        errorMessage = 'ไม่มีสิทธิ์เข้าถึงเอกสารนี้';
      } else if (responseError.status === 404) {
        errorMessage = 'ไม่พบเอกสารที่ต้องการ';
      } else if (responseError.status === 401) {
        errorMessage = 'กรุณาเข้าสู่ระบบใหม่';
      } else {
        errorMessage = `เกิดข้อผิดพลาดในการโหลดเอกสาร (${responseError.status})`;
      }
    } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      errorMessage = error.message;
    }
    
    setError(errorMessage);
    setLoading(false);
    toast.error(errorMessage);
  }, []);

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleRotateLeft = useCallback(() => {
    setRotation(prev => prev - 90);
  }, []);

  const handleRotateRight = useCallback(() => {
    setRotation(prev => prev + 90);
  }, []);

  const handlePrevPage = useCallback(() => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  }, [numPages]);

  const pdfOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  }), []);

  const handleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [pdfUrl, filename]);

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle 
            className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors"
            onClick={toggleCollapse}
          >
            <FileText className="h-5 w-5" />
{additionalFileIndex !== undefined ? 'เอกสารแก้ไข PDF' : 'บันทึกต้นฉบับ'}
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4 ml-1" />
            ) : (
              <ChevronUp className="h-4 w-4 ml-1" />
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              ดาวน์โหลด
            </Button>
          </div>
        </CardHeader>
        {!isCollapsed && (
          <CardContent className="p-0">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-600 mb-2">{error}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                }}
              >
                ลองใหม่
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle 
          className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={toggleCollapse}
        >
          <FileText className="h-5 w-5" />
          {additionalFileIndex !== undefined ? 'เอกสารแก้ไข PDF' : 'บันทึกต้นฉบับ'}
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 ml-1" />
          ) : (
            <ChevronUp className="h-4 w-4 ml-1" />
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            ดาวน์โหลด
          </Button>
          <Button variant="outline" size="sm" onClick={handleFullscreen}>
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4 mr-1" />
            ) : (
              <Maximize2 className="h-4 w-4 mr-1" />
            )}
            {isFullscreen ? 'ย่อหน้าจอ' : 'ขยายหน้าจอ'}
          </Button>
        </div>
      </CardHeader>

      {!isCollapsed && pdfInitialized && numPages > 0 && (
        <div className="px-6 pb-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={pageNumber <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium whitespace-nowrap">
                {pageNumber} / {numPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={pageNumber >= numPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium whitespace-nowrap min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRotateLeft}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleRotateRight}>
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {!isCollapsed && (
        <CardContent className="p-0">
        <div className={`overflow-auto ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-[600px]'} bg-gray-50`}>
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
                    file={pdfUrl}
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
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      className="shadow-lg border border-gray-200 bg-white"
                    />
                  </Document>
                </div>
              </>
            ) : (
              <Document
                file={pdfUrl}
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
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="shadow-lg border border-gray-200 bg-white"
                />
              </Document>
            )}
          </div>
        </div>
      </CardContent>
      )}
    </Card>
  );
}