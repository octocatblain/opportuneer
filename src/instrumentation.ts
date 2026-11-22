// Runs once when the Next.js server starts (`npm run dev` / `npm start`).
// The Node-only code lives in a separate file and is imported only in the Node
// runtime, so webpack doesn't try to bundle puppeteer for the edge runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
