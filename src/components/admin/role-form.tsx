// src/components/admin/role-form.tsx
"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { updateRole, deleteRole } from "@/actions/role-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Permission = {
  id: number;
  name: string;
  description: string | null;
};

type Role = {
  id: number;
  name: string;
  description: string | null;
};

type RoleFormProps = {
  role: Role;
  permissions: Permission[];
  selectedPermissions: number[];
};

export function RoleForm({
  role,
  permissions,
  selectedPermissions,
}: RoleFormProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPermissionIds, setSelectedPermissionIds] =
    useState<number[]>(selectedPermissions);

  const initialState = { message: "", errors: {}, success: false } as const;
  const updateWithId = updateRole.bind(null, role.id);
  const [state, formAction, isPending] = useActionState(updateWithId, initialState);

  const handlePermissionChange = (checked: boolean, permissionId: number) => {
    setSelectedPermissionIds((prev) =>
      checked
        ? [...prev, permissionId]
        : prev.filter((id) => id !== permissionId)
    );
  };

  const handleDelete = async () => {
    await deleteRole(role.id);
    setIsDeleteDialogOpen(false);
    router.push("/admin/roles");
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
        <div className="space-y-2">
          <Label htmlFor="name">ชื่อบทบาท</Label>
          <Input id="name" name="name" defaultValue={role.name} required />
          {state.errors?.name && (
            <p className="text-sm text-red-500">{state.errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">คำอธิบาย</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={role.description || ""}
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

        <div className="flex justify-between">
          <Dialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <DialogTrigger asChild>
              <Button type="button" variant="destructive">
                ลบบทบาท
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ยืนยันการลบบทบาท</DialogTitle>
                <DialogDescription>
                  คุณต้องการลบบทบาท &quot;{role.name}&quot; ใช่หรือไม่?
                  การกระทำนี้ไม่สามารถย้อนกลับได้
                  และจะทำให้ผู้ใช้งานที่มีบทบาทนี้สูญเสียสิทธิ์การเข้าถึงที่เกี่ยวข้อง
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  ยืนยันการลบ
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <span className="mr-2">กำลังบันทึก...</span>
            </>
          ) : (
            "บันทึกการเปลี่ยนแปลง"
          )}
        </Button>
        </div>
      </form>
    </div>
  );
}
