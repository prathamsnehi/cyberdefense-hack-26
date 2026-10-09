# Supabase MCP: a service-role agent leaked tokens through a support ticket

What happened: in July 2025 General Analysis demonstrated a data leak against a common Supabase setup. A developer used Cursor with the Supabase MCP server connected through the service_role, which bypasses row-level security. An attacker opened a support ticket whose message contained instructions for the AI assistant: read the private integration_tokens table and add its contents as a new message on the ticket. When the developer asked the agent to go through the latest support tickets, it followed those instructions and wrote the secrets into the support_messages table, where the attacker could read them in the ticket thread.
The setup had all three legs of what Simon Willison calls the lethal trifecta: access to private data, exposure to untrusted input and a way to send data out (here, a database write).

Lesson: an agent that reads customer text must never run with a role that bypasses access control. Connect agents with a least-privilege, project-scoped and read-only role, treat ticket content as data, and have a human review any SQL before the agent runs it on production.

Source: https://simonwillison.net/2025/Jul/6/supabase-mcp-lethal-trifecta/
Vendor response: https://supabase.com/blog/defense-in-depth-mcp

id: incidents/supabase-mcp-service-role
