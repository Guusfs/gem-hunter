// get/set cache com timeout
const apiCache = new Map();

export function getCachedData(key) {
  const cached = apiCache.get(key);
  const maxAge = 5 * 60 * 1000; // 5 minutos
  if (cached && Date.now() - cached.timestamp < maxAge) {
    return cached.data;
  }
  return null;
}

export function setCachedData(key, data) {
  apiCache.set(key, {
    data,
    timestamp: Date.now()
  });
}
