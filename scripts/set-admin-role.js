import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "service-account.json"), "utf-8")
);

initializeApp({
  credential: cert(serviceAccount),
});

async function main() {
  const uid = process.argv[2];

  if (!uid) {
    console.error("Usage: node scripts/set-admin-role.js <USER_UID>");
    process.exit(1);
  }

  await getAuth().setCustomUserClaims(uid, { role: "admin" });
  console.log(`Admin role set for UID: ${uid}`);
}

main().catch((error) => {
  console.error("Failed to set admin role:", error);
  process.exit(1);
});

