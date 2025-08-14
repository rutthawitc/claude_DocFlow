"use strict";
// src/components/auth/login-form-server.tsx
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginFormServer = LoginFormServer;
const react_dom_1 = require("react-dom");
const react_dom_2 = require("react-dom");
const auth_1 = require("@/actions/auth");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const label_1 = require("@/components/ui/label");
const alert_1 = require("@/components/ui/alert");
const card_1 = require("@/components/ui/card");
const lucide_react_1 = require("lucide-react");
function SubmitButton() {
  const { pending } = (0, react_dom_2.useFormStatus)();
  return (
    <button_1.Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <lucide_react_1.Loader2 className="mr-2 h-4 w-4 animate-spin" />
          กำลังเข้าสู่ระบบ...
        </>
      ) : (
        "เข้าสู่ระบบ"
      )}
    </button_1.Button>
  );
}
function LoginFormServer() {
  var _a, _b;
  const [state, formAction] = (0, react_dom_1.useFormState)(
    auth_1.loginAction,
    {
      errors: {},
      message: "",
    }
  );
  return (
    <card_1.Card className="w-full max-w-md mx-auto">
      <card_1.CardHeader>
        <card_1.CardTitle className="text-2xl font-bold text-center">
          เข้าสู่ระบบ
        </card_1.CardTitle>
        <card_1.CardDescription className="text-center">
          เข้าสู่ระบบด้วยบัญชี PWA Intranet
        </card_1.CardDescription>
      </card_1.CardHeader>
      <card_1.CardContent>
        <form action={formAction} className="space-y-4">
          {state.message && (
            <alert_1.Alert variant="destructive">
              <alert_1.AlertDescription>
                {state.message}
              </alert_1.AlertDescription>
            </alert_1.Alert>
          )}

          <div className="space-y-2">
            <label_1.Label htmlFor="username">ชื่อผู้ใช้</label_1.Label>
            <input_1.Input
              id="username"
              name="username"
              placeholder="กรอกชื่อผู้ใช้"
              required
            />
            {((_a = state.errors) === null || _a === void 0
              ? void 0
              : _a.username) && (
              <p className="text-sm text-red-500">{state.errors.username}</p>
            )}
          </div>

          <div className="space-y-2">
            <label_1.Label htmlFor="pwd">รหัสผ่าน</label_1.Label>
            <input_1.Input
              id="pwd"
              name="pwd"
              type="password"
              placeholder="กรอกรหัสผ่าน"
              required
            />
            {((_b = state.errors) === null || _b === void 0
              ? void 0
              : _b.pwd) && (
              <p className="text-sm text-red-500">{state.errors.pwd}</p>
            )}
          </div>

          <SubmitButton />
        </form>
      </card_1.CardContent>
    </card_1.Card>
  );
}
