"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createUser } from "@/actions/user-actions";

type Role = {
  id: number;
  name: string;
  description: string | null;
};

type UserFormProps = {
  roles: Role[];
  user?: {
    id: number;
    username: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  selectedRoles?: number[];
};

export function UserForm({ roles, user, selectedRoles = [] }: UserFormProps) {
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>(selectedRoles);

  // กำหนด initialState ตามที่ createUser function รองรับ
  const initialState = { message: "", errors: {}, success: false } as const;
  const [state, formAction] = useFormState(createUser, initialState);

  const handleRoleChange = (checked: boolean, roleId: number) => {
    setSelectedRoleIds((prev) =>
      checked ? [...prev, roleId] : prev.filter((id) => id !== roleId)
    );
  };

  return (
    <div>
      {state.message && (
        <Alert variant={state.success ? "default" : "destructive"} className="mb-4">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <form action={formAction} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="username">ชื่อผู้ใช้งาน</Label>
          <Input
            id="username"
            name="username"
            placeholder="เช่น user123"
            defaultValue={user?.username || ""}
            required
          />
          {state.errors && 'username' in state.errors && state.errors.username && (
            <p className="text-sm text-red-500">{state.errors.username[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="firstName">ชื่อ</Label>
          <Input
            id="firstName"
            name="firstName"
            defaultValue={user?.firstName || ""}
          />
          {state.errors && 'firstName' in state.errors && state.errors.firstName && (
            <p className="text-sm text-red-500">{state.errors.firstName[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">นามสกุล</Label>
          <Input
            id="lastName"
            name="lastName"
            defaultValue={user?.lastName || ""}
          />
          {state.errors && 'lastName' in state.errors && state.errors.lastName && (
            <p className="text-sm text-red-500">{state.errors.lastName[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">อีเมล</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={user?.email || ""}
          />
          {state.errors && 'email' in state.errors && state.errors.email && (
            <p className="text-sm text-red-500">{state.errors.email[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="roles">บทบาท</Label>
          <div className="space-y-2">
            {roles.map((role) => (
              <div key={role.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`role-${role.id}`}
                  name="roles"
                  value={role.id}
                  checked={selectedRoleIds.includes(role.id)}
                  onCheckedChange={(checked) => handleRoleChange(!!checked, role.id)}
                />
                <Label htmlFor={`role-${role.id}`} className="font-normal cursor-pointer">
                  {role.name}
                  {role.description && <span className="text-gray-500 text-sm ml-2">({role.description})</span>}
                </Label>
              </div>
            ))}
          </div>
          {state.errors && 'roles' in state.errors && state.errors.roles && (
            <p className="text-sm text-red-500">{state.errors.roles[0]}</p>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="submit">
            {user ? "บันทึกการเปลี่ยนแปลง" : "เพิ่มผู้ใช้งาน"}
          </Button>
        </div>
      </form>
    </div>
  );
}
