"use strict";
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginForm = LoginForm;
const react_1 = require("react");
const react_hook_form_1 = require("react-hook-form");
const zod_1 = require("@hookform/resolvers/zod");
const zod_2 = require("zod");
const navigation_1 = require("next/navigation");
const auth_1 = require("@/auth");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const form_1 = require("@/components/ui/form");
const card_1 = require("@/components/ui/card");
const alert_1 = require("@/components/ui/alert");
const lucide_react_1 = require("lucide-react");
const csrf_1 = require("@/lib/csrf");
const loginSchema = zod_2.z.object({
  username: zod_2.z.string().min(1, "กรุณาระบุชื่อผู้ใช้"),
  pwd: zod_2.z.string().min(1, "กรุณาระบุรหัสผ่าน"),
});
function LoginForm() {
  const router = (0, navigation_1.useRouter)();
  const searchParams = (0, navigation_1.useSearchParams)();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [error, setError] = (0, react_1.useState)(null);
  const [isLoading, setIsLoading] = (0, react_1.useState)(false);
  const form = (0, react_hook_form_1.useForm)({
    resolver: (0, zod_1.zodResolver)(loginSchema),
    defaultValues: {
      username: "",
      pwd: "",
    },
  });
  async function onSubmit(data) {
    setIsLoading(true);
    setError(null);
    try {
      const result = await (0, auth_1.signIn)("credentials", {
        username: data.username,
        password: data.pwd,
        csrfToken: (0, csrf_1.generateCsrfToken)(),
        redirect: false,
      });
      if (result === null || result === void 0 ? void 0 : result.error) {
        setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        setIsLoading(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ โปรดลองอีกครั้ง");
      setIsLoading(false);
    }
  }
  return (
    <card_1.Card className="w-full max-w-md mx-auto">
      <card_1.CardHeader>
        <card_1.CardTitle className="text-2xl font-bold text-center">
          เข้าสู่ระบบ
        </card_1.CardTitle>
        <card_1.CardDescription className="text-center">
          {/*           เข้าสู่ระบบด้วยบัญชี PWA ของคุณ */}
        </card_1.CardDescription>
      </card_1.CardHeader>
      <card_1.CardContent>
        <form_1.Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <alert_1.Alert variant="destructive">
                <alert_1.AlertDescription>{error}</alert_1.AlertDescription>
              </alert_1.Alert>
            )}
            <form_1.FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <form_1.FormItem>
                  <form_1.FormLabel>ชื่อผู้ใช้</form_1.FormLabel>
                  <form_1.FormControl>
                    <input_1.Input placeholder="กรอกชื่อผู้ใช้" {...field} />
                  </form_1.FormControl>
                  <form_1.FormMessage />
                </form_1.FormItem>
              )}
            />
            <form_1.FormField
              control={form.control}
              name="pwd"
              render={({ field }) => (
                <form_1.FormItem>
                  <form_1.FormLabel>รหัสผ่าน</form_1.FormLabel>
                  <form_1.FormControl>
                    <input_1.Input
                      type="password"
                      placeholder="กรอกรหัสผ่าน"
                      {...field}
                    />
                  </form_1.FormControl>
                  <form_1.FormMessage />
                </form_1.FormItem>
              )}
            />
            <button_1.Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <lucide_react_1.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                "เข้าสู่ระบบ"
              )}
            </button_1.Button>
          </form>
        </form_1.Form>
      </card_1.CardContent>
    </card_1.Card>
  );
}
