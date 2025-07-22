"use strict";
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/admin/page.tsx
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminDashboardPage;
const auth_1 = require("@/auth");
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const button_1 = require("@/components/ui/button");
const card_1 = require("@/components/ui/card");
async function AdminDashboardPage() {
    const session = await (0, auth_1.auth)();
    if (!session || !session.user.roles.includes("admin")) {
        (0, navigation_1.redirect)("/unauthorized");
    }
    return (<div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">หน้าจัดการระบบ</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>จัดการผู้ใช้งาน</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <p className="mb-4">จัดการข้อมูลผู้ใช้งานและสิทธิ์การเข้าถึง</p>
            <link_1.default href="/admin/users">
              <button_1.Button>จัดการผู้ใช้งาน</button_1.Button>
            </link_1.default>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>จัดการบทบาท</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <p className="mb-4">กำหนดบทบาทและสิทธิ์การเข้าถึงระบบ</p>
            <link_1.default href="/admin/roles">
              <button_1.Button>จัดการบทบาท</button_1.Button>
            </link_1.default>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>จัดการสิทธิ์</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <p className="mb-4">กำหนดสิทธิ์การเข้าถึงฟีเจอร์ต่างๆ</p>
            <link_1.default href="/admin/permissions">
              <button_1.Button>จัดการสิทธิ์</button_1.Button>
            </link_1.default>
          </card_1.CardContent>
        </card_1.Card>
      </div>
    </div>);
}
