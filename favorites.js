export function normalizeFavoriteIds(ids) {
    const seen = new Set();
    return ids.filter(id => typeof id === 'string' && id && !seen.has(id) && seen.add(id));
}

export function addFavorite(ids, id) {
    return normalizeFavoriteIds([...ids, id]);
}

export function removeFavorite(ids, id) {
    return normalizeFavoriteIds(ids).filter(item => item !== id);
}

export function moveFavorite(ids, fromIndex, toIndex) {
    const result = normalizeFavoriteIds(ids);
    if (fromIndex < 0 || fromIndex >= result.length || toIndex < 0 || toIndex >= result.length)
        return result;
    const [item] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, item);
    return result;
}

export function deduplicateRunning(favoriteIds, runningApps, getId = app => app.get_id()) {
    const seen = new Set(normalizeFavoriteIds(favoriteIds));
    return runningApps.filter(app => {
        const id = getId(app);
        if (!id || seen.has(id))
            return false;
        seen.add(id);
        return true;
    });
}
