'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { toast } from 'sonner';

interface AdditionalPDFViewerClientProps {
  documentId: number;
  itemIndex: number;
  filename: string;
  className?: string;
}

export function AdditionalPDFViewerClient({ 
  documentId, 
  itemIndex, 
  filename, 
  className 
}: AdditionalPDFViewerClientProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfInitialized, setPdfInitialized] = useState<boolean>(false);

  const pdfUrl = `/api/documents/${documentId}/additional-files/${itemIndex}/view`;
  
  // Initialize PDF.js worker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Initializing PDF.js for additional document, version:', pdfjs.version);
      
      // Use worker that matches the exact API version
      const workerSrc = `/pdf-workers/pdf.worker.${pdfjs.version}.min.mjs`;
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      
      console.log('PDF.js worker source set to:', workerSrc);
      setPdfInitialized(true);
    }
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log('Additional PDF loaded successfully, pages:', numPages);
    setNumPages(numPages);
    setPageNumber(1);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: any) => {
    console.error('Error loading additional PDF:', error);
    setError('Failed to load PDF document');
    setLoading(false);
  }, []);

  const changePage = useCallback((offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      return Math.min(Math.max(1, newPageNumber), numPages);
    });
  }, [numPages]);

  const changeScale = useCallback((newScale: number) => {
    setScale(Math.max(0.25, Math.min(3.0, newScale)));
  }, []);

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}/additional-files/${itemIndex}/download`, {
        credentials: 'include'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
        toast.success('ดาวน์โหลดเรียบร้อย');
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('ไม่สามารถดาวน์โหลดไฟล์ได้');
    }
  };

  const pageControls = useMemo(() => (
    <div className="flex items-center gap-2 text-sm">
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => changePage(-1)} 
        disabled={pageNumber <= 1}
      >
        <ChevronLeft className="h-3 w-3" />
      </Button>
      
      <span className="min-w-16 text-center">
        {pageNumber} / {numPages}
      </span>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => changePage(1)} 
        disabled={pageNumber >= numPages}
      >
        <ChevronRight className="h-3 w-3" />
      </Button>
    </div>
  ), [pageNumber, numPages, changePage]);

  const zoomControls = useMemo(() => (
    <div className="flex items-center gap-1">
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => changeScale(scale - 0.25)}
        disabled={scale <= 0.25}
      >
        <ZoomOut className="h-3 w-3" />
      </Button>
      
      <span className="min-w-12 text-center text-sm">
        {Math.round(scale * 100)}%
      </span>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => changeScale(scale + 0.25)}
        disabled={scale >= 3.0}
      >
        <ZoomIn className="h-3 w-3" />
      </Button>
    </div>
  ), [scale, changeScale]);

  if (!pdfInitialized) {
    return (
      <Card className={className}>
        <CardContent className="p-0">
          <div className="flex items-center justify-center py-12 h-[600px] bg-gray-50">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>กำลังเตรียมระบบ PDF...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          เอกสารเพิ่มเติม
        </CardTitle>
        
        <div className="flex items-center gap-2">
          {pageControls}
          
          <div className="h-4 w-px bg-gray-300 mx-2" />
          
          {zoomControls}
          
          <div className="h-4 w-px bg-gray-300 mx-2" />
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setRotation(rotation - 90)}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setRotation(rotation + 90)}
          >
            <RotateCw className="h-3 w-3" />
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDownload}
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-[600px]'} overflow-auto bg-gray-50`}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>กำลังโหลดเอกสาร...</span>
            </div>
          )}
          
          {error ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">ไม่สามารถโหลดเอกสารได้</h3>
              <p className="text-sm text-gray-600 text-center mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                ลองใหม่
              </Button>
            </div>
          ) : (
            <div className="flex justify-center py-4">
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={null}
                error={null}
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  loading={null}
                  error={null}
                />
              </Document>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}