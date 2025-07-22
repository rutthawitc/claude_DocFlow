"use strict";
// src/app/admin/roles/add/page.tsx
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AddRolePage;
const db_1 = require("@/db");
const link_1 = __importDefault(require("next/link"));
const button_1 = require("@/components/ui/button");
const add_role_form_1 = require("@/components/admin/add-role-form");
async function AddRolePage() {
    // Fetch all permissions
    const permissions = await db_1.db.query.permissions.findMany({
        orderBy: (permissions) => permissions.name,
    });
    return (<div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">เพิ่มบทบาทใหม่</h1>
        <link_1.default href="/admin/roles">
          <button_1.Button variant="outline">กลับ</button_1.Button>
        </link_1.default>
      </div>

      <div className="bg-white rounded-md shadow p-6">
        <add_role_form_1.AddRoleForm permissions={permissions}/>
      </div>
    </div>);
}
