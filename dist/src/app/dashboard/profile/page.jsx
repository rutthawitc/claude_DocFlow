"use strict";
// src/app/dashboard/profile/page.tsx
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProfilePage;
const auth_1 = require("@/auth");
const navigation_1 = require("next/navigation");
const user_profile_1 = require("@/components/user-profile");
async function ProfilePage() {
    const session = await (0, auth_1.auth)();
    if (!session) {
        (0, navigation_1.redirect)("/login");
    }
    return (<div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">ข้อมูลผู้ใช้</h1>

      <user_profile_1.UserProfile />
    </div>);
}
