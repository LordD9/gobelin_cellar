import { Link } from 'react-router-dom';
import logo from '../assets/logo.jpg';

export function EmptyState({
  title,
  text,
  actionLabel,
  actionTo,
}: {
  title: string;
  text: string;
  actionLabel?: string;
  actionTo?: string;
}) {
  return (
    <div className="empty glass">
      <img src={logo} alt="" />
      <h2>{title}</h2>
      <p className="muted">{text}</p>
      {actionTo && actionLabel && (
        <p style={{ marginTop: 16 }}>
          <Link to={actionTo} className="btn btn-primary">
            {actionLabel}
          </Link>
        </p>
      )}
    </div>
  );
}
