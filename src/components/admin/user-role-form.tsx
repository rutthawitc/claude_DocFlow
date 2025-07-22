// src/components/admin/user-role-form.tsx

"use client";

import { useState } from "react";
import { useActionState } from "react";
import { updateUserRoles } from "@/actions/role-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Role = {
  id: number;
  name: string;
  description: string | null;
};

type User = {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
};

type UserRoleFormProps = {
  user: User;
  roles: Role[];
  selectedRoles: number[];
};

export function UserRoleForm({
  user,
  roles,
  selectedRoles,
}: UserRoleFormProps) {
  const [selectedRoleIds, setSelectedRoleIds] =
    useState<number[]>(selectedRoles);

  const initialState = { message: "", errors: {}, success: false } as const;
  const [state, formAction, isPending] = useActionState(updateUserRoles, initialState);

  const handleRoleChange = (checked: boolean, roleId: number) => {
    setSelectedRoleIds((prev) =>
      checked ? [...prev, roleId] : prev.filter((id) => id !== roleId)
    );
  };

  return (
    <div>
      {state.message && (
        <Alert
          variant={state.success ? "default" : "destructive"}
          className="mb-4"
        >
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="userId" value={user.id} />

        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border rounded-md p-4">
            {roles.map((role) => (
              <div key={role.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`role-${role.id}`}
                  name="roles"
                  value={role.id}
                  checked={selectedRoleIds.includes(role.id)}
                  onCheckedChange={(checked) =>
                    handleRoleChange(checked as boolean, role.id)
                  }
                />
                <Label
                  htmlFor={`role-${role.id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {role.name}
                  {role.description && (
                    <span className="text-gray-500 text-xs ml-1">
                      ({role.description})
                    </span>
                  )}
                </Label>
              </div>
            ))}
          </div>
          {state.errors?.roles && (
            <p className="text-sm text-red-500">{state.errors.roles}</p>
          )}
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <span className="mr-2">กำลังบันทึก...</span>
            </>
          ) : (
            "บันทึกการเปลี่ยนแปลง"
          )}
        </Button>
      </form>
    </div>
  );
}
