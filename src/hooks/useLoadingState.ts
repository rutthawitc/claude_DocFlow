import { useState, useCallback, useRef } from 'react';

/**
 * Loading state configuration options
 */
export interface LoadingStateOptions {
  initialLoading?: boolean;
  autoReset?: boolean; // Auto-reset error after successful operation
  timeout?: number; // Auto-timeout for operations (in ms)
}

/**
 * Loading state return object
 */
export interface LoadingState {
  loading: boolean;
  error: string | null;
  success: boolean;
  isIdle: boolean;
  
  // Actions
  startLoading: () => void;
  stopLoading: () => void;
  setError: (error: string | Error | null) => void;
  setSuccess: (message?: string) => void;
  reset: () => void;
  
  // Async wrapper
  execute: <T>(promise: Promise<T>) => Promise<T>;
}

/**
 * Consolidated loading state hook for components
 * Eliminates duplicated loading state patterns across the application
 * 
 * @param options Configuration options
 * @returns LoadingState object with state and control functions
 * 
 * @example
 * ```tsx
 * const { loading, error, execute, setError } = useLoadingState();
 * 
 * const fetchData = async () => {
 *   try {
 *     const data = await execute(api.getData());
 *     setData(data);
 *   } catch (err) {
 *     // Error automatically set by execute()
 *   }
 * };
 * ```
 */
export function useLoadingState(options: LoadingStateOptions = {}): LoadingState {
  const {
    initialLoading = false,
    autoReset = true,
    timeout
  } = options;

  const [loading, setLoading] = useState<boolean>(initialLoading);
  const [error, setErrorState] = useState<string | null>(null);
  const [success, setSuccessState] = useState<boolean>(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Cleanup timeout on unmount
  useState(() => {
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  });

  const startLoading = useCallback(() => {
    if (!mountedRef.current) return;
    
    setLoading(true);
    if (autoReset) {
      setErrorState(null);
      setSuccessState(false);
    }

    // Set timeout if specified
    if (timeout) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setLoading(false);
          setErrorState('Operation timed out. Please try again.');
        }
      }, timeout);
    }
  }, [autoReset, timeout]);

  const stopLoading = useCallback(() => {
    if (!mountedRef.current) return;
    
    setLoading(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const setError = useCallback((error: string | Error | null) => {
    if (!mountedRef.current) return;
    
    setLoading(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (error === null) {
      setErrorState(null);
    } else if (error instanceof Error) {
      setErrorState(error.message);
    } else {
      setErrorState(error);
    }
    
    setSuccessState(false);
  }, []);

  const setSuccess = useCallback((message?: string) => {
    if (!mountedRef.current) return;
    
    setLoading(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setErrorState(null);
    setSuccessState(true);
    
    // Auto-reset success after 3 seconds
    setTimeout(() => {
      if (mountedRef.current) {
        setSuccessState(false);
      }
    }, 3000);
  }, []);

  const reset = useCallback(() => {
    if (!mountedRef.current) return;
    
    setLoading(false);
    setErrorState(null);
    setSuccessState(false);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const execute = useCallback(async <T>(promise: Promise<T>): Promise<T> => {
    startLoading();
    
    try {
      const result = await promise;
      
      if (mountedRef.current) {
        stopLoading();
        if (autoReset) {
          setSuccessState(true);
          // Auto-reset success after 1 second for execute()
          setTimeout(() => {
            if (mountedRef.current) {
              setSuccessState(false);
            }
          }, 1000);
        }
      }
      
      return result;
    } catch (error) {
      if (mountedRef.current) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred';
        setError(errorMessage);
      }
      throw error;
    }
  }, [startLoading, stopLoading, setError, autoReset]);

  return {
    loading,
    error,
    success,
    isIdle: !loading && !error && !success,
    
    startLoading,
    stopLoading,
    setError,
    setSuccess,
    reset,
    execute
  };
}

/**
 * Extended loading state hook with additional features for complex operations
 */
export interface ExtendedLoadingStateOptions extends LoadingStateOptions {
  onSuccess?: (result?: any) => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number;
}

export function useExtendedLoadingState(options: ExtendedLoadingStateOptions = {}) {
  const baseLoadingState = useLoadingState(options);
  const { onSuccess, onError, retryCount = 0, retryDelay = 1000 } = options;
  
  const retryCountRef = useRef(0);

  const executeWithRetry = useCallback(async <T>(promise: () => Promise<T>): Promise<T> => {
    retryCountRef.current = 0;
    
    const attemptExecution = async (): Promise<T> => {
      try {
        const result = await baseLoadingState.execute(promise());
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        retryCountRef.current = 0;
        return result;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        if (retryCountRef.current < retryCount) {
          retryCountRef.current++;
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          
          return attemptExecution();
        }
        
        if (onError) {
          onError(errorObj);
        }
        
        throw error;
      }
    };

    return attemptExecution();
  }, [baseLoadingState, onSuccess, onError, retryCount, retryDelay]);

  return {
    ...baseLoadingState,
    executeWithRetry,
    retryCount: retryCountRef.current
  };
}

export default useLoadingState;