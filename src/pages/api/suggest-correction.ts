import type { APIRoute } from "astro";
import { resolveMx, resolve4, resolve6 } from "node:dns/promises";

export const prerender = false;

const GITHUB_REPO = "deepakcb/kannada-bechdel-test";
const MAX_LEN = 2000;

// Well-known disposable/throwaway email providers, plus obviously fake
// placeholder domains people type into forms they don't want to fill in.
const BLOCKED_EMAIL_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "temp-mail.org", "throwawaymail.com", "yopmail.com", "trashmail.com",
  "dispostable.com", "getnada.com", "fakeinbox.com", "sharklasers.com",
  "maildrop.cc", "mintemail.com", "mailnesia.com", "moakt.com",
  "example.com", "example.org", "example.net", "test.com", "email.com",
]);

function clean(value: FormDataEntryValue | null, maxLen = MAX_LEN): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

function hasValidEmailFormat(email: string): boolean {
  // local part, @, domain with a real-looking TLD; rejects consecutive dots
  return /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)*\.[a-zA-Z]{2,24}$/.test(email);
}

async function domainAcceptsMail(domain: string): Promise<boolean> {
  const withTimeout = <T,>(p: Promise<T>) =>
    Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))]);

  try {
    const mx = await withTimeout(resolveMx(domain));
    if (mx.length > 0) return true;
  } catch {
    // no MX (or lookup failed) — some domains still accept mail via a bare A/AAAA record
  }
  try {
    const [a, aaaa] = await withTimeout(
      Promise.all([resolve4(domain).catch(() => []), resolve6(domain).catch(() => [])]),
    );
    return a.length > 0 || aaaa.length > 0;
  } catch {
    // DNS timed out or errored unexpectedly — fail open rather than block a real user
    return true;
  }
}

async function isValidEmail(email: string): Promise<boolean> {
  if (!hasValidEmailFormat(email)) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain || BLOCKED_EMAIL_DOMAINS.has(domain)) return false;
  return domainAcceptsMail(domain);
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();

  // Honeypot: real users never fill this (it's hidden via CSS). Bots often do.
  if (clean(form.get("company"))) {
    return redirect("/correct/?sent=1", 303);
  }

  const movie = clean(form.get("movie"), 200);
  const field = clean(form.get("field"), 100);
  const suggestion = clean(form.get("suggestion"), 1500);
  const source = clean(form.get("source"), 500);
  const email = clean(form.get("email"), 200);

  if (!movie || !field || !suggestion || !email) {
    return redirect("/correct/?error=1", 303);
  }
  if (!(await isValidEmail(email))) {
    return redirect("/correct/?error=email", 303);
  }

  const token = import.meta.env.GITHUB_ISSUE_TOKEN;
  if (!token) {
    console.error("GITHUB_ISSUE_TOKEN is not configured");
    return redirect("/correct/?error=1", 303);
  }

  const body = [
    `**Movie:** ${movie}`,
    `**Field:** ${field}`,
    `**Suggested change:** ${suggestion}`,
    source ? `**Source:** ${source}` : null,
    `**Submitted by:** ${email}`,
    "",
    "_Submitted via the site's correction form. Visible publicly since this is a public repo — see the About page for details._",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `Correction: ${movie} — ${field}`,
      body,
    }),
  });

  if (!res.ok) {
    console.error("GitHub issue creation failed", res.status, await res.text());
    return redirect("/correct/?error=1", 303);
  }

  return redirect("/correct/?sent=1", 303);
};
