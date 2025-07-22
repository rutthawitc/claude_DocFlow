"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UsersPage;
/* eslint-disable @typescript-eslint/no-unused-vars */
const db_1 = require("@/db");
const link_1 = __importDefault(require("next/link"));
const button_1 = require("@/components/ui/button");
const table_1 = require("@/components/ui/table");
const badge_1 = require("@/components/ui/badge");
async function UsersPage() {
    // Fetch users with their roles
    const users = await db_1.db.query.users.findMany({
        with: {
            userRoles: {
                with: {
                    role: true,
                },
            },
        },
    });
    return (<div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">จัดการผู้ใช้งาน</h1>
        <link_1.default href="/admin/users/add">
          <button_1.Button>เพิ่มผู้ใช้งาน</button_1.Button>
        </link_1.default>
      </div>

      <div className="bg-white rounded-md shadow">
        <table_1.Table>
          <table_1.TableHeader>
            <table_1.TableRow>
              <table_1.TableHead>ชื่อผู้ใช้</table_1.TableHead>
              <table_1.TableHead>ชื่อ-นามสกุล</table_1.TableHead>
              <table_1.TableHead>อีเมล</table_1.TableHead>
              <table_1.TableHead>ตำแหน่ง</table_1.TableHead>
              <table_1.TableHead>บทบาท</table_1.TableHead>
              <table_1.TableHead className="text-right">จัดการ</table_1.TableHead>
            </table_1.TableRow>
          </table_1.TableHeader>
          <table_1.TableBody>
            {users.map((user) => (<table_1.TableRow key={user.id}>
                <table_1.TableCell className="font-medium">{user.username}</table_1.TableCell>
                <table_1.TableCell>
                  {user.firstName} {user.lastName}
                </table_1.TableCell>
                <table_1.TableCell>{user.email}</table_1.TableCell>
                <table_1.TableCell>{user.position}</table_1.TableCell>
                <table_1.TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.userRoles.map((userRole) => (<badge_1.Badge key={userRole.roleId} variant="outline">
                        {userRole.role.name}
                      </badge_1.Badge>))}
                  </div>
                </table_1.TableCell>
                <table_1.TableCell className="text-right">
                  <link_1.default href={`/admin/users/${user.id}`}>
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
