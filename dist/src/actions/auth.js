"use strict";
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/actions/auth.ts
'use server';
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginAction = loginAction;
const auth_1 = require("@/auth");
const navigation_1 = require("next/navigation");
const zod_1 = require("zod");
const csrf_1 = require("@/lib/csrf");
const loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, 'กรุณาระบุชื่อผู้ใช้'),
    pwd: zod_1.z.string().min(1, 'กรุณาระบุรหัสผ่าน'),
});
async function loginAction(prevState, formData) {
    // Validate CSRF token
    const csrfToken = formData.get('csrf_token');
    if (!(0, csrf_1.validateCsrfToken)(csrfToken)) {
        return {
            message: 'การตรวจสอบความปลอดภัยล้มเหลว โปรดลองใหม่อีกครั้ง',
        };
    }
    // Validate input
    const validatedFields = loginSchema.safeParse({
        username: formData.get('username'),
        pwd: formData.get('pwd'),
    });
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'ข้อมูลไม่ถูกต้อง',
        };
    }
    try {
        // Try to sign in
        const result = await (0, auth_1.signIn)('credentials', {
            username: validatedFields.data.username,
            pwd: validatedFields.data.pwd,
            redirect: false,
        });
        if (result === null || result === void 0 ? void 0 : result.error) {
            return {
                message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
            };
        }
        // Redirect to dashboard on success
        (0, navigation_1.redirect)('/dashboard');
    }
    catch (error) {
        return {
            message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
        };
    }
}
