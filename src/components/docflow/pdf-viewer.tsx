'use client';

import React, { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
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
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  documentId: number;
  filename: string;
  className?: string;
}

export function PDFViewer({ documentId, filename, className }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const pdfUrl = `/api/documents/${documentId}/download`;

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF load error:', error);
    setError('ไม่สามารถโหลดเอกสาร PDF ได้');
    setLoading(false);
    toast.error('ไม่สามารถโหลดเอกสาร PDF ได้');
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

  const handleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(pdfUrl, {
        credentials: 'include'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('ดาวน์โหลดเรียบร้อย');
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('ไม่สามารถดาวน์โหลดไฟล์ได้');
    }
  }, [pdfUrl, filename]);

  const resetView = useCallback(() => {
    setScale(1.0);
    setRotation(0);
    setPageNumber(1);
  }, []);

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            เอกสาร PDF
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่สามารถแสดงเอกสารได้</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleDownload} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              ดาวน์โหลดเอกสาร
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} ${isFullscreen ? 'fixed inset-0 z-[999] bg-white' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            เอกสาร PDF
            {numPages > 0 && (
              <span className="text-sm font-normal text-gray-500">
                ({numPages} หน้า)
              </span>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleFullscreen}
              title={isFullscreen ? 'ออกจากเต็มจอ' : 'เต็มจอ'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {/* Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={pageNumber <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-2 px-2">
                <span className="text-sm">
                  {pageNumber} / {numPages}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={pageNumber >= numPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Zoom */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <span className="text-sm px-2 min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={scale >= 3.0}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Rotation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRotateLeft}
                title="หมุนซ้าย"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRotateRight}
                title="หมุนขวา"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={resetView}>
            รีเซ็ต
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className={`overflow-auto ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-[600px]'} bg-gray-50`}>
          <div className="flex justify-center items-start p-4">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>กำลังโหลดเอกสาร...</span>
              </div>
            )}
            
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading=""
              error=""
              options={{
                cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
                cMapPacked: true,
                standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/',
              }}
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
        </div>
      </CardContent>
    </Card>
  );
}