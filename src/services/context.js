// Only events from the authenticated session may inform its next step.
export function sessionContext(events, consent) {
  const result = (rule, nextStep, reason, page, target) => ({
    nextStep,
    recommendation: { rule, reason, page, target, ruleVersion: '1', simulated: true },
  });
  if (!consent)
    return result(
      'collection-disabled',
      'Você pode continuar navegando com a coleta desativada.',
      'A coleta desta sessão está desativada.',
      'home',
      'page',
    );
  if (events.some((e) => e.type === 'journey_completed'))
    return result(
      'completed',
      'Explore outras oportunidades quando desejar.',
      'Há uma conclusão demonstrativa nesta sessão.',
      'oportunidades',
      'explorar',
    );
  const help = events.filter((e) => e.type === 'click' && e.target === 'ajuda').length;
  if (help >= 2)
    return result(
      'repeated-help',
      'Consulte a orientação para o próximo passo da jornada.',
      `${help} cliques em ajuda nesta sessão; isso não comprova dificuldade.`,
      'ajuda',
      'ajuda',
    );
  const preference = events.findLast(
    (e) => e.type === 'preference' && ['energia', 'tecnologia', 'servicos'].includes(e.target),
  );
  if (preference)
    return result(
      'explicit-interest',
      `Explore oportunidades de ${preference.target}.`,
      'Sugestão baseada na última preferência explícita desta sessão.',
      'oportunidades',
      preference.target,
    );
  if (events.some((e) => e.type === 'click' && e.target === 'explorar'))
    return result(
      'exploring',
      'Escolha uma área de interesse para orientar sua exploração.',
      'Foi observado um clique em explorar nesta sessão.',
      'preferencias',
      'page',
    );
  return result(
    'welcome',
    'Explore oportunidades e peça ajuda quando precisar.',
    'Ainda não há um sinal específico nesta sessão.',
    'oportunidades',
    'explorar',
  );
}
