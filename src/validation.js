export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export function requireValue(condition, message) {
  if (!condition) throw new ApiError(400, 'INVALID_INPUT', message);
}
export function object(body, keys) {
  requireValue(body && typeof body === 'object' && !Array.isArray(body), 'Envie um objeto JSON.');
  requireValue(
    Object.keys(body).every((key) => keys.includes(key)),
    'Campo não permitido. Envie somente o contrato documentado.',
  );
}
export const types = ['page_view', 'click', 'preference', 'journey_completed'];
export const pages = ['home', 'empresa', 'oportunidades', 'ajuda', 'preferencias'];
export const targets = [
  'page',
  'explorar',
  'ajuda',
  'energia',
  'tecnologia',
  'servicos',
  'concluir',
];
export const statuses = ['open', 'planned', 'done', 'dismissed'];
export function validateEvent(body) {
  object(body, ['id', 'type', 'page', 'target', 'occurredAt']);
  requireValue(
    typeof body.id === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id),
    'id deve ser UUID v4.',
  );
  requireValue(
    types.includes(body.type) && pages.includes(body.page) && targets.includes(body.target),
    'Tipo, página ou alvo fora do catálogo.',
  );
  const time = Date.parse(body.occurredAt);
  requireValue(
    typeof body.occurredAt === 'string' &&
      Number.isFinite(time) &&
      time <= Date.now() + 60_000 &&
      time >= Date.now() - 86400_000,
    'occurredAt deve estar nas últimas 24 horas (tolerância futura: 60 segundos).',
  );
  return { ...body, occurredAt: new Date(time).toISOString() };
}
export function filters(query) {
  object(query, ['from', 'to', 'segment', 'limit', 'offset']);
  const day = (value, fallback) => {
    if (value === undefined) return fallback;
    requireValue(
      typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value),
      'Use datas YYYY-MM-DD.',
    );
    requireValue(
      Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value,
      'Data inválida.',
    );
    return value;
  };
  const from = day(query.from, new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10));
  const to = day(query.to, new Date().toISOString().slice(0, 10));
  requireValue(
    from <= to && Date.parse(to) - Date.parse(from) <= 366 * 86400_000,
    'Intervalo deve ter até 366 dias e início anterior ao fim.',
  );
  requireValue(
    query.segment === undefined || ['energia', 'tecnologia', 'servicos'].includes(query.segment),
    'Segmento inválido.',
  );
  const number = (value, fallback, max) => {
    if (value === undefined) return fallback;
    requireValue(
      typeof value === 'string' && /^\d+$/.test(value) && Number(value) <= max,
      'Paginação inválida.',
    );
    return Number(value);
  };
  const limit = number(query.limit, 50, 200);
  requireValue(limit > 0, 'limit deve ser positivo.');
  return {
    from,
    to,
    segment: query.segment ?? null,
    limit,
    offset: number(query.offset, 0, 1_000_000),
  };
}
