"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProfileModal;
const auth_1 = require("@/auth");
const navigation_1 = require("next/navigation");
const user_profile_1 = require("@/components/user-profile");
const dialog_1 = require("@/components/ui/dialog");
async function ProfileModal() {
    const session = await (0, auth_1.auth)();
    if (!session) {
        (0, navigation_1.redirect)("/login");
    }
    return (<dialog_1.Dialog open>
      <dialog_1.DialogContent className="sm:max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">ข้อมูลผู้ใช้</h2>
        <user_profile_1.UserProfile />
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
}
