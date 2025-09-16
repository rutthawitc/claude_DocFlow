'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLoadingState } from '@/hooks/useLoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, 
  Edit2, 
  Trash2, 
  Eye,
  Calendar,
  Building,
  Loader2,
  AlertTriangle,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { DeleteDraftModal } from '@/components/ui/delete-draft-modal';

interface DraftDocument {
  id: number;
  mtNumber: string;
  mtDate: string;
  subject: string;
  monthYear: string;
  branchBaCode: number;
  branchName?: string;
  createdAt: string;
  filePath: string;
  originalFilename: string;
  hasAdditionalDocs?: boolean;
  additionalDocsCount?: number;
  additionalDocs?: string[];
}

interface DraftedDocumentsListProps {
  onEditDocument?: (document: DraftDocument) => void;
  refreshTrigger?: number;
}

export function DraftedDocumentsList({ onEditDocument, refreshTrigger }: DraftedDocumentsListProps) {
  const router = useRouter();
  const [draftDocuments, setDraftDocuments] = useState<DraftDocument[]>([]);
  const { loading, error, execute, setError } = useLoadingState({ initialLoading: true });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DraftDocument | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<number>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);

  // Fetch drafted documents
  const fetchDraftDocuments = async () => {
    try {
      const response = await execute(fetch('/api/documents?status=draft', {
        credentials: 'include'
      }));

      const result = await response.json();

      if (response.ok && result.success) {
        const documents = result.data.data || [];
        setDraftDocuments(documents);
      } else {
        throw new Error(result.error || 'Failed to fetch drafted documents');
      }
    } catch (err) {
      console.error('Error fetching drafted documents:', err);
      // Error is automatically handled by execute()
    }
  };

  // Load documents on mount and when refresh trigger changes
  useEffect(() => {
    fetchDraftDocuments();
  }, [refreshTrigger]);

  // Handle edit document
  const handleEdit = (document: DraftDocument) => {
    if (onEditDocument) {
      onEditDocument(document);
    } else {
      // Navigate to edit page if no callback provided
      router.push(`/documents/${document.id}/edit`);
    }
  };

  // Handle delete document click
  const handleDeleteClick = (document: DraftDocument) => {
    setDocumentToDelete(document);
    setShowDeleteModal(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    try {
      const response = await fetch(`/api/documents/${documentToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('ลบเอกสารร่างสำเร็จ');
        setDraftDocuments(prev => prev.filter(doc => doc.id !== documentToDelete.id));
        setShowDeleteModal(false);
        setDocumentToDelete(null);
      } else {
        throw new Error(result.error || 'Failed to delete document');
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      toast.error('ไม่สามารถลบเอกสารได้');
    }
  };

  // Handle delete cancel
  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDocumentToDelete(null);
  };

  // Handle view document
  const handleView = (documentId: number) => {
    router.push(`/documents/${documentId}`);
  };

  // Handle checkbox change for individual document
  const handleDocumentCheck = (documentId: number, checked: boolean) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(documentId);
      } else {
        newSet.delete(documentId);
      }
      return newSet;
    });
  };

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDocuments(new Set(draftDocuments.map(doc => doc.id)));
    } else {
      setSelectedDocuments(new Set());
    }
  };

  // Check if all documents are selected
  const isAllSelected = draftDocuments.length > 0 && selectedDocuments.size === draftDocuments.length;
  const isPartiallySelected = selectedDocuments.size > 0 && selectedDocuments.size < draftDocuments.length;

  // Handle bulk send documents
  const handleBulkSend = async () => {
    if (selectedDocuments.size === 0) {
      toast.error('กรุณาเลือกเอกสารที่ต้องการส่ง');
      return;
    }
    setShowSendConfirmation(true);
  };

  // Confirm and send selected documents
  const confirmBulkSend = async () => {
    setIsSending(true);
    setShowSendConfirmation(false);
    
    try {
      const documentIds = Array.from(selectedDocuments);
      const response = await fetch('/api/documents/bulk-send', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documentIds })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const sentCount = result.data.sentCount || documentIds.length;
        toast.success(`เอกสารได้ถูกส่งแล้วจำนวน ${sentCount} ฉบับ`);
        
        // Remove sent documents from the list
        setDraftDocuments(prev => prev.filter(doc => !selectedDocuments.has(doc.id)));
        setSelectedDocuments(new Set());
      } else {
        throw new Error(result.error || 'Failed to send documents');
      }
    } catch (err) {
      console.error('Error sending documents:', err);
      toast.error('ไม่สามารถส่งเอกสารได้');
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            เอกสารร่าง
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            กำลังโหลดเอกสารร่าง...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            เอกสารร่าง
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 text-center">
            <div className="space-y-2">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
              <p className="text-red-600">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchDraftDocuments}
              >
                ลองใหม่
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            เอกสารร่าง ({draftDocuments.length})
          </CardTitle>
          
          {draftDocuments.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  id="select-all"
                  className={isPartiallySelected ? 'data-[state=checked]:bg-blue-600' : ''}
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  เลือกทั้งหมด
                </label>
              </div>
              
              {selectedDocuments.size > 0 && (
                <Button
                  onClick={handleBulkSend}
                  disabled={isSending}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  ส่งเอกสารที่เลือก ({selectedDocuments.size})
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {draftDocuments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>ไม่มีเอกสารร่าง</p>
            <p className="text-sm">เอกสารที่บันทึกเป็นร่างจะแสดงที่นี่</p>
          </div>
        ) : (
          <div className="space-y-3">
            {draftDocuments.map((document) => (
              <div
                key={document.id}
                className={`border rounded-lg p-4 transition-colors ${
                  selectedDocuments.has(document.id) 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedDocuments.has(document.id)}
                    onCheckedChange={(checked) => handleDocumentCheck(document.id, checked as boolean)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Draft
                      </Badge>
                      <span className="text-sm font-medium text-gray-600">
                        {document.mtNumber}
                      </span>
                    </div>
                    
                    <h4 className="font-medium text-gray-900 mb-1 line-clamp-2">
                      {document.subject}
                    </h4>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        <span>BA: {document.branchBaCode}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{document.monthYear}</span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-400">
                      บันทึกเมื่อ {formatDistanceToNow(new Date(document.createdAt), { 
                        addSuffix: true, 
                        locale: th 
                      })}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(document.id)}
                      className="text-gray-500 hover:text-blue-600"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(document)}
                      className="text-gray-500 hover:text-green-600"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(document)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Modal */}
      <DeleteDraftModal
        open={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        documentTitle={documentToDelete?.subject}
        mtNumber={documentToDelete?.mtNumber}
      />

      {/* Send Confirmation Dialog */}
      {showSendConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">ยืนยันการส่งเอกสาร</h3>
            <p className="text-gray-600 mb-6">
              คุณต้องการส่งเอกสารที่เลือกจำนวน {selectedDocuments.size} ฉบับหรือไม่?
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowSendConfirmation(false)}
                disabled={isSending}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={confirmBulkSend}
                disabled={isSending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    กำลังส่ง...
                  </>
                ) : (
                  'ยืนยันส่งเอกสาร'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}