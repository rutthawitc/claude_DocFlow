'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DocumentStatus } from '@/lib/types';
import { toast } from 'sonner';
import { 
  FileText, 
  Send, 
  CheckCircle, 
  RotateCcw,
  AlertCircle,
  Clock
} from 'lucide-react';

interface StatusManagementProps {
  documentId: number;
  currentStatus: DocumentStatus;
  userRoles: string[];
  onStatusUpdate?: (newStatus: DocumentStatus) => void;
}

interface AdditionalFile {
  id: number;
  documentId: number;
  itemIndex: number;
  itemName: string;
  filePath: string;
  originalFilename: string;
  fileSize: number;
  uploaderId: number;
  isVerified: boolean | null;
  verifiedBy: number | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function StatusManagement({ 
  documentId, 
  currentStatus, 
  userRoles,
  onStatusUpdate 
}: StatusManagementProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [comment, setComment] = useState('');
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<DocumentStatus | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<{
    allVerified: boolean;
    hasAdditionalDocs: boolean;
    loading: boolean;
  }>({ allVerified: false, hasAdditionalDocs: false, loading: true });

  // Check verification status for additional documents
  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        // First, get document details to check if it has additional docs
        const docResponse = await fetch(`/api/documents/${documentId}`, {
          credentials: 'include'
        });

        if (docResponse.ok) {
          const docResult = await docResponse.json();
          if (docResult.success && docResult.data) {
            const document = docResult.data;
            
            // Check if document has additional docs
            if (!document.hasAdditionalDocs || !document.additionalDocs || document.additionalDocs.length === 0) {
              setVerificationStatus({
                allVerified: true, // No additional docs means all verified by default
                hasAdditionalDocs: false,
                loading: false
              });
              return;
            }

            // Get additional files verification status
            const filesResponse = await fetch(`/api/documents/${documentId}/additional-files`, {
              credentials: 'include'
            });

            if (filesResponse.ok) {
              const filesResult = await filesResponse.json();
              if (filesResult.success && filesResult.data) {
                const files: AdditionalFile[] = filesResult.data;
                const filteredDocs = document.additionalDocs.filter((doc: string) => doc && doc.trim() !== '');
                
                let verified = 0;
                let total = filteredDocs.length;

                filteredDocs.forEach((_: string, index: number) => {
                  const file = files.find(f => f.itemIndex === index);
                  if (file && file.isVerified === true) {
                    verified++;
                  }
                });

                const allVerified = total > 0 && verified === total && 
                                  files.filter(f => f.isVerified === false).length === 0 &&
                                  files.filter(f => f.isVerified === null).length === 0;

                setVerificationStatus({
                  allVerified,
                  hasAdditionalDocs: true,
                  loading: false
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
        setVerificationStatus({
          allVerified: false,
          hasAdditionalDocs: true,
          loading: false
        });
      }
    };

    checkVerificationStatus();
  }, [documentId]);

  const getStatusIcon = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.DRAFT:
        return <FileText className="w-4 h-4" />;
      case DocumentStatus.SENT_TO_BRANCH:
        return <Send className="w-4 h-4" />;
      case DocumentStatus.ACKNOWLEDGED:
        return <CheckCircle className="w-4 h-4" />;
      case DocumentStatus.SENT_BACK_TO_DISTRICT:
        return <RotateCcw className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.DRAFT:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case DocumentStatus.SENT_TO_BRANCH:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case DocumentStatus.ACKNOWLEDGED:
        return 'bg-green-100 text-green-800 border-green-300';
      case DocumentStatus.SENT_BACK_TO_DISTRICT:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.DRAFT:
        return 'ร่าง';
      case DocumentStatus.SENT_TO_BRANCH:
        return 'เอกสารจากเขต';
      case DocumentStatus.ACKNOWLEDGED:
        return 'รับทราบแล้ว';
      case DocumentStatus.SENT_BACK_TO_DISTRICT:
        return 'ส่งกลับเขต';
      default:
        return 'ไม่ทราบสถานะ';
    }
  };

  const getAvailableActions = () => {
    const actions: Array<{
      status: DocumentStatus;
      label: string;
      variant: 'default' | 'destructive' | 'outline' | 'secondary';
      requiresComment?: boolean;
    }> = [];

    const isUploader = userRoles.includes('uploader') || userRoles.includes('admin') || userRoles.includes('district_manager');
    const isBranchUser = userRoles.includes('branch_user') || userRoles.includes('branch_manager') || userRoles.includes('admin') || userRoles.includes('district_manager');

    switch (currentStatus) {
      case DocumentStatus.DRAFT:
        if (isUploader) {
          actions.push({
            status: DocumentStatus.SENT_TO_BRANCH,
            label: 'เอกสารจากเขต',
            variant: 'default'
          });
        }
        break;
      
      case DocumentStatus.SENT_TO_BRANCH:
        if (isBranchUser) {
          actions.push({
            status: DocumentStatus.ACKNOWLEDGED,
            label: 'รับทราบ',
            variant: 'default'
          });
          actions.push({
            status: DocumentStatus.SENT_BACK_TO_DISTRICT,
            label: 'ส่งกลับเขต',
            variant: 'outline',
            requiresComment: true
          });
        }
        break;
      
      case DocumentStatus.ACKNOWLEDGED:
        if (isBranchUser) {
          actions.push({
            status: DocumentStatus.SENT_BACK_TO_DISTRICT,
            label: 'ส่งกลับเขต',
            variant: 'outline',
            requiresComment: true
          });
        }
        break;
      
      case DocumentStatus.SENT_BACK_TO_DISTRICT:
        if (isUploader) {
          actions.push({
            status: DocumentStatus.SENT_TO_BRANCH,
            label: 'เอกสารจากเขตใหม่',
            variant: 'default',
            requiresComment: true
          });
        }
        break;
    }

    return actions;
  };

  const handleStatusUpdate = async (newStatus: DocumentStatus, requiresComment = false) => {
    if (requiresComment) {
      setPendingStatus(newStatus);
      setShowCommentDialog(true);
      return;
    }

    await updateStatus(newStatus, '');
  };

  const updateStatus = async (newStatus: DocumentStatus, statusComment: string) => {
    setIsUpdating(true);
    
    try {
      const response = await fetch(`/api/documents/${documentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          comment: statusComment
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // Update local state immediately for instant UI feedback
      onStatusUpdate?.(newStatus);
      
      toast.success('อัปเดตสถานะสำเร็จ');
      
      if (showCommentDialog) {
        setShowCommentDialog(false);
        setComment('');
        setPendingStatus(null);
      }

    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('ไม่สามารถอัปเดตสถานะได้');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCommentSubmit = () => {
    if (pendingStatus && comment.trim()) {
      updateStatus(pendingStatus, comment.trim());
    } else {
      toast.error('กรุณากรอกความคิดเห็น');
    }
  };

  const availableActions = getAvailableActions();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium">สถานะปัจจุบัน:</Label>
        <Badge 
          variant="outline" 
          className={`flex items-center gap-1 ${getStatusColor(currentStatus)}`}
        >
          {getStatusIcon(currentStatus)}
          {getStatusText(currentStatus)}
        </Badge>
      </div>

      {availableActions.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">การดำเนินการ:</Label>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            {availableActions.map((action) => {
              // Check if this is the "Send Back to District" button and additional docs are not verified
              const isSendBackAction = action.status === DocumentStatus.SENT_BACK_TO_DISTRICT;
              const shouldDisableDueToVerification = isSendBackAction && 
                verificationStatus.hasAdditionalDocs && 
                !verificationStatus.allVerified && 
                !verificationStatus.loading;

              return (
                <Button
                  key={action.status}
                  variant={action.variant}
                  size="sm"
                  disabled={isUpdating || shouldDisableDueToVerification}
                  onClick={() => handleStatusUpdate(action.status, action.requiresComment)}
                  className="flex items-center gap-1"
                  title={shouldDisableDueToVerification ? 'กรุณาตรวจสอบเอกสารเพิ่มเติมให้ครบทุกฉบับก่อนส่งกลับเขต' : undefined}
                >
                  {getStatusIcon(action.status)}
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Verification Status Warning */}
      {verificationStatus.hasAdditionalDocs && !verificationStatus.allVerified && !verificationStatus.loading && 
       availableActions.some(action => action.status === DocumentStatus.SENT_BACK_TO_DISTRICT) && (
        <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
          <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-orange-700 font-medium">
              ไม่สามารถส่งกลับเขตได้ในขณะนี้
            </p>
            <p className="text-xs text-orange-600 mt-1">
              กรุณาตรวจสอบเอกสารเพิ่มเติมให้ครบทุกฉบับก่อนส่งกลับเขต
            </p>
          </div>
        </div>
      )}

      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มความคิดเห็น</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status-comment">
                ความคิดเห็น (จำเป็น)
              </Label>
              <Textarea
                id="status-comment"
                placeholder="กรุณาระบุเหตุผลหรือความคิดเห็น..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCommentDialog(false);
                  setComment('');
                  setPendingStatus(null);
                }}
                disabled={isUpdating}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleCommentSubmit}
                disabled={isUpdating || !comment.trim()}
              >
                {isUpdating ? 'กำลังอัปเดต...' : 'อัปเดตสถานะ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {availableActions.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <AlertCircle className="w-4 h-4" />
          ไม่มีการดำเนินการที่ใช้ได้สำหรับสถานะนี้
        </div>
      )}
    </div>
  );
}