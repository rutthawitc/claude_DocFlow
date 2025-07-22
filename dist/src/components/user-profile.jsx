"use strict";
// src/components/user-profile.tsx
"use client";
// src/components/user-profile.tsx
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserProfile = UserProfile;
const react_1 = require("next-auth/react");
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const badge_1 = require("@/components/ui/badge");
const auth_1 = require("@/auth");
function UserProfile() {
    const { data: session } = (0, react_1.useSession)();
    if (!session) {
        return null;
    }
    return (<card_1.Card className="w-full max-w-3xl mx-auto">
      <card_1.CardHeader>
        <card_1.CardTitle className="text-2xl font-bold">ข้อมูลผู้ใช้</card_1.CardTitle>
      </card_1.CardHeader>
      <card_1.CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold">ชื่อ-นามสกุล</h3>
            <p>
              {session.user.firstName} {session.user.lastName}
            </p>
          </div>
          <div>
            <h3 className="font-semibold">อีเมล</h3>
            <p>{session.user.email}</p>
          </div>
          <div>
            <h3 className="font-semibold">ตำแหน่ง</h3>
            <p>{session.user.position}</p>
          </div>
          <div>
            <h3 className="font-semibold">หน่วยงาน</h3>
            <p>{session.user.divName}</p>
          </div>
          <div>
            <h3 className="font-semibold">สังกัด</h3>
            <p>{session.user.depName}</p>
          </div>
          <div>
            <h3 className="font-semibold">สายงาน</h3>
            <p>{session.user.orgName}</p>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">บทบาท</h3>
          <div className="flex flex-wrap gap-2">
            {session.user.roles.map((role) => (<badge_1.Badge key={role} variant="secondary">
                {role}
              </badge_1.Badge>))}
          </div>
        </div>

        <div className="pt-4">
          <button_1.Button variant="destructive" onClick={() => (0, auth_1.signOut)({ callbackUrl: "/" })}>
            ออกจากระบบ
          </button_1.Button>
        </div>
      </card_1.CardContent>
    </card_1.Card>);
}
