"use client";

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/auth-context';

// Types
interface Department {
  id: number;
  baCode: number;
  branchCode: number;
  name: string;
  departmentName: string | null;
  regionId: number;
  regionCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
  documentCount?: number;
}

interface DepartmentFilters {
  search: string;
  region: string;
  isActive: string;
  departmentName: string;
}

interface CreateDepartmentData {
  baCode: number;
  name: string;
  departmentName: string;
  regionId: number;
  regionCode: string;
  isActive: boolean;
}

interface UpdateDepartmentData {
  name: string;
  departmentName: string;
  regionId: number;
  regionCode: string;
  isActive: boolean;
}

export function DepartmentManagement() {
  const { hasRole } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  // Filter states
  const [filters, setFilters] = useState<DepartmentFilters>({
    search: '',
    region: '',
    isActive: 'all',
    departmentName: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState<CreateDepartmentData>({
    baCode: 0,
    name: '',
    departmentName: '',
    regionId: 6,
    regionCode: 'R6',
    isActive: true
  });

  const [editForm, setEditForm] = useState<UpdateDepartmentData>({
    name: '',
    departmentName: '',
    regionId: 6,
    regionCode: 'R6',
    isActive: true
  });

  // Pagination
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false
  });

  // Load departments
  const loadDepartments = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      if (filters.search) queryParams.append('search', filters.search);
      if (filters.region) queryParams.append('region', filters.region);
      if (filters.isActive !== 'all') queryParams.append('isActive', filters.isActive);
      if (filters.departmentName) queryParams.append('departmentName', filters.departmentName);
      queryParams.append('limit', pagination.limit.toString());
      queryParams.append('offset', pagination.offset.toString());

      const response = await fetch(`/api/admin/departments?${queryParams}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load departments');
      }

      const result = await response.json();

      if (result.success) {
        setDepartments(result.data.departments);
        setPagination(result.data.pagination);
      } else {
        throw new Error(result.error || 'Failed to load departments');
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load departments on mount and filter changes
  useEffect(() => {
    loadDepartments();
  }, [filters, pagination.offset]);

  // Create department
  const handleCreate = async () => {
    try {
      setCreating(true);

      const response = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(createForm)
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Failed to create department');
      }

      const result = await response.json();
      if (result.success) {
        setCreateModalOpen(false);
        setCreateForm({
          baCode: 0,
          name: '',
          departmentName: '',
          regionId: 6,
          regionCode: 'R6',
          isActive: true
        });
        loadDepartments();
      } else {
        throw new Error(result.error || 'Failed to create department');
      }
    } catch (error) {
      console.error('Error creating department:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to create department'}`);
    } finally {
      setCreating(false);
    }
  };

  // Update department
  const handleUpdate = async () => {
    if (!selectedDepartment) return;

    try {
      setUpdating(selectedDepartment.id);

      const response = await fetch(`/api/admin/departments/${selectedDepartment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(editForm)
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Failed to update department');
      }

      const result = await response.json();
      if (result.success) {
        setEditModalOpen(false);
        setSelectedDepartment(null);
        loadDepartments();
      } else {
        throw new Error(result.error || 'Failed to update department');
      }
    } catch (error) {
      console.error('Error updating department:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to update department'}`);
    } finally {
      setUpdating(null);
    }
  };

  // Delete department
  const handleDelete = async () => {
    if (!selectedDepartment) return;

    try {
      setDeleting(selectedDepartment.id);

      const response = await fetch(`/api/admin/departments/${selectedDepartment.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Failed to delete department');
      }

      const result = await response.json();
      if (result.success) {
        setDeleteModalOpen(false);
        setSelectedDepartment(null);
        loadDepartments();
      } else {
        throw new Error(result.error || 'Failed to delete department');
      }
    } catch (error) {
      console.error('Error deleting department:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to delete department'}`);
    } finally {
      setDeleting(null);
    }
  };

  // Open edit modal
  const openEditModal = (department: Department) => {
    setSelectedDepartment(department);
    setEditForm({
      name: department.name,
      departmentName: department.departmentName || '',
      regionId: department.regionId,
      regionCode: department.regionCode,
      isActive: department.isActive
    });
    setEditModalOpen(true);
  };

  // Open delete modal
  const openDeleteModal = (department: Department) => {
    setSelectedDepartment(department);
    setDeleteModalOpen(true);
  };

  // Open view modal
  const openViewModal = (department: Department) => {
    setSelectedDepartment(department);
    setViewModalOpen(true);
  };

  // Filter change handler
  const handleFilterChange = (key: keyof DepartmentFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, offset: 0 })); // Reset to first page
  };

  // Check permissions
  const canManageDepartments = hasRole('admin');
  const canViewDepartments = hasRole('admin') || hasRole('district_manager');

  if (!canViewDepartments) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Access Restricted
          </h3>
          <p className="text-gray-500">
            You don't have permission to view departments
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Department Management</h1>
          <p className="text-gray-600">{pagination.total} departments total</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDepartments}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>

          {canManageDepartments && (
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Department
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Name, BA code, or department..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Region</Label>
                <Select value={filters.region} onValueChange={(value) => handleFilterChange('region', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Regions</SelectItem>
                    <SelectItem value="R6">Region 6</SelectItem>
                    <SelectItem value="R1">Region 1</SelectItem>
                    <SelectItem value="R2">Region 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filters.isActive} onValueChange={(value) => handleFilterChange('isActive', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Department Type</Label>
                <Input
                  placeholder="Department name..."
                  value={filters.departmentName}
                  onChange={(e) => handleFilterChange('departmentName', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Departments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading departments...</span>
            </div>
          ) : departments.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No departments found
              </h3>
              <p className="text-gray-500">
                {Object.values(filters).some(f => f) ? 'No departments match your filters' : 'No departments available'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>BA Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department Type</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell>
                        <div className="font-mono text-sm">{dept.baCode}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{dept.name}</div>
                      </TableCell>
                      <TableCell>
                        {dept.departmentName ? (
                          <Badge variant="secondary">{dept.departmentName}</Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{dept.regionCode}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={dept.isActive ? "default" : "secondary"}>
                          {dept.isActive ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1 text-gray-400" />
                          <span>{dept.userCount ?? '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openViewModal(dept)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {canManageDepartments && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(dept)}
                                disabled={updating === dept.id}
                              >
                                {updating === dept.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Edit className="h-4 w-4" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteModal(dept)}
                                disabled={deleting === dept.id}
                                className="text-red-600 hover:text-red-700"
                              >
                                {deleting === dept.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Department Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Department</DialogTitle>
            <DialogDescription>
              Add a new department to the system
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-baCode">BA Code</Label>
              <Input
                id="create-baCode"
                type="number"
                placeholder="e.g. 105906"
                value={createForm.baCode || ''}
                onChange={(e) => setCreateForm(prev => ({ ...prev, baCode: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-name">Department Name</Label>
              <Input
                id="create-name"
                placeholder="e.g. กปภ.เขต 6 - งานใหม่"
                value={createForm.name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-departmentName">Department Type</Label>
              <Input
                id="create-departmentName"
                placeholder="e.g. งานใหม่"
                value={createForm.departmentName}
                onChange={(e) => setCreateForm(prev => ({ ...prev, departmentName: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-regionId">Region ID</Label>
                <Input
                  id="create-regionId"
                  type="number"
                  value={createForm.regionId}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, regionId: parseInt(e.target.value) }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-regionCode">Region Code</Label>
                <Input
                  id="create-regionCode"
                  placeholder="R6"
                  value={createForm.regionCode}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, regionCode: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !createForm.name || !createForm.baCode}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Department'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Department Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update department information
            </DialogDescription>
          </DialogHeader>

          {selectedDepartment && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>BA Code (Read Only)</Label>
                <Input
                  value={selectedDepartment.baCode}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-name">Department Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-departmentName">Department Type</Label>
                <Input
                  id="edit-departmentName"
                  value={editForm.departmentName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, departmentName: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-regionId">Region ID</Label>
                  <Input
                    id="edit-regionId"
                    type="number"
                    value={editForm.regionId}
                    onChange={(e) => setEditForm(prev => ({ ...prev, regionId: parseInt(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-regionCode">Region Code</Label>
                  <Input
                    id="edit-regionCode"
                    value={editForm.regionCode}
                    onChange={(e) => setEditForm(prev => ({ ...prev, regionCode: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setEditForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                  className="flex items-center space-x-2"
                >
                  {editForm.isActive ? (
                    <ToggleRight className="h-6 w-6 text-green-600" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-gray-400" />
                  )}
                  <span className={editForm.isActive ? 'text-green-600' : 'text-gray-400'}>
                    {editForm.isActive ? 'Active' : 'Inactive'}
                  </span>
                </button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={updating === selectedDepartment?.id}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updating === selectedDepartment?.id || !editForm.name}
            >
              {updating === selectedDepartment?.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Department'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this department? This action will deactivate the department.
            </DialogDescription>
          </DialogHeader>

          {selectedDepartment && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Department Details:</h4>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">BA Code:</span> {selectedDepartment.baCode}</p>
                <p><span className="font-medium">Name:</span> {selectedDepartment.name}</p>
                <p><span className="font-medium">Type:</span> {selectedDepartment.departmentName || 'N/A'}</p>
                <p><span className="font-medium">Users:</span> {selectedDepartment.userCount ?? '-'}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting === selectedDepartment?.id}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting === selectedDepartment?.id}
            >
              {deleting === selectedDepartment?.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Department'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Department Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Department Details</DialogTitle>
          </DialogHeader>

          {selectedDepartment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">BA Code</Label>
                  <p className="font-mono font-medium">{selectedDepartment.baCode}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Branch Code</Label>
                  <p className="font-mono font-medium">{selectedDepartment.branchCode}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm text-gray-500">Department Name</Label>
                <p className="font-medium">{selectedDepartment.name}</p>
              </div>

              <div>
                <Label className="text-sm text-gray-500">Department Type</Label>
                <p>{selectedDepartment.departmentName || 'N/A'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Region</Label>
                  <p>{selectedDepartment.regionCode} (ID: {selectedDepartment.regionId})</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Status</Label>
                  <Badge variant={selectedDepartment.isActive ? "default" : "secondary"}>
                    {selectedDepartment.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Users</Label>
                  <p className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {selectedDepartment.userCount ?? '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Documents</Label>
                  <p>{selectedDepartment.documentCount || 0}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-gray-500">Created</Label>
                    <p>{new Date(selectedDepartment.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Updated</Label>
                    <p>{new Date(selectedDepartment.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}