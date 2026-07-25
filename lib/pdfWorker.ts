import { pdfjs } from "react-pdf";

// Self-hosted (see scripts/copy-pdf-worker.mjs) so preview works without a
// CDN dependency.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
