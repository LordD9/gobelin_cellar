export function getBasePath(): string {
  const injected = window.__GOBLIN_BASE_PATH__;
  if (typeof injected === 'string' && injected && injected !== '/') {
    return injected.replace(/\/+$/, '');
  }
  return '';
}

export function apiRoot(): string {
  const base = getBasePath();
  return base ? `${base}/api` : '/api';
}

declare global {
  interface Window {
    __GOBLIN_BASE_PATH__?: string;
  }
}
