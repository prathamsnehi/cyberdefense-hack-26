# GitHub MCP prompt injection: a public issue leaked private repo data

What happened: on 26 May 2025 Invariant Labs showed that an agent connected to the official GitHub MCP server could be hijacked by an issue in a public repository. The user asked their agent to look at the open issues of their public repo. One issue, written by an attacker, asked the agent to collect information about the author from all of their repositories. The agent used the user's own token to read private repositories and published what it found in a pull request on the public repo, where anyone could read it.
No tool was poisoned and no credential was stolen: the agent only used access it already had. Invariant called the pattern a "toxic agent flow" and described it as an architectural problem, not a bug in the server code.

Lesson: an agent that reads untrusted text (public issues) must not hold a credential that reaches private data and a public write channel at the same time. Scope the token to the one repository the task needs, use one repository per session, and require human approval before writes that publish data; an "always allow" setting turns every injection into a leak.

Source: https://invariantlabs.ai/blog/mcp-github-vulnerability

id: incidents/github-mcp-prompt-injection
