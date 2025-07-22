"use strict";
// src/app/unauthorized/page.tsx
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UnauthorizedPage;
const link_1 = __importDefault(require("next/link"));
const button_1 = require("@/components/ui/button");
function UnauthorizedPage() {
    return (<div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-50 py-12 px-4">
      <div className="text-center space-y-6 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-red-600">
          ไม่มีสิทธิ์เข้าถึง
        </h1>
        <p className="text-xl text-gray-600">
          คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้
          โปรดติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เพิ่มเติม
        </p>
        <div className="flex justify-center gap-4">
          <link_1.default href="/dashboard">
            <button_1.Button variant="outline">กลับไปยังแดชบอร์ด</button_1.Button>
          </link_1.default>
          <link_1.default href="/">
            <button_1.Button>กลับไปยังหน้าหลัก</button_1.Button>
          </link_1.default>
        </div>
      </div>
    </div>);
}
