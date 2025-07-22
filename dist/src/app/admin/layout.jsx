"use strict";
// src/app/admin/layout.tsx
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminLayout;
const auth_1 = require("@/auth");
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const button_1 = require("@/components/ui/button");
async function AdminLayout({ children, }) {
    const session = await (0, auth_1.auth)();
    if (!session || !session.user.roles.includes("admin")) {
        (0, navigation_1.redirect)("/unauthorized");
    }
    return (<div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="container mx-auto">
          <div className="flex items-center space-x-4 py-4">
            <link_1.default href="/admin" className="font-semibold text-lg">
              Admin Dashboard
            </link_1.default>
            <div className="ml-auto flex space-x-2">
              <link_1.default href="/admin/users">
                <button_1.Button variant="ghost" size="sm">
                  ผู้ใช้งาน
                </button_1.Button>
              </link_1.default>
              <link_1.default href="/admin/roles">
                <button_1.Button variant="ghost" size="sm">
                  บทบาท
                </button_1.Button>
              </link_1.default>
              <link_1.default href="/admin/permissions">
                <button_1.Button variant="ghost" size="sm">
                  สิทธิ์
                </button_1.Button>
              </link_1.default>
              <link_1.default href="/dashboard">
                <button_1.Button variant="ghost" size="sm">
                  กลับสู่แดชบอร์ด
                </button_1.Button>
              </link_1.default>
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto py-8">{children}</div>
    </div>);
}
