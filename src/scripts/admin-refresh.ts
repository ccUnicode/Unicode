// One-off refresh for this release. Do not clear authentication or application storage.
export const ADMIN_REFRESH_RELEASE = 'recruitment-summary-2026-10-12';
export function refreshAdminOnce(browser = window) {
  const key = `admin-refreshed:${ADMIN_REFRESH_RELEASE}`;
  const url = new URL(browser.location.href);
  if (url.searchParams.get('panel_update') === ADMIN_REFRESH_RELEASE) return false;
  try {
    if (browser.localStorage.getItem(key)) return false;
    browser.localStorage.setItem(key, '1');
  } catch {
    // Without persistent storage, skip the reload to avoid loops and lost sessions.
    return false;
  }
  url.searchParams.set('panel_update', ADMIN_REFRESH_RELEASE);
  browser.location.replace(url.href);
  return true;
}
