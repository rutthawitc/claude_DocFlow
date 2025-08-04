"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Shield, 
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  isLocalAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
}

interface CreateUserData {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export function UserManagement() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Create user form state
  const [createFormData, setCreateFormData] = useState<CreateUserData>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    password: ''
  });

  // Edit user form state
  const [editFormData, setEditFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    roles: [] as string[]
  });

  // Check if user has admin access
  const userRoles = session?.user?.pwa?.roles || [];
  const hasAdminAccess = userRoles.includes('admin');

  // Load users and roles
  const loadData = async () => {
    if (!hasAdminAccess) return;
    
    setLoading(true);
    try {
      // Load users
      const usersResponse = await fetch('/api/admin/users');
      const usersResult = await usersResponse.json();
      
      if (usersResult.success) {
        setUsers(usersResult.data.users);
      } else {
        toast.error(`Failed to load users: ${usersResult.error}`);
      }

      // Load roles
      const rolesResponse = await fetch('/api/admin/roles');
      const rolesResult = await rolesResponse.json();
      
      if (rolesResult.success) {
        setRoles(rolesResult.data.roles);
      } else {
        toast.error(`Failed to load roles: ${rolesResult.error}`);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load user management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [hasAdminAccess]);

  // Create new local admin user
  const handleCreateUser = async () => {
    if (!createFormData.username || !createFormData.email || !createFormData.firstName || 
        !createFormData.lastName || !createFormData.password) {
      toast.error('All fields are required');
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createFormData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Local admin user created successfully');
        setShowCreateDialog(false);
        setCreateFormData({
          username: '',
          email: '',
          firstName: '',
          lastName: '',
          password: ''
        });
        loadData(); // Reload users list
      } else {
        toast.error(`Failed to create user: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    }
  };

  // Update user
  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('User updated successfully');
        setShowEditDialog(false);
        setSelectedUser(null);
        loadData(); // Reload users list
      } else {
        toast.error(`Failed to update user: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  // Delete user
  const handleDeleteUser = async (user: User) => {
    if (user.isLocalAdmin && !confirm(`Are you sure you want to delete the local admin user "${user.username}"? This action cannot be undone.`)) {
      return;
    }

    if (!user.isLocalAdmin && !confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('User deleted successfully');
        loadData(); // Reload users list
      } else {
        toast.error(`Failed to delete user: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  // Open edit dialog
  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: [...user.roles]
    });
    setShowEditDialog(true);
  };

  // Handle role checkbox change
  const handleRoleChange = (roleName: string, checked: boolean) => {
    setEditFormData(prev => ({
      ...prev,
      roles: checked 
        ? [...prev.roles, roleName]
        : prev.roles.filter(r => r !== roleName)
    }));
  };

  if (!hasAdminAccess) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Access denied. Admin privileges required.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            <span>Loading user management...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Local Admin
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Local Admin User</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={createFormData.username}
                          onChange={(e) => setCreateFormData(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="admin"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={createFormData.email}
                          onChange={(e) => setCreateFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="admin@example.com"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={createFormData.firstName}
                          onChange={(e) => setCreateFormData(prev => ({ ...prev, firstName: e.target.value }))}
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={createFormData.lastName}
                          onChange={(e) => setCreateFormData(prev => ({ ...prev, lastName: e.target.value }))}
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={createFormData.password}
                        onChange={(e) => setCreateFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Minimum 6 characters"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateUser}>Create User</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {user.isLocalAdmin && <Shield className="h-4 w-4 text-blue-600" />}
                      <div>
                        <div className="font-medium text-right">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground text-right">
                          @{user.username} • {user.email}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role} variant="secondary" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User: {selectedUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="editFirstName">First Name</Label>
                <Input
                  id="editFirstName"
                  value={editFormData.firstName}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="editLastName">Last Name</Label>
              <Input
                id="editLastName"
                value={editFormData.lastName}
                onChange={(e) => setEditFormData(prev => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Roles</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={editFormData.roles.includes(role.name)}
                      onCheckedChange={(checked) => handleRoleChange(role.name, !!checked)}
                    />
                    <Label htmlFor={`role-${role.id}`} className="text-sm">
                      {role.name}
                      {role.description && (
                        <span className="text-muted-foreground ml-1">
                          ({role.description})
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateUser}>Update User</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}