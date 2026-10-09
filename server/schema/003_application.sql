CREATE DATABASE IF NOT EXISTS albert;
CREATE TABLE IF NOT EXISTS albert.agent_events (
 event_id UUID DEFAULT generateUUIDv4(), event_time DateTime64(3, 'UTC') DEFAULT now64(3),
 run_id String DEFAULT '', agent_id String, agent_version String DEFAULT '',
 attack_id String DEFAULT '', event_type LowCardinality(String), tool_name String DEFAULT '',
 source_id String DEFAULT '', decision LowCardinality(String) DEFAULT '',
 outcome LowCardinality(String) DEFAULT '', details String DEFAULT '{}'
) ENGINE = MergeTree ORDER BY (run_id, event_time, event_id);
ALTER TABLE albert.agent_events
 ADD COLUMN IF NOT EXISTS version String DEFAULT agent_version,
 ADD COLUMN IF NOT EXISTS session_id String DEFAULT '',
 ADD COLUMN IF NOT EXISTS tool String DEFAULT tool_name,
 ADD COLUMN IF NOT EXISTS args String DEFAULT details,
 ADD COLUMN IF NOT EXISTS source LowCardinality(String) DEFAULT '',
 ADD COLUMN IF NOT EXISTS is_new_payee UInt8 DEFAULT 0,
 ADD COLUMN IF NOT EXISTS fleet UInt8 DEFAULT 0,
 ADD COLUMN IF NOT EXISTS ts DateTime64(3, 'UTC') DEFAULT event_time,
 ADD COLUMN IF NOT EXISTS guard_ms Nullable(Float64) DEFAULT NULL;
CREATE TABLE IF NOT EXISTS albert.payees (
 agent_id String, account String, updated_at DateTime64(3, 'UTC') DEFAULT now64(3)
) ENGINE = ReplacingMergeTree(updated_at) ORDER BY (agent_id, account);
INSERT INTO albert.payees (agent_id, account)
SELECT 'invoice-bot', account FROM
 (SELECT arrayJoin(['ACME-001', 'GLOBEX-002', 'INITECH-003']) AS account)
WHERE account NOT IN (SELECT account FROM albert.payees FINAL WHERE agent_id = 'invoice-bot');
CREATE VIEW IF NOT EXISTS albert.blocked_events AS
SELECT * FROM albert.agent_events WHERE event_type = 'tool_blocked';
CREATE TABLE IF NOT EXISTS albert.findings (
 run_id String, rule_id String, file String, line UInt32, severity String,
 message String, origin String, ts DateTime64(3, 'UTC') DEFAULT now64(3)
) ENGINE = MergeTree ORDER BY (run_id, ts, rule_id);
CREATE TABLE IF NOT EXISTS albert.learned_rules (
 run_id String, rule_id String, ts DateTime64(3, 'UTC') DEFAULT now64(3)
) ENGINE = MergeTree ORDER BY (run_id, rule_id);
