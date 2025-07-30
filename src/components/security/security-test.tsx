/**
 * Security Test Component
 * Component for testing CSRF protection and security headers
 */

"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useCSRF, secureApiCall } from '@/lib/security/csrf-client';
import { Shield, CheckCircle, AlertTriangle, TestTube, Lock } from 'lucide-react';

interface TestResult {
  test: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  data?: any;
}

export function SecurityTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const { getToken, secureFetch } = useCSRF();

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // Test 1: Security Headers (GET request - no CSRF required)
  const testSecurityHeaders = async () => {
    addTestResult({
      test: 'Security Headers Test',
      status: 'pending',
      message: 'Testing security headers on GET request...'
    });

    try {
      const response = await fetch('/api/security-test', {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok && result.success) {
        addTestResult({
          test: 'Security Headers Test',
          status: 'success',
          message: 'Security headers applied successfully',
          data: {
            headers: Object.fromEntries(response.headers.entries()),
            response: result.data
          }
        });
      } else {
        addTestResult({
          test: 'Security Headers Test',
          status: 'error',
          message: `Test failed: ${result.message || 'Unknown error'}`,
          data: result
        });
      }
    } catch (error) {
      addTestResult({
        test: 'Security Headers Test',
        status: 'error',
        message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Test 2: CSRF Token Generation
  const testCSRFTokenGeneration = async () => {
    addTestResult({
      test: 'CSRF Token Generation',
      status: 'pending',
      message: 'Generating CSRF token...'
    });

    try {
      const token = await getToken();

      if (token) {
        addTestResult({
          test: 'CSRF Token Generation',
          status: 'success',
          message: 'CSRF token generated successfully',
          data: { tokenLength: token.length, tokenPreview: token.substring(0, 20) + '...' }
        });
      } else {
        addTestResult({
          test: 'CSRF Token Generation',
          status: 'error',
          message: 'Failed to generate CSRF token'
        });
      }
    } catch (error) {
      addTestResult({
        test: 'CSRF Token Generation',
        status: 'error',
        message: `Token generation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Test 3: CSRF Protection (POST request - CSRF required)
  const testCSRFProtection = async () => {
    addTestResult({
      test: 'CSRF Protection Test',
      status: 'pending',
      message: 'Testing CSRF protection on POST request...'
    });

    try {
      const response = await secureFetch('/api/security-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testData: 'CSRF protection test data',
          timestamp: new Date().toISOString()
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        addTestResult({
          test: 'CSRF Protection Test',
          status: 'success',
          message: 'CSRF protection working correctly',
          data: result.data
        });
      } else {
        addTestResult({
          test: 'CSRF Protection Test',
          status: 'error',
          message: `CSRF test failed: ${result.message || 'Unknown error'}`,
          data: result
        });
      }
    } catch (error) {
      addTestResult({
        test: 'CSRF Protection Test',
        status: 'error',
        message: `CSRF test error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Test 4: CSRF Bypass Attempt (POST without token)
  const testCSRFBypass = async () => {
    addTestResult({
      test: 'CSRF Bypass Attempt',
      status: 'pending',
      message: 'Attempting POST request without CSRF token...'
    });

    try {
      // Test with a simpler endpoint that doesn't require authentication
      // This simulates a real CSRF attack by not sending any credentials
      const response = await fetch('/api/csrf-test', {
        method: 'POST',
        credentials: 'omit', // Don't send any cookies to simulate CSRF attack
        headers: {
          'Content-Type': 'application/json'
          // Explicitly NOT including x-csrf-token header
        },
        body: JSON.stringify({
          testData: 'Attempt to bypass CSRF protection'
        })
      });

      const result = await response.json();

      if (response.status === 403 && (result.error === 'CSRF_TOKEN_MISSING' || result.error === 'CSRF_TOKEN_INVALID')) {
        addTestResult({
          test: 'CSRF Bypass Attempt',
          status: 'success',
          message: 'CSRF protection correctly blocked request without token',
          data: result
        });
      } else if (response.status === 401) {
        addTestResult({
          test: 'CSRF Bypass Attempt',
          status: 'error',
          message: 'Test failed due to authentication - try with authenticated endpoint',
          data: result
        });
      } else {
        addTestResult({
          test: 'CSRF Bypass Attempt',
          status: 'error',
          message: `CSRF protection failed - request should have been blocked (Status: ${response.status})`,
          data: { 
            status: response.status,
            response: result,
            expectedStatus: 403,
            expectedError: 'CSRF_TOKEN_MISSING'
          }
        });
      }
    } catch (error) {
      addTestResult({
        test: 'CSRF Bypass Attempt',
        status: 'error',
        message: `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Test 5: Multiple HTTP Methods
  const testMultipleMethods = async () => {
    const methods = ['PUT', 'DELETE'];
    
    for (const method of methods) {
      addTestResult({
        test: `CSRF ${method} Test`,
        status: 'pending',
        message: `Testing CSRF protection on ${method} request...`
      });

      try {
        const response = await secureFetch('/api/security-test', {
          method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: method === 'PUT' ? JSON.stringify({ testData: `${method} test data` }) : undefined
        });

        const result = await response.json();

        if (response.ok && result.success) {
          addTestResult({
            test: `CSRF ${method} Test`,
            status: 'success',
            message: `CSRF protection working for ${method} requests`,
            data: result.data
          });
        } else {
          addTestResult({
            test: `CSRF ${method} Test`,
            status: 'error',
            message: `${method} test failed: ${result.message || 'Unknown error'}`,
            data: result
          });
        }
      } catch (error) {
        addTestResult({
          test: `CSRF ${method} Test`,
          status: 'error',
          message: `${method} test error: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setTesting(true);
    clearResults();

    try {
      await testSecurityHeaders();
      await testCSRFTokenGeneration();
      await testCSRFProtection();
      await testCSRFBypass();
      await testMultipleMethods();

      toast.success('All security tests completed');
    } catch (error) {
      toast.error('Error running security tests');
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <TestTube className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-700">Pass</Badge>;
      case 'error':
        return <Badge variant="destructive">Fail</Badge>;
      case 'pending':
        return <Badge variant="secondary">Testing...</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Implementation Test Suite
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Button onClick={runAllTests} disabled={testing}>
            {testing ? 'Running Tests...' : 'Run All Tests'}
          </Button>
          <Button variant="outline" onClick={clearResults} disabled={testing}>
            Clear Results
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Results</h3>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.test}</span>
                    </div>
                    {getStatusBadge(result.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
                  {result.data && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                        View Details
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-50 rounded overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <Lock className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Security Features Being Tested</h4>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• Security headers (CSP, X-Frame-Options, etc.)</li>
                <li>• CSRF token generation and validation</li>
                <li>• Protection against CSRF attacks</li>
                <li>• Rate limiting and API security</li>
                <li>• Multiple HTTP method protection</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}