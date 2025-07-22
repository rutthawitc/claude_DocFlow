"use strict";
// src/app/api/user/info/route.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const auth_1 = require("@/auth");
const server_1 = require("next/server");
async function GET() {
    const session = await (0, auth_1.auth)();
    if (!session) {
        return server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Return user info, excluding sensitive data
    return server_1.NextResponse.json({
        id: session.user.id,
        username: session.user.username,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        email: session.user.email,
        position: session.user.position,
        division: session.user.divName,
        department: session.user.depName,
        organization: session.user.orgName,
    });
}
