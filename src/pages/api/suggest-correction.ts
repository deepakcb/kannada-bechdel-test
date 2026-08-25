import type { APIRoute } from "astro";

export const prerender = false;

const GITHUB_REPO = "deepakcb/kannada-bechdel-test";
const MAX_LEN = 2000;

function clean(value: FormDataEntryValue | null, maxLen = MAX_LEN): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

  if (!movie || !field || !suggestion || !email || !isValidEmail(email)) {
    return redirect("/correct/?error=1", 303);
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
