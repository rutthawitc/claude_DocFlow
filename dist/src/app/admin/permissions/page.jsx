"use strict";
// src/app/admin/permissions/page.tsx
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PermissionsPage;
const db_1 = require("@/db");
const link_1 = __importDefault(require("next/link"));
const button_1 = require("@/components/ui/button");
const table_1 = require("@/components/ui/table");
async function PermissionsPage() {
    // Fetch all permissions
    const permissions = await db_1.db.query.permissions.findMany({
        orderBy: (permissions) => permissions.name,
    });
    return (<div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">จัดการสิทธิ์</h1>
        <link_1.default href="/admin/permissions/add">
          <button_1.Button>เพิ่มสิทธิ์</button_1.Button>
        </link_1.default>
      </div>

      <div className="bg-white rounded-md shadow">
        <table_1.Table>
          <table_1.TableHeader>
            <table_1.TableRow>
              <table_1.TableHead>ชื่อสิทธิ์</table_1.TableHead>
              <table_1.TableHead>คำอธิบาย</table_1.TableHead>
              <table_1.TableHead className="text-right">จัดการ</table_1.TableHead>
            </table_1.TableRow>
          </table_1.TableHeader>
          <table_1.TableBody>
            {permissions.map((permission) => (<table_1.TableRow key={permission.id}>
                <table_1.TableCell className="font-medium">{permission.name}</table_1.TableCell>
                <table_1.TableCell>{permission.description}</table_1.TableCell>
                <table_1.TableCell className="text-right">
                  <link_1.default href={`/admin/permissions/${permission.id}`}>
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
