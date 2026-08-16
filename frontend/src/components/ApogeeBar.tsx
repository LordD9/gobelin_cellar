import { currentYear, formatWindow } from '../wineStatus';

export function ApogeeBar({
  drinkFrom,
  drinkUntil,
}: {
  drinkFrom: number | null;
  drinkUntil: number | null;
}) {
  const year = currentYear();
  if (drinkFrom == null && drinkUntil == null) {
    return <p className="muted">Aucune fenêtre d'apogée renseignée.</p>;
  }

  const start = drinkFrom ?? year - 2;
  const end = drinkUntil ?? year + 2;
  const span = Math.max(end - start, 1);
  const nowPct = Math.min(100, Math.max(0, ((year - start) / span) * 100));
  const fillPct = Math.min(100, Math.max(8, ((Math.min(year, end) - start) / span) * 100));

  return (
    <div>
      <p>{formatWindow(drinkFrom, drinkUntil)}</p>
      <div className="apogee-scale" aria-hidden="true">
        <div className="apogee-fill" style={{ width: `${fillPct}%` }} />
        <div className="apogee-now" style={{ left: `${nowPct}%` }} />
      </div>
      <div className="apogee-years">
        <span>{start}</span>
        <span>aujourd'hui · {year}</span>
        <span>{end}</span>
      </div>
    </div>
  );
}
