"use strict";
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/admin/roles/page.tsx
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RolesPage;
const db_1 = require("@/db");
const link_1 = __importDefault(require("next/link"));
const button_1 = require("@/components/ui/button");
const table_1 = require("@/components/ui/table");
const badge_1 = require("@/components/ui/badge");
async function RolesPage() {
    // Fetch roles with their permissions
    const roles = await db_1.db.query.roles.findMany({
        with: {
            rolePermissions: {
                with: {
                    permission: true,
                },
            },
        },
    });
    return (<div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">จัดการบทบาท</h1>
        <link_1.default href="/admin/roles/add">
          <button_1.Button>เพิ่มบทบาท</button_1.Button>
        </link_1.default>
      </div>

      <div className="bg-white rounded-md shadow">
        <table_1.Table>
          <table_1.TableHeader>
            <table_1.TableRow>
              <table_1.TableHead>ชื่อบทบาท</table_1.TableHead>
              <table_1.TableHead>คำอธิบาย</table_1.TableHead>
              <table_1.TableHead>สิทธิ์</table_1.TableHead>
              <table_1.TableHead className="text-right">จัดการ</table_1.TableHead>
            </table_1.TableRow>
          </table_1.TableHeader>
          <table_1.TableBody>
            {roles.map((role) => (<table_1.TableRow key={role.id}>
                <table_1.TableCell className="font-medium">{role.name}</table_1.TableCell>
                <table_1.TableCell>{role.description}</table_1.TableCell>
                <table_1.TableCell>
                  <div className="flex flex-wrap gap-1">
                    {role.rolePermissions.map((rolePermission) => (<badge_1.Badge key={rolePermission.permissionId} variant="outline">
                        {rolePermission.permission.name}
                      </badge_1.Badge>))}
                  </div>
                </table_1.TableCell>
                <table_1.TableCell className="text-right">
                  <link_1.default href={`/admin/roles/${role.id}`}>
                    <button_1.Button variant="ghost" size="sm">
                      แก้ไข
                    </button_1.Button>
                  </link_1.default>
                </table_1.TableCell>
              </table_1.TableRow>))}
          </table_1.TableBody>
        </table_1.Table>
      </div>
    </div>);
}
