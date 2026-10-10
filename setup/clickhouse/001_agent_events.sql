CREATE TABLE IF NOT EXISTS albert.agent_events
(
    event_id UUID DEFAULT generateUUIDv4(),
    event_time DateTime64(3, 'UTC') DEFAULT now64(3),
    run_id String,
    agent_id String,
    agent_version String DEFAULT '',
    attack_id String DEFAULT '',
    event_type LowCardinality(String),
    tool_name String DEFAULT '',
    source_id String DEFAULT '',
    decision LowCardinality(String) DEFAULT '',
    outcome LowCardinality(String) DEFAULT '',
    details String DEFAULT '{}'
)
ENGINE = MergeTree
ORDER BY (run_id, event_time, event_id);
