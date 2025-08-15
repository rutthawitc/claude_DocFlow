import { useState, useCallback, useMemo } from 'react';

/**
 * Validation rule definition
 */
export interface ValidationRule<T = any> {
  required?: boolean | string;
  minLength?: number | string;
  maxLength?: number | string;
  pattern?: RegExp | string;
  custom?: (value: T, formData: Record<string, any>) => string | null;
  type?: 'email' | 'url' | 'number' | 'tel';
}

/**
 * Field validation configuration
 */
export interface FieldConfig<T = any> {
  rules?: ValidationRule<T>;
  transform?: (value: any) => T; // Transform value before validation
  dependencies?: string[]; // Other fields that should trigger revalidation
}

/**
 * Form configuration
 */
export interface FormConfig<T extends Record<string, any> = Record<string, any>> {
  fields: {
    [K in keyof T]?: FieldConfig<T[K]>;
  };
  // Global form validation (cross-field validation)
  validate?: (formData: T) => Record<string, string>;
}

/**
 * Form state
 */
export interface FormState<T extends Record<string, any>> {
  values: Partial<T>;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

/**
 * Thai localized validation messages
 */
const THAI_MESSAGES = {
  required: 'ฟิลด์นี้จำเป็นต้องกรอก',
  minLength: (min: number) => `ต้องมีความยาวอย่างน้อย ${min} ตัวอักษร`,
  maxLength: (max: number) => `ความยาวไม่เกิน ${max} ตัวอักษร`,
  email: 'รูปแบบอีเมลไม่ถูกต้อง',
  url: 'รูปแบบ URL ไม่ถูกต้อง',
  number: 'กรุณากรอกตัวเลข',
  tel: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง',
  pattern: 'รูปแบบไม่ถูกต้อง',
};

/**
 * Built-in validation patterns
 */
const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  tel: /^[0-9+\-\s()]+$/,
};

/**
 * Validate individual field
 */
function validateField<T>(
  value: T,
  rules: ValidationRule<T>,
  fieldName: string,
  formData: Record<string, any>
): string | null {
  // Required validation
  if (rules.required) {
    const isEmpty = value === null || value === undefined || 
                   (typeof value === 'string' && value.trim() === '') ||
                   (Array.isArray(value) && value.length === 0);
    
    if (isEmpty) {
      return typeof rules.required === 'string' 
        ? rules.required 
        : THAI_MESSAGES.required;
    }
  }

  // Skip other validations if value is empty (and not required)
  if (!rules.required && (value === null || value === undefined || value === '')) {
    return null;
  }

  const stringValue = String(value);

  // Length validations
  if (rules.minLength && stringValue.length < Number(rules.minLength)) {
    return typeof rules.minLength === 'string' 
      ? rules.minLength 
      : THAI_MESSAGES.minLength(Number(rules.minLength));
  }

  if (rules.maxLength && stringValue.length > Number(rules.maxLength)) {
    return typeof rules.maxLength === 'string' 
      ? rules.maxLength 
      : THAI_MESSAGES.maxLength(Number(rules.maxLength));
  }

  // Type validations
  if (rules.type) {
    switch (rules.type) {
      case 'email':
        if (!VALIDATION_PATTERNS.email.test(stringValue)) {
          return THAI_MESSAGES.email;
        }
        break;
      case 'url':
        if (!VALIDATION_PATTERNS.url.test(stringValue)) {
          return THAI_MESSAGES.url;
        }
        break;
      case 'number':
        if (isNaN(Number(stringValue))) {
          return THAI_MESSAGES.number;
        }
        break;
      case 'tel':
        if (!VALIDATION_PATTERNS.tel.test(stringValue)) {
          return THAI_MESSAGES.tel;
        }
        break;
    }
  }

  // Pattern validation
  if (rules.pattern) {
    const pattern = rules.pattern instanceof RegExp 
      ? rules.pattern 
      : new RegExp(rules.pattern);
    
    if (!pattern.test(stringValue)) {
      return typeof rules.pattern === 'string' 
        ? rules.pattern 
        : THAI_MESSAGES.pattern;
    }
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(value, formData);
  }

  return null;
}

/**
 * Unified form validation hook with Thai localization
 * Eliminates duplicated form validation patterns across components
 * 
 * @param config Form configuration with validation rules
 * @param initialValues Initial form values
 * @returns Form state and control functions
 * 
 * @example
 * ```tsx
 * const form = useFormValidation({
 *   fields: {
 *     email: {
 *       rules: {
 *         required: true,
 *         type: 'email'
 *       }
 *     },
 *     password: {
 *       rules: {
 *         required: true,
 *         minLength: 8
 *       }
 *     },
 *     confirmPassword: {
 *       rules: {
 *         required: true,
 *         custom: (value, formData) => 
 *           value !== formData.password ? 'รหัสผ่านไม่ตรงกัน' : null
 *       },
 *       dependencies: ['password']
 *     }
 *   }
 * }, { email: '', password: '', confirmPassword: '' });
 * 
 * // In JSX
 * <input
 *   value={form.values.email || ''}
 *   onChange={(e) => form.setValue('email', e.target.value)}
 *   onBlur={() => form.setTouched('email', true)}
 * />
 * {form.errors.email && form.touched.email && (
 *   <span className="error">{form.errors.email}</span>
 * )}
 * ```
 */
export function useFormValidation<T extends Record<string, any>>(
  config: FormConfig<T>,
  initialValues: Partial<T> = {}
) {
  const [values, setValues] = useState<Partial<T>>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Validate all fields
   */
  const validateAllFields = useCallback((formData: Partial<T>) => {
    const newErrors: Partial<Record<keyof T, string>> = {};

    // Validate individual fields
    Object.keys(config.fields).forEach((fieldName) => {
      const field = config.fields[fieldName as keyof T];
      if (!field?.rules) return;

      const value = formData[fieldName as keyof T];
      const transformedValue = field.transform ? field.transform(value) : value;
      
      const error = validateField(
        transformedValue, 
        field.rules, 
        fieldName,
        formData as Record<string, any>
      );
      
      if (error) {
        newErrors[fieldName as keyof T] = error;
      }
    });

    // Global form validation
    if (config.validate) {
      const globalErrors = config.validate(formData as T);
      Object.entries(globalErrors).forEach(([fieldName, error]) => {
        if (error) {
          newErrors[fieldName as keyof T] = error;
        }
      });
    }

    return newErrors;
  }, [config]);

  /**
   * Validate specific field and its dependencies
   */
  const validateField = useCallback((fieldName: keyof T, formData: Partial<T>) => {
    const newErrors = { ...errors };
    
    // Get fields that need validation (field + dependencies)
    const fieldsToValidate = new Set([fieldName]);
    
    // Add fields that depend on this field
    Object.keys(config.fields).forEach((otherFieldName) => {
      const field = config.fields[otherFieldName as keyof T];
      if (field?.dependencies?.includes(fieldName as string)) {
        fieldsToValidate.add(otherFieldName as keyof T);
      }
    });

    // Validate each field
    fieldsToValidate.forEach((field) => {
      const fieldConfig = config.fields[field];
      if (!fieldConfig?.rules) return;

      const value = formData[field];
      const transformedValue = fieldConfig.transform 
        ? fieldConfig.transform(value) 
        : value;
      
      const error = validateField(
        transformedValue, 
        fieldConfig.rules, 
        field as string,
        formData as Record<string, any>
      );
      
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
    });

    setErrors(newErrors);
    return newErrors;
  }, [config, errors]);

  /**
   * Set value for a specific field
   */
  const setValue = useCallback((fieldName: keyof T, value: T[keyof T]) => {
    const newValues = { ...values, [fieldName]: value };
    setValues(newValues);

    // Validate field if it has been touched
    if (touched[fieldName]) {
      validateField(fieldName, newValues);
    }
  }, [values, touched, validateField]);

  /**
   * Set multiple values at once
   */
  const setValues = useCallback((newValues: Partial<T>) => {
    const updatedValues = { ...values, ...newValues };
    setValues(updatedValues);

    // Validate touched fields
    Object.keys(newValues).forEach((fieldName) => {
      if (touched[fieldName as keyof T]) {
        validateField(fieldName as keyof T, updatedValues);
      }
    });
  }, [values, touched, validateField]);

  /**
   * Set touched state for a field
   */
  const setTouched = useCallback((fieldName: keyof T, isTouched: boolean = true) => {
    setTouched(prev => ({ ...prev, [fieldName]: isTouched }));
    
    // Validate field when it becomes touched
    if (isTouched) {
      validateField(fieldName, values);
    }
  }, [values, validateField]);

  /**
   * Set touched state for multiple fields
   */
  const setTouchedMultiple = useCallback((touchedFields: Partial<Record<keyof T, boolean>>) => {
    setTouched(prev => ({ ...prev, ...touchedFields }));
    
    // Validate newly touched fields
    Object.entries(touchedFields).forEach(([fieldName, isTouched]) => {
      if (isTouched) {
        validateField(fieldName as keyof T, values);
      }
    });
  }, [values, validateField]);

  /**
   * Validate entire form
   */
  const validate = useCallback(() => {
    const newErrors = validateAllFields(values);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, validateAllFields]);

  /**
   * Submit form with validation
   */
  const submit = useCallback(async (onSubmit: (values: T) => Promise<void> | void) => {
    setIsSubmitting(true);
    
    // Mark all fields as touched
    const allTouched: Partial<Record<keyof T, boolean>> = {};
    Object.keys(config.fields).forEach((fieldName) => {
      allTouched[fieldName as keyof T] = true;
    });
    setTouched(allTouched);

    // Validate all fields
    const newErrors = validateAllFields(values);
    setErrors(newErrors);

    try {
      if (Object.keys(newErrors).length === 0) {
        await onSubmit(values as T);
      }
    } finally {
      setIsSubmitting(false);
    }
    
    return Object.keys(newErrors).length === 0;
  }, [values, config, validateAllFields]);

  /**
   * Reset form to initial values
   */
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  /**
   * Get field props for easy integration with inputs
   */
  const getFieldProps = useCallback((fieldName: keyof T) => {
    return {
      value: values[fieldName] ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setValue(fieldName, e.target.value as T[keyof T]);
      },
      onBlur: () => setTouched(fieldName, true),
      error: touched[fieldName] ? errors[fieldName] : undefined,
    };
  }, [values, errors, touched, setValue, setTouched]);

  /**
   * Check if form is valid
   */
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  /**
   * Check if form has been modified
   */
  const isDirty = useMemo(() => {
    return Object.keys(values).some(key => {
      return values[key as keyof T] !== initialValues[key as keyof T];
    });
  }, [values, initialValues]);

  return {
    // Form state
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    
    // Field controls
    setValue,
    setValues,
    setTouched,
    setTouchedMultiple,
    
    // Form controls
    validate,
    submit,
    reset,
    
    // Utility functions
    getFieldProps,
    validateField: (fieldName: keyof T) => validateField(fieldName, values),
  };
}

/**
 * Common form configurations for DocFlow
 */
export const FORM_CONFIGS = {
  /**
   * Document upload form configuration
   */
  documentUpload: {
    fields: {
      title: {
        rules: {
          required: true,
          minLength: 3,
          maxLength: 200,
        },
      },
      description: {
        rules: {
          maxLength: 1000,
        },
      },
      monthYear: {
        rules: {
          required: true,
          pattern: /^\d{4}-\d{2}$/,
        },
      },
      file: {
        rules: {
          required: true,
          custom: (file: File | null) => {
            if (!file) return 'กรุณาเลือกไฟล์';
            if (file.type !== 'application/pdf') return 'กรุณาเลือกไฟล์ PDF เท่านั้น';
            if (file.size > 10 * 1024 * 1024) return 'ขนาดไฟล์ไม่เกิน 10 MB';
            return null;
          },
        },
      },
    },
  } as FormConfig<{
    title: string;
    description: string;
    monthYear: string;
    file: File | null;
  }>,

  /**
   * Telegram settings form configuration
   */
  telegramSettings: {
    fields: {
      botToken: {
        rules: {
          required: 'กรุณาใส่ Bot Token',
          minLength: 10,
        },
      },
      defaultChatId: {
        rules: {
          required: 'กรุณาใส่ Chat ID',
          pattern: /^-?\d+$/,
        },
      },
    },
  } as FormConfig<{
    botToken: string;
    defaultChatId: string;
  }>,

  /**
   * User management form configuration
   */
  userForm: {
    fields: {
      username: {
        rules: {
          required: true,
          minLength: 3,
          maxLength: 50,
          pattern: /^[a-zA-Z0-9_-]+$/,
        },
      },
      email: {
        rules: {
          required: true,
          type: 'email',
        },
      },
      fullName: {
        rules: {
          required: true,
          minLength: 2,
          maxLength: 100,
        },
      },
    },
  } as FormConfig<{
    username: string;
    email: string;
    fullName: string;
  }>,
};

export default useFormValidation;