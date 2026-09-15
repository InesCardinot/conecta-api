import { selectEvents, signals } from './analytics.js';

// Historical evidence and present-day actionability are distinct questions.
export function historicalSignals(db, filter, now = Date.now()) {
  const evaluatedAt = Math.min(now, Date.parse(`${filter.to}T23:59:59.999Z`));
  const observed = selectEvents(db, filter).filter((e) => Date.parse(e.occurredAt) <= evaluatedAt);
  const profiles = new Set(observed.map((e) => e.profileId));
  const history = selectEvents(db, { ...filter, from: '0001-01-01' }).filter(
    (e) => profiles.has(e.profileId) && Date.parse(e.occurredAt) <= evaluatedAt,
  );
  const currentEvents = selectEvents(db, {
    from: '0001-01-01',
    to: '9999-12-31',
    segment: filter.segment,
  }).filter((e) => Date.parse(e.occurredAt) <= now);
  const active = new Set(signals(db, currentEvents, now).map((s) => s.id));
  const items = signals(db, history, evaluatedAt).map((signal) => ({
    ...signal,
    ruleVersion: '2',
    evaluatedAt: new Date(evaluatedAt).toISOString(),
    activeNow: active.has(signal.id),
    statusScope: 'current',
    reason: signal.reason.replaceAll('no período', 'até a data de referência'),
  }));
  return {
    simulated: true,
    filter,
    evaluatedAt: new Date(evaluatedAt).toISOString(),
    selectionScope: 'profiles-observed-in-range',
    evidenceScope: 'history-through-reference',
    total: items.length,
    items: items.slice(filter.offset, filter.offset + filter.limit),
  };
}
