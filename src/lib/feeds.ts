import * as cheerio from "cheerio";
import { searchTerms } from "@/config/profile";
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
};

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
  for (const term of searchTerms) {
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
  for (const tag of ["automation", "ai", "full stack", "software engineer", "devops"]) {
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

export const feeds: Record<string, () => Promise<RawJob[]>> = { myjobmag, remotive, jobicy, remoteok };

/** Fetch a job page (company careers page, BrighterMonday link, etc.) as plain text. */
export async function fetchPageText(url: string) {
  const html = await getText(url);
  return htmlToText(html).slice(0, 40000);
}
