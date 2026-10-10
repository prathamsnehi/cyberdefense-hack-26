-- Latest agent actions. Exclude infrastructure smoke-test rows from demo metrics.
SELECT event_time, run_id, agent_id, agent_version, event_type,
       tool_name, source_id, decision, outcome
FROM albert.agent_events
WHERE event_type != 'setup_smoke_test'
ORDER BY event_time DESC
LIMIT 100;

-- Successful and unsuccessful attacks per version.
-- Contract: emit exactly one attack_result row per evaluated attack.
-- Emit outcome = success for an exploited target, failure for a blocked attack,
-- and error for an inconclusive infrastructure/model failure.
SELECT agent_id, agent_version,
       countIf(outcome = 'success') AS successful_attacks,
       countIf(outcome = 'failure') AS unsuccessful_attacks,
       countIf(outcome = 'error') AS inconclusive_attacks
FROM albert.agent_events
WHERE event_type = 'attack_result'
GROUP BY agent_id, agent_version;

-- Recent blocked actions and their originating source.
SELECT event_time, run_id, agent_id, tool_name, source_id, outcome
FROM albert.agent_events
WHERE decision = 'deny'
ORDER BY event_time DESC
LIMIT 100;
