// src/components/admin/add-role-form.tsx

"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createRole } from "@/actions/role-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Permission = {
  id: number;
  name: string;
  description: string | null;
};

type AddRoleFormProps = {
  permissions: Permission[];
};

export function AddRoleForm({ permissions }: AddRoleFormProps) {
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>(
    []
  );

  const initialState = { message: "", errors: {}, success: false } as const;
  const [state, formAction, isPending] = useActionState(createRole, initialState);

  const handlePermissionChange = (checked: boolean, permissionId: number) => {
    setSelectedPermissionIds((prev) =>
      checked
        ? [...prev, permissionId]
        : prev.filter((id) => id !== permissionId)
    );
  };

  return (
    <div>
      {state.message && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <form action={formAction} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">ชื่อบทบาท</Label>
          <Input id="name" name="name" placeholder="ระบุชื่อบทบาท" required />
          {state.errors?.name && (
            <p className="text-sm text-red-500">{state.errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">คำอธิบาย</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="อธิบายบทบาทนี้"
            rows={3}
          />
          {state.errors?.description && (
            <p className="text-sm text-red-500">{state.errors.description}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>สิทธิ์</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border rounded-md p-4">
            {permissions.map((permission) => (
              <div key={permission.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`permission-${permission.id}`}
                  name="permissions"
                  value={permission.id}
                  checked={selectedPermissionIds.includes(permission.id)}
                  onCheckedChange={(checked) =>
                    handlePermissionChange(checked as boolean, permission.id)
                  }
                />
                <Label
                  htmlFor={`permission-${permission.id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {permission.name}
                  {permission.description && (
                    <span className="text-gray-500 text-xs ml-1">
                      ({permission.description})
                    </span>
                  )}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" className="mt-4" disabled={isPending}>
          {isPending ? (
            <>
              <span className="mr-2">กำลังบันทึก...</span>
            </>
          ) : (
            "บันทึก"
          )}
        </Button>
      </form>
    </div>
  );
}
