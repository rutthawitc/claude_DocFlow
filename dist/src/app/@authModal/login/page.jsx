"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoginModal;
const login_form_server_1 = require("@/components/auth/login-form-server");
const dialog_1 = require("@/components/ui/dialog");
const auth_1 = require("@/auth");
const navigation_1 = require("next/navigation");
async function LoginModal() {
    const session = await (0, auth_1.auth)();
    // If already authenticated, redirect to dashboard
    if (session) {
        (0, navigation_1.redirect)("/dashboard");
    }
    return (<dialog_1.Dialog open>
      <dialog_1.DialogContent className="sm:max-w-md">
        <login_form_server_1.LoginFormServer />
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
}
