"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardLayout;
// src/app/dashboard/layout.tsx
const auth_1 = require("@/auth");
const navigation_1 = require("next/navigation");
async function DashboardLayout({ children, modal, }) {
    const session = await (0, auth_1.auth)();
    if (!session) {
        (0, navigation_1.redirect)("/login");
    }
    return (<div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        {children}
        {modal}
      </div>
    </div>);
}
