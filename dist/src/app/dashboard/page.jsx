"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardPage;
const react_1 = require("react");
const role_guard_1 = __importDefault(require("@/components/auth/role-guard"));
const user_profile_1 = require("@/components/user-profile");
const card_1 = require("@/components/ui/card");
const skeleton_1 = require("@/components/ui/skeleton");
function DashboardPage() {
    return (<role_guard_1.default requiredPermissions={["dashboard:access"]} fallbackPath="/unauthorized">
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-center">แดชบอร์ด</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>ข้อมูลส่วนตัว</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <react_1.Suspense fallback={<skeleton_1.Skeleton className="h-20 w-full"/>}>
                <user_profile_1.UserProfile />
              </react_1.Suspense>
            </card_1.CardContent>
          </card_1.Card>

          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>สถานะการใช้งาน</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="space-y-2">
                <div className="font-semibold">
                  สถานะ: <span className="text-green-600">ออนไลน์</span>
                </div>
                <div className="font-semibold">
                  เข้าสู่ระบบล่าสุด:{" "}
                  <span>{new Date().toLocaleString("th-TH")}</span>
                </div>
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </div>
      </div>
    </role_guard_1.default>);
}
