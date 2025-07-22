"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EditRolePage;
// src/app/admin/roles/[id]/page.tsx
const db_1 = require("@/db");
const schema = __importStar(require("@/db/schema"));
const navigation_1 = require("next/navigation");
const drizzle_orm_1 = require("drizzle-orm");
const link_1 = __importDefault(require("next/link"));
const button_1 = require("@/components/ui/button");
const role_form_1 = require("@/components/admin/role-form");
async function EditRolePage({ params, }) {
    const roleId = parseInt(params.id);
    if (isNaN(roleId)) {
        (0, navigation_1.notFound)();
    }
    // Fetch role with its permissions
    const role = await db_1.db.query.roles.findFirst({
        where: (0, drizzle_orm_1.eq)(schema.roles.id, roleId),
        with: {
            rolePermissions: {
                with: {
                    permission: true,
                },
            },
        },
    });
    if (!role) {
        (0, navigation_1.notFound)();
    }
    // Fetch all permissions for the form
    const permissions = await db_1.db.query.permissions.findMany({
        orderBy: (permissions) => permissions.name,
    });
    return (<div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">แก้ไขบทบาท: {role.name}</h1>
        <link_1.default href="/admin/roles">
          <button_1.Button variant="outline">กลับ</button_1.Button>
        </link_1.default>
      </div>

      <div className="bg-white rounded-md shadow p-6">
        <role_form_1.RoleForm role={role} permissions={permissions} selectedPermissions={role.rolePermissions.map((rp) => rp.permissionId)}/>
      </div>
    </div>);
}
