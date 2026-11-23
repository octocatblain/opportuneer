import * as cheerio from "cheerio";
import { cfg, type AppConfig } from "@/lib/config";
import { isAfrica, isKenya } from "@/lib/regions";
import { htmlToText } from "@/lib/cv";
import { parseSalary, type Salary } from "@/lib/salary";
import { matchTitleFamily } from "@/lib/scoring";

export type RawJob = {
  source: string;
  sourceId: string;
  title: string;
  companyName: string;
  url: string;
  description: string;
  location: string;
  remote: boolean;
  employment: string | null;
  salary: Salary;
  postedAt: Date | null;
  /** The board itself marks the employer/post as verified (e.g. BrighterMonday badge). */
  verified?: boolean;
};

/** Pull the first schema.org JobPosting out of a page (handles @graph). */
function jobPostingLd($: cheerio.CheerioAPI) {
  for (const el of $('script[type="application/ld+json"]').toArray()) {
    try {
      const data = JSON.parse($(el).text());
      const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
      const job = items.find((x: { "@type"?: string }) => x["@type"] === "JobPosting");
      if (job) return { job, graph: items as Record<string, unknown>[] };
    } catch {
      /* ignore broken JSON-LD */
    }
  }
  return null;
}

function ldSalary(job: { baseSalary?: { currency?: string; value?: { minValue?: number; maxValue?: number; value?: number; unitText?: string } } }): Salary {
  const v = job.baseSalary?.value;
  if (!v) return {};
  const unit = (v.unitText ?? "").toUpperCase();
  return {
    min: v.minValue ?? v.value,
    max: v.maxValue,
    currency: job.baseSalary?.currency,
    period: unit === "YEAR" ? "year" : unit === "HOUR" ? "hour" : unit === "MONTH" ? "month" : undefined,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Per-feed cap on search terms, so a long title list does not turn one scan into hundreds of requests. */
const MAX_TERMS = 10;

const UA = { "User-Agent": "Mozilla/5.0 (Opportuneer personal job search)" };

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: UA, cache: "no-store", signal: AbortSignal.timeout(45000) });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function getText(url: string): Promise<string> {
  const res = await fetch(url, { headers: UA, cache: "no-store", signal: AbortSignal.timeout(45000) });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

/** Employment type; the start of the text (e.g. "Job Type Full Time") wins over later mentions. */
const employmentOf = (s: string | null | undefined): string | null => {
  const classify = (t: string) => {
    if (/\bfull[ _-]?time\b/.test(t)) return "full-time";
    if (/\bpart[ _-]?time\b/.test(t)) return "part-time";
    if (/\b(contract|contractor|fixed[ -]term|freelance|temporary)\b/.test(t)) return "contract";
    if (/\bintern(ship)?\b/.test(t)) return "internship";
    return null;
  };
  const t = (s ?? "").toLowerCase();
  return classify(t.slice(0, 300)) ?? classify(t);
};

// ---- Remotive (remote; attribution: link back to Remotive; max ~4 calls/day) ----
async function remotive(): Promise<RawJob[]> {
  type R = { jobs: { id: number; url: string; title: string; company_name: string; job_type: string; publication_date: string; candidate_required_location: string; salary: string; description: string }[] };
  const out: RawJob[] = [];
  for (const term of cfg().searchTerms.slice(0, MAX_TERMS)) {
    const data = await getJson<R>(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(term)}&limit=50`);
    for (const j of data.jobs) {
      out.push({
        source: "remotive",
        sourceId: String(j.id),
        title: j.title,
        companyName: j.company_name,
        url: j.url,
        description: htmlToText(j.description),
        location: j.candidate_required_location || "Worldwide",
        remote: true,
        employment: employmentOf(j.job_type),
        salary: parseSalary(j.salary),
        postedAt: j.publication_date ? new Date(j.publication_date) : null,
      });
    }
  }
  return out;
}

// ---- Jobicy (remote; attribution: link to original URL) ----
async function jobicy(): Promise<RawJob[]> {
  type J = { jobs: { id: number; url: string; jobTitle: string; companyName: string; jobType: string[]; jobGeo: string; jobDescription: string; pubDate: string; salaryMin?: number; salaryMax?: number; salaryCurrency?: string; salaryPeriod?: string }[] };
  const out: RawJob[] = [];
  for (const tag of cfg().searchTerms.slice(0, MAX_TERMS)) {
    const data = await getJson<J>(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(tag)}`);
    for (const j of data.jobs ?? []) {
      out.push({
        source: "jobicy",
        sourceId: String(j.id),
        title: j.jobTitle,
        companyName: j.companyName,
        url: j.url,
        description: htmlToText(j.jobDescription),
        location: j.jobGeo || "Anywhere",
        remote: true,
        employment: employmentOf(j.jobType?.join(" ")),
        salary: j.salaryMin
          ? { min: j.salaryMin, max: j.salaryMax, currency: j.salaryCurrency || "USD", period: j.salaryPeriod === "monthly" ? "month" : j.salaryPeriod === "hourly" ? "hour" : "year" }
          : {},
        postedAt: j.pubDate ? new Date(j.pubDate) : null,
      });
    }
  }
  return out;
}

/** Repair UTF-8 text that was decoded as Latin-1 ("Ã©", "â€”"). */
function fixMojibake(s?: string) {
  if (!s || !/[ÃÂâ][\u0080-ÿ]/.test(s)) return s;
  const fixed = Buffer.from(s, "latin1").toString("utf8");
  return fixed.includes("�") ? s : fixed;
}

// ---- RemoteOK (remote; attribution: link back to Remote OK) ----
async function remoteok(): Promise<RawJob[]> {
  type O = { id?: string; position?: string; company?: string; url?: string; description?: string; location?: string; salary_min?: number; salary_max?: number; date?: string; tags?: string[] };
  const data = (await getJson<O[]>("https://remoteok.com/api")).map((j) => ({ ...j, position: fixMojibake(j.position), company: fixMojibake(j.company), description: fixMojibake(j.description) }));
  return data
    .filter((j) => j.id && j.position)
    .map((j) => ({
      source: "remoteok",
      sourceId: String(j.id),
      title: j.position!,
      companyName: j.company ?? "Unknown",
      url: j.url ?? "",
      description: htmlToText(j.description ?? ""),
      location: j.location || "Worldwide",
      remote: true,
      employment: null,
      salary: j.salary_max ? { min: j.salary_min || undefined, max: j.salary_max, currency: "USD", period: "year" as const } : {},
      postedAt: j.date ? new Date(j.date) : null,
    }));
}

// ---- MyJobMag Kenya (public RSS; detail page fetched only for matching titles) ----
async function myjobmag(): Promise<RawJob[]> {
  const xml = await getText("https://www.myjobmag.co.ke/jobsxml.xml");
  const $ = cheerio.load(xml, { xml: true });
  const items = $("item")
    .toArray()
    .map((el) => {
      const it = $(el);
      const full = it.find("title").text().trim();
      const [title, companyName] = full.includes(" at ") ? [full.slice(0, full.lastIndexOf(" at ")), full.slice(full.lastIndexOf(" at ") + 4)] : [full, "Unknown"];
      return { title, companyName, url: it.find("link").text().trim(), industry: it.find("industry").text(), about: it.find("description").text(), pubDate: it.find("pubDate").text() };
    });
  const out: RawJob[] = [];
  for (const it of items) {
    if (!matchTitleFamily(it.title)) continue;
    let description = `${it.about}\nIndustry: ${it.industry}`;
    try {
      const page = cheerio.load(await getText(it.url));
      page("script,style,ins").remove();
      const key = page(".job-key-info").first().text().replace(/\s+/g, " ").trim();
      const body = page(".job-description").first().text().replace(/\s+/g, " ").trim();
      if (body) description = `${key}\n\n${body}\n\nIndustry: ${it.industry}`;
    } catch {
      /* keep RSS summary */
    }
    out.push({
      source: "myjobmag",
      sourceId: it.url,
      title: it.title,
      companyName: it.companyName,
      url: it.url,
      description,
      location: description.match(/Location\s+(.+?)\s+(?:Job Field|Job Type|Experience|Qualification)/)?.[1] ?? "Kenya",
      remote: /\bremote\b/i.test(description.slice(0, 400)),
      employment: employmentOf(description.slice(0, 3000)),
      salary: parseSalary(description),
      postedAt: it.pubDate ? new Date(it.pubDate) : null,
    });
  }
  return out;
}

// ---- BrighterMonday Kenya (category pages; keeps the board's "verified" employer badge) ----
async function brightermonday(): Promise<RawJob[]> {
  const techFamily = cfg().titleFamilies.some((f) => ["ai-automation", "transformation-lead", "fullstack", "solutions-systems", "platform"].includes(f.key));
  const pages = [
    ...cfg().searchTerms.slice(0, MAX_TERMS).map((t) => `https://www.brightermonday.co.ke/jobs?q=${encodeURIComponent(t)}`),
    ...(techFamily
      ? [
          "https://www.brightermonday.co.ke/jobs/software-data",
          "https://www.brightermonday.co.ke/jobs/software-data?page=2",
          "https://www.brightermonday.co.ke/jobs/software-data?page=3",
          "https://www.brightermonday.co.ke/jobs/engineering-technology",
          "https://www.brightermonday.co.ke/jobs/consulting-strategy",
        ]
      : []),
  ];
  const cards = new Map<string, { title: string; company: string; verified: boolean }>();
  for (const url of pages) {
    const $ = cheerio.load(await getText(url));
    $('a[href*="/listings/"]').each((_, a) => {
      const href = $(a).attr("href")!.split("?")[0];
      if (cards.has(href)) return;
      // Walk up to the card that holds just this listing.
      let el = $(a);
      while (el.parent().length && new Set(el.parent().find('a[href*="/listings/"]').map((_, x) => $(x).attr("href")!.split("?")[0]).get()).size === 1) el = el.parent();
      const html = $.html(el);
      const company = el.find('a[href*="/company/"]').first().text().trim() || el.find("p").first().text().trim();
      cards.set(href, { title: $(a).text().trim(), company, verified: /id="verified"|#verified/.test(html) });
    });
    await sleep(800);
  }
  const out: RawJob[] = [];
  for (const [url, card] of cards) {
    if (!card.title || !matchTitleFamily(card.title)) continue;
    try {
      const $ = cheerio.load(await getText(url));
      const ld = jobPostingLd($);
      const job = ld?.job ?? {};
      const orgId = job.hiringOrganization?.["@id"];
      const org = ld?.graph.find((x) => x["@id"] === orgId) as { name?: string } | undefined;
      const addr = job.jobLocation?.address ?? {};
      out.push({
        source: "brightermonday",
        sourceId: url,
        title: job.title || card.title,
        companyName: org?.name || card.company || "Unknown",
        url,
        description: htmlToText(job.description ?? ""),
        location: [addr.addressLocality, addr.addressRegion].filter(Boolean).join(", ") || "Kenya",
        remote: /home based|remote/i.test(String(job.description ?? "").slice(0, 600)),
        employment: employmentOf(job.employmentType),
        salary: ldSalary(job),
        postedAt: job.datePosted ? new Date(job.datePosted) : null,
        verified: card.verified,
      });
    } catch {
      /* skip a listing that fails to load */
    }
    await sleep(500);
  }
  return out;
}

// ---- Remote4Africa (remote jobs open to Africa; attribution: link back) ----
async function remote4africa(): Promise<RawJob[]> {
  const links = new Map<string, string>();
  for (const term of cfg().searchTerms.slice(0, MAX_TERMS)) {
    const $ = cheerio.load(await getText(`https://remote4africa.com/jobs/search?q=${encodeURIComponent(term)}`));
    $('a[href^="/jobs/"]').each((_, a) => {
      const href = $(a).attr("href")!;
      const title = $(a).text().replace(/\s+/g, " ").trim();
      if (/^\/jobs\/(search|plans)/.test(href) || links.has(href)) return;
      if (title) links.set(href, title);
    });
    await sleep(800);
  }
  const out: RawJob[] = [];
  for (const [href, title] of links) {
    if (!matchTitleFamily(title)) continue;
    const url = `https://remote4africa.com${href}`;
    try {
      const $ = cheerio.load(await getText(url));
      const job = jobPostingLd($)?.job;
      if (!job) continue;
      const eligible = (job.applicantLocationRequirements ?? []).map((x: { name?: string }) => x.name).filter(Boolean).join(", ");
      out.push({
        source: "remote4africa",
        sourceId: href,
        title: job.title || title,
        companyName: job.hiringOrganization?.name || "Unknown",
        url,
        description: htmlToText(job.description ?? ""),
        location: eligible || "Africa",
        remote: true,
        employment: employmentOf(job.employmentType),
        salary: ldSalary(job),
        postedAt: job.datePosted ? new Date(job.datePosted) : null,
      });
    } catch {
      /* skip */
    }
    await sleep(500);
  }
  return out;
}

// ---- Himalayas (remote; searched for roles open to the account's country; attribution: link back) ----
async function himalayas(): Promise<RawJob[]> {
  type H = {
    jobs: {
      title: string; companyName: string; employmentType: string; minSalary: number | null; maxSalary: number | null; currency: string | null;
      salaryPeriod: string; locationRestrictions: string[]; description: string; pubDate: number; applicationLink: string; guid: string;
    }[];
  };
  const out: RawJob[] = [];
  const country = cfg().locations.country;
  for (const term of cfg().searchTerms.slice(0, MAX_TERMS)) {
    const data = await getJson<H>(`https://himalayas.app/jobs/api/search?q=${encodeURIComponent(term)}${country ? `&country=${encodeURIComponent(country)}` : ""}`);
    for (const j of data.jobs ?? []) {
      out.push({
        source: "himalayas",
        sourceId: j.guid,
        title: j.title,
        companyName: j.companyName,
        url: j.guid,
        description: htmlToText(j.description ?? ""),
        // A list of most countries in the world is not a "specifically Africa/Kenya" role.
        location: !j.locationRestrictions?.length
          ? "Worldwide"
          : j.locationRestrictions.length > 15
            ? `Worldwide (${j.locationRestrictions.length} countries)`
            : j.locationRestrictions.join(", "),
        remote: true,
        employment: employmentOf(j.employmentType),
        salary: j.maxSalary || j.minSalary ? { min: j.minSalary ?? undefined, max: j.maxSalary ?? undefined, currency: j.currency ?? "USD", period: j.salaryPeriod === "annual" ? "year" : "month" } : {},
        postedAt: j.pubDate ? new Date(j.pubDate * 1000) : null,
      });
    }
    await sleep(500);
  }
  return out;
}

// ---- Arbeitnow (Germany and nearby; English and German posts; public API) ----
async function arbeitnow(): Promise<RawJob[]> {
  type A = { data: { slug: string; company_name: string; title: string; description: string; remote: boolean; url: string; job_types?: string[]; location: string; created_at: number }[] };
  const out: RawJob[] = [];
  for (const page of [1, 2, 3]) {
    const data = await getJson<A>(`https://www.arbeitnow.com/api/job-board-api?page=${page}`);
    for (const j of data.data ?? []) {
      out.push({
        source: "arbeitnow",
        sourceId: j.slug,
        title: j.title,
        companyName: j.company_name,
        url: j.url,
        description: htmlToText(j.description ?? ""),
        location: j.location || "Germany",
        remote: Boolean(j.remote),
        employment: employmentOf((j.job_types ?? []).join(" ")),
        salary: {},
        postedAt: j.created_at ? new Date(j.created_at * 1000) : null,
      });
    }
    await sleep(500);
  }
  return out;
}

export const feeds: Record<string, () => Promise<RawJob[]>> = {
  // National boards (only run for accounts in that country: see feedApplies)
  brightermonday,
  myjobmag,
  remote4africa,
  arbeitnow,
  // Remote boards, for everyone
  himalayas,
  remotive,
  jobicy,
  remoteok,
};

const EUROPE = /\b(germany|deutschland|austria|switzerland|europe|berlin|munich|hamburg|frankfurt|cologne|vienna|zurich)\b/i;

/** Which boards make sense for an account: national boards only for their country, remote boards for all. */
export const feedApplies: Record<string, (c: AppConfig) => boolean> = {
  brightermonday: (c) => isKenya(c.locations.country),
  myjobmag: (c) => isKenya(c.locations.country),
  remote4africa: (c) => isAfrica(c.locations.country),
  arbeitnow: (c) => EUROPE.test([c.locations.country, ...c.locations.accepted].join(" ")),
};
export const feedRuns = (name: string, c: AppConfig) => feedApplies[name]?.(c) ?? true;

/** Fetch a job page (company careers page, BrighterMonday link, etc.) as plain text. */
export async function fetchPageText(url: string) {
  const html = await getText(url);
  return htmlToText(html).slice(0, 40000);
}
