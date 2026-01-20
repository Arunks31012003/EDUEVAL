// Helpers to resolve audio/media URLs and determine mime types
export function resolveAudioUrl(audioUrl) {
  if (!audioUrl) return '';
  const API_BASE = process.env.REACT_APP_API_BASE_URL || '';

  // If already a full URL, return as-is
  if (/^https?:\/\//i.test(audioUrl)) return audioUrl;

  // If the path already targets the API (starts with /api), make it absolute with the API base
  if (audioUrl.startsWith('/api/')) {
    // If API_BASE is empty, return the relative path to preserve current behavior
    return API_BASE ? `${API_BASE}${audioUrl}` : audioUrl;
  }

  // If audioUrl is a local Uploads path, proxy it through /api/files and prefix API base
  if (audioUrl.startsWith('/Uploads')) {
    const path = `/api/files${audioUrl}`;
    return API_BASE ? `${API_BASE}${path}` : path;
  }
  if (audioUrl.startsWith('Uploads')) {
    const path = `/api/files/${audioUrl}`;
    return API_BASE ? `${API_BASE}${path}` : path;
  }

  // If it's likely a Google Drive file ID, route to external proxy on the API server
  if (/^[a-zA-Z0-9_-]+$/.test(audioUrl)) {
    const path = `/api/external?url=${encodeURIComponent(audioUrl)}`;
    return API_BASE ? `${API_BASE}${path}` : path;
  }

  // Fallback: return as-is (could be a relative path already correct for public folder)
  return audioUrl;
}

export function getAudioMimeType(audioUrl) {
  if (!audioUrl) return 'audio/webm';
  const ext = (audioUrl.split('.').pop() || '').toLowerCase();
  if (ext === 'mp3') return 'audio/mpeg';
  if (ext === 'wav') return 'audio/wav';
  if (ext === 'ogg') return 'audio/ogg';
  if (ext === 'webm') return 'audio/webm';
  return 'audio/webm';
}

export default { resolveAudioUrl, getAudioMimeType };
