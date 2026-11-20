/**
 * Everything Opportuneer knows about Blain's targets and Red Star Standard's offer.
 * Edit this file to change what the app searches for, how it scores, and what it pitches.
 */

export const profile = {
  name: "Blain Muema",
  email: "blainmuema@gmail.com",
  phone: "+254 11 360-4268",
  location: "Nairobi, Kenya",
  links: {
    github: "github.com/octocatblain",
    linkedin: "linkedin.com/in/blain-muema",
    blog: "blainmuema.hashnode.dev",
    portfolio: "blainmuema.vercel.app",
  },
  noticePeriod: "1 month",
  /** Path to the master CV (HTML) that tailored CVs are built from. */
  cvHtmlPath: "C:/home/personal/cv/source/blain-muema-cv.html",
  /** Where generated PDFs are copied for safekeeping (besides ./storage). */
  coverLetterArchiveDir: "C:/home/personal/cover-letters",
};

/** Exchange rate used to compare salaries. Update when it drifts. */
export const KES_PER_USD = 129;

export const payFloors = {
  /** Local (Kenya) roles: about USD 2,000 a month. */
  localMonthlyUsd: 2000,
  /** Remote / international roles. */
  remoteMonthlyUsd: 2500,
  /** Show jobs within this fraction below the floor as "below target" instead of hiding them. */
  belowTargetTolerance: 0.3,
};

export const locations = {
  accepted: ["nairobi", "kenya", "mombasa", "kisumu", "nakuru", "eldoret", "thika", "machakos", "kiambu"],
  /** Abroad is accepted only when the post offers visa sponsorship or relocation. */
  abroadNeedsSponsorship: true,
  excludedRegions: ["uganda", "tanzania", "rwanda", "ethiopia", "burundi", "south sudan"],
};

export type TitleFamily = {
  key: string;
  label: string;
  keywords: string[]; // matched against job titles (lowercase)
  weight: number; // how strongly this family fits Blain (0-1)
};

export const titleFamilies: TitleFamily[] = [
  {
    key: "ai-automation",
    label: "AI / Automation Engineer",
    keywords: ["ai engineer", "automation engineer", "ai solutions", "ai integration", "machine learning engineer", "llm", "genai", "generative ai", "process automation", "rpa", "applied ai"],
    weight: 1,
  },
  {
    key: "transformation-lead",
    label: "Digital Transformation / AI Lead",
    keywords: ["digital transformation", "ai lead", "head of ai", "ai adoption", "innovation lead", "head of digital", "technology consultant", "ai consultant", "fractional cto", "head of technology", "it manager"],
    weight: 1,
  },
  {
    key: "fullstack",
    label: "Senior / Full-Stack Software Engineer",
    keywords: ["full stack", "full-stack", "fullstack", "software engineer", "software developer", "web developer", "backend engineer", "frontend engineer", "next.js", "react developer", "laravel", "node.js", "technical lead", "tech lead", "lead developer"],
    weight: 0.85,
  },
  {
    key: "solutions-systems",
    label: "Solutions / Systems Engineer",
    keywords: ["solutions engineer", "solutions architect", "systems engineer", "systems developer", "integration engineer", "erp developer", "systems analyst", "implementation engineer"],
    weight: 0.85,
  },
  {
    key: "platform",
    label: "Platform Engineer",
    keywords: ["platform engineer", "devops engineer", "site reliability", "cloud engineer", "infrastructure engineer"],
    weight: 0.7,
  },
];

export type Industry = { key: string; label: string; keywords: string[] };

/** Keywords are whole words; a trailing * matches any word starting with it. */
export const industries: Industry[] = [
  { key: "finance", label: "Finance: SACCOs, microfinance, insurance", keywords: ["sacco*", "microfinance", "mfb", "insurance", "insurer*", "bank", "banking", "lending", "pension*", "cooperative society", "assurance", "underwriting"] },
  { key: "health", label: "Health, pharma & regulators", keywords: ["hospital*", "clinic*", "pharma*", "healthcare", "medical", "laborator*", "regulator*", "diagnostic*", "patients"] },
  { key: "logistics", label: "Logistics, manufacturing, agribusiness", keywords: ["logistics", "freight", "shipping", "manufactur*", "factory", "agribusiness", "agricultur*", "farmer*", "dairy", "tea estate*", "coffee", "supply chain", "warehous*", "distributor*", "fmcg"] },
  { key: "services", label: "Hospitality, tourism, retail, education", keywords: ["hotel*", "hospitality", "tourism", "safari*", "retail*", "supermarket*", "school*", "universit*", "college", "restaurant*", "real estate"] },
];

/** Signals that a company is non-tech / late to AI (good for us). */
export const lowMaturityKeywords = ["excel", "manual*", "paper-based", "spreadsheet*", "digitis*", "digitiz*", "moderni*", "legacy", "erp", "automate*", "automation", "digital transformation", "sage", "quickbooks", "tally"];

/** Signals that the employer IS a tech company (lower priority, not excluded). */
export const techCompanyKeywords = ["saas", "startup", "software company", "tech company", "developer tools", "ai company", "series a", "series b", "series c", "our platform", "our product", "y combinator", "venture-backed", "product engineers", "engineering team"];

// ---------------- Red Star Standard ----------------

export type Package = {
  key: string;
  name: string;
  priceKes: number; // starting price
  monthlyKes?: number;
  kind: "one-off" | "retainer" | "setup+retainer";
  duration: string;
  summary: string;
  /** Count as "good enough" for the client floor (Strategy Sprint or retainer). */
  qualifies: boolean;
};

export const company = {
  name: "Red Star Standard",
  website: "https://redstarstandard.co.ke",
  pricingUrl: "https://redstarstandard.co.ke/pricing",
  tagline: "AI consulting, automation and software for SMEs and non-tech organisations",
  terms: [
    "Free 30-minute consultation",
    "Starters: 50% to begin, 50% on delivery (M-Pesa split allowed)",
    "Larger builds: 30% start / 40% working demo / 30% handover",
    "NDA as standard; client owns code, models and data; weekly demos",
    "Prices in KES before VAT; USD via Paystack/Flutterwave for clients outside Kenya",
  ],
  foundingOffer: {
    text: "30% off the first project for founding clients, in exchange for a testimonial and case study",
    /** Stop mentioning the offer once this many founding clients are won. */
    maxFoundingClients: 5,
  },
  /** Prospect must be able to afford at least this (Strategy Sprint) or a retainer. */
  clientFloorKes: 60000,
};

/**
 * Every priced offer on redstarstandard.co.ke/pricing and /services.
 * The pitch writer considers ALL of these (plus the custom service lines below) and picks the best angle.
 */
export const packages: Package[] = [
  // Fixed-price starters
  { key: "quick-win", name: "AI Quick-Win Sprint", priceKes: 15000, kind: "one-off", duration: "1 week", summary: "One working automation live plus a 1-hour AI training for the team", qualifies: false },
  { key: "shop-starter", name: "Shop Starter", priceKes: 7500, kind: "one-off", duration: "2-3 days", summary: "Google and Maps listing, WhatsApp ready to chat and sell, M-Pesa at the counter (small shops)", qualifies: false },
  { key: "whatsapp-ai", name: "WhatsApp AI Assistant", priceKes: 30000, monthlyKes: 5000, kind: "setup+retainer", duration: "live in 1-2 weeks", summary: "24/7 FAQ answers in English and Swahili, lead qualification, bookings, monthly tuning (Meta fees at cost)", qualifies: true },
  { key: "ai-website", name: "AI-Ready Website + GEO", priceKes: 50000, kind: "one-off", duration: "2-3 weeks", summary: "Fast mobile-first website found on Google and cited in ChatGPT/Gemini answers", qualifies: false },
  // Training, strategy and build
  { key: "team-training", name: "Team AI Training", priceKes: 25000, kind: "one-off", duration: "3-4 hours, up to 20 people", summary: "Hands-on training on the team's own documents and tasks, playbook and certificate", qualifies: false },
  { key: "strategy-sprint", name: "Strategy Sprint", priceKes: 60000, kind: "one-off", duration: "2-4 weeks", summary: "AI readiness scorecard, ranked use cases with ROI, 90-day roadmap", qualifies: true },
  { key: "poc-mvp", name: "PoC / MVP Build", priceKes: 250000, kind: "one-off", duration: "PoC 4-6 weeks, MVP 8-12 weeks", summary: "Fixed scope and price, working product on the client's data, go/no-go report", qualifies: true },
  { key: "dedicated-team", name: "Dedicated AI Team", priceKes: 150000, monthlyKes: 150000, kind: "retainer", duration: "monthly", summary: "Engineers and a strategist, scale up or down, weekly reporting", qualifies: true },
  // Custom builds (quoted after the free call)
  { key: "business-website", name: "Business website with M-Pesa checkout", priceKes: 80000, kind: "one-off", duration: "custom", summary: "Typically KES 80,000-250,000 depending on scope", qualifies: true },
  { key: "web-app", name: "Custom web app / business system", priceKes: 250000, kind: "one-off", duration: "custom", summary: "From about KES 250,000; portals, dashboards, workflow systems, integrations", qualifies: true },
  { key: "support", name: "Support & maintenance", priceKes: 5000, monthlyKes: 5000, kind: "retainer", duration: "monthly", summary: "Hosting, security updates, backups and small improvements (from KES 5,000/mo)", qualifies: true },
  // AI Growth Studio (monthly marketing)
  { key: "ads-studio", name: "AI Ads Studio", priceKes: 30000, monthlyKes: 30000, kind: "retainer", duration: "monthly, KES 30k-150k", summary: "AI-produced ad creative and campaign management", qualifies: true },
  { key: "design-studio", name: "AI Design Studio", priceKes: 25000, monthlyKes: 25000, kind: "retainer", duration: "monthly, KES 25k-200k", summary: "Ongoing brand and marketing design", qualifies: true },
  { key: "newsletter-ops", name: "Newsletter Operations", priceKes: 15000, monthlyKes: 15000, kind: "retainer", duration: "monthly, KES 15k-80k", summary: "Customer newsletters written, designed and sent", qualifies: true },
  { key: "seo-geo", name: "AI SEO / GEO / AEO", priceKes: 30000, monthlyKes: 30000, kind: "retainer", duration: "monthly, KES 30k-100k+", summary: "Rank on Google and get cited by ChatGPT/Gemini answers", qualifies: true },
  { key: "ghostwriting", name: "AI Ghostwriting", priceKes: 15000, monthlyKes: 15000, kind: "retainer", duration: "monthly, KES 15k-80k+", summary: "Thought-leadership posts and articles for leaders", qualifies: true },
  { key: "growth-ops", name: "Growth Operations", priceKes: 0, kind: "retainer", duration: "monthly", summary: "Base fee + 10-50% profit share on growth delivered", qualifies: true },
  { key: "instagram-agency", name: "Instagram Content Agency", priceKes: 25000, monthlyKes: 25000, kind: "retainer", duration: "monthly, KES 25k-120k", summary: "Instagram content and community management", qualifies: true },
  { key: "clipping", name: "Clipping-as-a-Service", priceKes: 20000, monthlyKes: 20000, kind: "retainer", duration: "monthly, KES 20k-100k or rev-share", summary: "Short-form clips from long videos and events", qualifies: true },
  { key: "ugc-studio", name: "UGC Studio (Human + AI)", priceKes: 0, kind: "retainer", duration: "per video, package or retainer", summary: "User-generated-style video content", qualifies: true },
];

/** The full service menu (custom-quoted). The pitch writer can propose any of these. */
export const serviceLines: Record<string, string[]> = {
  "AI Consulting": ["AI Strategy & Roadmap", "AI Readiness Assessment", "AI Solution Design & Architecture", "Generative AI Consulting", "Data Engineering & Analytics", "AI Integration", "AI Governance & Responsible AI", "AI Training & Adoption"],
  "AI Development": ["AI Software Development", "Enterprise AI Development", "AI-Native Development", "Generative AI Development", "AI SaaS Development", "AI Product Engineering", "AI App Development", "AI Modernisation", "AI PoC & MVP Development"],
  "Software & Web": ["Custom Software Development", "Web Application Development", "E-commerce Development", "CMS", "Next.js / React / Angular / Node.js / Laravel / Python / Flutter development", "PostgreSQL / MongoDB / MySQL development"],
  "Industry Solutions": ["AI in Banking", "AI in Manufacturing", "AI in E-commerce", "AI in Real Estate", "AI in Insurance", "Data Governance", "AI in Legal", "AI in HR", "AI in Healthcare", "AI in Food & Agriculture", "AI in Education", "AI for SaaS", "AI in Software Development"],
  "AI Growth Studio": ["AI Ads Studio", "AI Design Studio", "Newsletter Operations", "AI SEO / GEO / AEO", "AI Ghostwriting", "Growth Operations", "Instagram Content Agency", "Clipping-as-a-Service", "UGC Studio (Human + AI)"],
};

/** Search terms used by the job feeds (one request per term). */
export const searchTerms = [
  "AI engineer",
  "automation engineer",
  "digital transformation",
  "full stack developer",
  "software engineer",
  "solutions engineer",
  "platform engineer",
];
