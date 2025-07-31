'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DocumentWithRelations, DocumentFilters, PaginatedResponse } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Calendar, 
  User, 
  Search, 
  Filter,
  ChevronDown,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface LazyDocumentListProps {
  branchBaCode: number;
  initialFilters?: Partial<DocumentFilters>;
  onDocumentClick?: (document: DocumentWithRelations) => void;
  className?: string;
}

interface DocumentListState {
  documents: DocumentWithRelations[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
}

const INITIAL_PAGE_SIZE = 10;
const LOAD_MORE_PAGE_SIZE = 20;

export default function LazyDocumentList({
  branchBaCode,
  initialFilters = {},
  onDocumentClick,
  className
}: LazyDocumentListProps) {
  // State management
  const [state, setState] = useState<DocumentListState>({
    documents: [],
    loading: true,
    hasMore: true,
    error: null,
    totalCount: 0,
    currentPage: 1,
  });

  const [filters, setFilters] = useState<DocumentFilters>({
    status: 'all',
    page: 1,
    limit: INITIAL_PAGE_SIZE,
    search: '',
    dateFrom: undefined,
    dateTo: undefined,
    ...initialFilters,
  });

  const [searchQuery, setSearchQuery] = useState(filters.search || '');
  const [isSearching, setIsSearching] = useState(false);

  // Refs for intersection observer and debouncing
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Intersection observer for infinite scrolling
  const isLoadMoreVisible = useIntersectionObserver(loadMoreRef, {
    threshold: 0.1,
    rootMargin: '100px',
  });

  // Fetch documents function
  const fetchDocuments = useCallback(async (
    currentFilters: DocumentFilters,
    append: boolean = false
  ): Promise<void> => {
    try {
      setState(prev => ({ 
        ...prev, 
        loading: true, 
        error: null 
      }));

      const queryParams = new URLSearchParams({
        status: currentFilters.status || 'all',
        page: currentFilters.page.toString(),
        limit: currentFilters.limit.toString(),
        ...(currentFilters.search && { search: currentFilters.search }),
        ...(currentFilters.dateFrom && { dateFrom: currentFilters.dateFrom.toISOString() }),
        ...(currentFilters.dateTo && { dateTo: currentFilters.dateTo.toISOString() }),
      });

      console.log(`📄 ${append ? 'Loading more' : 'Fetching'} documents for branch ${branchBaCode}`, {
        page: currentFilters.page,
        filters: currentFilters
      });

      const response = await fetch(
        `/api/documents/branch/${branchBaCode}?${queryParams.toString()}`,
        {
          headers: {
            'Cache-Control': 'max-age=300', // 5 minutes client-side cache
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      
      if (!responseText) {
        throw new Error('Empty response from server');
      }

      let result: { success: boolean; data: PaginatedResponse<DocumentWithRelations> };
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Response text:', responseText);
        throw new Error('Invalid JSON response from server');
      }

      if (!result.success) {
        throw new Error('Failed to fetch documents');
      }

      const { data, total, totalPages } = result.data;

      setState(prev => ({
        ...prev,
        documents: append ? [...prev.documents, ...data] : data,
        loading: false,
        hasMore: currentFilters.page < totalPages,
        totalCount: total,
        currentPage: currentFilters.page,
        error: null,
      }));

      console.log(`✅ Loaded ${data.length} documents (${append ? 'appended' : 'replaced'})`);

    } catch (error) {
      console.error('Error fetching documents:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load documents',
        hasMore: false,
      }));
    }
  }, [branchBaCode]);

  // Load more documents (infinite scroll)
  const loadMore = useCallback(() => {
    if (state.loading || !state.hasMore) return;

    const nextFilters = {
      ...filters,
      page: state.currentPage + 1,
      limit: LOAD_MORE_PAGE_SIZE,
    };

    setFilters(nextFilters);
    fetchDocuments(nextFilters, true);
  }, [filters, state.loading, state.hasMore, state.currentPage, fetchDocuments]);

  // Search with debouncing
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setIsSearching(true);
      const newFilters = {
        ...filters,
        search: query,
        page: 1,
        limit: INITIAL_PAGE_SIZE,
      };
      
      setFilters(newFilters);
      fetchDocuments(newFilters, false).finally(() => {
        setIsSearching(false);
      });
    }, 500); // 500ms debounce
  }, [filters, fetchDocuments]);

  // Filter change handler
  const handleFilterChange = useCallback((key: keyof DocumentFilters, value: any) => {
    const newFilters = {
      ...filters,
      [key]: value,
      page: 1, // Reset to first page
      limit: INITIAL_PAGE_SIZE,
    };
    
    setFilters(newFilters);
    fetchDocuments(newFilters, false);
  }, [filters, fetchDocuments]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    const refreshFilters = {
      ...filters,
      page: 1,
      limit: INITIAL_PAGE_SIZE,
    };
    
    setFilters(refreshFilters);
    fetchDocuments(refreshFilters, false);
  }, [filters, fetchDocuments]);

  // Initial load and intersection observer effect
  useEffect(() => {
    fetchDocuments(filters, false);
  }, []); // Only run on mount

  useEffect(() => {
    if (isLoadMoreVisible && state.hasMore && !state.loading) {
      loadMore();
    }
  }, [isLoadMoreVisible, state.hasMore, state.loading, loadMore]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'sent_to_branch': return 'default';
      case 'acknowledged': return 'success';
      case 'sent_back_to_district': return 'destructive';
      default: return 'outline';
    }
  };

  // Status display text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'ร่าง';
      case 'sent_to_branch': return 'ส่งไปสาขา';
      case 'acknowledged': return 'รับทราบ';
      case 'sent_back_to_district': return 'ส่งกลับเขต';
      default: return status;
    }
  };

  if (state.error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-destructive mb-4">เกิดข้อผิดพลาด: {state.error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              ลองใหม่
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Filters and Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              เอกสาร ({state.totalCount.toLocaleString()} รายการ)
            </span>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              รีเฟรช
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาด้วยเรื่อง หรือเลขที่เอกสาร..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="draft">ร่าง</SelectItem>
                <SelectItem value="sent_to_branch">ส่งไปสาขา</SelectItem>
                <SelectItem value="acknowledged">รับทราบ</SelectItem>
                <SelectItem value="sent_back_to_district">ส่งกลับเขต</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Document List */}
      <div className="space-y-4">
        {state.documents.map((document) => (
          <Card 
            key={document.id} 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onDocumentClick?.(document)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold">{document.subject}</h3>
                    <Badge variant={getStatusColor(document.status) as any}>
                      {getStatusText(document.status)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      {document.mtNumber}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {document.mtDate}
                    </div>
                    {document.uploader && (
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {document.uploader.firstName} {document.uploader.lastName}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {new Date(document.uploadDate).toLocaleDateString('th-TH')}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Loading skeletons */}
        {state.loading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <Card key={`skeleton-${i}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <div className="grid grid-cols-3 gap-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load more trigger */}
        {state.hasMore && !state.loading && (
          <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
            <Button 
              variant="outline" 
              onClick={loadMore}
              className="w-full"
            >
              <ChevronDown className="h-4 w-4 mr-2" />
              โหลดเพิ่มเติม
            </Button>
          </div>
        )}

        {/* No more documents */}
        {!state.hasMore && state.documents.length > 0 && (
          <div className="text-center py-4 text-muted-foreground">
            แสดงเอกสารครบทั้งหมดแล้ว
          </div>
        )}

        {/* Empty state */}
        {!state.loading && state.documents.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">ไม่พบเอกสาร</p>
              {(filters.search || filters.status !== 'all') && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery('');
                    handleFilterChange('status', 'all');
                    handleFilterChange('search', '');
                  }}
                >
                  ล้างตัวกรอง
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}