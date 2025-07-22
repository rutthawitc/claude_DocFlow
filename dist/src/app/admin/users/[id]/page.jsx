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
exports.default = EditUserPage;
// src/app/admin/users/[id]/page.tsx
const db_1 = require("@/db");
const schema = __importStar(require("@/db/schema"));
const navigation_1 = require("next/navigation");
const drizzle_orm_1 = require("drizzle-orm");
const link_1 = __importDefault(require("next/link"));
const button_1 = require("@/components/ui/button");
const user_role_form_1 = require("@/components/admin/user-role-form");
async function EditUserPage({ params, }) {
    const userId = parseInt(params.id);
    if (isNaN(userId)) {
        (0, navigation_1.notFound)();
    }
    // Fetch user with their roles
    const user = await db_1.db.query.users.findFirst({
        where: (0, drizzle_orm_1.eq)(schema.users.id, userId),
        with: {
            userRoles: {
                with: {
                    role: true,
                },
            },
        },
    });
    if (!user) {
        (0, navigation_1.notFound)();
    }
    // Fetch all roles for the form
    const roles = await db_1.db.query.roles.findMany({
        orderBy: (roles) => roles.name,
    });
    return (<div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          แก้ไขผู้ใช้งาน: {user.firstName} {user.lastName}
        </h1>
        <link_1.default href="/admin/users">
          <button_1.Button variant="outline">กลับ</button_1.Button>
        </link_1.default>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-md shadow p-4">
          <h2 className="font-semibold mb-2">ข้อมูลผู้ใช้งาน</h2>
          <div className="space-y-1 text-sm">
            <p>
              ชื่อผู้ใช้: <span className="font-medium">{user.username}</span>
            </p>
            <p>
              ชื่อ-นามสกุล:{" "}
              <span className="font-medium">
                {user.firstName} {user.lastName}
              </span>
            </p>
            <p>
              อีเมล: <span className="font-medium">{user.email}</span>
            </p>
            <p>
              ตำแหน่ง: <span className="font-medium">{user.position}</span>
            </p>
            <p>
              สังกัด: <span className="font-medium">{user.depName}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md shadow p-6">
        <h2 className="font-semibold mb-4">จัดการบทบาท</h2>
        <user_role_form_1.UserRoleForm user={user} roles={roles} selectedRoles={user.userRoles.map((ur) => ur.roleId)}/>
      </div>
    </div>);
}
