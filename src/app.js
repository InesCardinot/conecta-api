import express from 'express';
import { randomUUID, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { ApiError, requireValue, object, validateEvent, filters, statuses } from './validation.js';
import { selectEvents, summary, journeys, signals, csv } from './services/analytics.js';

const hash = (value) => createHash('sha256').update(value).digest('hex');
export function createApp(
  db,
  { readOnly = true, adminToken = '', origins = [], rateLimit = 300 } = {},
) {
  if (!readOnly && adminToken.length < 32)
    throw new Error('ADMIN_TOKEN precisa de pelo menos 32 caracteres. Execute npm run setup.');
  const app = express();
  app.disable('x-powered-by');
  const requests = new Map();
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    });
    req.requestId = randomUUID();
    res.set('X-Request-Id', req.requestId);
    const origin = req.get('origin');
    if (origin && !origins.includes(origin))
      return next(new ApiError(403, 'ORIGIN_DENIED', 'Origem não autorizada.'));
    if (origin)
      res.set({
        'Access-Control-Allow-Origin': origin,
        Vary: 'Origin',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      });
    const now = Date.now();
    for (const [key, value] of requests) if (now > value.until) requests.delete(key);
    const key = req.ip;
    const bucket = requests.get(key) ?? { count: 0, until: now + 60_000 };
    bucket.count++;
    requests.set(key, bucket);
    if (bucket.count > rateLimit) {
      res.set('Retry-After', '60');
      return next(new ApiError(429, 'RATE_LIMIT', 'Aguarde um minuto antes de tentar novamente.'));
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use(express.json({ limit: '16kb', strict: true }));
  const writable = (req, res, next) =>
    readOnly
      ? next(new ApiError(403, 'READ_ONLY', 'Demonstração pública somente para leitura.'))
      : next();
  const admin = (req, res, next) => {
    if (readOnly && req.method === 'GET') return next();
    const token = (req.get('authorization') ?? '').replace(/^Bearer /, '');
    if (
      !token ||
      !adminToken ||
      !timingSafeEqual(Buffer.from(hash(token)), Buffer.from(hash(adminToken)))
    )
      return next(new ApiError(401, 'UNAUTHORIZED', 'Token administrativo inválido.'));
    next();
  };
  const session = (req, res, next) => {
    const token = (req.get('authorization') ?? '').replace(/^Bearer /, '');
    const row = db.prepare('SELECT * FROM sessions WHERE id=?').get(req.params.id);
    if (!row || row.token_hash !== hash(token) || row.expires_at < new Date().toISOString())
      return next(new ApiError(401, 'INVALID_SESSION', 'Sessão inválida ou expirada.'));
    req.session = row;
    next();
  };
  app.get('/health', (req, res) => {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok', version: '0.1.0', simulated: true, readOnly });
  });
  app.get('/api/v1/catalog', (req, res) =>
    res.json({
      simulated: true,
      profiles: db.prepare('SELECT * FROM profiles').all(),
      interests: ['energia', 'tecnologia', 'servicos'],
      readOnly,
    }),
  );
  app.post('/api/v1/sessions', writable, (req, res) => {
    object(req.body, ['profileId', 'analyticsConsent']);
    requireValue(
      typeof req.body.profileId === 'string' &&
        db.prepare('SELECT id FROM profiles WHERE id=?').get(req.body.profileId),
      'Selecione um perfil fictício do catálogo.',
    );
    requireValue(
      req.body.analyticsConsent === true,
      'A coleta demonstrativa exige adesão explícita.',
    );
    const id = randomUUID(),
      token = randomBytes(32).toString('hex'),
      now = new Date().toISOString();
    db.prepare('INSERT INTO sessions VALUES (?, ?, ?, 1, ?, ?)').run(
      id,
      req.body.profileId,
      hash(token),
      now,
      new Date(Date.now() + 86400_000).toISOString(),
    );
    res.status(201).json({ id, token, expiresIn: 86400, simulated: true });
  });
  app.get('/api/v1/sessions/:id/context', session, (req, res) =>
    res.json({
      profileId: req.session.profile_id,
      analyticsConsent: Boolean(req.session.consent),
      simulated: true,
      nextStep: 'Explore oportunidades e peça ajuda quando precisar.',
    }),
  );
  app.patch('/api/v1/sessions/:id/preferences', writable, session, (req, res) => {
    object(req.body, ['analyticsConsent']);
    requireValue(
      typeof req.body.analyticsConsent === 'boolean',
      'analyticsConsent deve ser booleano.',
    );
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE sessions SET consent=? WHERE id=?').run(
        Number(req.body.analyticsConsent),
        req.params.id,
      );
      if (!req.body.analyticsConsent)
        db.prepare('DELETE FROM events WHERE session_id=?').run(req.params.id);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    res.json({
      analyticsConsent: req.body.analyticsConsent,
      eventsRemoved: !req.body.analyticsConsent,
    });
  });
  app.post('/api/v1/sessions/:id/events', writable, session, (req, res) => {
    if (!req.session.consent)
      throw new ApiError(403, 'CONSENT_REQUIRED', 'Coleta desativada nesta sessão.');
    const event = validateEvent(req.body);
    const previous = db.prepare('SELECT * FROM events WHERE id=?').get(event.id);
    if (previous) {
      if (
        previous.session_id !== req.params.id ||
        previous.type !== event.type ||
        previous.page !== event.page ||
        previous.target !== event.target ||
        previous.occurred_at !== event.occurredAt
      )
        throw new ApiError(409, 'ID_CONFLICT', 'id já utilizado com outro conteúdo.');
      return res.json({ accepted: true, duplicate: true, id: event.id });
    }
    db.prepare('INSERT INTO events VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      event.id,
      req.params.id,
      event.type,
      event.page,
      event.target,
      event.occurredAt,
      new Date().toISOString(),
    );
    res.status(201).json({ accepted: true, duplicate: false, id: event.id });
  });
  app.use('/api/v1/admin', admin);
  const data = (req) => {
    const filter = filters(req.query);
    return { filter, events: selectEvents(db, filter) };
  };
  app.get('/api/v1/admin/summary', (req, res) => {
    const { filter, events } = data(req);
    res.json({ simulated: true, filter, ...summary(events) });
  });
  app.get('/api/v1/admin/journeys', (req, res) => {
    const { filter, events } = data(req),
      items = journeys(events);
    res.json({
      simulated: true,
      total: items.length,
      items: items.slice(filter.offset, filter.offset + filter.limit),
    });
  });
  app.get('/api/v1/admin/signals', (req, res) => {
    const { filter, events } = data(req),
      items = signals(db, events);
    res.json({
      simulated: true,
      total: items.length,
      items: items.slice(filter.offset, filter.offset + filter.limit),
    });
  });
  app.patch('/api/v1/admin/signals/:id', writable, (req, res) => {
    object(req.body, ['status']);
    requireValue(statuses.includes(req.body.status), 'Status inválido.');
    const parts = req.params.id.split(':');
    requireValue(
      parts.length === 2 &&
        ['inactive-7d', 'repeated-help', 'opportunity-interest'].includes(parts[1]) &&
        db.prepare('SELECT id FROM profiles WHERE id=?').get(parts[0]),
      'Sinal inválido.',
    );
    const all = selectEvents(db, { from: '2000-01-01', to: '2100-01-01', segment: null });
    requireValue(
      signals(db, all).some((item) => item.id === req.params.id),
      'Sinal não está ativo na base completa.',
    );
    const previous =
      db.prepare('SELECT status FROM actions WHERE signal_id=?').get(req.params.id)?.status ??
      'open';
    const now = new Date().toISOString();
    db.exec('BEGIN');
    try {
      db.prepare(
        'INSERT INTO actions VALUES (?, ?, ?) ON CONFLICT(signal_id) DO UPDATE SET status=excluded.status, updated_at=excluded.updated_at',
      ).run(req.params.id, req.body.status, now);
      db.prepare(
        'INSERT INTO audit (signal_id, previous_status, status, created_at) VALUES (?, ?, ?, ?)',
      ).run(req.params.id, previous, req.body.status, now);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    res.json({ id: req.params.id, status: req.body.status, simulated: true });
  });
  app.get('/api/v1/admin/audit', (req, res) => {
    object(req.query, ['limit', 'offset']);
    const f = filters(req.query);
    res.json({
      items: db
        .prepare('SELECT * FROM audit ORDER BY id DESC LIMIT ? OFFSET ?')
        .all(f.limit, f.offset),
    });
  });
  app.get('/api/v1/admin/events.csv', (req, res) => {
    const { events } = data(req);
    if (events.length > 10000)
      throw new ApiError(400, 'EXPORT_LIMIT', 'Reduza o período para até 10.000 eventos.');
    res
      .set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="conecta-eventos-simulados.csv"',
      })
      .send(csv(events));
  });
  app.use((req, res, next) => next(new ApiError(404, 'NOT_FOUND', 'Recurso não encontrado.')));
  app.use((error, req, res, next) => {
    const status =
      error.status === 413
        ? 413
        : error instanceof SyntaxError && error.status === 400
          ? 400
          : (error.status ?? 500);
    res
      .status(status)
      .json({
        error: {
          code: error.code ?? (status === 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST'),
          message:
            status === 500 ? 'Erro interno. Consulte o responsável pela API.' : error.message,
          requestId: req.requestId,
        },
      });
  });
  return app;
}
