export function isDayLocked(engine, date) {
  return !!engine.one(`SELECT id FROM day_closeouts WHERE date = ?`, [date]);
}

export function assertDayOpen(engine, date) {
  if (isDayLocked(engine, date)) {
    throw new Error(`${date} has already been closed out and locked. No further entries can be written to it.`);
  }
}
