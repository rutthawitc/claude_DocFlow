"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ThaiDatePicker } from "@/components/ui/thai-date-picker";
import {
  Upload,
  FileText,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  Eye,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const PDFPreviewModal = dynamic(() => import("./pdf-preview-modal").then(mod => ({ default: mod.PDFPreviewModal })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
});
import {
  clientDocumentUploadSchema,
  validateForm,
  validateField,
  validatePDFFile,
  sanitizeFormData,
  type ValidationResult,
  type ClientDocumentUploadInput,
} from "@/lib/validation/client";
import {
  generateMonthYearOptions,
  getCurrentMonthYear,
} from "@/lib/utils/month-year-generator";
import {
  getDefaultReturnDates,
  isSecondDateAfterFirst,
  getDefaultAdditionalDocDueDate,
} from "@/lib/utils/business-days";

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
    docReceivedDate?: string;
    hasAdditionalDocs?: boolean;
    additionalDocsCount?: number;
    additionalDocs?: string[];
    sendBackOriginalDocument?: boolean;
    sendBackDate?: string;
    deadlineDate?: string;
  };
  onEditComplete?: () => void;
}

interface FormData {
  branchBaCode: string;
  mtNumber: string;
  mtDate: string;
  subject: string;
  monthYear: string;
  docReceivedDate: string;
  hasAdditionalDocs: boolean;
  additionalDocsCount: number;
  additionalDocs: string[];
  additionalDocsDueDates: string[]; // Due dates for each additional document
  sendBackOriginalDocument: boolean;
  sendBackDate: string;
  deadlineDate: string;
}

export function DocumentUpload({
  branches,
  onUploadSuccess,
  editDocument,
  onEditComplete,
}: DocumentUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [emendationDocFile, setEmendationDocFile] = useState<File | null>(null);
  const [emendationDocDragActive, setEmendationDocDragActive] = useState(false);
  const [showEmendationDocUpload, setShowEmendationDocUpload] = useState(false);
  const [showEmendationDocPreview, setShowEmendationDocPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<FormData>(() => {
    const defaultDates = getDefaultReturnDates();
    const defaultDueDate = getDefaultAdditionalDocDueDate();
    return {
      branchBaCode: editDocument?.branchBaCode.toString() || "",
      mtNumber: editDocument?.mtNumber || "",
      mtDate: editDocument?.mtDate || "",
      subject: editDocument?.subject || "",
      monthYear: editDocument?.monthYear || getCurrentMonthYear(),
      docReceivedDate: editDocument?.docReceivedDate || "",
      hasAdditionalDocs: editDocument?.hasAdditionalDocs || false,
      additionalDocsCount: editDocument?.additionalDocsCount || 1,
      additionalDocs: editDocument?.additionalDocs || [""],
      additionalDocsDueDates: [defaultDueDate], // Initialize with default due date (5 business days)
      sendBackOriginalDocument: false,
      sendBackDate: defaultDates.sendBackDate,
      deadlineDate: defaultDates.deadlineDate,
    };
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState(!!editDocument);

  // Update form data when editDocument prop changes
  useEffect(() => {
    if (editDocument) {
      const defaultDates = getDefaultReturnDates();
      const defaultDueDate = getDefaultAdditionalDocDueDate();
      setIsEditMode(true);
      setFormData({
        branchBaCode: editDocument.branchBaCode.toString(),
        mtNumber: editDocument.mtNumber,
        mtDate: editDocument.mtDate,
        subject: editDocument.subject,
        monthYear: editDocument.monthYear,
        docReceivedDate: editDocument.docReceivedDate || "",
        hasAdditionalDocs: editDocument.hasAdditionalDocs || false,
        additionalDocsCount: editDocument.additionalDocsCount || 1,
        additionalDocs: editDocument.additionalDocs || [""],
        additionalDocsDueDates: [defaultDueDate], // Initialize with default due date (5 business days)
        sendBackOriginalDocument:
          editDocument.sendBackOriginalDocument || false,
        sendBackDate: editDocument.sendBackDate || defaultDates.sendBackDate,
        deadlineDate: editDocument.deadlineDate || defaultDates.deadlineDate,
      });
      // Clear any existing file selection when switching to edit mode
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else {
      setIsEditMode(false);
      // Reset form data to defaults when not in edit mode
      const defaultDates = getDefaultReturnDates();
      const defaultDueDate = getDefaultAdditionalDocDueDate();
      setFormData({
        branchBaCode: "",
        mtNumber: "",
        mtDate: "",
        subject: "",
        monthYear: getCurrentMonthYear(),
        docReceivedDate: "",
        hasAdditionalDocs: false,
        additionalDocsCount: 1,
        additionalDocs: [""],
        additionalDocsDueDates: [defaultDueDate], // Initialize with default due date (5 business days)
        sendBackOriginalDocument: false,
        sendBackDate: defaultDates.sendBackDate,
        deadlineDate: defaultDates.deadlineDate,
      });
    }
  }, [editDocument]);

  // File validation
  const validateFile = useCallback((file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ["application/pdf"];

    if (!allowedTypes.includes(file.type)) {
      return "Only PDF files are allowed";
    }

    if (file.size > maxSize) {
      return "File size must be less than 10MB";
    }

    return null;
  }, []);

  // Emendation document file handlers
  const handleEmendationDocFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setEmendationDocFile(file);
    toast.success("ไฟล์เอกสารแก้ไขถูกเลือกแล้ว");
  }, [validateFile]);

  const handleEmendationDocFileDelete = useCallback(() => {
    setEmendationDocFile(null);
    toast.success("ลบไฟล์เอกสารแก้ไขแล้ว");
  }, []);

  const handleEmendationDocFilePreview = useCallback(() => {
    if (emendationDocFile) {
      setShowEmendationDocPreview(true);
    }
  }, [emendationDocFile]);

  // Emendation document drag & drop handlers
  const handleEmendationDocDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setEmendationDocDragActive(true);
    } else if (e.type === "dragleave") {
      setEmendationDocDragActive(false);
    }
  }, []);

  const handleEmendationDocDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setEmendationDocDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        handleEmendationDocFileSelect(file);
      }
    },
    [handleEmendationDocFileSelect],
  );

  // Handle file selection
  const handleFileSelect = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }

      setSelectedFile(file);
      setErrors((prev) => ({ ...prev, file: [] }));
    },
    [validateFile],
  );

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = e.dataTransfer.files;
      if (files && files[0]) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect],
  );

  // File input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files[0]) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect],
  );

  // Field-level validation for real-time feedback (define first)
  const validateSingleField = useCallback(
    (fieldName: keyof ClientDocumentUploadInput, value: string) => {
      try {
        // Create a partial object with just this field for validation
        const partialData = { [fieldName]: value };
        const result = clientDocumentUploadSchema.safeParse(partialData);

        // Extract any error for this specific field
        if (!result.success) {
          const fieldError = result.error.errors.find(
            (err) => err.path.length === 0 || err.path.includes(fieldName),
          );

          if (fieldError) {
            setFieldErrors((prev) => ({
              ...prev,
              [fieldName]: fieldError.message,
            }));
            return false;
          }
        }

        // Clear error if validation passed
        setFieldErrors((prev) => ({
          ...prev,
          [fieldName]: "",
        }));

        return true;
      } catch (error) {
        console.warn(`Validation error for field ${fieldName}:`, error);
        // Clear error on exception and allow form to proceed
        setFieldErrors((prev) => ({
          ...prev,
          [fieldName]: "",
        }));
        return true;
      }
    },
    [],
  );

  // Form input change
  const handleInputChange = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear errors for this field
      setErrors((prev) => ({ ...prev, [field]: [] }));
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));

      // Real-time validation with debounce
      if (value.trim()) {
        setTimeout(() => {
          // Only validate fields that exist in the schema
          const validationFields: (keyof ClientDocumentUploadInput)[] = [
            "branchBaCode",
            "mtNumber",
            "mtDate",
            "subject",
            "monthYear",
            "docReceivedDate",
            "hasAdditionalDocs",
            "additionalDocsCount",
            "sendBackOriginalDocument",
            "sendBackDate",
            "deadlineDate",
          ];

          if (
            validationFields.includes(field as keyof ClientDocumentUploadInput)
          ) {
            validateSingleField(
              field as keyof ClientDocumentUploadInput,
              value,
            );
          }
        }, 300);
      }
    },
    [validateSingleField],
  );

  // Handle additional documents checkbox
  const handleAdditionalDocsToggle = useCallback((checked: boolean) => {
    const defaultDueDate = getDefaultAdditionalDocDueDate();
    setFormData((prev) => ({
      ...prev,
      hasAdditionalDocs: checked,
      additionalDocsCount: checked ? prev.additionalDocsCount || 1 : 1,
      additionalDocs: checked ? prev.additionalDocs || [""] : [""],
      additionalDocsDueDates: checked ? prev.additionalDocsDueDates || [defaultDueDate] : [defaultDueDate],
    }));
  }, []);

  // Handle additional documents count change
  const handleAdditionalDocsCountChange = useCallback((count: number) => {
    const validCount = Math.max(1, Math.min(10, count));
    const defaultDueDate = getDefaultAdditionalDocDueDate();
    setFormData((prev) => {
      const currentDocs = prev.additionalDocs || [];
      const currentDueDates = prev.additionalDocsDueDates || [];
      const newDocs = Array.from(
        { length: validCount },
        (_, i) => currentDocs[i] || "",
      );
      const newDueDates = Array.from(
        { length: validCount },
        (_, i) => currentDueDates[i] || defaultDueDate, // Use default due date for new items
      );
      return {
        ...prev,
        additionalDocsCount: validCount,
        additionalDocs: newDocs,
        additionalDocsDueDates: newDueDates,
      };
    });
  }, []);

  // Handle individual additional document change
  const handleAdditionalDocChange = useCallback(
    (index: number, value: string) => {
      setFormData((prev) => ({
        ...prev,
        additionalDocs: (prev.additionalDocs || []).map((doc, i) =>
          i === index ? value : doc,
        ),
      }));
    },
    [],
  );

  // Handle individual additional document due date change
  const handleAdditionalDocDueDateChange = useCallback(
    (index: number, value: string) => {
      setFormData((prev) => ({
        ...prev,
        additionalDocsDueDates: (prev.additionalDocsDueDates || []).map((date, i) =>
          i === index ? value : date,
        ),
      }));
    },
    [],
  );

  // Handle original document return checkbox
  const handleSendBackOriginalDocumentToggle = useCallback(
    (checked: boolean) => {
      const defaultDates = getDefaultReturnDates();
      setFormData((prev) => ({
        ...prev,
        sendBackOriginalDocument: checked,
        sendBackDate: checked
          ? prev.sendBackDate || defaultDates.sendBackDate
          : defaultDates.sendBackDate,
        deadlineDate: checked
          ? prev.deadlineDate || defaultDates.deadlineDate
          : defaultDates.deadlineDate,
      }));
    },
    [],
  );

  // Handle send back date change
  const handleSendBackDateChange = useCallback((value: string) => {
    setFormData((prev) => {
      const newFormData = {
        ...prev,
        sendBackDate: value,
      };

      // Validate that deadline is after send back date
      if (
        value &&
        prev.deadlineDate &&
        !isSecondDateAfterFirst(value, prev.deadlineDate)
      ) {
        setFieldErrors((prevErrors) => ({
          ...prevErrors,
          deadlineDate: "กำหนดส่งกลับต้องหลังจากวันที่ส่งกลับ",
        }));
      } else {
        setFieldErrors((prevErrors) => {
          const { deadlineDate, ...rest } = prevErrors;
          return rest;
        });
      }

      return newFormData;
    });
  }, []);

  // Handle deadline date change
  const handleDeadlineDateChange = useCallback((value: string) => {
    setFormData((prev) => {
      const newFormData = {
        ...prev,
        deadlineDate: value,
      };

      // Validate that deadline is after send back date
      if (
        prev.sendBackDate &&
        value &&
        !isSecondDateAfterFirst(prev.sendBackDate, value)
      ) {
        setFieldErrors((prevErrors) => ({
          ...prevErrors,
          deadlineDate: "กำหนดส่งกลับต้องหลังจากวันที่ส่งกลับ",
        }));
      } else {
        setFieldErrors((prevErrors) => {
          const { deadlineDate, ...rest } = prevErrors;
          return rest;
        });
      }

      return newFormData;
    });
  }, []);

  // Validate file
  const validateFileSelection = useCallback(
    (file: File | null): { isValid: boolean; error?: string } => {
      if (!file && !isEditMode) {
        return { isValid: false, error: "กรุณาเลือกไฟล์ PDF" };
      }

      if (file) {
        return validatePDFFile(file);
      }

      return { isValid: true };
    },
    [isEditMode],
  );

  // Form validation with Zod
  const validateFormData = useCallback((): ValidationResult<ClientDocumentUploadInput> => {
      // Sanitize form data
      const sanitizedData = sanitizeFormData(formData);

      // Validate with Zod schema
      const validation = validateForm(
        sanitizedData,
        clientDocumentUploadSchema,
      );

      // File validation
      const fileValidation = validateFileSelection(selectedFile);
      if (!fileValidation.isValid) {
        validation.errors = {
          ...validation.errors,
          file: [fileValidation.error!],
        };
        validation.success = false;
      }

      // Update error states
      setErrors(validation.errors || {});
      setFieldErrors(
        Object.fromEntries(
          Object.entries(validation.errors || {}).map(([key, msgs]) => [
            key,
            msgs[0],
          ]),
        ),
      );

      return validation as ValidationResult<ClientDocumentUploadInput>;
    }, [formData, selectedFile, validateFileSelection]);

  // Get month/year options using the utility function
  const monthYearOptions = generateMonthYearOptions();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent, action: "save" | "send") => {
    e.preventDefault();

    // Validate form data
    const validation = validateFormData();
    if (!validation.success) {
      toast.error(validation.message || "กรุณาตรวจสอบข้อมูลที่กรอก");
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
          monthYear: formData.monthYear,
          docReceivedDate: formData.docReceivedDate,
          hasAdditionalDocs: formData.hasAdditionalDocs || false,
          additionalDocsCount: formData.additionalDocsCount || 1,
          additionalDocs: formData.additionalDocs || [""],
          additionalDocsDueDates: formData.additionalDocsDueDates || [""],
          sendBackOriginalDocument: formData.sendBackOriginalDocument || false,
          sendBackDate: formData.sendBackDate || "",
          deadlineDate: formData.deadlineDate || "",
        };

        let response;
        if (selectedFile) {
          // Update with new file
          const uploadFormData = new FormData();
          uploadFormData.append("file", selectedFile);
          uploadFormData.append("branchBaCode", formData.branchBaCode);
          uploadFormData.append("mtNumber", formData.mtNumber);
          uploadFormData.append("mtDate", formData.mtDate);
          uploadFormData.append("subject", formData.subject);
          uploadFormData.append("monthYear", formData.monthYear);
          uploadFormData.append("docReceivedDate", formData.docReceivedDate);
          uploadFormData.append(
            "hasAdditionalDocs",
            formData.hasAdditionalDocs.toString(),
          );
          uploadFormData.append(
            "additionalDocsCount",
            (formData.additionalDocsCount || 1).toString(),
          );
          uploadFormData.append(
            "additionalDocs",
            JSON.stringify(formData.additionalDocs || [""]),
          );
          uploadFormData.append(
            "additionalDocsDueDates",
            JSON.stringify(formData.additionalDocsDueDates || [""]),
          );
          uploadFormData.append(
            "sendBackOriginalDocument",
            formData.sendBackOriginalDocument.toString(),
          );
          uploadFormData.append("sendBackDate", formData.sendBackDate || "");
          uploadFormData.append("deadlineDate", formData.deadlineDate || "");
          uploadFormData.append("action", action);

          // Add emendation document if exists
          if (emendationDocFile) {
            uploadFormData.append("emendationDocFile", emendationDocFile);
          }

          response = await fetch(`/api/documents/${editDocument.id}`, {
            method: "PUT",
            credentials: "include",
            body: uploadFormData,
          });
        } else {
          // Update metadata only
          response = await fetch(`/api/documents/${editDocument.id}`, {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updateData),
          });
        }

        const result = await response.json();

        if (response.ok && result.success) {
          toast.success("อัปเดตเอกสารสำเร็จ");

          onEditComplete?.();
          onUploadSuccess?.(result.data);
          router.push("/documents");
        } else {
          throw new Error(result.error || "Update failed");
        }
      } else {
        // Create new document
        const uploadFormData = new FormData();
        uploadFormData.append("file", selectedFile!);
        uploadFormData.append("branchBaCode", formData.branchBaCode);
        uploadFormData.append("mtNumber", formData.mtNumber);
        uploadFormData.append("mtDate", formData.mtDate);
        uploadFormData.append("subject", formData.subject);
        uploadFormData.append("monthYear", formData.monthYear);
        uploadFormData.append("docReceivedDate", formData.docReceivedDate);
        uploadFormData.append(
          "hasAdditionalDocs",
          formData.hasAdditionalDocs.toString(),
        );
        uploadFormData.append(
          "additionalDocsCount",
          (formData.additionalDocsCount || 1).toString(),
        );
        uploadFormData.append(
          "additionalDocs",
          JSON.stringify(formData.additionalDocs || [""]),
        );
        uploadFormData.append(
          "additionalDocsDueDates",
          JSON.stringify(formData.additionalDocsDueDates || [""]),
        );
        uploadFormData.append(
          "sendBackOriginalDocument",
          formData.sendBackOriginalDocument.toString(),
        );
        uploadFormData.append("sendBackDate", formData.sendBackDate || "");
        uploadFormData.append("deadlineDate", formData.deadlineDate || "");
        uploadFormData.append("action", action);

        // Add emendation document if exists
        if (emendationDocFile) {
          uploadFormData.append("emendationDocFile", emendationDocFile);
        }

        const response = await fetch("/api/documents", {
          method: "POST",
          credentials: "include",
          body: uploadFormData,
        });

        const result = await response.json();

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = result.retryAfter || 60;
          toast.error(
            `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
          );
          return;
        }

        if (response.ok && result.success) {
          toast.success(
            action === "save"
              ? "Document saved as draft successfully"
              : "Document uploaded and sent successfully",
          );

          // Reset form
          setSelectedFile(null);
          setEmendationDocFile(null);
          setShowEmendationDocUpload(false);
          const defaultDates = getDefaultReturnDates();
          setFormData({
            branchBaCode: "",
            mtNumber: "",
            mtDate: "",
            subject: "",
            monthYear: getCurrentMonthYear(),
            docReceivedDate: "",
            hasAdditionalDocs: false,
            additionalDocsCount: 1,
            additionalDocs: [""],
            sendBackOriginalDocument: false,
            sendBackDate: defaultDates.sendBackDate,
            deadlineDate: defaultDates.deadlineDate,
          });

          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }

          onUploadSuccess?.(result.data);
          router.push("/documents");
        } else {
          throw new Error(result.error || "Upload failed");
        }
      }
    } catch (error) {
      console.error(isEditMode ? "Update error:" : "Upload error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : isEditMode
            ? "Update failed"
            : "Upload failed",
      );
    } finally {
      setUploading(false);
    }
  };

  // Remove selected file
  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-6 w-6" />
          {isEditMode ? "แก้ไขเอกสาร" : "อัปโหลดเอกสาร"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Area */}
        <div className="space-y-4">
          <Label>
            ไฟล์เอกสาร PDF{" "}
            {isEditMode ? "(เว้นว่างหากไม่ต้องการเปลี่ยนไฟล์)" : "*"}
          </Label>

          {isEditMode && editDocument && !selectedFile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-700">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">
                  ไฟล์ปัจจุบัน: {editDocument.originalFilename}
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                อัปโหลดไฟล์ใหม่เพื่อเปลี่ยนแปลง หรือเว้นว่างเพื่อใช้ไฟล์เดิม
              </p>
            </div>
          )}

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50"
                : fieldErrors.file || (errors.file && errors.file[0])
                  ? "border-red-300 bg-red-50"
                  : isEditMode && !selectedFile
                    ? "border-gray-200 bg-gray-50"
                    : "border-gray-300 hover:border-gray-400"
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
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-700"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Ready to upload
                </Badge>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 mx-auto text-gray-400" />
                <div>
                  <p className="text-lg font-medium">วางไฟล์ PDF ที่นี่ หรือ</p>
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
                  {isEditMode && (
                    <>
                      <br />
                      อัปโหลดไฟล์ใหม่เพื่อเปลี่ยนแปลงไฟล์เดิม
                    </>
                  )}
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
          {/* Branch Selection and Doc Received Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branchBaCode">สาขา *</Label>
              <select
                id="branchBaCode"
                value={formData.branchBaCode}
                onChange={(e) =>
                  handleInputChange("branchBaCode", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">เลือกสาขา</option>
                {branches.map((branch) => (
                  <option key={branch.baCode} value={branch.baCode}>
                    {branch.name} (BA: {branch.baCode})
                  </option>
                ))}
              </select>
              {(fieldErrors.branchBaCode ||
                (errors.branchBaCode && errors.branchBaCode[0])) && (
                <p className="text-sm text-red-600">
                  {fieldErrors.branchBaCode || errors.branchBaCode[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="docReceivedDate">
                วันที่รับเอกสารต้นฉบับจากสาขา
              </Label>
              <ThaiDatePicker
                value={formData.docReceivedDate}
                onChange={(value) =>
                  handleInputChange("docReceivedDate", value)
                }
                placeholder="เลือกวันที่รับเอกสาร"
                className={
                  fieldErrors.docReceivedDate ||
                  (errors.docReceivedDate && errors.docReceivedDate[0])
                    ? "border-red-300"
                    : ""
                }
              />
              {(fieldErrors.docReceivedDate ||
                (errors.docReceivedDate && errors.docReceivedDate[0])) && (
                <p className="text-sm text-red-600">
                  {fieldErrors.docReceivedDate || errors.docReceivedDate[0]}
                </p>
              )}
            </div>
          </div>

          {/* MT Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mtNumber">เลขที่ มท *</Label>
              <Input
                id="mtNumber"
                value={formData.mtNumber}
                onChange={(e) => handleInputChange("mtNumber", e.target.value)}
                placeholder="เช่น MT001-2024"
                className={
                  fieldErrors.mtNumber ||
                  (errors.mtNumber && errors.mtNumber[0])
                    ? "border-red-300"
                    : ""
                }
              />
              {(fieldErrors.mtNumber ||
                (errors.mtNumber && errors.mtNumber[0])) && (
                <p className="text-sm text-red-600">
                  {fieldErrors.mtNumber || errors.mtNumber[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mtDate">วันที่ลงเลขที่ มท *</Label>
              <ThaiDatePicker
                value={formData.mtDate}
                onChange={(value) => handleInputChange("mtDate", value)}
                placeholder="เลือกวันที่"
                className={
                  fieldErrors.mtDate || (errors.mtDate && errors.mtDate[0])
                    ? "border-red-300"
                    : ""
                }
              />
              {(fieldErrors.mtDate || (errors.mtDate && errors.mtDate[0])) && (
                <p className="text-sm text-red-600">
                  {fieldErrors.mtDate || errors.mtDate[0]}
                </p>
              )}
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">รายละเอียด เพิ่มเติม *</Label>
            <Textarea
              id="subject"
              value={formData.subject}
              onChange={(e) => handleInputChange("subject", e.target.value)}
              placeholder="ระบุรายละเอียดเรื่องที่เบิกจ่าย"
              rows={3}
              className={
                fieldErrors.subject || (errors.subject && errors.subject[0])
                  ? "border-red-300"
                  : ""
              }
            />
            {(fieldErrors.subject || (errors.subject && errors.subject[0])) && (
              <p className="text-sm text-red-600">
                {fieldErrors.subject || errors.subject[0]}
              </p>
            )}
          </div>

          {/* Original Document Return */}
          <div className="space-y-4 border rounded-lg p-4 bg-blue-50">
            <div className="flex items-center gap-3">
              <Checkbox
                id="sendBackOriginalDocument"
                checked={formData.sendBackOriginalDocument}
                onCheckedChange={handleSendBackOriginalDocumentToggle}
              />
              <Label
                htmlFor="sendBackOriginalDocument"
                className="cursor-pointer font-medium"
              >
                ส่งเอกสารต้นฉบับกลับสาขา
              </Label>
            </div>

            {formData.sendBackOriginalDocument && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sendBackDate">วันที่ส่งกลับ</Label>
                  <ThaiDatePicker
                    id="sendBackDate"
                    value={formData.sendBackDate}
                    onChange={handleSendBackDateChange}
                    placeholder="dd/mm/yyyy"
                    className={fieldErrors.sendBackDate ? "border-red-300" : ""}
                  />
                  {fieldErrors.sendBackDate && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {fieldErrors.sendBackDate}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadlineDate">กำหนดสาขาส่งกลับเขต</Label>
                  <ThaiDatePicker
                    id="deadlineDate"
                    value={formData.deadlineDate}
                    onChange={handleDeadlineDateChange}
                    placeholder="dd/mm/yyyy"
                    className={fieldErrors.deadlineDate ? "border-red-300" : ""}
                  />
                  {fieldErrors.deadlineDate && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {fieldErrors.deadlineDate}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Emendation Document Upload */}
          <div className="space-y-4 border rounded-lg p-4 bg-green-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="showEmendationDocUpload"
                  checked={showEmendationDocUpload}
                  onCheckedChange={(checked) => setShowEmendationDocUpload(!!checked)}
                />
                <Label
                  htmlFor="showEmendationDocUpload"
                  className="cursor-pointer font-medium text-green-800"
                >
                  ตัวอย่างเอกสารที่ต้องแก้ไข
                </Label>
              </div>
              <div className="flex items-center gap-2">
                {emendationDocFile && (
                  <Badge variant="secondary" className="bg-green-200 text-green-800">
                    อัปโหลดแล้ว
                  </Badge>
                )}
              </div>
            </div>

            {showEmendationDocUpload && (
              <>
                {!emendationDocFile ? (
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 ${
                  emendationDocDragActive
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragEnter={handleEmendationDocDrag}
                onDragLeave={handleEmendationDocDrag}
                onDragOver={handleEmendationDocDrag}
                onDrop={handleEmendationDocDrop}
              >
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleEmendationDocFileSelect(file);
                    }
                  }}
                  className="hidden"
                  id="emendation-doc-file-input"
                />
                <label
                  htmlFor="emendation-doc-file-input"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className={`h-8 w-8 ${emendationDocDragActive ? "text-blue-500" : "text-gray-400"}`} />
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-blue-600 hover:text-blue-500">
                      คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวาง
                    </span>
                    <p className="mt-1">รองรับไฟล์ PDF เท่านั้น (สูงสุด 10MB)</p>
                  </div>
                </label>
              </div>
            ) : (
              <div className="border rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-red-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {emendationDocFile.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(emendationDocFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleEmendationDocFilePreview}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      ดูเอกสาร
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleEmendationDocFileDelete}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      ลบ
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('emendation-doc-file-input')?.click()}
                      className="text-gray-600 border-gray-300 hover:bg-gray-50"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      เปลี่ยนไฟล์
                    </Button>
                  </div>
                </div>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleEmendationDocFileSelect(file);
                    }
                  }}
                  className="hidden"
                  id="emendation-doc-file-input"
                />
              </div>
                )}
              </>
            )}
          </div>

          {/* Additional Documents */}
          <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-3">
              <Checkbox
                id="hasAdditionalDocs"
                checked={formData.hasAdditionalDocs}
                onCheckedChange={handleAdditionalDocsToggle}
              />
              <Label htmlFor="hasAdditionalDocs" className="cursor-pointer">
                เอกสารที่ต้องส่งเพิ่มเติม/แก้ไข
              </Label>
              {formData.hasAdditionalDocs && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.additionalDocsCount}
                    onChange={(e) =>
                      handleAdditionalDocsCountChange(
                        parseInt(e.target.value) || 1,
                      )
                    }
                    className="w-16 h-8"
                  />
                  <span className="text-sm text-gray-600">ฉบับ</span>
                </div>
              )}
            </div>

            {formData.hasAdditionalDocs && (
              <div className="space-y-3">
                {(formData.additionalDocs || [])
                  .slice(0, formData.additionalDocsCount)
                  .map((doc, index) => (
                    <div key={index} className="space-y-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600 w-6">
                          {index + 1}.
                        </span>
                        <Input
                          value={doc || ""}
                          onChange={(e) =>
                            handleAdditionalDocChange(index, e.target.value)
                          }
                          placeholder={`เอกสารเพิ่มเติมที่ ${index + 1}`}
                          className={`flex-1 ${fieldErrors.additionalDocs || (errors.additionalDocs && errors.additionalDocs[0]) ? "border-red-300" : ""}`}
                        />
                      </div>
                      <div className="flex items-center gap-2 ml-8">
                        <Label className="text-sm text-gray-600 min-w-[80px]">กำหนดส่ง:</Label>
                        <ThaiDatePicker
                          value={formData.additionalDocsDueDates[index] || ""}
                          onChange={(value) => handleAdditionalDocDueDateChange(index, value)}
                          placeholder="เลือกวันที่กำหนดส่ง"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {(fieldErrors.additionalDocs ||
              (errors.additionalDocs && errors.additionalDocs[0])) && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {formData.hasAdditionalDocs
                  ? "กรุณาระบุรายละเอียดเอกสารที่ต้องส่งเพิ่มเติมทุกรายการ"
                  : fieldErrors.additionalDocs || errors.additionalDocs[0]}
              </p>
            )}
          </div>

          {/* Month Year */}
          <div className="space-y-2">
            <Label htmlFor="monthYear">ประจำเดือน *</Label>
            <select
              id="monthYear"
              value={formData.monthYear}
              onChange={(e) => handleInputChange("monthYear", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">เลือกเดือน/ปี</option>
              {monthYearOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {(fieldErrors.monthYear ||
              (errors.monthYear && errors.monthYear[0])) && (
              <p className="text-sm text-red-600">
                {fieldErrors.monthYear || errors.monthYear[0]}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => handleSubmit(e, "save")}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isEditMode ? "บันทึกการแก้ไข" : "บันทึก (Draft)"}
            </Button>

            <Button
              type="button"
              onClick={(e) => handleSubmit(e, "send")}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isEditMode ? "บันทึกและส่งเอกสาร" : "ส่งเอกสาร"}
            </Button>

            {isEditMode && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsEditMode(false);
                  setSelectedFile(null);
                  setEmendationDocFile(null);
                  setShowEmendationDocUpload(false);
                  const defaultDates = getDefaultReturnDates();
                  setFormData({
                    branchBaCode: "",
                    mtNumber: "",
                    mtDate: "",
                    subject: "",
                    monthYear: getCurrentMonthYear(),
                    docReceivedDate: "",
                    hasAdditionalDocs: false,
                    additionalDocsCount: 1,
                    additionalDocs: [""],
                    sendBackOriginalDocument: false,
                    sendBackDate: defaultDates.sendBackDate,
                    deadlineDate: defaultDates.deadlineDate,
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

        {/* PDF Preview Modal */}
        <PDFPreviewModal
          file={emendationDocFile}
          isOpen={showEmendationDocPreview}
          onClose={() => setShowEmendationDocPreview(false)}
        />
      </CardContent>
    </Card>
  );
}
