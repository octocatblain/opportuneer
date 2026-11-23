/**
 * Turns a job description into readable blocks. Descriptions arrive in two shapes: proper text with line breaks (new scans
 * keep the page's paragraphs and bullets) and older or pasted text that is one flat run ("EngineerPosition Type: Full-Time...
 * RoleWe are hiring... • Build ... • Develop ..."). Both are split into facts, headings, paragraphs and bullet lists.
 */
export type Block = { type: "facts"; items: [string, string][] } | { type: "heading"; text: string } | { type: "p"; text: string } | { type: "list"; items: string[] };

const HEADINGS = [
  "About the Role", "About the Company", "About the Team", "About Us", "About You", "About the Job", "The Role", "Role Overview", "Job Overview", "Overview", "Job Summary", "Summary",
  "What You'll Own", "What You\u2019ll Own", "What You'll Do", "What You\u2019ll Do", "What You Will Do", "What You Will Own", "Key Responsibilities", "Responsibilities", "Duties",
  "Requirements", "Key Requirements", "Minimum Requirements", "Qualifications", "Preferred Qualifications", "Minimum Qualifications", "Required Skills", "Skills", "Nice to Have", "Nice-to-Have", "Bonus Points",
  "What We Offer", "What We're Looking For", "What We\u2019re Looking For", "Who You Are", "Who We Are", "Benefits", "Perks", "Compensation", "Why Join Us", "How to Apply", "Application Process", "Tech Stack", "Technologies",
];
const LABELS = ["Position Type", "Job Type", "Employment Type", "Working Hours", "Hours", "Location", "Salary", "Compensation", "Contract Length", "Start Date", "Department", "Experience", "Duration", "Industry", "Reports To"];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const HEAD_RE = new RegExp(`(?<=[a-z0-9.)!?:\\s])(${HEADINGS.map(esc).join("|")})(?=[A-Z:\\s\u2022]|$)`, "g");
const LABEL_RE = new RegExp(`(?<=[a-z0-9.)!?\\s])(${LABELS.map(esc).join("|")})\\s*:`, "g");
const LABEL_LINE = new RegExp(`^(${LABELS.map(esc).join("|")})\\s*:\\s*(.+)$`);

const isHeadingLine = (l: string) => HEADINGS.some((h) => l.replace(/:$/, "").toLowerCase() === h.toLowerCase());

export function parseDescription(raw: string, title?: string | null): Block[] {
  let t = raw.replace(/\r/g, "").replace(/\u00a0/g, " ");
  // Glued sentences: "...production.The ideal" -> "...production. The ideal"
  t = t.replace(/([a-z0-9)])\.([A-Z][a-z])/g, "$1. $2");
  // Bullets, whether "• item" on its own line or inline "• a • b • c"
  t = t.replace(/\s*[\u2022\u25aa\u25cf\u25e6\u00b7]\s+/g, "\n• ").replace(/\n[-*]\s+/g, "\n• ");
  // Labels (Position Type: ...) and known section headings, even when glued to the previous word
  t = t.replace(LABEL_RE, "\n$1:");
  t = t.replace(HEAD_RE, "\n§ $1\n");
  const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);

  const blocks: Block[] = [];
  let facts: [string, string][] = [];
  let list: string[] = [];
  const flushList = () => {
    if (list.length) blocks.push({ type: "list", items: list });
    list = [];
  };
  const flushFacts = () => {
    if (facts.length) blocks.push({ type: "facts", items: facts });
    facts = [];
  };

  lines.forEach((line, idx) => {
    const labelMatch = line.match(LABEL_LINE);
    if (line.startsWith("§ ")) {
      flushList();
      flushFacts();
      blocks.push({ type: "heading", text: line.slice(2).replace(/:$/, "") });
    } else if (line.startsWith("• ")) {
      flushFacts();
      list.push(line.slice(2));
    } else if (labelMatch && blocks.every((b) => b.type === "facts") && line.length < 160) {
      flushList();
      facts.push([labelMatch[1], labelMatch[2]]);
    } else if (isHeadingLine(line)) {
      flushList();
      flushFacts();
      blocks.push({ type: "heading", text: line.replace(/:$/, "") });
    } else {
      // A short first line that repeats the job title adds nothing: the page already shows it.
      if (idx === 0 && title && line.length < 100 && (title.toLowerCase().includes(line.toLowerCase()) || line.toLowerCase().includes(title.toLowerCase()))) return;
      flushList();
      flushFacts();
      // Long paragraphs are cut into groups of about three sentences
      const sentences = line.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g)?.map((x) => x.trim()).filter(Boolean) ?? [line];
      if (line.length <= 450 || sentences.length < 4) blocks.push({ type: "p", text: line });
      else for (let i = 0; i < sentences.length; i += 3) blocks.push({ type: "p", text: sentences.slice(i, i + 3).join(" ") });
    }
  });
  flushList();
  flushFacts();
  return blocks;
}
