-- Remover restrição estrita de períodos pré-definidos na tabela schedules.
-- Os agendamentos agora suportam padrões dinâmicos como "week:1"..."week:5" e "month:1"..."month:31",
-- além dos períodos tradicionais ("yesterday", "day", etc.).

ALTER TABLE public.schedules
  DROP CONSTRAINT IF EXISTS schedules_period_check;
