"use strict";
// src/components/admin/user-role-form.tsx
"use client";
// src/components/admin/user-role-form.tsx
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRoleForm = UserRoleForm;
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const role_actions_1 = require("@/actions/role-actions");
const button_1 = require("@/components/ui/button");
const checkbox_1 = require("@/components/ui/checkbox");
const label_1 = require("@/components/ui/label");
const alert_1 = require("@/components/ui/alert");
function UserRoleForm({ user, roles, selectedRoles, }) {
    var _a;
    const [selectedRoleIds, setSelectedRoleIds] = (0, react_1.useState)(selectedRoles);
    const initialState = { message: "", errors: {}, success: false };
    const [state, formAction] = (0, react_dom_1.useFormState)(role_actions_1.updateUserRoles, initialState);
    const handleRoleChange = (checked, roleId) => {
        setSelectedRoleIds((prev) => checked ? [...prev, roleId] : prev.filter((id) => id !== roleId));
    };
    return (<div>
      {state.message && (<alert_1.Alert variant={state.success ? "default" : "destructive"} className="mb-4">
          <alert_1.AlertDescription>{state.message}</alert_1.AlertDescription>
        </alert_1.Alert>)}

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="userId" value={user.id}/>

        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border rounded-md p-4">
            {roles.map((role) => (<div key={role.id} className="flex items-center space-x-2">
                <checkbox_1.Checkbox id={`role-${role.id}`} name="roles" value={role.id} checked={selectedRoleIds.includes(role.id)} onCheckedChange={(checked) => handleRoleChange(checked, role.id)}/>
                <label_1.Label htmlFor={`role-${role.id}`} className="text-sm font-normal cursor-pointer">
                  {role.name}
                  {role.description && (<span className="text-gray-500 text-xs ml-1">
                      ({role.description})
                    </span>)}
                </label_1.Label>
              </div>))}
          </div>
          {((_a = state.errors) === null || _a === void 0 ? void 0 : _a.roles) && (<p className="text-sm text-red-500">{state.errors.roles}</p>)}
        </div>

        <button_1.Button type="submit">บันทึกการเปลี่ยนแปลง</button_1.Button>
      </form>
    </div>);
}
