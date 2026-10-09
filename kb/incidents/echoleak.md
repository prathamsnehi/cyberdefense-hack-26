# EchoLeak (CVE-2025-32711): zero-click exfiltration from Microsoft 365 Copilot

What happened: in June 2025 Microsoft fixed CVE-2025-32711, an AI command injection in Microsoft 365 Copilot that Aim Security reported under the name EchoLeak (critical, CVSS 9.3 in Microsoft's advisory). The attacker only had to send the victim a crafted email with hidden instructions. When the user later asked Copilot an ordinary question, retrieval pulled that email into the context and Copilot followed the instructions: it collected sensitive data from the user's mail, OneDrive, SharePoint or Teams and placed it in a markdown link or image URL.
The exploit got past Copilot's cross-prompt injection classifier and its link redaction by using reference-style markdown and an allowed Microsoft Teams URL, so the data left without a single click. Microsoft fixed it server-side and reported no exploitation in the wild.

Lesson: an email is untrusted input even when the agent reads it on its own initiative, and retrieved text must never be able to instruct the model. Block automatic outbound channels (image fetches, links, tool calls) built from model output that has seen untrusted text, and keep untrusted content and private data out of the same context where possible.

Source: https://msrc.microsoft.com/update-guide/vulnerability/CVE-2025-32711
Write-up: https://thehackernews.com/2025/06/zero-click-ai-vulnerability-exposes.html

id: incidents/echoleak
