'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLoadingState } from '@/hooks/useLoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Edit2, 
  Trash2, 
  Eye,
  Calendar,
  Building,
  Loader2,
  AlertTriangle
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
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          เอกสารร่าง ({draftDocuments.length})
        </CardTitle>
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
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
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
                  
                  <div className="flex items-center gap-1 ml-4">
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
    </Card>
  );
}