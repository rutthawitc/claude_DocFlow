"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const link_1 = __importDefault(require("next/link"));
const button_1 = require("@/components/ui/button");
const auth_1 = require("@/auth");
async function Home() {
    const session = await (0, auth_1.auth)();
    return (<div className="flex flex-col min-h-[calc(100vh-64px)] items-center justify-center bg-gray-50 py-12 px-4">
      <div className="text-center space-y-6 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          ระบบยืนยันตัวตนผู้ใช้งานการประปาส่วนภูมิภาค
        </h1>
        <p className="text-xl text-gray-600">
          ระบบสมัยใหม่ที่พัฒนาด้วย Next.js 15 และ Auth.js
          เพื่อการจัดการผู้ใช้งานอย่างมีประสิทธิภาพ
        </p>
        <div className="flex justify-center gap-4">
          {session ? (<link_1.default href="/dashboard">
              <button_1.Button size="lg">ไปที่แดชบอร์ด</button_1.Button>
            </link_1.default>) : (<link_1.default href="/login">
              <button_1.Button size="lg">เข้าสู่ระบบ</button_1.Button>
            </link_1.default>)}
        </div>
      </div>
    </div>);
}
