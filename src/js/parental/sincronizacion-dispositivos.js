import { createClient } from "@supabase/supabase-js";
import {
  encodeStoredValue,
  isSyncableKey,
  snapshotSyncableStorage
} from "./sync-state.js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const DEVICE_ID_KEY = "fmv_sync_device_id";
const HOUSEHOLD_ID_KEY = "fmv_sync_household_id";
const MAX_SYNC_BYTES = 256 * 1024;
const HEARTBEAT_MS = 45_000;
const POLL_MS = 1_500;

let supabase;
let sessionPromise;
let deviceId;
let householdId;
let userId;
let activeChannel;
let channelStatus = "CLOSED";
let heartbeatTimer;
let pollTimer;
let localSnapshot = new Map();
let syncBusy = false;
let storageListenerRegistered = false;
let pendingReload = false;
let reloadTimer;
let modal;
let modalStatus;
let deviceList;
let deviceSummary;

function messageOf(error) {
  return error && error.message ? error.message : String(error || "Error desconocido.");
}

function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function ensureSupabase() {
  if (!isConfigured()) {
    throw new Error("Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para activar la sincronización.");
  }
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });
  }
  return supabase;
}

function createDeviceId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return hex.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
}

function getDeviceId() {
  if (deviceId) return deviceId;
  deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId || !/^[0-9a-f-]{36}$/i.test(deviceId)) {
    deviceId = createDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

function detectPlatform() {
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "Android";
  if (/iPad|iPhone|iPod/i.test(ua)) return "iOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Macintosh|Mac OS/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Web";
}

function ensureSession() {
  if (!sessionPromise) {
    sessionPromise = (async function () {
      const api = ensureSupabase();
      const { data: sessionData, error: sessionError } = await api.auth.getSession();
      if (sessionError) throw sessionError;
      let session = sessionData.session;
      if (!session) {
        const { data, error } = await api.auth.signInAnonymously();
        if (error) throw error;
        session = data.session;
      }
      if (!session) throw new Error("No se pudo iniciar una sesión segura para este dispositivo.");
      userId = session.user.id;
      return api;
    })().catch(function (error) {
      sessionPromise = null;
      throw error;
    });
  }
  return sessionPromise;
}

async function cargarDispositivo() {
  const api = await ensureSession();
  const id = getDeviceId();
  const { data, error } = await api
    .from("fmv_devices")
    .select("id, household_id, name, platform")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    householdId = "";
    deviceId = createDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    localStorage.removeItem(HOUSEHOLD_ID_KEY);
    return null;
  }
  householdId = data.household_id;
  localStorage.setItem(HOUSEHOLD_ID_KEY, householdId);
  return data;
}

function setStatus(text, isError) {
  if (!modalStatus) return;
  modalStatus.textContent = text || "";
  modalStatus.classList.toggle("fmv-sync-error", Boolean(isError));
}

function currentDeviceName() {
  const input = modal && modal.caja.querySelector("[data-device-name]");
  return (input && input.value.trim()) || ("FreshMindVideo · " + detectPlatform());
}

function setVisiblePairingCode(code) {
  const container = modal.caja.querySelector("[data-pairing]");
  const output = modal.caja.querySelector("[data-pairing-code]");
  const copyButton = modal.caja.querySelector("[data-copy-code]");
  if (!container || !output || !copyButton) return;
  container.hidden = !code;
  output.textContent = code || "";
  copyButton.onclick = async function () {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("Código copiado. Caduca en 10 minutos y solo se puede usar una vez.");
    } catch (error) {
      setStatus("No se pudo copiar. Selecciona y copia el código manualmente.", true);
    }
  };
}

function formatLastSeen(value) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Sin actividad registrada";
  const age = Math.max(0, Date.now() - time);
  if (age < 90_000) return "En línea ahora";
  const minutes = Math.floor(age / 60_000);
  if (minutes < 60) return "Hace " + Math.max(1, minutes) + " min";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return "Hace " + hours + (hours === 1 ? " hora" : " horas");
  const days = Math.floor(hours / 24);
  return "Hace " + days + (days === 1 ? " día" : " días");
}

function renderDevices(rows) {
  if (!deviceList || !deviceSummary) return;
  deviceList.replaceChildren();
  const onlineCount = rows.filter((row) => Date.now() - new Date(row.last_seen_at).getTime() < 90_000).length;
  const recentCount = rows.filter((row) => Date.now() - new Date(row.last_seen_at).getTime() < 7 * 86_400_000).length;
  deviceSummary.innerHTML =
    '<div class="fmv-sync-stat"><strong>' + onlineCount + '</strong><span>En línea</span></div>' +
    '<div class="fmv-sync-stat"><strong>' + recentCount + '</strong><span>Activos esta semana</span></div>' +
    '<div class="fmv-sync-stat"><strong>' + rows.length + '</strong><span>Recientes (30 días)</span></div>';

  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "fmv-sync-empty";
    empty.textContent = "No hay dispositivos conectados durante los últimos 30 días.";
    deviceList.appendChild(empty);
    return;
  }

  rows.forEach((row) => {
    const age = Math.max(0, Date.now() - new Date(row.last_seen_at).getTime());
    const progress = Math.max(4, Math.round(100 * (1 - Math.min(age, 7 * 86_400_000) / (7 * 86_400_000))));
    const online = age < 90_000;
    const card = document.createElement("article");
    card.className = "fmv-sync-device";
    card.innerHTML =
      '<span class="fmv-sync-device-icon" aria-hidden="true">' +
        (/Android|iOS/i.test(row.platform) ? "📱" : /Web|Linux|Windows|macOS/i.test(row.platform) ? "💻" : "📺") +
      '</span><div class="fmv-sync-device-info"><strong></strong><span></span>' +
        '<div class="fmv-sync-activity"><i></i></div></div><span class="fmv-sync-online" aria-label="' +
        (online ? "En línea" : "Desconectado") + '"></span>';
    card.querySelector("strong").textContent = row.name + (row.id === deviceId ? " (este dispositivo)" : "");
    card.querySelector(".fmv-sync-device-info > span").textContent = row.platform + " · " + formatLastSeen(row.last_seen_at);
    card.querySelector(".fmv-sync-activity i").style.width = progress + "%";
    card.classList.toggle("is-online", online);
    deviceList.appendChild(card);
  });
}

async function refreshDevices() {
  if (!householdId || !deviceList) return;
  const { data, error } = await ensureSupabase()
    .from("fmv_devices")
    .select("id, name, platform, last_seen_at")
    .eq("household_id", householdId)
    .gte("last_seen_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
    .order("last_seen_at", { ascending: false });
  if (error) throw error;
  renderDevices(data || []);
}

function maybeReloadAfterRemoteChange() {
  if (!pendingReload || !document.body || document.body.classList.contains("viendo")) return;
  if (document.querySelector(".fmv-modal")) return;
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(function () {
    if (pendingReload && !document.body.classList.contains("viendo") && !document.querySelector(".fmv-modal")) {
      location.reload();
    }
  }, 900);
}

function applyRemoteRow(row) {
  if (!row || !isSyncableKey(row.key)) return false;
  const previous = localStorage.getItem(row.key);
  if (row.deleted) {
    localStorage.removeItem(row.key);
    localSnapshot.set(row.key, null);
    if (previous !== null) {
      pendingReload = true;
      return true;
    }
    return false;
  }
  const next = encodeStoredValue(row.value);
  localStorage.setItem(row.key, next);
  localSnapshot.set(row.key, next);
  if (previous !== next) {
    pendingReload = true;
    return true;
  }
  return false;
}

async function syncLocalChanges() {
  if (!householdId || syncBusy || document.visibilityState === "hidden") return;
  syncBusy = true;
  try {
    const snapshot = snapshotSyncableStorage(localStorage);
    const keys = new Set([...snapshot.keys(), ...localSnapshot.keys()]);
    const changes = [];
    keys.forEach((key) => {
      const current = snapshot.has(key) ? snapshot.get(key) : null;
      if (!localSnapshot.has(key) || localSnapshot.get(key) !== current) {
        if (current === null && !localSnapshot.has(key)) return;
        changes.push({
          household_id: householdId,
          key,
          value: current,
          deleted: current === null,
          updated_by: userId
        });
      }
    });
    if (!changes.length) return;

    const payload = changes;
    const bytes = new Blob([JSON.stringify(payload)]).size;
    if (bytes > MAX_SYNC_BYTES) {
      throw new Error("Los cambios superan el límite de sincronización de 256 KB.");
    }
    const { error } = await ensureSupabase()
      .from("fmv_sync_items")
      .upsert(payload, { onConflict: "household_id,key" });
    if (error) throw error;
    changes.forEach((change) => localSnapshot.set(change.key, change.deleted ? null : snapshot.get(change.key)));
    if (modalStatus) setStatus("Cambios sincronizados automáticamente.");
  } catch (error) {
    console.error("No se pudieron sincronizar los cambios familiares.", error);
    if (modalStatus) setStatus("Error de sincronización: " + messageOf(error), true);
  } finally {
    syncBusy = false;
  }
}

async function cargarEstadoRemoto() {
  const { data, error } = await ensureSupabase()
    .from("fmv_sync_items")
    .select("key, value, deleted, updated_by")
    .eq("household_id", householdId);
  if (error) throw error;

  localSnapshot = new Map();
  let changed = false;
  (data || []).forEach((row) => {
    if (row.updated_by !== userId) changed = applyRemoteRow(row) || changed;
    else localSnapshot.set(row.key, row.deleted ? null : localStorage.getItem(row.key));
  });
  if (changed) {
    pendingReload = true;
    maybeReloadAfterRemoteChange();
  }
  await syncLocalChanges();
}

async function startHouseholdSync() {
  if (!householdId) return;
  if (activeChannel) {
    await ensureSupabase().removeChannel(activeChannel);
    activeChannel = null;
  }
  const api = ensureSupabase();
  channelStatus = "CONNECTING";
  activeChannel = api
    .channel("fmv-household-" + householdId)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "fmv_sync_items",
      filter: "household_id=eq." + householdId
    }, function (event) {
      const row = event.new;
      if (row && row.updated_by !== userId && applyRemoteRow(row)) {
        maybeReloadAfterRemoteChange();
      }
    })
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "fmv_devices",
      filter: "household_id=eq." + householdId
    }, function () {
      refreshDevices().catch(function (error) {
        console.error("No se pudo actualizar la lista de dispositivos.", error);
      });
    })
    .subscribe(function (status, error) {
      channelStatus = status;
      if (status === "SUBSCRIBED") {
        setStatus("Sincronización automática activa.");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setStatus("No se pudo conectar en tiempo real: " + messageOf(error || status), true);
      }
    });

  await cargarEstadoRemoto();
  const id = getDeviceId();
  const heartbeat = async function () {
    if (document.visibilityState === "hidden") return;
    const { error } = await api.rpc("fmv_touch_device", { p_device_id: id });
    if (error) {
      console.error("No se pudo actualizar la presencia del dispositivo.", error);
      if (modalStatus) setStatus("No se pudo registrar la conexión: " + messageOf(error), true);
    } else if (deviceList) {
      refreshDevices().catch(function (refreshError) {
        console.error("No se pudo actualizar la lista de dispositivos.", refreshError);
      });
    }
  };
  await heartbeat();
  clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(heartbeat, HEARTBEAT_MS);
  clearInterval(pollTimer);
  pollTimer = setInterval(syncLocalChanges, POLL_MS);
  if (!storageListenerRegistered) {
    window.addEventListener("storage", syncLocalChanges);
    storageListenerRegistered = true;
  }
}

async function bootstrapKnownDevice() {
  if (!isConfigured() || !localStorage.getItem(DEVICE_ID_KEY) || !localStorage.getItem(HOUSEHOLD_ID_KEY)) return;
  try {
    const device = await cargarDispositivo();
    if (device) await startHouseholdSync();
  } catch (error) {
    console.error("No se pudo iniciar la sincronización del dispositivo.", error);
  }
}

async function createHousehold() {
  const api = await ensureSession();
  const { household_id: newHouseholdId, pairing_code: code, error } = await api
    .rpc("fmv_create_household", {
      p_device_id: getDeviceId(),
      p_name: currentDeviceName(),
      p_platform: detectPlatform()
    })
    .single();
  if (error) throw error;
  householdId = newHouseholdId;
  localStorage.setItem(HOUSEHOLD_ID_KEY, householdId);
  setVisiblePairingCode(code);
  await startHouseholdSync();
  await refreshDevices();
}

async function issuePairingCode() {
  const api = await ensureSession();
  const { data, error } = await api.rpc("fmv_issue_pairing_code", {
    p_device_id: getDeviceId()
  });
  if (error) throw error;
  setVisiblePairingCode(data);
  setStatus("Código válido por 10 minutos y de un solo uso.");
}

async function joinHousehold(code) {
  if (!/^[a-f0-9]{48}$/i.test(code)) {
    throw new Error("El código debe tener 48 caracteres hexadecimales.");
  }
  const api = await ensureSession();
  const { data: newHouseholdId, error } = await api.rpc("fmv_join_household", {
    p_pairing_code: code.toLowerCase(),
    p_device_id: getDeviceId(),
    p_name: currentDeviceName(),
    p_platform: detectPlatform()
  });
  if (error) throw error;
  householdId = newHouseholdId;
  localStorage.setItem(HOUSEHOLD_ID_KEY, householdId);
  await cargarDispositivo();
  await startHouseholdSync();
  await refreshDevices();
}

function abrirDispositivos() {
  const api = window.FMV_padresAPI;
  if (!api) throw new Error("La Zona de Padres todavía no está disponible.");

  modal = api.modal(
    '<h3 style="margin:0 0 8px">📱 Dispositivos de la familia</h3>' +
    '<p style="margin:0 0 14px;font-size:14px;opacity:.78">Empareja teléfonos y computadoras. Los canales, videos y ajustes permitidos se mantienen sincronizados automáticamente.</p>' +
    '<div class="fmv-sync-summary" data-device-summary></div>' +
    '<div class="fmv-sync-devices" data-device-list></div>' +
    '<p class="fmv-sync-status" data-status role="status" aria-live="polite"></p>' +
    '<label class="fmv-sync-label">Nombre para identificar este dispositivo' +
      '<input data-device-name maxlength="60" autocomplete="off" placeholder="Ej.: Tablet sala, celular mamá"></label>' +
    '<div class="fmv-sync-actions">' +
      '<button type="button" data-create>Crear grupo familiar</button>' +
      '<button type="button" data-issue hidden>Generar código para otro dispositivo</button>' +
    '</div>' +
    '<div class="fmv-sync-pairing" data-pairing hidden><strong>Código de emparejamiento (caduca en 10 min)</strong>' +
      '<code data-pairing-code></code><button type="button" data-copy-code>Copiar código</button></div>' +
    '<div class="fmv-sync-join" data-join-controls>' +
      '<label class="fmv-sync-label">Código para emparejar este dispositivo' +
        '<input data-join-code maxlength="48" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Pega el código de 48 caracteres"></label>' +
      '<button type="button" data-join>Emparejar</button>' +
    '</div>',
    560
  );
  modalStatus = modal.caja.querySelector("[data-status]");
  deviceList = modal.caja.querySelector("[data-device-list]");
  deviceSummary = modal.caja.querySelector("[data-device-summary]");
  const nameInput = modal.caja.querySelector("[data-device-name]");
  nameInput.value = "FreshMindVideo · " + detectPlatform();
  const createButton = modal.caja.querySelector("[data-create]");
  const issueButton = modal.caja.querySelector("[data-issue]");
  const joinControls = modal.caja.querySelector("[data-join-controls]");
  const deviceNameLabel = nameInput.closest(".fmv-sync-label");

  async function reportError(error) {
    console.error("No se pudo completar la acción de dispositivos.", error);
    setStatus(messageOf(error), true);
  }

  async function refreshPanel() {
    if (!isConfigured()) {
      createButton.hidden = true;
      issueButton.hidden = true;
      setStatus("Falta configurar Supabase. Sigue la guía de configuración del proyecto.", true);
      return;
    }
    try {
      await cargarDispositivo();
      if (householdId) {
        createButton.hidden = true;
        issueButton.hidden = false;
        joinControls.hidden = true;
        deviceNameLabel.hidden = true;
        setStatus(channelStatus === "SUBSCRIBED"
          ? "Sincronización automática activa."
          : "Conectando el dispositivo a la familia…");
        if (!activeChannel) await startHouseholdSync();
        await refreshDevices();
      } else {
        createButton.hidden = false;
        issueButton.hidden = true;
        joinControls.hidden = false;
        deviceNameLabel.hidden = false;
        setStatus(isConfigured()
          ? "Crea un grupo familiar aquí o ingresa un código de otro dispositivo."
          : "Falta configurar Supabase. Sigue la guía de configuración del proyecto.");
      }
    } catch (error) {
      await reportError(error);
    }
  }

  createButton.addEventListener("click", async function () {
    createButton.disabled = true;
    try {
      await createHousehold();
      createButton.hidden = true;
      issueButton.hidden = false;
      joinControls.hidden = true;
      deviceNameLabel.hidden = true;
      setStatus("Grupo creado. Empareja los demás dispositivos con el código.");
    } catch (error) {
      await reportError(error);
    } finally {
      createButton.disabled = false;
    }
  });
  issueButton.addEventListener("click", async function () {
    issueButton.disabled = true;
    try {
      await issuePairingCode();
    } catch (error) {
      await reportError(error);
    } finally {
      issueButton.disabled = false;
    }
  });
  modal.caja.querySelector("[data-join]").addEventListener("click", async function () {
    const button = this;
    const codeInput = modal.caja.querySelector("[data-join-code]");
    button.disabled = true;
    try {
      await joinHousehold(codeInput.value.trim());
      createButton.hidden = true;
      issueButton.hidden = false;
      joinControls.hidden = true;
      deviceNameLabel.hidden = true;
      codeInput.value = "";
      setStatus("Dispositivo emparejado. Sincronización automática activa.");
    } catch (error) {
      await reportError(error);
    } finally {
      button.disabled = false;
    }
  });

  refreshPanel();
  return modal;
}

window.FMV_abrirDispositivos = abrirDispositivos;

document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "visible" && householdId) {
    syncLocalChanges();
    if (supabase) {
      supabase.rpc("fmv_touch_device", { p_device_id: getDeviceId() }).then(({ error }) => {
        if (error) console.error("No se pudo renovar la presencia del dispositivo.", error);
      });
    }
  }
});

if (document.body && window.MutationObserver) {
  new MutationObserver(maybeReloadAfterRemoteChange).observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
    subtree: true
  });
}

bootstrapKnownDevice();
