export const SYNCABLE_KEYS = new Set([
  "fmv_extra",
  "fmv_ocultos",
  "fmv_bloqueados",
  "fmv_ocultos_det",
  "fmv_listas_ocultas",
  "fmv_det_listas_ocultas",
  "fmv_palabras_excluidas",
  "fmv_perfiles",
  "fmv_vperfiles",
  "fmv_sort_canales",
  "fmv_sort_mis",
  "fmv_card_shape",
  "fmv_horarios_rutina",
  "fmv_modo_calma",
  "fmv_filtro_azul",
  "fmv_pausas_activas"
]);

export function isSyncableKey(key) {
  return SYNCABLE_KEYS.has(key) ||
    /^fmv_cuenta_(hija|hijo)_(?:fmv_videos|fmv_videos_ocultos|limite_minutos)$/.test(key) ||
    /^fmv_avatar_(hija|hijo)$/.test(key);
}

export function snapshotSyncableStorage(storage) {
  const snapshot = new Map();
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && isSyncableKey(key)) snapshot.set(key, storage.getItem(key));
  }
  return snapshot;
}

export function encodeStoredValue(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}
