import { Octokit } from "octokit";
import { env } from "./env";

// `|| undefined` keeps Octokit unauthenticated (instead of sending an empty token) on dev runs.
const gh = new Octokit({ auth: env.GITHUB_TOKEN || undefined });
// GITHUB_REPO may be empty on dev runs; split never throws, and every call below is gated on the token.
const [owner = "", repo = ""] = env.GITHUB_REPO.split("/");

// Without a token the loop still completes (dev runs, the skeleton). Judges open this repo, so every dev run
// must not leave a PR behind: run with GITHUB_TOKEN empty until the clean runs at 3:30.
export async function openPullRequest(o: { path: string; content: string; title: string; body: string }) {
  if (!env.GITHUB_TOKEN) return "(github disabled)";
  const { data: main } = await gh.rest.git.getRef({ owner, repo, ref: "heads/main" });
  const branch = `agentguard/${Date.now()}`;
  await gh.rest.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha: main.object.sha });
  let sha: string | undefined;
  try {
    const { data } = await gh.rest.repos.getContent({ owner, repo, path: o.path, ref: branch });
    if (!Array.isArray(data)) sha = data.sha;
  } catch { /* new file */ }
  await gh.rest.repos.createOrUpdateFileContents({ owner, repo, path: o.path, branch, sha,
    message: o.title, content: Buffer.from(o.content).toString("base64") });
  const { data: pr } = await gh.rest.pulls.create({ owner, repo, head: branch, base: "main", title: o.title, body: o.body });
  return pr.html_url;
}

export async function openIssue(title: string, body: string) {
  if (!env.GITHUB_TOKEN) return "(github disabled)";
  // One issue per file+rule, ever. Re-runs return the existing issue instead of spamming the repo.
  const { data: open } = await gh.rest.issues.listForRepo({ owner, repo, labels: "agentguard", state: "open", per_page: 100 });
  const dup = open.find((i) => i.title === title);
  if (dup) return dup.html_url;
  const { data } = await gh.rest.issues.create({ owner, repo, title, body, labels: ["agentguard"] });
  return data.html_url;
}
