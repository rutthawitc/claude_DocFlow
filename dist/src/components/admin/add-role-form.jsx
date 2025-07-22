"use strict";
// src/components/admin/add-role-form.tsx
"use client";
// src/components/admin/add-role-form.tsx
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddRoleForm = AddRoleForm;
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const role_actions_1 = require("@/actions/role-actions");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const textarea_1 = require("@/components/ui/textarea");
const checkbox_1 = require("@/components/ui/checkbox");
const label_1 = require("@/components/ui/label");
const alert_1 = require("@/components/ui/alert");
function AddRoleForm({ permissions }) {
    var _a, _b;
    const [selectedPermissionIds, setSelectedPermissionIds] = (0, react_1.useState)([]);
    const initialState = { message: "", errors: {} };
    const [state, formAction] = (0, react_dom_1.useFormState)(role_actions_1.createRole, initialState);
    const handlePermissionChange = (checked, permissionId) => {
        setSelectedPermissionIds((prev) => checked
            ? [...prev, permissionId]
            : prev.filter((id) => id !== permissionId));
    };
    return (<div>
      {state.message && (<alert_1.Alert variant="destructive" className="mb-4">
          <alert_1.AlertDescription>{state.message}</alert_1.AlertDescription>
        </alert_1.Alert>)}

      <form action={formAction} className="space-y-6">
        <div className="space-y-2">
          <label_1.Label htmlFor="name">ชื่อบทบาท</label_1.Label>
          <input_1.Input id="name" name="name" placeholder="ระบุชื่อบทบาท" required/>
          {((_a = state.errors) === null || _a === void 0 ? void 0 : _a.name) && (<p className="text-sm text-red-500">{state.errors.name}</p>)}
        </div>

        <div className="space-y-2">
          <label_1.Label htmlFor="description">คำอธิบาย</label_1.Label>
          <textarea_1.Textarea id="description" name="description" placeholder="อธิบายบทบาทนี้" rows={3}/>
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

        <button_1.Button type="submit">สร้างบทบาท</button_1.Button>
      </form>
    </div>);
}
