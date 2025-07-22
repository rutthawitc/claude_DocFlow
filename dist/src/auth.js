"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.signOut = exports.signIn = exports.auth = exports.handlers = void 0;
// src/auth.ts
const next_auth_1 = __importDefault(require("next-auth"));
const credentials_1 = __importDefault(require("next-auth/providers/credentials"));
const drizzle_adapter_1 = require("@auth/drizzle-adapter");
const db_1 = require("@/db");
const schema = __importStar(require("@/db/schema"));
const drizzle_orm_1 = require("drizzle-orm");
// Function to get user roles and permissions
async function getUserRolesAndPermissions(userId) {
    // Get user roles
    const userRolesData = await db_1.db.query.userRoles.findMany({
        where: (0, drizzle_orm_1.eq)(schema.userRoles.userId, parseInt(userId)),
        with: {
            role: true
        }
    });
    const roles = userRolesData.map(ur => ur.role.name);
    // If no roles assigned, assign default 'user' role
    if (roles.length === 0) {
        const userRole = await db_1.db.query.roles.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.roles.name, 'user')
        });
        if (userRole) {
            await db_1.db.insert(schema.userRoles).values({
                userId: parseInt(userId),
                roleId: userRole.id
            });
            roles.push('user');
        }
    }
    // Get permissions for all roles
    const permissions = [];
    for (const userRole of userRolesData) {
        const rolePermissionsData = await db_1.db.query.rolePermissions.findMany({
            where: (0, drizzle_orm_1.eq)(schema.rolePermissions.roleId, userRole.roleId),
            with: {
                permission: true
            }
        });
        rolePermissionsData.forEach(rp => {
            if (!permissions.includes(rp.permission.name)) {
                permissions.push(rp.permission.name);
            }
        });
    }
    return { roles, permissions };
}
_a = (0, next_auth_1.default)({
    adapter: (0, drizzle_adapter_1.DrizzleAdapter)(db_1.db, schema),
    session: { strategy: 'jwt' },
    pages: {
        signIn: '/login',
        error: '/error',
    },
    providers: [
        (0, credentials_1.default)({
            name: 'PWA Credentials',
            credentials: {
                username: { label: 'Username', type: 'text' },
                pwd: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials.username || !credentials.password) {
                    return null;
                }
                try {
                    // Call the PWA API
                    const response = await fetch('https://intranet.pwa.co.th/login/webservice_login6.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            username: credentials.username,
                            pwd: credentials.password,
                        }),
                    });
                    const data = await response.json();
                    if (data.status !== 'success') {
                        return null;
                    }
                    // Check if user exists in database
                    let userInDb = await db_1.db.query.users.findFirst({
                        where: (0, drizzle_orm_1.eq)(schema.users.username, data.username.toString())
                    });
                    // If user doesn't exist, create a new user
                    if (!userInDb) {
                        const [newUser] = await db_1.db.insert(schema.users).values({
                            username: data.username.toString(),
                            firstName: data.firstname,
                            lastName: data.lastname,
                            email: data.email,
                            costCenter: data.costcenter,
                            ba: data.ba,
                            part: data.part,
                            area: data.area,
                            jobName: data.job_name,
                            level: data.level,
                            divName: data.div_name,
                            depName: data.dep_name,
                            orgName: data.org_name,
                            position: data.position,
                        }).returning();
                        userInDb = newUser;
                        // Assign default 'user' role to new user
                        const userRole = await db_1.db.query.roles.findFirst({
                            where: (0, drizzle_orm_1.eq)(schema.roles.name, 'user')
                        });
                        if (userRole) {
                            await db_1.db.insert(schema.userRoles).values({
                                userId: userInDb.id,
                                roleId: userRole.id
                            });
                        }
                    }
                    else {
                        // Update existing user with fresh data from PWA API
                        await db_1.db.update(schema.users)
                            .set({
                            firstName: data.firstname,
                            lastName: data.lastname,
                            email: data.email,
                            costCenter: data.costcenter,
                            ba: data.ba,
                            part: data.part,
                            area: data.area,
                            jobName: data.job_name,
                            level: data.level,
                            divName: data.div_name,
                            depName: data.dep_name,
                            orgName: data.org_name,
                            position: data.position,
                            updatedAt: new Date(),
                        })
                            .where((0, drizzle_orm_1.eq)(schema.users.id, userInDb.id));
                    }
                    // Map the API response to user data
                    const user = {
                        id: userInDb.id.toString(),
                        username: data.username.toString(),
                        firstName: data.firstname,
                        lastName: data.lastname,
                        email: data.email,
                        costCenter: data.costcenter,
                        ba: data.ba,
                        part: data.part,
                        area: data.area,
                        jobName: data.job_name,
                        level: data.level,
                        divName: data.div_name,
                        depName: data.dep_name,
                        orgName: data.org_name,
                        position: data.position,
                    };
                    return user;
                }
                catch (error) {
                    console.error('Authentication error:', error);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            // Initial sign in
            if (user) {
                // Include all user fields in the token
                token.username = user.username;
                token.firstName = user.firstName;
                token.lastName = user.lastName;
                token.email = user.email;
                token.costCenter = user.costCenter;
                token.ba = user.ba;
                token.part = user.part;
                token.area = user.area;
                token.jobName = user.jobName;
                token.level = user.level;
                token.divName = user.divName;
                token.depName = user.depName;
                token.orgName = user.orgName;
                token.position = user.position;
                // Get user roles and permissions
                const { roles, permissions } = await getUserRolesAndPermissions(user.id);
                token.roles = roles;
                token.permissions = permissions;
            }
            return token;
        },
        async session({ session, token }) {
            // Add user information to the session
            if (token && session.user) {
                session.user.id = token.sub;
                session.user.username = token.username;
                session.user.firstName = token.firstName;
                session.user.lastName = token.lastName;
                session.user.email = token.email;
                session.user.costCenter = token.costCenter;
                session.user.ba = token.ba;
                session.user.part = token.part;
                session.user.area = token.area;
                session.user.jobName = token.jobName;
                session.user.level = token.level;
                session.user.divName = token.divName;
                session.user.depName = token.depName;
                session.user.orgName = token.orgName;
                session.user.position = token.position;
                session.user.roles = token.roles;
                session.user.permissions = token.permissions;
            }
            return session;
        },
    },
}), exports.handlers = _a.handlers, exports.auth = _a.auth, exports.signIn = _a.signIn, exports.signOut = _a.signOut;
