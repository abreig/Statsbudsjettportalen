/**
 * Download a file from a backend URL that requires Bearer token authentication.
 * Uses fetch() instead of window.open() so the Authorization header is included.
 */
export async function downloadFileWithAuth(url: string, filename: string): Promise<void> {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error(`Nedlasting feilet: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}
