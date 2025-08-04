'use client';

import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { 
  MessageSquare, 
  Send, 
  User, 
  Clock,
  Loader2,
  Trash2,
  Edit3,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

// Support both nested and flat comment structures
interface Comment {
  // Nested structure (from API)
  comment?: {
    id: number;
    documentId: number;
    userId: number;
    content: string;
    createdAt: string;
  };
  user?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  // Flat structure (legacy/alternative)
  id?: number;
  documentId?: number;
  userId?: number;
  content?: string;
  createdAt?: string;
}

interface CommentSystemProps {
  documentId: number;
  initialComments?: Comment[];
  userRoles: string[];
  currentUserId?: number;
  refreshInterval?: number; // in milliseconds, default 10000 (10s)
}

// Helper functions to safely access comment data
const getCommentId = (comment: Comment): number => {
  return comment.comment?.id ?? comment.id ?? 0;
};

const getCommentContent = (comment: Comment): string => {
  return comment.comment?.content ?? comment.content ?? '';
};

const getCommentCreatedAt = (comment: Comment): string => {
  return comment.comment?.createdAt ?? comment.createdAt ?? '';
};

const getCommentUser = (comment: Comment) => {
  return comment.user ?? {
    id: 0,
    username: '',
    firstName: 'Unknown',
    lastName: 'User'
  };
};

export function CommentSystem({ 
  documentId, 
  initialComments = [],
  userRoles,
  currentUserId,
  refreshInterval = 10000
}: CommentSystemProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new comments are added
  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch latest comments
  const fetchComments = async (silent = true) => {
    if (!silent) setIsLoading(true);
    
    try {
      const response = await fetch(`/api/documents/${documentId}/comments?t=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-cache', // Force fresh data
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const hasNewComments = result.data.length > comments.length;
          setComments(result.data);
          
          // Auto-scroll if there are new comments
          if (hasNewComments && silent) {
            setTimeout(scrollToBottom, 100);
          }
        }
      }
    } catch (error) {
      if (!silent) {
        console.error('Failed to fetch comments:', error);
        toast.error('ไม่สามารถโหลดความคิดเห็นได้');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Set up real-time refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchComments(true);
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [documentId, refreshInterval, comments.length]);

  // Handle comment submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setComments(prev => [...prev, result.data]);
        setNewComment('');
        toast.success('เพิ่มความคิดเห็นเรียบร้อย');
        
        // Scroll to the new comment
        setTimeout(scrollToBottom, 100);
      } else {
        throw new Error(result.error || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Comment submission error:', error);
      toast.error('ไม่สามารถเพิ่มความคิดเห็นได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle comment edit
  const startEdit = (comment: Comment) => {
    setEditingCommentId(getCommentId(comment));
    setEditText(getCommentContent(comment));
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditText('');
  };

  const saveEdit = async (commentId: number) => {
    if (!editText.trim()) return;

    try {
      const response = await fetch(`/api/documents/${documentId}/comments/${commentId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editText.trim() }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, content: editText.trim() }
            : comment
        ));
        setEditingCommentId(null);
        setEditText('');
        toast.success('แก้ไขความคิดเห็นเรียบร้อย');
      } else {
        throw new Error(result.error || 'Failed to edit comment');
      }
    } catch (error) {
      console.error('Comment edit error:', error);
      toast.error('ไม่สามารถแก้ไขความคิดเห็นได้');
    }
  };

  // Handle comment delete
  const deleteComment = async (commentId: number) => {
    if (!confirm('คุณต้องการลบความคิดเห็นนี้หรือไม่?')) return;

    try {
      const response = await fetch(`/api/documents/${documentId}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setComments(prev => prev.filter(comment => comment.id !== commentId));
        toast.success('ลบความคิดเห็นเรียบร้อย');
      } else {
        throw new Error(result.error || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Comment delete error:', error);
      toast.error('ไม่สามารถลบความคิดเห็นได้');
    }
  };

  const canModifyComment = (comment: Comment) => {
    return currentUserId === comment.userId || userRoles.includes('admin');
  };

  const canAddComments = () => {
    return userRoles.some(role => 
      ['admin', 'uploader', 'branch_user', 'branch_manager', 'user'].includes(role)
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <CardTitle>ความคิดเห็น ({comments.length})</CardTitle>
        </div>
        {refreshInterval > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            อัปเดตทุก {Math.floor(refreshInterval / 1000)} วินาที
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Comments List */}
        <div className="space-y-4 max-h-80 sm:max-h-96 overflow-y-auto">
          {isLoading && comments.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>กำลังโหลดความคิดเห็น...</span>
            </div>
          ) : comments.length > 0 ? (
            comments.map((comment, index) => {
              // Debug: Log comment structure
              if (index === 0) {
                console.log('Comment structure:', comment);
              }
              return (
              <div key={getCommentId(comment) || `comment-${index}`} className="space-y-2 group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-right">
                        {getCommentUser(comment).firstName} {getCommentUser(comment).lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(() => {
                          try {
                            // Check if createdAt exists
                            const createdAt = getCommentCreatedAt(comment);
                            if (!createdAt) {
                              console.warn('Missing createdAt for comment ID:', getCommentId(comment), comment);
                              return 'ไม่ระบุเวลา';
                            }
                            
                            // Handle both string and Date objects
                            const date = typeof createdAt === 'string' 
                              ? new Date(createdAt) 
                              : createdAt;
                            
                            // Check if date is valid
                            if (!date || isNaN(date.getTime())) {
                              console.warn('Invalid date for comment ID:', getCommentId(comment), 'createdAt:', createdAt);
                              return 'วันที่ไม่ถูกต้อง';
                            }
                            
                            return format(date, 'dd/MM/yyyy HH:mm', { locale: th });
                          } catch (error) {
                            console.error('Date formatting error for comment ID:', getCommentId(comment), error, 'createdAt:', createdAt);
                            return 'ข้อผิดพลาดวันที่';
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                  
                  {canModifyComment(comment) && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(comment)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteComment(getCommentId(comment))}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {editingCommentId === getCommentId(comment) ? (
                  <div className="space-y-2 ml-10">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="min-h-[80px]"
                      placeholder="แก้ไขความคิดเห็น..."
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEdit}
                      >
                        <X className="h-4 w-4 mr-1" />
                        ยกเลิก
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveEdit(getCommentId(comment))}
                        disabled={!editText.trim()}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        บันทึก
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="ml-10">
                    <p className="text-gray-700 whitespace-pre-wrap">{getCommentContent(comment)}</p>
                  </div>
                )}

                {index < comments.length - 1 && <Separator />}
              </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>ยังไม่มีความคิดเห็น</p>
            </div>
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Add Comment Form */}
        {canAddComments() && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Separator />
            <div>
              <Textarea
                ref={textareaRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="เพิ่มความคิดเห็น..."
                className="min-h-[80px]"
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isSubmitting || !newComment.trim()}
                size="sm"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                ส่งความคิดเห็น
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}