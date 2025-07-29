'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  X, 
  AlertCircle, 
  CheckCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  clientDocumentUploadSchema, 
  validateForm, 
  validateField, 
  validatePDFFile,
  sanitizeFormData,
  type ValidationResult,
  type ClientDocumentUploadInput
} from '@/lib/validation/client';

interface Branch {
  id: number;
  baCode: number;
  name: string;
}

interface DocumentUploadProps {
  branches: Branch[];
  onUploadSuccess?: (document: unknown) => void;
  editDocument?: {
    id: number;
    mtNumber: string;
    mtDate: string;
    subject: string;
    monthYear: string;
    branchBaCode: number;
    originalFilename: string;
  };
  onEditComplete?: () => void;
}

interface FormData {
  branchBaCode: string;
  mtNumber: string;
  mtDate: string;
  subject: string;
  monthYear: string;
}

export function DocumentUpload({ branches, onUploadSuccess, editDocument, onEditComplete }: DocumentUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    branchBaCode: editDocument?.branchBaCode.toString() || '',
    mtNumber: editDocument?.mtNumber || '',
    mtDate: editDocument?.mtDate || '',
    subject: editDocument?.subject || '',
    monthYear: editDocument?.monthYear || ''
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState(!!editDocument);

  // Update form data when editDocument prop changes
  useEffect(() => {
    if (editDocument) {
      setIsEditMode(true);
      setFormData({
        branchBaCode: editDocument.branchBaCode.toString(),
        mtNumber: editDocument.mtNumber,
        mtDate: editDocument.mtDate,
        subject: editDocument.subject,
        monthYear: editDocument.monthYear
      });
      // Clear any existing file selection when switching to edit mode
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      setIsEditMode(false);
    }
  }, [editDocument]);

  // File validation
  const validateFile = useCallback((file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf'];
    
    if (!allowedTypes.includes(file.type)) {
      return 'Only PDF files are allowed';
    }
    
    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }
    
    return null;
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    
    setSelectedFile(file);
    setErrors(prev => ({ ...prev, file: '' }));
  }, [validateFile]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // File input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Field-level validation for real-time feedback (define first)
  const validateSingleField = useCallback((fieldName: keyof ClientDocumentUploadInput, value: string) => {
    const fieldSchema = clientDocumentUploadSchema.shape[fieldName];
    const fieldValidation = validateField(value, fieldSchema, fieldName);
    
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: fieldValidation.isValid ? '' : fieldValidation.error || ''
    }));
    
    return fieldValidation.isValid;
  }, []);

  // Form input change
  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear errors for this field
    setErrors(prev => ({ ...prev, [field]: [] }));
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
    
    // Real-time validation with debounce
    if (value.trim()) {
      setTimeout(() => {
        validateSingleField(field as keyof ClientDocumentUploadInput, value);
      }, 300);
    }
  }, [validateSingleField]);

  // Validate file
  const validateFileSelection = useCallback((file: File | null): { isValid: boolean; error?: string } => {
    if (!file && !isEditMode) {
      return { isValid: false, error: 'กรุณาเลือกไฟล์ PDF' };
    }
    
    if (file) {
      return validatePDFFile(file);
    }
    
    return { isValid: true };
  }, [isEditMode]);

  // Form validation with Zod
  const validateFormData = useCallback((): ValidationResult<ClientDocumentUploadInput> => {
    // Sanitize form data
    const sanitizedData = sanitizeFormData(formData);
    
    // Validate with Zod schema
    const validation = validateForm(sanitizedData, clientDocumentUploadSchema);
    
    // File validation
    const fileValidation = validateFileSelection(selectedFile);
    if (!fileValidation.isValid) {
      validation.errors = { 
        ...validation.errors, 
        file: [fileValidation.error!] 
      };
      validation.success = false;
    }
    
    // Update error states
    setErrors(validation.errors || {});
    setFieldErrors(
      Object.fromEntries(
        Object.entries(validation.errors || {}).map(([key, msgs]) => [key, msgs[0]])
      )
    );
    
    return validation;
  }, [formData, selectedFile, validateFileSelection]);

  // Generate month/year options
  const generateMonthYearOptions = () => {
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    
    const currentYear = new Date().getFullYear();
    const buddhistYear = currentYear + 543;
    const options = [];

    for (let year = buddhistYear; year >= buddhistYear - 2; year--) {
      months.forEach(month => {
        options.push(`${month} ${year}`);
      });
    }

    return options;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent, action: 'save' | 'send') => {
    e.preventDefault();
    
    // Validate form data
    const validation = validateFormData();
    if (!validation.success) {
      toast.error(validation.message || 'กรุณาตรวจสอบข้อมูลที่กรอก');
      return;
    }

    setUploading(true);

    try {
      if (isEditMode && editDocument) {
        // Update existing document
        const updateData = {
          branchBaCode: parseInt(formData.branchBaCode),
          mtNumber: formData.mtNumber,
          mtDate: formData.mtDate,
          subject: formData.subject,
          monthYear: formData.monthYear
        };

        let response;
        if (selectedFile) {
          // Update with new file
          const uploadFormData = new FormData();
          uploadFormData.append('file', selectedFile);
          uploadFormData.append('branchBaCode', formData.branchBaCode);
          uploadFormData.append('mtNumber', formData.mtNumber);
          uploadFormData.append('mtDate', formData.mtDate);
          uploadFormData.append('subject', formData.subject);
          uploadFormData.append('monthYear', formData.monthYear);

          response = await fetch(`/api/documents/${editDocument.id}`, {
            method: 'PUT',
            credentials: 'include',
            body: uploadFormData
          });
        } else {
          // Update metadata only
          response = await fetch(`/api/documents/${editDocument.id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
          });
        }

        const result = await response.json();

        if (response.ok && result.success) {
          toast.success('อัปเดตเอกสารสำเร็จ');
          
          // Update status if sending
          if (action === 'send' && result.data) {
            await fetch(`/api/documents/${result.data.id}/status`, {
              method: 'PATCH',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                status: 'sent_to_branch',
                comment: 'Document sent to branch'
              })
            });
          }

          onEditComplete?.();
          onUploadSuccess?.(result.data);
          router.push('/documents');
        } else {
          throw new Error(result.error || 'Update failed');
        }
      } else {
        // Create new document
        const uploadFormData = new FormData();
        uploadFormData.append('file', selectedFile!);
        uploadFormData.append('branchBaCode', formData.branchBaCode);
        uploadFormData.append('mtNumber', formData.mtNumber);
        uploadFormData.append('mtDate', formData.mtDate);
        uploadFormData.append('subject', formData.subject);
        uploadFormData.append('monthYear', formData.monthYear);

        const response = await fetch('/api/documents', {
          method: 'POST',
          credentials: 'include',
          body: uploadFormData
        });

        const result = await response.json();

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = result.retryAfter || 60;
          toast.error(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`);
          return;
        }

        if (response.ok && result.success) {
          toast.success(
            action === 'save' 
              ? 'Document saved as draft successfully' 
              : 'Document uploaded and sent successfully'
          );
          
          // Reset form
          setSelectedFile(null);
          setFormData({
            branchBaCode: '',
            mtNumber: '',
            mtDate: '',
            subject: '',
            monthYear: ''
          });
          
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }

          // Update status if sending
          if (action === 'send' && result.data) {
            await fetch(`/api/documents/${result.data.id}/status`, {
              method: 'PATCH',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                status: 'sent_to_branch',
                comment: 'Document sent to branch'
              })
            });
          }

          onUploadSuccess?.(result.data);
          router.push('/documents');
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      }
    } catch (error) {
      console.error(isEditMode ? 'Update error:' : 'Upload error:', error);
      toast.error(error instanceof Error ? error.message : (isEditMode ? 'Update failed' : 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  // Remove selected file
  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-6 w-6" />
          {isEditMode ? 'แก้ไขเอกสาร' : 'อัปโหลดเอกสาร'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Area */}
        <div className="space-y-4">
          <Label>ไฟล์เอกสาร PDF {isEditMode ? '(เว้นว่างหากไม่ต้องการเปลี่ยนไฟล์)' : '*'}</Label>
          
          {isEditMode && editDocument && !selectedFile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-700">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">ไฟล์ปัจจุบัน: {editDocument.originalFilename}</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">อัปโหลดไฟล์ใหม่เพื่อเปลี่ยนแปลง หรือเว้นว่างเพื่อใช้ไฟล์เดิม</p>
            </div>
          )}
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : fieldErrors.file || (errors.file && errors.file[0]) 
                ? 'border-red-300 bg-red-50' 
                : isEditMode && !selectedFile
                ? 'border-gray-200 bg-gray-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-8 w-8 text-red-500" />
                  <div className="text-left">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="ml-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Ready to upload
                </Badge>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 mx-auto text-gray-400" />
                <div>
                  <p className="text-lg font-medium">
                    วางไฟล์ PDF ที่นี่ หรือ
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2"
                  >
                    เลือกไฟล์
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  รองรับไฟล์ PDF เท่านั้น (สูงสุด 10MB)
                  {isEditMode && <><br />อัปโหลดไฟล์ใหม่เพื่อเปลี่ยนแปลงไฟล์เดิม</>}
                </p>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
          
          {(fieldErrors.file || (errors.file && errors.file[0])) && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {fieldErrors.file || errors.file[0]}
            </p>
          )}
        </div>

        <form className="space-y-4">
          {/* Branch Selection */}
          <div className="space-y-2">
            <Label htmlFor="branchBaCode">สาขา *</Label>
            <select
              id="branchBaCode"
              value={formData.branchBaCode}
              onChange={(e) => handleInputChange('branchBaCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">เลือกสาขา</option>
              {branches.map((branch) => (
                <option key={branch.baCode} value={branch.baCode}>
                  {branch.name} (BA: {branch.baCode})
                </option>
              ))}
            </select>
            {(fieldErrors.branchBaCode || (errors.branchBaCode && errors.branchBaCode[0])) && (
              <p className="text-sm text-red-600">{fieldErrors.branchBaCode || errors.branchBaCode[0]}</p>
            )}
          </div>

          {/* MT Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mtNumber">เลขที่ มท *</Label>
              <Input
                id="mtNumber"
                value={formData.mtNumber}
                onChange={(e) => handleInputChange('mtNumber', e.target.value)}
                placeholder="เช่น MT001-2024"
                className={fieldErrors.mtNumber || (errors.mtNumber && errors.mtNumber[0]) ? 'border-red-300' : ''}
              />
              {(fieldErrors.mtNumber || (errors.mtNumber && errors.mtNumber[0])) && (
                <p className="text-sm text-red-600">{fieldErrors.mtNumber || errors.mtNumber[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mtDate">วันที่ลงเลขที่ มท *</Label>
              <Input
                id="mtDate"
                type="date"
                value={formData.mtDate}
                onChange={(e) => handleInputChange('mtDate', e.target.value)}
                className={fieldErrors.mtDate || (errors.mtDate && errors.mtDate[0]) ? 'border-red-300' : ''}
              />
              {(fieldErrors.mtDate || (errors.mtDate && errors.mtDate[0])) && (
                <p className="text-sm text-red-600">{fieldErrors.mtDate || errors.mtDate[0]}</p>
              )}
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">เรื่องเบิกจ่าย *</Label>
            <Textarea
              id="subject"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="ระบุรายละเอียดเรื่องที่เบิกจ่าย"
              rows={3}
              className={fieldErrors.subject || (errors.subject && errors.subject[0]) ? 'border-red-300' : ''}
            />
            {(fieldErrors.subject || (errors.subject && errors.subject[0])) && (
              <p className="text-sm text-red-600">{fieldErrors.subject || errors.subject[0]}</p>
            )}
          </div>

          {/* Month Year */}
          <div className="space-y-2">
            <Label htmlFor="monthYear">ประจำเดือน *</Label>
            <select
              id="monthYear"
              value={formData.monthYear}
              onChange={(e) => handleInputChange('monthYear', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">เลือกเดือน/ปี</option>
              {generateMonthYearOptions().map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {(fieldErrors.monthYear || (errors.monthYear && errors.monthYear[0])) && (
              <p className="text-sm text-red-600">{fieldErrors.monthYear || errors.monthYear[0]}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => handleSubmit(e, 'save')}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isEditMode ? 'บันทึกการแก้ไข' : 'บันทึก (Draft)'}
            </Button>
            
            <Button
              type="button"
              onClick={(e) => handleSubmit(e, 'send')}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isEditMode ? 'บันทึกและส่งเอกสาร' : 'ส่งเอกสาร'}
            </Button>
            
            {isEditMode && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsEditMode(false);
                  setSelectedFile(null);
                  setFormData({
                    branchBaCode: '',
                    mtNumber: '',
                    mtDate: '',
                    subject: '',
                    monthYear: ''
                  });
                  onEditComplete?.();
                }}
                disabled={uploading}
              >
                ยกเลิก
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}