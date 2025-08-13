'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Trash2,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

interface Document {
  id: number;
  originalFilename: string;
  fileSize: number;
  branchBaCode: number;
  uploadDate: string;
  mtNumber: string;
  mtDate: string;
  subject: string;
  monthYear: string;
  status: string;
  uploaderId: number;
  createdAt: string;
  updatedAt: string;
  branch?: {
    id: number;
    name: string;
    baCode: number;
  };
  uploader?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
}

interface DocumentsListProps {
  branchBaCode?: number;
  title?: string;
  showBranchFilter?: boolean;
}

interface Filters {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
}

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  sent_to_branch: 'bg-orange-100 text-orange-700 border-orange-200',
  acknowledged: 'bg-green-100 text-green-700 border-green-200',
  sent_back_to_district: 'bg-blue-100 text-blue-700 border-blue-200'
};

const STATUS_LABELS = {
  draft: 'ร่าง',
  sent_to_branch: 'เอกสารจากเขต',
  acknowledged: 'รับทราบ',
  sent_back_to_district: 'ส่งกลับเขต'
};

export function DocumentsList({ 
  branchBaCode, 
  title = 'เอกสารทั้งหมด',
  showBranchFilter = true 
}: DocumentsListProps) {
  const { hasRole, hasPermission, user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<{ [key: number]: boolean }>({});
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [deletedDocumentInfo, setDeletedDocumentInfo] = useState<{ mtNumber: string; subject: string } | null>(null);

  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 20
  });

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.status !== 'all') queryParams.append('status', filters.status);
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
      queryParams.append('page', filters.page.toString());
      queryParams.append('limit', filters.limit.toString());

      // Add timestamp to prevent caching issues, especially for branch views
      queryParams.append('_t', Date.now().toString());
      // Add random parameter to defeat any client-side caching
      queryParams.append('_r', Math.random().toString(36).substring(7));
      
      const endpoint = branchBaCode 
        ? `/api/documents/branch/${branchBaCode}?${queryParams}`
        : `/api/documents?${queryParams}`;

      const response = await fetch(endpoint, {
        credentials: 'include',
        cache: 'no-store', // Ensure fresh data, especially important for branch views
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      
      if (!responseText) {
        throw new Error('Empty response from server');
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Response text:', responseText);
        throw new Error('Invalid JSON response from server');
      }

      if (result.success) {
        setDocuments(result.data.data || []);
        setTotalPages(result.data.totalPages || 0);
        setTotalDocuments(result.data.total || 0);
      } else {
        throw new Error(result.error || 'Failed to fetch documents');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [branchBaCode, filters]);

  // Initial load and refetch when filters change
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle filter changes
  const handleFilterChange = useCallback((key: keyof Filters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value // Reset to page 1 when changing filters
    }));
  }, []);

  // Handle search with debounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (filters.search !== '') {
        fetchDocuments();
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [filters.search]);

  // Download document
  const handleDownload = async (documentId: number, filename: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/download`, {
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
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  // Delete document
  const handleDelete = async (documentId: number) => {
    setDeletingId(documentId);
    
    // Find the document info for the success message
    const docToDelete = documents.find(doc => doc.id === documentId);
    
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        console.log('Delete API successful, updating UI...');
        
        // Use flushSync to force immediate synchronous updates
        flushSync(() => {
          // Remove document from local state immediately
          setDocuments(prev => {
            const newDocs = prev.filter(doc => doc.id !== documentId);
            console.log('Documents updated:', prev.length, '->', newDocs.length);
            return newDocs;
          });
          
          setTotalDocuments(prev => {
            const newTotal = prev - 1;
            console.log('Total documents updated:', prev, '->', newTotal);
            return newTotal;
          });
          
          // Close the delete confirmation dialog
          setDeleteDialogOpen(prev => ({ ...prev, [documentId]: false }));
        });
        
        // Set document info and show success dialog
        if (docToDelete) {
          setDeletedDocumentInfo({
            mtNumber: docToDelete.mtNumber,
            subject: docToDelete.subject
          });
        }
        setSuccessDialogOpen(true);
        
        // Force refresh the data from server to ensure consistency
        // This is especially important for branch-specific views
        // Multiple refreshes to handle any backend delays and cache clearing
        setTimeout(() => {
          fetchDocuments();
        }, 100);
        setTimeout(() => {
          fetchDocuments();
        }, 500);
        setTimeout(() => {
          fetchDocuments();
        }, 1500);
        
        // Also trigger a page refresh for branch views to clear any lingering cache
        if (branchBaCode) {
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
        
        console.log('Document deleted successfully, UI should update now');
      } else {
        const error = await response.json();
        console.error('Delete failed:', error.error);
        alert(`ลบเอกสารไม่สำเร็จ: ${error.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('เกิดข้อผิดพลาดในการลบเอกสาร');
    } finally {
      setDeletingId(null);
    }
  };

  // Check if user can delete document
  const canDeleteDocument = (doc: Document): boolean => {
    // Admin can delete any document
    if (hasRole('admin')) return true;
    
    // Users with delete permission can delete any document
    if (hasPermission('documents:delete')) return true;
    
    // Document owner can delete their own draft documents
    if (user?.id === doc.uploaderId.toString() && doc.status === 'draft') return true;
    
    return false;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-gray-600">
            {totalDocuments} เอกสาร
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDocuments}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            ตัวกรอง
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">ค้นหา</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="เลขที่ มท หรือ เรื่อง"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">สถานะ</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="draft">Draft</option>
                  <option value="sent_to_branch">เอกสารจากเขต</option>
                  <option value="acknowledged">รับทราบ</option>
                  <option value="sent_back_to_district">ส่งกลับเขต</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">วันที่เริ่มต้น</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">วันที่สิ้นสุด</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">กำลังโหลด...</span>
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ไม่พบเอกสาร
            </h3>
            <p className="text-gray-500">
              ไม่มีเอกสารที่ตรงกับเงื่อนไขการค้นหา
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {console.log('Rendering documents:', documents.length)}
          {documents.map((doc) => (
            <Card key={`doc-${doc.id}-${doc.updatedAt}`} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Document Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">
                          {doc.mtNumber}
                        </h3>
                        <p className="text-gray-600">
                          {doc.subject}
                        </p>
                        {showBranchFilter && doc.branch && (
                          <p className="text-sm text-blue-600">
                            {doc.branch.name}
                          </p>
                        )}
                      </div>
                      
                      <Badge 
                        variant="outline" 
                        className={STATUS_COLORS[doc.status as keyof typeof STATUS_COLORS]}
                      >
                        {STATUS_LABELS[doc.status as keyof typeof STATUS_LABELS]}
                      </Badge>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(doc.mtDate), 'dd/MM/yyyy', { locale: th })}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {formatFileSize(doc.fileSize)}
                      </div>
                      <div>
                        ประจำ: {doc.monthYear}
                      </div>
                      {doc.uploader && (
                        <div className="text-right">
                          โดย: {doc.uploader.firstName} {doc.uploader.lastName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link href={`/documents/${doc.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        ดู
                      </Button>
                    </Link>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc.id, doc.originalFilename)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      ดาวน์โหลด
                    </Button>

                    {canDeleteDocument(doc) && (
                      <Dialog 
                        open={deleteDialogOpen[doc.id] || false}
                        onOpenChange={(open) => setDeleteDialogOpen(prev => ({ ...prev, [doc.id]: open }))}
                      >
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={deletingId === doc.id}
                            onClick={() => setDeleteDialogOpen(prev => ({ ...prev, [doc.id]: true }))}
                          >
                            {deletingId === doc.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-1" />
                            )}
                            ลบ
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>ยืนยันการลบเอกสาร</DialogTitle>
                            <DialogDescription>
                              คุณแน่ใจหรือไม่ที่จะลบเอกสาร &quot;{doc.mtNumber}&quot; - {doc.subject}?
                              <br />
                              <strong className="text-red-600">การดำเนินการนี้ไม่สามารถยกเลิกได้</strong>
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button 
                              variant="outline"
                              onClick={() => setDeleteDialogOpen(prev => ({ ...prev, [doc.id]: false }))}
                            >
                              ยกเลิก
                            </Button>
                            <Button
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => handleDelete(doc.id)}
                              disabled={deletingId === doc.id}
                            >
                              {deletingId === doc.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  กำลังลบ...
                                </>
                              ) : (
                                'ลบเอกสาร'
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            หน้า {filters.page} จาก {totalPages} ({totalDocuments} เอกสาร)
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange('page', filters.page - 1)}
              disabled={filters.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              ก่อนหน้า
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={filters.page === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange('page', page)}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange('page', filters.page + 1)}
              disabled={filters.page >= totalPages}
            >
              ถัดไป
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div>
                <DialogTitle className="text-green-800">ลบเอกสารสำเร็จ</DialogTitle>
                <DialogDescription className="text-gray-600">
                  เอกสารถูกลบออกจากระบบเรียบร้อยแล้ว
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            {deletedDocumentInfo && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">เอกสารที่ถูกลบ:</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">เลขที่:</span> {deletedDocumentInfo.mtNumber}</p>
                  <p><span className="font-medium">เรื่อง:</span> {deletedDocumentInfo.subject}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              onClick={() => {
                setSuccessDialogOpen(false);
                setDeletedDocumentInfo(null);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              ตกลง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}