export function get(key, fallback = null) {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

export function set(key, value) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function remove(key) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

export function getScores(gameId) {
  return get(`gp_scores_${gameId}`, []);
}

export function saveScore(gameId, entry) {
  const scores = getScores(gameId);
  scores.push({ ...entry, date: Date.now() });
  scores.sort((a, b) => b.score - a.score);
  const top = scores.slice(0, 20);
  set(`gp_scores_${gameId}`, top);
  return top;
}

export function getRecentlyPlayed() {
  return get('gp_recent', []);
}

export function addRecentlyPlayed(gameId) {
  const recent = getRecentlyPlayed().filter(id => id !== gameId);
  recent.unshift(gameId);
  set('gp_recent', recent.slice(0, 10));
}

export function getFavorites() {
  return get('gp_favorites', []);
}

export function toggleFavorite(gameId) {
  const favs = getFavorites();
  const idx = favs.indexOf(gameId);
  if (idx >= 0) { favs.splice(idx, 1); } else { favs.push(gameId); }
  set('gp_favorites', favs);
  return favs;
}

export function getStats() {
  return get('gp_stats', { totalGames: 0, totalWins: 0, xp: 0, level: 1 });
}

export function updateStats(delta) {
  const stats = getStats();
  const updated = {
    ...stats,
    totalGames: (stats.totalGames || 0) + (delta.games || 0),
    totalWins:  (stats.totalWins  || 0) + (delta.wins  || 0),
    xp:         (stats.xp         || 0) + (delta.xp    || 0),
  };
  updated.level = Math.floor(1 + Math.sqrt(updated.xp / 100));
  set('gp_stats', updated);
  return updated;
}

export function getAchievements() {
  return get('gp_achievements', []);
}

export function unlockAchievement(id) {
  const list = getAchievements();
  if (!list.includes(id)) {
    list.push(id);
    set('gp_achievements', list);
    return true;
  }
  return false;
}

export function getControls() {
  return get('gp_controls', null);
}

export function saveControls(controls) {
  set('gp_controls', controls);
}
