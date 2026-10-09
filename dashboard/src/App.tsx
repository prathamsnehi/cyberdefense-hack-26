import { useState } from 'react';
import { numberValue, safeUrl, textValue, type Metrics, type QueryResult, type RecordData } from './api';
import { useDefenseRun, useManualQuery, usePolling } from './hooks';
import type { Evaluation, RunEvent } from './eventState';

function Icon({ name, size = 18 }: { name: 'shield' | 'grid' | 'pulse' | 'search' | 'bolt' | 'arrow' | 'refresh' | 'check' | 'terminal'; size?: number }) {
  const paths = {
    shield: <><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" /><path d="m8 12 3 3 5-6" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    pulse: <path d="M2 12h5l3-8 4 16 3-8h5" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    bolt: <path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z" />,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    refresh: <><path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5" /></>,
    check: <path d="m5 12 4 4 10-10" />,
    terminal: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="m7 9 3 3-3 3M13 15h4" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function formatNumber(value: unknown, options?: Intl.NumberFormatOptions) {
  const number = numberValue(value);
  return number === undefined ? 'Unavailable' : new Intl.NumberFormat('en-US', options).format(number);
}

function DataValue({ value }: { value: unknown }) {
  const url = safeUrl(value);
  return url ? <a href={url} target="_blank" rel="noopener noreferrer">{textValue(value)}</a> : <>{textValue(value)}</>;
}

function RecordFields({ record }: { record: RecordData }) {
  return <dl className="record-fields">{Object.entries(record).map(([key, value]) => <div key={key}><dt>{key}</dt><dd><DataValue value={value} /></dd></div>)}</dl>;
}

function QueryMeta({ data }: { data?: QueryResult }) {
  return <span className="query-meta">{data ? `${formatNumber(data.rowsRead)} rows scanned · ${formatNumber(data.elapsedMs, { maximumFractionDigits: 1 })} ms` : 'Query statistics pending'}</span>;
}

function MetricCard({ label, value, unit, detail, loading, icon }: { label: string; value: unknown; unit?: string; detail: string; loading: boolean; icon: 'pulse' | 'shield' | 'search' | 'bolt' }) {
  const available = numberValue(value) !== undefined;
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><Icon name={icon} size={17} /></div><div className={`metric-value ${!available ? 'missing-value' : ''}`}>{loading ? 'Pending' : formatNumber(value, { maximumFractionDigits: 1 })}{available && unit && <span>{unit}</span>}</div><p>{detail}</p></article>;
}

function EvaluationRow({ result }: { result: Evaluation }) {
  const known = result.total !== undefined && result.succeeded !== undefined && result.infraErrors !== undefined;
  const percent = known && result.total! > 0 ? Math.min(100, result.succeeded! / result.total! * 100) : undefined;
  return <tr><td><span className="version-tag">{result.version}</span></td><td>{formatNumber(result.total)}</td><td className={result.succeeded ? 'text-red' : ''}>{formatNumber(result.succeeded)}</td><td>{formatNumber(result.infraErrors)}</td><td>{result.happyPath === undefined ? <span className="muted">{result.final ? 'Unavailable' : 'Pending'}</span> : <span className={result.happyPath ? 'text-green' : 'text-red'}>{result.happyPath ? 'Pass' : 'Fail'}</span>}</td><td>{result.accepted === undefined ? <span className="pill neutral">{result.final ? 'Unavailable' : 'Evaluating'}</span> : <span className={`pill ${result.accepted ? 'green' : 'red'}`}>{result.accepted ? 'Accepted' : 'Rejected'}</span>}{percent !== undefined && <span className="mini-progress" aria-label={`${Math.round(percent)} percent of attacks blocked`}><span style={{ width: `${percent}%` }} /></span>}</td></tr>;
}

function EventItem({ event }: { event: RunEvent }) {
  const time = new Date(event.ts);
  const validTime = !Number.isNaN(time.getTime());
  return <li className={`timeline-item ${event.step === 'error' ? 'timeline-error' : ''}`}><span className="timeline-dot" /><div className="timeline-content"><div className="timeline-head"><strong>{event.step.replaceAll('_', ' ')}</strong><time dateTime={validTime ? time.toISOString() : undefined}>{validTime ? time.toLocaleTimeString('en-US', { hour12: false }) : 'Time unavailable'}</time></div><RecordFields record={event.data} /></div></li>;
}

function QueryRows({ rows, feed = false }: { rows: RecordData[]; feed?: boolean }) {
  return <div className={feed ? 'query-rows denied-rows' : 'query-rows'}>{rows.map((row, index) => <details key={index} className="query-row"><summary><span className={`row-icon ${feed ? 'denied' : ''}`}><Icon name={feed ? 'shield' : 'search'} size={16} /></span><span className="row-summary"><strong>{textValue(row.tool ?? row.database ?? row.database_name ?? row.name ?? row.type ?? (feed ? 'Denied operation' : 'Database match'))}</strong><span>{textValue(row.reason ?? row.host ?? row.hostname ?? row.table ?? row.agent_id ?? row.ts ?? row.timestamp ?? 'Expand to inspect query result')}</span></span><span className={`pill ${feed ? 'red' : 'neutral'}`}>{feed ? 'Denied' : 'Match'}</span><span className="expand-mark">+</span></summary><RecordFields record={row} /></details>)}</div>;
}

export default function App() {
  const metrics = usePolling<Metrics>('/metrics');
  const blocked = usePolling<QueryResult>('/events/blocked');
  const hunt = useManualQuery<QueryResult>('/fleet/hunt');
  const [agentFilter, setAgentFilter] = useState('');
  const run = useDefenseRun();
  const evaluations = Object.values(run.evaluations);
  const statusText = { idle: 'Ready to run', starting: 'Starting loop', running: 'Loop in progress', done: 'Run complete', error: 'Run interrupted' }[run.status];
  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="#overview" aria-label="Albert AI home"><span className="brand-mark"><Icon name="shield" size={23} /></span><span>albert<span className="brand-ai">AI</span></span></a><div className="workspace-label">WORKSPACE</div><nav aria-label="Main navigation"><a className="nav-link active" href="#overview"><Icon name="grid" />Overview<span className="active-dot" /></a><a className="nav-link" href="#defense"><Icon name="bolt" />Defense loop</a><a className="nav-link" href="#hunt"><Icon name="search" />Fleet hunt</a><a className="nav-link" href="#denied"><Icon name="shield" />Denied operations</a></nav><div className="sidebar-bottom"><div className="sidebar-note"><span className="small-dot" />AUTONOMOUS DEFENSE</div><p>Observe. Learn.<br />Strengthen every boundary.</p><div className="profile"><span className="avatar">A</span><div><strong>Security workspace</strong><span>Albert AI</span></div></div></div></aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div><div className="topbar-right"><span className={`connection-dot ${metrics.error ? 'offline' : metrics.data ? '' : 'pending'}`} /><span>{metrics.error ? 'Metrics unavailable' : metrics.data ? 'Connected to telemetry' : 'Connecting to telemetry'}</span><span className="header-avatar">A</span></div></header>
      <main id="overview"><div className="page-heading"><div><div className="eyebrow">SECURITY OPERATIONS</div><h1>Your defense, in motion.</h1><p>Live visibility into your fleet and its evolving guardrails.</p></div><span className="live-badge"><span className="small-dot" />LIVE TELEMETRY</span></div>
        {metrics.error && <p className="error-banner" role="status">Metrics: {metrics.error}{metrics.data && ' Showing the last available values.'}</p>}
        <section className="metrics-grid" aria-label="Security metrics"><MetricCard label="Events / second" value={metrics.data?.events_per_sec} detail="Incoming fleet activity" loading={!metrics.data && !metrics.error} icon="pulse" /><MetricCard label="Total events" value={metrics.data?.total_events} detail="Observed event volume" loading={!metrics.data && !metrics.error} icon="pulse" /><MetricCard label="Blocked / 24h" value={metrics.data?.blocked_24h} detail="Denied by active guardrails" loading={!metrics.data && !metrics.error} icon="shield" /><MetricCard label="Findings" value={metrics.data?.findings} detail="Discovered security findings" loading={!metrics.data && !metrics.error} icon="search" /><MetricCard label="Rules learned" value={metrics.data?.rules_learned} detail="Defense knowledge acquired" loading={!metrics.data && !metrics.error} icon="bolt" /><MetricCard label="Guard p95" value={metrics.data?.guard_p95_ms} unit="ms" detail="Guard evaluation latency" loading={!metrics.data && !metrics.error} icon="shield" /></section>
        <section id="defense" className="defense-banner"><div className="defense-emblem"><Icon name="bolt" size={28} /></div><div className="defense-copy"><span className="eyebrow">AUTONOMOUS DEFENSE LOOP</span><h2>Turn attacks into stronger guardrails.</h2><p>Run an evaluation, review each version, and follow the learning process live.</p></div><div className="defense-action"><button className="primary-button" onClick={() => void run.start()} disabled={run.busy}>{run.busy ? <span className="spinner" /> : <Icon name="bolt" size={16} />}{run.status === 'starting' ? 'Starting…' : run.status === 'running' ? 'Running…' : 'Run defense loop'}{!run.busy && <Icon name="arrow" size={16} />}</button><span className={`run-status ${run.status}`}><span className="small-dot" />{statusText}</span></div></section>
        {run.error && <p role="alert" className="error-banner">{run.error}</p>}
        <div className="run-grid"><section className="panel scoreboard"><div className="panel-heading"><div><h2><Icon name="shield" />Version evaluation</h2><p>Attack outcomes and happy path validation</p></div><span className="pill neutral">{evaluations.length} versions</span></div><div className="table-scroll"><table><thead><tr><th>Version</th><th>Attacks</th><th>Succeeded</th><th>Infra errors</th><th>Happy path</th><th>Verdict</th></tr></thead><tbody>{evaluations.map((result) => <EvaluationRow key={result.version} result={result} />)}</tbody></table></div>{!evaluations.length && <div className="empty-state"><span className="empty-icon"><Icon name="shield" size={24} /></span><strong>Every version has a story.</strong><p>{run.busy ? 'Waiting for the first evaluation result…' : 'Start a defense loop to compare attack outcomes.'}</p></div>}<div className="panel-footer"><span className="small-dot" />Results update as each evaluation completes</div></section>
          <section className="panel activity-panel"><div className="panel-heading"><div><h2><Icon name="terminal" />Run activity</h2><p>{run.runId ? `Run ${run.runId}` : 'A live trail of the defense loop'}</p></div><span className={`pill ${run.busy ? 'green' : 'neutral'}`}>{run.busy ? 'Live' : run.status === 'done' ? 'Complete' : 'Standby'}</span></div>{run.events.length ? <ol className="timeline" aria-label="Run events">{run.events.map((event) => <EventItem key={event.id} event={event} />)}</ol> : <div className="empty-state"><span className="empty-icon"><Icon name="pulse" size={24} /></span><strong>{run.busy ? 'Listening for events…' : 'Ready when you are.'}</strong><p>Loop steps will appear here as they happen.</p></div>}</section></div>
        <div className="data-grid"><section className="panel" id="hunt"><div className="panel-heading"><div><h2><Icon name="search" />Database fleet hunt</h2><p>Discover database matches across your fleet</p></div><button className="secondary-button" onClick={() => void hunt.refresh({ agent: agentFilter.trim() })} disabled={hunt.loading}><Icon name="refresh" size={15} />{hunt.loading ? 'Searching…' : 'Refresh hunt'}</button></div><div className="hunt-filter"><Icon name="search" size={14} /><input aria-label="Filter fleet hunt by agent" placeholder="All agents · enter an agent ID to filter" value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)} disabled={hunt.loading} /></div>{hunt.error && <p role="alert" className="inline-error">{hunt.error}</p>}{hunt.data?.rows.length ? <QueryRows rows={hunt.data.rows} /> : <div className="empty-state compact"><span className="empty-icon"><Icon name="search" size={24} /></span><strong>{hunt.loading ? 'Searching the fleet…' : hunt.data ? 'No database matches found.' : 'Your next discovery starts here.'}</strong><p>{hunt.data ? 'The latest query returned no matches.' : 'Refresh the hunt to query current database activity.'}</p></div>}<div className="panel-footer"><QueryMeta data={hunt.data} /></div></section>
          <section className="panel" id="denied"><div className="panel-heading"><div><h2><Icon name="shield" />Denied operations</h2><p>Blocked tool calls from your fleet</p></div><span className="pill red">{blocked.data ? `${blocked.data.rows.length} returned` : 'Pending'}</span></div>{blocked.error && <p role="status" className="inline-error">{blocked.error}{blocked.data && ' Showing the last available rows.'}</p>}{blocked.data?.rows.length ? <QueryRows rows={blocked.data.rows} feed /> : <div className="empty-state compact"><span className="empty-icon"><Icon name="shield" size={24} /></span><strong>{blocked.data ? 'No denied operations returned.' : blocked.error ? 'Feed unavailable.' : 'Connecting to the denied feed…'}</strong><p>{blocked.data ? 'The latest query returned no blocked tool calls.' : 'Recent blocked operations will appear here.'}</p></div>}<div className="panel-footer"><QueryMeta data={blocked.data} /><span className="poll-label">Refreshes every 2s</span></div></section></div>
        <footer className="page-footer"><span><Icon name="shield" size={14} /> Albert AI</span><span>Autonomous defense. Observable by design.</span></footer>
      </main></div>
  </div>;
}
