// Self-hosts the pdfjs worker in public/ so PDF preview doesn't depend on a
// CDN at runtime — matters for a PWA that's expected to work with a flaky
// connection. Re-run automatically via the postinstall script whenever
// pdfjs-dist (a react-pdf dependency) is updated.
import { copyFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const workerPath = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs");
copyFileSync(workerPath, new URL("../public/pdf.worker.min.mjs", import.meta.url));
