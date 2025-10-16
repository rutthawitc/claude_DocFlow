# TypeScript Scripts Documentation

## Problem

The TypeScript scripts in `scripts/` directory were not working due to permission issues with the system temporary directory.

### Error Message:
```
Error: EACCES: permission denied, mkdir '/var/folders/.../T/tsx-501'
```

### Root Cause:
- The `tsx` runtime needs to create temporary files
- System temp directory `/var/folders/zz/.../T/` is owned by `root` with restrictive permissions (`drwx------`)
- Regular users cannot create subdirectories in this location

## Solution

Created a wrapper script `scripts/run-ts.sh` that:
1. Creates a local `./tmp/tsx` directory
2. Sets `TMPDIR` environment variable to use the local directory
3. Runs `tsx` with the custom temp location

## Available Scripts

### 1. Create Admin User
```bash
pnpm admin:create
```

**What it does:**
- Interactive CLI to create a local admin user
- Initializes DocFlow roles and permissions
- Prompts for username, email, name, and password
- Assigns admin role with full permissions

**Usage Example:**
```bash
$ pnpm admin:create

🔧 DocFlow Local Admin Creation Tool
=====================================

🔄 Initializing DocFlow roles and permissions...
✅ DocFlow roles and permissions initialized

📝 Please provide the local admin details:

Username: admin
Email: admin@example.com
First Name: Admin
Last Name: User
Password: ******
Confirm Password: ******

🔄 Creating local admin user...

✅ Local admin user created successfully!
==========================================
👤 Username: admin
📧 Email: admin@example.com
🏷️  Name: Admin User
🔑 Roles: admin
⚡ Permissions: 20 permissions assigned

🎉 You can now login with these credentials!
```

**Script Location:** `scripts/create-admin.ts`

---

### 2. Initialize DocFlow (TypeScript)
```bash
pnpm docflow:init-ts
```

**What it does:**
- TypeScript version of docflow initialization
- Creates roles, permissions, and branches
- Assigns permissions to roles

**Script Location:** `scripts/init-docflow.ts`

**Note:** The regular `pnpm docflow:init` uses the JavaScript version which is faster.

---

## How the Fix Works

### Wrapper Script: `scripts/run-ts.sh`

```bash
#!/bin/bash

# Create local tmp directory
mkdir -p ./tmp/tsx

# Set TMPDIR to local tmp directory
export TMPDIR="$(pwd)/tmp/tsx"

# Run tsx with the provided script
npx tsx "$@"
```

### Package.json Scripts

```json
{
  "scripts": {
    "admin:create": "./scripts/run-ts.sh scripts/create-admin.ts",
    "docflow:init-ts": "./scripts/run-ts.sh scripts/init-docflow.ts"
  }
}
```

---

## Manual Execution

If you need to run the scripts manually:

### Option 1: Using the wrapper
```bash
./scripts/run-ts.sh scripts/create-admin.ts
```

### Option 2: Direct with custom TMPDIR
```bash
mkdir -p ./tmp/tsx
TMPDIR="$(pwd)/tmp/tsx" npx tsx scripts/create-admin.ts
```

### Option 3: Using pnpm (recommended)
```bash
pnpm admin:create
```

---

## Troubleshooting

### Script not executable
```bash
chmod +x scripts/run-ts.sh
```

### Permission denied
If you still get permission errors:
```bash
# Check temp directory permissions
ls -ld /var/folders/zz/*/T/

# Ensure local tmp exists
mkdir -p ./tmp/tsx
chmod 755 ./tmp/tsx
```

### Module not found errors
Make sure dependencies are installed:
```bash
pnpm install
```

---

## Development Dependencies

The following packages are required for TypeScript scripts:

- **`tsx`** - TypeScript execution engine (fast, no compilation needed)
- **`typescript`** - TypeScript compiler
- **`ts-node`** - Alternative TypeScript executor (legacy)

All are installed as devDependencies:
```bash
pnpm add -D tsx typescript ts-node
```

---

## Why Not Use ts-node?

We switched from `ts-node` to `tsx` because:
- ✅ **tsx is faster** - Uses esbuild for instant execution
- ✅ **tsx is modern** - Better ESM support
- ✅ **tsx is maintained** - Active development
- ❌ **ts-node is slower** - Requires compilation step
- ❌ **ts-node has issues** - With ESM modules in Next.js 15

---

## Adding New TypeScript Scripts

1. **Create script in `scripts/` directory:**
   ```typescript
   #!/usr/bin/env tsx

   // Your script here
   console.log('Hello from TypeScript!');
   ```

2. **Add npm script to package.json:**
   ```json
   {
     "scripts": {
       "my-script": "./scripts/run-ts.sh scripts/my-script.ts"
     }
   }
   ```

3. **Run it:**
   ```bash
   pnpm my-script
   ```

---

## Alternative: Compile to JavaScript

If you don't want to deal with TypeScript at runtime:

1. **Create compiled version:**
   ```bash
   npx tsc scripts/create-admin.ts --outDir scripts/dist --module commonjs
   ```

2. **Use the JS version:**
   ```bash
   node scripts/dist/create-admin.js
   ```

3. **Update package.json:**
   ```json
   {
     "scripts": {
       "admin:create": "node scripts/dist/create-admin.js"
     }
   }
   ```

---

## System Requirements

- **Node.js**: v18+ (v24.5.0 current)
- **pnpm**: v8+ (v10.14.0 current)
- **TypeScript**: v5+ (v5.8.3 current)
- **tsx**: v4+ (v4.20.6 current)

---

## Related Files

- `scripts/create-admin.ts` - Admin user creation script
- `scripts/init-docflow.ts` - DocFlow initialization script
- `scripts/run-ts.sh` - Wrapper script for tsx execution
- `package.json` - npm scripts configuration
- `tsconfig.json` - TypeScript configuration

---

**Last Updated:** 2025-01-16
**Status:** Working ✅
