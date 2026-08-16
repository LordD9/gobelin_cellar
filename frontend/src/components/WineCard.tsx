import { Link } from 'react-router-dom';
import type { WineResponse } from '../types';
import { bottlesLabel, drinkStatus, STATUS_LABELS, TYPE_LABELS, wineTitle } from '../wineStatus';

export function WineCard({ wine }: { wine: WineResponse }) {
  const status = drinkStatus(wine);
  return (
    <Link to={`/vins/${wine.id}`} className="wine-card glass">
      <span className={`wine-stripe ${wine.type}`} aria-hidden="true" />
      <div>
        <h3>{wineTitle(wine)}</h3>
        <p className="meta">
          {TYPE_LABELS[wine.type]}
          {wine.millesime ? ` · ${wine.millesime}` : ''}
          {wine.appellation ? ` · ${wine.appellation}` : wine.region ? ` · ${wine.region}` : ''}
          {' · '}
          {bottlesLabel(wine.quantity)}
        </p>
        {wine.location_path && <p className="meta">{wine.location_path}</p>}
      </div>
      <span className={`badge ${status}`}>{STATUS_LABELS[status]}</span>
    </Link>
  );
}
