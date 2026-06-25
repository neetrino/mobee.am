/**
 * One-time codemod: migrate admin routes to requireAdminApiContext.
 * Usage: node scripts/migrate-admin-auth-routes.cjs
 */

const fs = require("node:fs");
const path = require("node:path");

const ADMIN_API_ROOT = path.join(__dirname, "..", "src", "app", "api", "v1", "admin");

function collectRouteFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectRouteFiles(fullPath, files);
      continue;
    }
    if (entry.name === "route.ts") {
      files.push(fullPath);
    }
  }
  return files;
}

function migrateContent(content) {
  let next = content;

  next = next.replace(
    /import\s*\{\s*authenticateToken,\s*requireAdmin\s*\}\s*from\s*["']@\/lib\/middleware\/auth["'];\s*\n/g,
    'import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";\n',
  );

  next = next.replace(
    /const user = await authenticateToken\((\w+)\);\s*\n\s*markAuthComplete\(\);\s*\n\s*if \(!user \|\| !requireAdmin\(user\)\) \{\s*\n\s*return NextResponse\.json\([\s\S]*?\{ status: 403[^}]*\}\s*,?\s*\);\s*\n\s*\}/g,
    "const authResult = await requireAdminApiContext($1);\n      if (authResult instanceof NextResponse) {\n        return authResult;\n      }\n      markAuthComplete(authResult.source);",
  );

  next = next.replace(
    /const user = await authenticateToken\((\w+)\);\s*\n\s*\n\s*if \(!user \|\| !requireAdmin\(user\)\) \{\s*\n[\s\S]*?\{ status: 403[^}]*\}\s*,?\s*\);\s*\n\s*\}/g,
    "const authResult = await requireAdminApiContext($1);\n    if (authResult instanceof NextResponse) {\n      return authResult;\n    }",
  );

  next = next.replace(
    /const user = await authenticateToken\((\w+)\);\s*\n\s*if \(!user \|\| !requireAdmin\(user\)\) \{\s*\n[\s\S]*?\{ status: 403[^}]*\}\s*,?\s*\);\s*\n\s*\}/g,
    "const authResult = await requireAdminApiContext($1);\n    if (authResult instanceof NextResponse) {\n      return authResult;\n    }",
  );

  return next;
}

function main() {
  const files = collectRouteFiles(ADMIN_API_ROOT);
  let changed = 0;

  for (const filePath of files) {
    const original = fs.readFileSync(filePath, "utf8");
    const migrated = migrateContent(original);
    if (migrated !== original) {
      fs.writeFileSync(filePath, migrated, "utf8");
      changed += 1;
      console.log(`updated: ${path.relative(process.cwd(), filePath)}`);
    }
  }

  console.log(`Done. Updated ${changed} files.`);
}

main();
