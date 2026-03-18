import pool from './db.js';

function normalizeToISODate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  const s = String(value);
  if (s.length < 10) return null;
  // Aceita 'YYYY-MM-DD' ou 'YYYY-MM-DDTHH:mm:ss...' (pegamos só o dia).
  return s.slice(0, 10);
}

function parseISODateToUTC(dateStr) {
  // Garante que não dependa do fuso local.
  const d = String(dateStr).slice(0, 10);
  return new Date(`${d}T00:00:00.000Z`);
}

function toISODateUTC(d) {
  return d.toISOString().slice(0, 10);
}

function addDaysUTC(d, days) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function clampDayUTC(year, monthIndex, day) {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Math.min(day, lastDay);
}

export function calculateNextRunDateISO(currentDateISO, frequency, day_of_month) {
  const current = parseISODateToUTC(currentDateISO);
  const day = Number(day_of_month ?? current.getUTCDate());

  const lastDayOfMonth = (year, monthIndex0Based) => new Date(Date.UTC(year, monthIndex0Based + 1, 0)).getUTCDate();

  if (frequency === 'daily') {
    return toISODateUTC(addDaysUTC(current, 1));
  }

  if (frequency === 'weekly') {
    return toISODateUTC(addDaysUTC(current, 7));
  }

  if (frequency === 'monthly') {
    const nextMonth0 = current.getUTCMonth() + 1;
    const nextYear = current.getUTCFullYear() + Math.floor(nextMonth0 / 12);
    const nextMonth = nextMonth0 % 12;
    const clampedDay = Math.min(day, lastDayOfMonth(nextYear, nextMonth));
    return toISODateUTC(new Date(Date.UTC(nextYear, nextMonth, clampedDay)));
  }

  if (frequency === 'yearly') {
    const year = current.getUTCFullYear() + 1;
    const month = current.getUTCMonth();
    const clampedDay = Math.min(day, lastDayOfMonth(year, month));
    return toISODateUTC(new Date(Date.UTC(year, month, clampedDay)));
  }

  // fallback: se vier algo inesperado, não trava
  return toISODateUTC(addDaysUTC(current, 1));
}

function isValidISODateStr(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function processRecurringTransactions(userId) {
  const todayISO = new Date().toISOString().slice(0, 10);

  function maxIterationsForFrequency(f) {
    if (f === 'daily') return 60;
    if (f === 'weekly') return 104; // ~2 anos
    if (f === 'monthly') return 48; // ~4 anos
    if (f === 'yearly') return 15;
    return 60;
  }

  const maxRecurringToProcess = 12;

  const { rows } = await pool.query(
    `SELECT
      id, user_id,
      account_id, category_id, type, amount, description,
      frequency, day_of_month, next_run_date, is_active
     FROM recurring_transactions
     WHERE user_id = $1
       AND is_active = true
       AND next_run_date <= $2
     ORDER BY next_run_date ASC`,
    [userId, todayISO]
  );

  const dueRows = rows.slice(0, maxRecurringToProcess);
  for (const r of dueRows) {
    let cursorISO = normalizeToISODate(r.next_run_date);
    if (!cursorISO) continue;

    const maxIterations = maxIterationsForFrequency(r.frequency);

    try {
      let iterations = 0;
      while (cursorISO <= todayISO && iterations < maxIterations) {
        if (!isValidISODateStr(cursorISO)) break;

        // Insere a transação apenas se ainda não existir para (recurring_id, transaction_date)
        await pool.query(
          `INSERT INTO transactions
             (user_id, type, amount, description, category_id, account_id, transaction_date, status, is_recurring, recurring_id)
           SELECT
             $1, $2, $3, $4, $5, $6, $7, $8, true, $9
           WHERE NOT EXISTS (
             SELECT 1 FROM transactions
             WHERE user_id = $1
               AND recurring_id = $9
               AND transaction_date = $7
           )`,
          [
            userId,
            r.type,
            r.amount,
            r.description,
            r.category_id,
            r.account_id,
            cursorISO,
            'completed',
            r.id,
          ]
        );

        // Avança para a próxima ocorrência
        const nextISO = calculateNextRunDateISO(cursorISO, r.frequency, r.day_of_month);
        if (!isValidISODateStr(nextISO)) {
          cursorISO = nextISO;
          break;
        }
        // Evita loops caso por algum motivo o cálculo não avance
        if (nextISO <= cursorISO) break;
        cursorISO = nextISO;
        iterations += 1;
      }

      // Atualiza próximo run apenas se a data estiver válida
      if (isValidISODateStr(cursorISO)) {
        await pool.query(
          `UPDATE recurring_transactions
           SET next_run_date = $1
           WHERE id = $2 AND user_id = $3`,
          [cursorISO, r.id, userId]
        );
      }
    } catch (err) {
      // Nunca derrubar as rotas de leitura por causa de uma recorrência mal formatada
      console.error('processRecurringTransactions error (recurring_id):', r.id, err);
    }
  }
}

