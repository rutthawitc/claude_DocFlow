'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Users,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  ShieldX
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Branch {
  id: number;
  baCode: number;
  branchCode: number;
  name: string;
  regionId: number;
  regionCode: string;
  isActive: boolean;
  documentCounts: {
    total: number;
    draft: number;
    sent_to_branch: number;
    acknowledged: number;
    sent_back_to_district: number;
  };
}

interface BranchOverviewProps {
  userRoles?: string[];
  userBranchBaCode?: number;
}

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  sent_to_branch: 'bg-orange-100 text-orange-700',
  acknowledged: 'bg-green-100 text-green-700',
  sent_back_to_district: 'bg-blue-100 text-blue-700'
};

export function BranchOverview({ userRoles = [], userBranchBaCode }: BranchOverviewProps) {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'total' | 'pending' | 'ba'>('ba');
  const [showAccessDeniedDialog, setShowAccessDeniedDialog] = useState(false);
  const [deniedBranchName, setDeniedBranchName] = useState('');

  // Fetch branches with document counts
  const fetchBranches = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/branches?includeCounts=true', {
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setBranches(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch branches');
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  // Check if user can access a specific branch
  const canAccessBranch = (branchBaCode: number): boolean => {
    // Only admin and district_manager can access all branches
    if (userRoles.includes('admin') || 
        userRoles.includes('district_manager')) {
      return true;
    }

    // All other users (including branch_manager, uploader, branch_user) can only access their own branch
    return userBranchBaCode === branchBaCode;
  };

  // Handle branch card click
  const handleBranchClick = (branch: Branch) => {
    if (canAccessBranch(branch.baCode)) {
      // User has access, navigate to branch
      router.push(`/documents/branch/${branch.baCode}`);
    } else {
      // User doesn't have access, show denial dialog
      setDeniedBranchName(branch.name);
      setShowAccessDeniedDialog(true);
    }
  };

  // Filter and sort branches
  const filteredAndSortedBranches = React.useMemo(() => {
    let filtered = branches;

    // Filter by user role and branch access
    if (!userRoles.includes('admin') && !userRoles.includes('branch_manager') && !userRoles.includes('district_manager')) {
      // Regular users only see their own branch
      filtered = branches.filter(branch => 
        userBranchBaCode ? branch.baCode === userBranchBaCode : true
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(branch =>
        branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        branch.baCode.toString().includes(searchTerm)
      );
    }

    // Sort branches
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'total':
          return b.documentCounts.total - a.documentCounts.total;
        case 'pending':
          return b.documentCounts.sent_to_branch - a.documentCounts.sent_to_branch;
        case 'ba':
          return a.baCode - b.baCode;
        case 'name':
        default:
          return a.name.localeCompare(b.name, 'th');
      }
    });

    return filtered;
  }, [branches, searchTerm, sortBy, userRoles, userBranchBaCode]);

  // Calculate summary statistics
  const summaryStats = React.useMemo(() => {
    const totalBranches = filteredAndSortedBranches.length;
    const totalDocuments = filteredAndSortedBranches.reduce((sum, branch) => sum + branch.documentCounts.total, 0);
    const pendingDocuments = filteredAndSortedBranches.reduce((sum, branch) => sum + branch.documentCounts.sent_to_branch, 0);
    const acknowledgedDocuments = filteredAndSortedBranches.reduce((sum, branch) => sum + branch.documentCounts.acknowledged, 0);
    
    return {
      totalBranches,
      totalDocuments,
      pendingDocuments,
      acknowledgedDocuments
    };
  }, [filteredAndSortedBranches]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        กำลังโหลด...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">ภาพรวมสาขา</h1>
          <p className="text-gray-600">
            {summaryStats.totalBranches} สาขา • {summaryStats.totalDocuments} เอกสาร
          </p>
        </div>
        
        <Button onClick={fetchBranches} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรช
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">สาขาทั้งหมด</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalBranches}</div>
            <p className="text-xs text-muted-foreground">
              ในเขต R6
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">เอกสารทั้งหมด</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              เอกสารในระบบ
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">รอดำเนินการ</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summaryStats.pendingDocuments}</div>
            <p className="text-xs text-muted-foreground">
              รอการรับทราบ
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">รับทราบแล้ว</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.acknowledgedDocuments}</div>
            <p className="text-xs text-muted-foreground">
              เอกสารที่รับทราบ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="ค้นหาสาขาหรือรหัส BA..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'total' | 'pending' | 'ba')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ba">เรียงตาม BA</option>
                <option value="name">เรียงตามชื่อ</option>
                <option value="total">เรียงตามจำนวนเอกสาร</option>
                <option value="pending">เรียงตามเอกสารค้าง</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branches Grid */}
      {filteredAndSortedBranches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ไม่พบสาขา
            </h3>
            <p className="text-gray-500">
              ไม่มีสาขาที่ตรงกับเงื่อนไขการค้นหา
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedBranches.map((branch) => {
            const pendingCount = branch.documentCounts.sent_to_branch;
            const totalCount = branch.documentCounts.total;
            
            return (
              <Card 
                key={branch.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer h-full"
                onClick={() => handleBranchClick(branch)}
              >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg leading-tight">
                          {branch.name}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          BA: {branch.baCode}
                        </p>
                      </div>
                      
                      {pendingCount > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {pendingCount}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Document Counts */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
                        <div className="text-xs text-gray-500">เอกสารทั้งหมด</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${pendingCount > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                          {pendingCount}
                        </div>
                        <div className="text-xs text-gray-500">รอดำเนินการ</div>
                      </div>
                    </div>

                    {/* Status Breakdown */}
                    {totalCount > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">สถานะเอกสาร</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          {/* Draft documents are not shown in main overview - they appear only in upload page */}
                          {branch.documentCounts.sent_to_branch > 0 && (
                            <Badge variant="outline" className={STATUS_COLORS.sent_to_branch}>
                              เอกสารจากเขต: {branch.documentCounts.sent_to_branch}
                            </Badge>
                          )}
                          {branch.documentCounts.acknowledged > 0 && (
                            <Badge variant="outline" className={STATUS_COLORS.acknowledged}>
                              รับทราบ: {branch.documentCounts.acknowledged}
                            </Badge>
                          )}
                          {branch.documentCounts.sent_back_to_district > 0 && (
                            <Badge variant="outline" className={STATUS_COLORS.sent_back_to_district}>
                              ส่งกลับเขต: {branch.documentCounts.sent_back_to_district}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Indicator */}
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>คลิกเพื่อดูเอกสาร</span>
                        {pendingCount > 0 && (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 text-orange-500" />
                            <span className="text-orange-600 font-medium">ต้องดำเนินการ</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
            );
          })}
        </div>
      )}

      {/* Access Denied Dialog */}
      <Dialog open={showAccessDeniedDialog} onOpenChange={setShowAccessDeniedDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <ShieldX className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div>
                <DialogTitle className="text-red-800">ไม่สามารถเข้าถึงได้</DialogTitle>
                <DialogDescription className="text-gray-600">
                  คุณไม่มีสิทธิ์ในการเข้าถึงข้อมูลสาขานี้
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-50 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2">สาขาที่ไม่สามารถเข้าถึง:</h4>
              <div className="text-sm text-red-700">
                <p>{deniedBranchName}</p>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>คุณสามารถเข้าถึงได้เฉพาะเอกสารของสาขาที่คุณสังกัดเท่านั้น หากต้องการเข้าถึงข้อมูลของสาขาอื่น กรุณาติดต่อผู้ดูแลระบบ</p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button 
              onClick={() => setShowAccessDeniedDialog(false)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              ตกลง
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}