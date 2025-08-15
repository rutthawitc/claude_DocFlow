import { useCallback } from 'react';
import { useLoadingState, LoadingStateOptions } from './useLoadingState';
import { toast } from 'sonner';

/**
 * API Request configuration options
 */
export interface ApiRequestOptions extends RequestInit {
  // Timeout in milliseconds
  timeout?: number;
  // Retry configuration
  retry?: {
    attempts: number;
    delay?: number;
  };
  // Custom error messages
  errorMessages?: {
    timeout?: string;
    network?: string;
    server?: string;
    generic?: string;
  };
  // Auto-show success/error toasts
  showToasts?: boolean;
  // Custom success message
  successMessage?: string;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  headers?: Headers;
}

/**
 * Default error messages in Thai
 */
const DEFAULT_ERROR_MESSAGES = {
  timeout: 'หมดเวลาคำขอ กรุณาลองใหม่',
  network: 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย',
  server: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์',
  generic: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
};

/**
 * Centralized API request hook with loading states, error handling, and retries
 * Eliminates duplicated fetch patterns across the application
 * 
 * @param loadingOptions Configuration for loading state management
 * @returns API request functions with loading states
 * 
 * @example
 * ```tsx
 * const { request, get, post, put, delete: deleteReq, loading, error } = useApiRequest();
 * 
 * const fetchData = async () => {
 *   const response = await get('/api/data');
 *   if (response.success) {
 *     setData(response.data);
 *   }
 * };
 * 
 * const createItem = async (data: any) => {
 *   const response = await post('/api/items', { 
 *     body: JSON.stringify(data),
 *     successMessage: 'สร้างรายการสำเร็จ'
 *   });
 *   return response;
 * };
 * ```
 */
export function useApiRequest(loadingOptions: LoadingStateOptions = {}) {
  const loadingState = useLoadingState(loadingOptions);

  /**
   * Create timeout promise
   */
  const createTimeoutPromise = useCallback((timeout: number): Promise<never> => {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeout);
    });
  }, []);

  /**
   * Parse response with proper error handling
   */
  const parseResponse = useCallback(async <T = any>(response: Response): Promise<ApiResponse<T>> => {
    try {
      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (response.ok) {
        return {
          success: true,
          data,
          status: response.status,
          headers: response.headers,
        };
      } else {
        return {
          success: false,
          error: data?.error || data?.message || `Server error: ${response.status}`,
          status: response.status,
          headers: response.headers,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse response',
        status: response.status,
        headers: response.headers,
      };
    }
  }, []);

  /**
   * Execute API request with retry logic
   */
  const executeWithRetry = useCallback(async <T = any>(
    url: string, 
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> => {
    const {
      timeout = 30000,
      retry = { attempts: 0, delay: 1000 },
      errorMessages = {},
      showToasts = true,
      successMessage,
      ...fetchOptions
    } = options;

    const mergedErrorMessages = { ...DEFAULT_ERROR_MESSAGES, ...errorMessages };

    let lastError: Error | null = null;
    let attempt = 0;
    const maxAttempts = retry.attempts + 1;

    while (attempt < maxAttempts) {
      try {
        // Create fetch promise with timeout
        const fetchPromise = fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
          },
          ...fetchOptions,
        });

        const timeoutPromise = createTimeoutPromise(timeout);
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        const apiResponse = await parseResponse<T>(response);

        // Handle success
        if (apiResponse.success) {
          if (showToasts && successMessage) {
            toast.success(successMessage);
          }
          return apiResponse;
        }

        // Handle server errors (non-retry for client errors)
        if (apiResponse.status && apiResponse.status < 500) {
          if (showToasts) {
            toast.error(apiResponse.error || mergedErrorMessages.server);
          }
          return apiResponse;
        }

        // Server error - potentially retryable
        lastError = new Error(apiResponse.error || mergedErrorMessages.server);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Request timeout') {
            lastError = new Error(mergedErrorMessages.timeout);
          } else if (error.message.includes('fetch')) {
            lastError = new Error(mergedErrorMessages.network);
          } else {
            lastError = error;
          }
        } else {
          lastError = new Error(mergedErrorMessages.generic);
        }
      }

      attempt++;
      
      // If we have more attempts, wait and retry
      if (attempt < maxAttempts && retry.delay) {
        await new Promise(resolve => setTimeout(resolve, retry.delay));
      }
    }

    // All attempts failed
    const errorMessage = lastError?.message || mergedErrorMessages.generic;
    if (showToasts) {
      toast.error(errorMessage);
    }

    return {
      success: false,
      error: errorMessage,
    };
  }, [createTimeoutPromise, parseResponse]);

  /**
   * Main request method
   */
  const request = useCallback(async <T = any>(
    url: string, 
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> => {
    return loadingState.execute(() => executeWithRetry<T>(url, options));
  }, [loadingState, executeWithRetry]);

  /**
   * Convenience methods for common HTTP verbs
   */
  const get = useCallback(<T = any>(url: string, options: Omit<ApiRequestOptions, 'method'> = {}) => {
    return request<T>(url, { ...options, method: 'GET' });
  }, [request]);

  const post = useCallback(<T = any>(url: string, options: Omit<ApiRequestOptions, 'method'> = {}) => {
    return request<T>(url, { ...options, method: 'POST' });
  }, [request]);

  const put = useCallback(<T = any>(url: string, options: Omit<ApiRequestOptions, 'method'> = {}) => {
    return request<T>(url, { ...options, method: 'PUT' });
  }, [request]);

  const patch = useCallback(<T = any>(url: string, options: Omit<ApiRequestOptions, 'method'> = {}) => {
    return request<T>(url, { ...options, method: 'PATCH' });
  }, [request]);

  const deleteReq = useCallback(<T = any>(url: string, options: Omit<ApiRequestOptions, 'method'> = {}) => {
    return request<T>(url, { ...options, method: 'DELETE' });
  }, [request]);

  return {
    // Main request method
    request,
    
    // Convenience methods
    get,
    post,
    put,
    patch,
    delete: deleteReq,
    
    // Loading state
    loading: loadingState.loading,
    error: loadingState.error,
    success: loadingState.success,
    
    // Loading state controls
    reset: loadingState.reset,
    setError: loadingState.setError,
    setSuccess: loadingState.setSuccess,
  };
}

/**
 * Type-safe API request hooks for specific endpoints
 * Create specialized hooks for common API patterns
 */

/**
 * Document API hook with type safety
 */
export function useDocumentApi() {
  const api = useApiRequest();

  const uploadDocument = useCallback(async (formData: FormData) => {
    return api.post<{ id: string; status: string }>('/api/documents', {
      body: formData,
      headers: {}, // Remove Content-Type to let browser set multipart boundary
      successMessage: 'อัปโหลดเอกสารสำเร็จ',
    });
  }, [api]);

  const updateDocumentStatus = useCallback(async (id: string, status: string) => {
    return api.patch<{ status: string }>(`/api/documents/${id}/status`, {
      body: JSON.stringify({ status }),
      successMessage: 'อัปเดตสถานะเอกสารสำเร็จ',
    });
  }, [api]);

  const deleteDocument = useCallback(async (id: string) => {
    return api.delete(`/api/documents/${id}`, {
      successMessage: 'ลบเอกสารสำเร็จ',
    });
  }, [api]);

  const getDocuments = useCallback(async (params: Record<string, string> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/documents${queryString ? `?${queryString}` : ''}`;
    return api.get<{ documents: any[]; totalPages: number; totalDocuments: number }>(url);
  }, [api]);

  return {
    ...api,
    uploadDocument,
    updateDocumentStatus,
    deleteDocument,
    getDocuments,
  };
}

/**
 * Settings API hook with type safety
 */
export function useSettingsApi() {
  const api = useApiRequest();

  const getTelegramSettings = useCallback(async () => {
    return api.get<any>('/api/telegram/settings');
  }, [api]);

  const saveTelegramSettings = useCallback(async (settings: any) => {
    return api.post('/api/telegram/settings', {
      body: JSON.stringify(settings),
      successMessage: 'บันทึกการตั้งค่า Telegram สำเร็จ',
    });
  }, [api]);

  const testTelegramConnection = useCallback(async (botToken: string) => {
    return api.post('/api/telegram/test-connection', {
      body: JSON.stringify({ botToken }),
    });
  }, [api]);

  const testTelegramMessage = useCallback(async (botToken: string, chatId: string) => {
    return api.post('/api/telegram/test-message', {
      body: JSON.stringify({ botToken, chatId }),
    });
  }, [api]);

  const getSystemSettings = useCallback(async () => {
    return api.get<any>('/api/system-settings');
  }, [api]);

  const saveSystemSettings = useCallback(async (settings: any) => {
    return api.put('/api/system-settings', {
      body: JSON.stringify(settings),
      successMessage: 'บันทึกการตั้งค่าระบบสำเร็จ',
    });
  }, [api]);

  return {
    ...api,
    getTelegramSettings,
    saveTelegramSettings,
    testTelegramConnection,
    testTelegramMessage,
    getSystemSettings,
    saveSystemSettings,
  };
}

export default useApiRequest;