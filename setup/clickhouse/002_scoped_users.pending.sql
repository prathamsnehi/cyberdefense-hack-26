-- PROPOSAL ONLY: not applied. Requires approval to create persistent credentials.
-- Replace password placeholders privately at execution time; never commit passwords.
-- These are new service users, not replacements for the existing default user.
CREATE USER albert_writer IDENTIFIED WITH sha256_password BY '<GENERATED_WRITER_PASSWORD>';
GRANT SELECT, INSERT ON albert.agent_events TO albert_writer;

CREATE USER albert_reader IDENTIFIED WITH sha256_password BY '<GENERATED_READER_PASSWORD>';
GRANT SELECT ON albert.agent_events TO albert_reader;

-- Validation after creating users:
-- 1. Writer can insert/read a synthetic event.
-- 2. Reader can SELECT it but cannot INSERT it.
-- 3. Both users lack database/table creation and permission-administration privileges.
