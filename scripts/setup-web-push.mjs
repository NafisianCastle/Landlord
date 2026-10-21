import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve, basename } from "node:path";
import webpush from "web-push";

const args = process.argv.slice(2);
const subjectIndex = args.indexOf("--subject");
const outputIndex = args.indexOf("--output");
const subject = subjectIndex >= 0 ? args[subjectIndex + 1] : undefined;
const output = resolve(
  outputIndex >= 0 ? args[outputIndex + 1] : ".env.push.local",
);

try {
  if (!subject)
    throw new Error(
      "Usage: npm run setup:push -- --subject mailto:your-contact@example.com [--output .env.push.local]",
    );
  const contact = new URL(subject);
  if (!["mailto:", "https:"].includes(contact.protocol))
    throw new Error(
      "The subject must be a contact mailto: address or HTTPS URL.",
    );
  if (!basename(output).startsWith(".env."))
    throw new Error(
      "Use a .env.* output filename so credentials stay ignored by Git.",
    );
  const keys = webpush.generateVAPIDKeys();
  const content = [
    "# Keep this file private. Import these values into the hosting environment.",
    `VAPID_PUBLIC_KEY=${keys.publicKey}`,
    `VAPID_PRIVATE_KEY=${keys.privateKey}`,
    `VAPID_SUBJECT=${subject}`,
    `CRON_SECRET=${randomBytes(32).toString("hex")}`,
    "",
  ].join("\n");
  await writeFile(output, content, { flag: "wx", mode: 0o600 });
  console.log(`Created ${output}. Credential values were not printed.`);
  console.log(
    "Import the values into the intended hosting environment and redeploy. Keep this key pair stable.",
  );
} catch (error) {
  console.error(
    error.code === "EEXIST"
      ? "That file already exists. Existing push keys were preserved; choose a different output only if you intend to create a new installation."
      : error.message,
  );
  process.exitCode = 1;
}
