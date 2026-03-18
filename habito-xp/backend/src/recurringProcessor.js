import pool from './db.js';

function parseISODateToUTC(dateStr) {
  // Garante que não dependa do fuso local.
  return new Date(`${dateStr}T00:00:00.000Z`);
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

export async function processRecurringTransactions(userId) {
  const todayISO = new Date().toISOString().slice(0, 10);

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

  for (const r of rows) {
    let cursorISO = String(r.next_run_date);
    const maxIterations = 240; // evita loops/erros se a recorrência ficar atrasada demais
    let iterations = 0;

    while (cursorISO <= todayISO && iterations < maxIterations) {
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
      cursorISO = calculateNextRunDateISO(cursorISO, r.frequency, r.day_of_month);
      iterations += 1;
    }

    await pool.query(
      `UPDATE recurring_transactions
       SET next_run_date = $1
       WHERE id = $2 AND user_id = $3`,
      [cursorISO, r.id, userId]
    );
  }
}

