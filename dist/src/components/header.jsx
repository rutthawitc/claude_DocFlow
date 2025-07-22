"use strict";
// src/components/header.tsx
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Header = Header;
const link_1 = __importDefault(require("next/link"));
const auth_1 = require("@/auth");
const button_1 = require("@/components/ui/button");
async function Header() {
    const session = await (0, auth_1.auth)();
    // Check if user has admin role
    const isAdmin = session === null || session === void 0 ? void 0 : session.user.roles.includes("admin");
    return (<header className="bg-white shadow">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <link_1.default href="/" className="text-xl font-bold">
          PWA Auth System
        </link_1.default>

        <nav className="flex gap-4 items-center">
          <link_1.default href="/" className="hover:underline">
            หน้าหลัก
          </link_1.default>

          {session ? (<>
              <link_1.default href="/dashboard" className="hover:underline">
                แดชบอร์ด
              </link_1.default>

              {isAdmin && (<link_1.default href="/admin" className="hover:underline text-indigo-600">
                  จัดการระบบ
                </link_1.default>)}

              <form action={async () => {
                "use server";
                await (0, auth_1.signOut)({ redirectTo: "/" });
            }}>
                <button_1.Button type="submit" variant="outline" size="sm">
                  ออกจากระบบ
                </button_1.Button>
              </form>
            </>) : (<link_1.default href="/login">
              <button_1.Button size="sm">เข้าสู่ระบบ</button_1.Button>
            </link_1.default>)}
        </nav>
      </div>
    </header>);
}
