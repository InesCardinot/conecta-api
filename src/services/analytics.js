export function selectEvents(db, filter) {
  return db
    .prepare(
      `SELECT e.id, e.session_id AS sessionId, s.profile_id AS profileId,
    p.label, p.segment, e.type, e.page, e.target, e.occurred_at AS occurredAt
    FROM events e JOIN sessions s ON s.id=e.session_id JOIN profiles p ON p.id=s.profile_id
    WHERE s.consent=1 AND e.occurred_at>=? AND e.occurred_at<=?
    AND (? IS NULL OR p.segment=?) ORDER BY e.occurred_at, e.id`,
    )
    .all(
      `${filter.from}T00:00:00.000Z`,
      `${filter.to}T23:59:59.999Z`,
      filter.segment,
      filter.segment,
    );
}
function counts(events, getKey) {
  const data = new Map();
  for (const event of events) {
    const key = getKey(event);
    data.set(key, (data.get(key) ?? 0) + 1);
  }
  return [...data]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}
export function journeys(events) {
  const grouped = new Map();
  for (const event of events) {
    if (!grouped.has(event.profileId)) grouped.set(event.profileId, []);
    grouped.get(event.profileId).push(event);
  }
  return [...grouped].map(([profileId, timeline]) => ({
    profileId,
    label: timeline[0].label,
    segment: timeline[0].segment,
    sessions: new Set(timeline.map((e) => e.sessionId)).size,
    firstClick: timeline.find((e) => e.type === 'click')?.target ?? null,
    lastSeen: timeline.at(-1).occurredAt,
    completed: timeline.some((e) => e.type === 'journey_completed'),
    timeline,
  }));
}
export function summary(events) {
  const grouped = journeys(events);
  const firstBySession = new Map();
  for (const event of events)
    if (event.type === 'click' && !firstBySession.has(event.sessionId))
      firstBySession.set(event.sessionId, event);
  return {
    events: events.length,
    profiles: grouped.length,
    sessions: new Set(events.map((e) => e.sessionId)).size,
    returningProfiles: grouped.filter((p) => p.sessions > 1).length,
    completedProfiles: grouped.filter((p) => p.completed).length,
    pages: counts(
      events.filter((e) => e.type === 'page_view'),
      (e) => e.page,
    ),
    firstClicks: counts([...firstBySession.values()], (e) => e.target),
    daily: counts(events, (e) => e.occurredAt.slice(0, 10)).sort((a, b) =>
      a.label.localeCompare(b.label),
    ),
  };
}
export function signals(db, events, now = Date.now()) {
  const result = [];
  for (const journey of journeys(events)) {
    const add = (rule, title, reason, recommendation, priority) => {
      const id = `${journey.profileId}:${rule}`;
      result.push({
        id,
        profileId: journey.profileId,
        label: journey.label,
        rule,
        title,
        reason,
        recommendation,
        priority,
        status:
          db.prepare('SELECT status FROM actions WHERE signal_id=?').get(id)?.status ?? 'open',
      });
    };
    const days = Math.floor((now - Date.parse(journey.lastSeen)) / 86400_000);
    if (days >= 7 && !journey.completed)
      add(
        'inactive-7d',
        'Jornada sem retorno',
        `${days} dias desde o último evento observado no período.`,
        'Revisar contexto e planejar orientação para retomar a jornada.',
        'alta',
      );
    const help = journey.timeline.filter((e) => e.type === 'click' && e.target === 'ajuda').length;
    if (help >= 2)
      add(
        'repeated-help',
        'Ajuda recorrente',
        `${help} cliques em ajuda no período.`,
        'Revisar a orientação disponível e oferecer um próximo passo claro.',
        'media',
      );
    const opportunities = journey.timeline.filter(
      (e) => e.type === 'click' && e.target === 'explorar',
    ).length;
    if (opportunities >= 2 && !journey.completed)
      add(
        'opportunity-interest',
        'Interesse em oportunidades',
        `${opportunities} explorações sem conclusão observada no período.`,
        'Planejar conteúdo relacionado ao interesse demonstrado.',
        'media',
      );
  }
  return result;
}
export function csv(events) {
  const cell = (value) => {
    let text = String(value ?? '');
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const columns = [
    'id',
    'sessionId',
    'profileId',
    'segment',
    'type',
    'page',
    'target',
    'occurredAt',
  ];
  return (
    '\uFEFF' +
    [
      columns.join(','),
      ...events.map((row) => columns.map((key) => cell(row[key])).join(',')),
    ].join('\r\n')
  );
}
