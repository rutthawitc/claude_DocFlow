"use strict";
// src/components/admin/role-form.tsx
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleForm = RoleForm;
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const navigation_1 = require("next/navigation");
const role_actions_1 = require("@/actions/role-actions");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const textarea_1 = require("@/components/ui/textarea");
const checkbox_1 = require("@/components/ui/checkbox");
const label_1 = require("@/components/ui/label");
const alert_1 = require("@/components/ui/alert");
const dialog_1 = require("@/components/ui/dialog");
function RoleForm({ role, permissions, selectedPermissions, }) {
    var _a, _b;
    const router = (0, navigation_1.useRouter)();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = (0, react_1.useState)(false);
    const [selectedPermissionIds, setSelectedPermissionIds] = (0, react_1.useState)(selectedPermissions);
    const initialState = { message: "", errors: {}, success: false };
    const updateWithId = role_actions_1.updateRole.bind(null, role.id);
    const [state, formAction] = (0, react_dom_1.useFormState)(updateWithId, initialState);
    const handlePermissionChange = (checked, permissionId) => {
        setSelectedPermissionIds((prev) => checked
            ? [...prev, permissionId]
            : prev.filter((id) => id !== permissionId));
    };
    const handleDelete = async () => {
        await (0, role_actions_1.deleteRole)(role.id);
        setIsDeleteDialogOpen(false);
        router.push("/admin/roles");
    };
    return (<div>
      {state.message && (<alert_1.Alert variant={state.success ? "default" : "destructive"} className="mb-4">
          <alert_1.AlertDescription>{state.message}</alert_1.AlertDescription>
        </alert_1.Alert>)}

      <form action={formAction} className="space-y-6">
        <div className="space-y-2">
          <label_1.Label htmlFor="name">ชื่อบทบาท</label_1.Label>
          <input_1.Input id="name" name="name" defaultValue={role.name} required/>
          {((_a = state.errors) === null || _a === void 0 ? void 0 : _a.name) && (<p className="text-sm text-red-500">{state.errors.name}</p>)}
        </div>

        <div className="space-y-2">
          <label_1.Label htmlFor="description">คำอธิบาย</label_1.Label>
          <textarea_1.Textarea id="description" name="description" defaultValue={role.description || ""} rows={3}/>
          {((_b = state.errors) === null || _b === void 0 ? void 0 : _b.description) && (<p className="text-sm text-red-500">{state.errors.description}</p>)}
        </div>

        <div className="space-y-2">
          <label_1.Label>สิทธิ์</label_1.Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border rounded-md p-4">
            {permissions.map((permission) => (<div key={permission.id} className="flex items-center space-x-2">
                <checkbox_1.Checkbox id={`permission-${permission.id}`} name="permissions" value={permission.id} checked={selectedPermissionIds.includes(permission.id)} onCheckedChange={(checked) => handlePermissionChange(checked, permission.id)}/>
                <label_1.Label htmlFor={`permission-${permission.id}`} className="text-sm font-normal cursor-pointer">
                  {permission.name}
                  {permission.description && (<span className="text-gray-500 text-xs ml-1">
                      ({permission.description})
                    </span>)}
                </label_1.Label>
              </div>))}
          </div>
        </div>

        <div className="flex justify-between">
          <dialog_1.Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <dialog_1.DialogTrigger asChild>
              <button_1.Button type="button" variant="destructive">
                ลบบทบาท
              </button_1.Button>
            </dialog_1.DialogTrigger>
            <dialog_1.DialogContent>
              <dialog_1.DialogHeader>
                <dialog_1.DialogTitle>ยืนยันการลบบทบาท</dialog_1.DialogTitle>
                <dialog_1.DialogDescription>
                  คุณต้องการลบบทบาท "{role.name}" ใช่หรือไม่?
                  การกระทำนี้ไม่สามารถย้อนกลับได้
                  และจะทำให้ผู้ใช้งานที่มีบทบาทนี้สูญเสียสิทธิ์การเข้าถึงที่เกี่ยวข้อง
                </dialog_1.DialogDescription>
              </dialog_1.DialogHeader>
              <dialog_1.DialogFooter>
                <button_1.Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                  ยกเลิก
                </button_1.Button>
                <button_1.Button variant="destructive" onClick={handleDelete}>
                  ยืนยันการลบ
                </button_1.Button>
              </dialog_1.DialogFooter>
            </dialog_1.DialogContent>
          </dialog_1.Dialog>

          <button_1.Button type="submit">บันทึกการเปลี่ยนแปลง</button_1.Button>
        </div>
      </form>
    </div>);
}
