"use strict";
// src/lib/csrf.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCsrfToken = generateCsrfToken;
exports.validateCsrfToken = validateCsrfToken;
const crypto_1 = require("crypto");
const headers_1 = require("next/headers");
function generateCsrfToken() {
    const token = (0, crypto_1.randomBytes)(32).toString('hex');
    (0, headers_1.cookies)().set('csrf_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });
    return token;
}
function validateCsrfToken(token) {
    var _a;
    const storedToken = (_a = (0, headers_1.cookies)().get('csrf_token')) === null || _a === void 0 ? void 0 : _a.value;
    if (!storedToken || token !== storedToken) {
        return false;
    }
    return true;
}
