window.RELV_CONFIG = Object.assign(
  {
    apiBase: 'https://relv-backend.vercel.app/api'
  },
  window.RELV_CONFIG || {}
);

window.relvApiUrl = function relvApiUrl(path) {
  const base = String(window.RELV_CONFIG.apiBase || '').replace(/\/$/, '');
  const cleanPath = String(path || '').startsWith('/') ? path : `/${path || ''}`;

  return base ? `${base}${cleanPath}` : '';
};
