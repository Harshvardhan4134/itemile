import fs from "fs";
import path from "path";

const root = "src";
const branding = [
  [/Lendlly/g, "Itemile"],
  [/RentShare/g, "Itemile"],
  [/Rent Share/g, "Itemile"],
  [/support@lendlly\.in/g, "support@itemile.com"],
  [/https:\/\/lendlly\.in/g, "https://itemile.com"],
  [/https:\/\/lendlly\.vercel\.app\/?/g, "https://itemile.com"],
  [/lendlly_selected_city/g, "itemile_selected_city"],
  [/rent-share\//g, "itemile/"],
  [/\+91 85476 52100/g, ""],
  [/tel:\+918547652100/g, "mailto:support@itemile.com"],
];

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (/\.(tsx?|jsx?)$/.test(ent.name)) files.push(p);
  }
  return files;
}

const skip = new Set([
  "src/lib/constants.ts",
  "src/lib/format.ts",
  "src/lib/verificationPolicy.ts",
]);

for (const file of walk(root)) {
  const norm = file.replace(/\\/g, "/");
  if (skip.has(norm)) continue;

  let text = fs.readFileSync(file, "utf8");
  const orig = text;

  for (const [re, rep] of branding) text = text.replace(re, rep);

  if (text.includes("₹")) {
    text = text.replace(/₹\{([^}]+)\}/g, "{formatCurrency($1)}");
    text = text.replace(/₹\$\{([^}]+)\}/g, "${formatCurrency($1)}");
    text = text.replace(/₹(\d[\d,]*)/g, (_, n) => {
      const num = Number(n.replace(/,/g, ""));
      return `$${num.toLocaleString("en-US")}`;
    });
    text = text.replace(/\(₹\/day\)/g, "(USD/day)");
    text = text.replace(/\(₹\/day\)/g, "(USD/day)");

    if (text !== orig && !text.includes("formatCurrency")) {
      const needsImport =
        text.includes("formatCurrency(") || text.includes("{formatCurrency");
      if (needsImport && !text.includes("@/lib/format")) {
        const importLine = "import { formatCurrency } from \"@/lib/format\";\n";
        const m = text.match(/^import .+;\r?\n/m);
        if (m) {
          const idx = text.indexOf(m[0]) + m[0].length;
          text = text.slice(0, idx) + importLine + text.slice(idx);
        } else {
          text = importLine + text;
        }
      }
    } else if (
      text !== orig &&
      (text.includes("formatCurrency(") || text.includes("{formatCurrency")) &&
      !text.includes("@/lib/format")
    ) {
      const importLine = "import { formatCurrency } from \"@/lib/format\";\n";
      const m = text.match(/^import .+;\r?\n/m);
      if (m) {
        const idx = text.indexOf(m[0]) + m[0].length;
        text = text.slice(0, idx) + importLine + text.slice(idx);
      }
    }
  }

  if (text !== orig) {
    fs.writeFileSync(file, text);
    console.log("updated", norm);
  }
}
