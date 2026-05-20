import { useState, useEffect, useMemo, useRef } from "react";

// ─── URL pública del servidor (ngrok) ────────────────────────
const PROD_URL = "https://footbath-popcorn-luncheon.ngrok-free.dev";

// ─── PALETA TEMA CLARO ──────────────────────────────────────
const THEME = {
  bg:         "#f4f6fb",
  surface:    "#ffffff",
  surfaceAlt: "#f9fafd",
  border:     "#e3e8f0",
  borderStr:  "#cbd5e1",
  text:       "#1a2540",
  textMuted:  "#5a6a85",
  textSubtle: "#94a3b8",
  accent:     "#1a6fff",
  accentSoft: "#e8f0ff",
  ok:         "#10b981",
  warn:       "#f59e0b",
  danger:     "#ef4444",
  offline:    "#94a3b8",
  shadow:     "0 1px 3px rgba(15,23,42,0.06), 0 4px 12px rgba(15,23,42,0.04)",
  shadowLg:   "0 4px 16px rgba(15,23,42,0.08), 0 12px 32px rgba(15,23,42,0.06)",
};

// ─── DATOS DE LA PULSERA REAL ───────────────────────────────
const INITIAL_RESIDENTES = [
  {
    id: 1,
    nombre: "Residente",
    apellidos: "1",
    edad: 0,
    habitacion_id: 1,
    dispositivo_ble: "PULSERA_001",
    color: "#1a6fff",
    umbral_hr_min: 50,
    umbral_hr_max: 100,
    umbral_spo2_warn: 95,
    umbral_spo2_crit: 92,
    notas_medicas: "Dispositivo de demo. Una sola pulsera BLE detectada por dos balizas (Hab 1 y Hab 2).",
    genero: "M",
  },
];

// ─── PLANO: Hab 1 y 2 tienen baliza, el resto decorativo ────
const RESIDENCIA = {
  label: "Residencia · Demo en vivo",
  rooms: [
    // Fila norte — solo Hab 1 y Hab 2 tienen baliza activa
    { id: 1,   name: "Hab. 1",      x: 10,  y: 48, w: 135, h: 110, type: "room",    beacon: 1 },
    { id: 2,   name: "Hab. 2",      x: 155, y: 48, w: 135, h: 110, type: "room",    beacon: 2 },
    { id: 3,   name: "Hab. 3",      x: 300, y: 48, w: 120, h: 110, type: "room" },
    { id: 4,   name: "Hab. 4",      x: 430, y: 48, w: 120, h: 110, type: "room" },
    { id: 5,   name: "Hab. 5",      x: 560, y: 48, w: 120, h: 110, type: "room" },
    // Pasillo central
    { id: 100, name: "Pasillo",     x: 10,  y: 163, w: 670, h: 35, type: "hall" },
    // Fila sur
    { id: 6,   name: "Hab. 6",      x: 10,  y: 203, w: 120, h: 95, type: "room" },
    { id: 7,   name: "Hab. 7",      x: 140, y: 203, w: 120, h: 95, type: "room" },
    { id: 101, name: "Salón",       x: 270, y: 203, w: 170, h: 95, type: "common", icon: "🛋️" },
    { id: 102, name: "Comedor",     x: 450, y: 203, w: 120, h: 95, type: "common", icon: "🍽️", beacon: 3 },
    { id: 103, name: "Enfermería",  x: 580, y: 203, w: 100, h: 95, type: "medical", icon: "🏥" },
  ],
};

// ─── UTILIDADES ─────────────────────────────────────────────
const sev = (s) => ({ critical: THEME.danger, warning: THEME.warn, info: THEME.accent }[s] || THEME.textSubtle);

const vitalSt = (tipo, val, u) => {
  if (!val || val === 0) return "offline";
  if (tipo === "hr") {
    if (val < (u?.hr_min || 50) || val > (u?.hr_max || 100)) return "danger";
    if (val < 55 || val > 95) return "warn";
    return "ok";
  }
  if (tipo === "spo2") {
    if (val < (u?.spo2_crit || 92)) return "danger";
    if (val < (u?.spo2_warn || 95)) return "warn";
    return "ok";
  }
  return "ok";
};

const stCol = (s) => ({ ok: THEME.ok, warn: THEME.warn, danger: THEME.danger, offline: THEME.offline }[s] || THEME.offline);

const timeAgo = (ts) => {
  if (!ts) return "—";
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 10) return "ahora";
  if (d < 60) return `${Math.floor(d)}s`;
  if (d < 3600) return `${Math.floor(d / 60)}min`;
  return `${Math.floor(d / 3600)}h`;
};

const roomLabel = (hid) => hid === 1 ? "Habitación 1" : hid === 2 ? "Habitación 2" : "Zona común";

// ─── TOAST COMPONENT ────────────────────────────────────────
function Toast({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", flexDirection: "column-reverse", gap: 8, pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: THEME.surface, border: `1px solid ${t.color}35`,
          borderLeft: `4px solid ${t.color}`, borderRadius: 12,
          padding: "12px 16px", boxShadow: THEME.shadowLg,
          display: "flex", alignItems: "center", gap: 10,
          animation: "toastIn 0.3s cubic-bezier(0.16,1,0.3,1)",
          minWidth: 260, maxWidth: 340, pointerEvents: "all",
        }}>
          <div style={{ fontSize: 20, flexShrink: 0 }}>{t.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text }}>{t.title}</div>
            {t.subtitle && <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 2 }}>{t.subtitle}</div>}
          </div>
          <button onClick={() => onDismiss(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.textSubtle, fontSize: 14, flexShrink: 0, padding: "0 0 0 6px" }}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ─── LOCATION HISTORY ───────────────────────────────────────
function LocationHistory({ history }) {
  if (!history.length) return (
    <div style={{ textAlign: "center", padding: "14px 0", color: THEME.textSubtle, fontSize: 11 }}>
      Sin movimientos registrados
    </div>
  );
  return (
    <div>
      {history.map((h, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < history.length - 1 ? `1px solid ${THEME.border}` : "none" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: i === 0 ? THEME.accent : THEME.border, flexShrink: 0 }} />
            {i < history.length - 1 && <div style={{ width: 1, height: 14, background: THEME.border, marginTop: 2 }} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? THEME.text : THEME.textMuted }}>{h.roomName}</div>
          </div>
          <div style={{ fontSize: 10, color: THEME.textSubtle, fontFamily: "'JetBrains Mono', monospace" }}>
            {new Date(h.ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── AVATAR COMPONENT ───────────────────────────────────────
function Avatar({ residente, size = 36, showStatus = false, status = "ok" }) {
  const initials = `${residente.nombre[0]}${residente.apellidos[0]}`;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `linear-gradient(135deg, ${residente.color}25, ${residente.color}10)`,
        border: `2px solid ${residente.color}50`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, fontWeight: 700, color: residente.color,
        fontFamily: "'DM Sans', sans-serif",
      }}>{initials}</div>
      {showStatus && (
        <div style={{
          position: "absolute", bottom: -1, right: -1,
          width: size * 0.32, height: size * 0.32, borderRadius: "50%",
          background: stCol(status), border: `2px solid ${THEME.surface}`,
          boxShadow: status === "danger" ? `0 0 8px ${stCol(status)}` : "none",
        }} />
      )}
    </div>
  );
}

// ─── FLOOR MAP COMPONENT ────────────────────────────────────
function FloorMap({ floor, residentes, alertas, selectedId, onSelect }) {
  const getResInRoom = (rid) => residentes.filter(r => (r.ubicacion_actual || r.habitacion_id) === rid);
  const roomSev = (rid) => {
    const ra = alertas.filter(a => {
      const r = residentes.find(res => res.id === a.residente_id);
      return r && (r.ubicacion_actual || r.habitacion_id) === rid;
    });
    if (ra.some(a => a.severidad === "critical")) return "critical";
    if (ra.some(a => a.severidad === "warning")) return "warning";
    return null;
  };

  const roomColors = {
    room:    { fill: THEME.surface,    stroke: THEME.borderStr },
    common:  { fill: "#f0f7ff",        stroke: "#bfd7f5" },
    medical: { fill: "#f5f3ff",        stroke: "#ddd6fe" },
    hall:    { fill: THEME.surfaceAlt, stroke: THEME.border },
  };

  return (
    <svg viewBox="0 0 700 310" style={{ width: "100%", display: "block", borderRadius: 14, background: THEME.surface, boxShadow: THEME.shadow }}>
      <defs>
        <filter id="ag-r"><feGaussianBlur stdDeviation="6" /><feComposite in="SourceGraphic" /></filter>
        <filter id="ag-y"><feGaussianBlur stdDeviation="4" /><feComposite in="SourceGraphic" /></filter>
        <filter id="shd"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.08" /></filter>
        <linearGradient id="hg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={THEME.surfaceAlt} />
          <stop offset="50%" stopColor="#eef2f8" />
          <stop offset="100%" stopColor={THEME.surfaceAlt} />
        </linearGradient>
      </defs>

      <rect x="8" y="8" width="684" height="294" rx="14" fill={THEME.surface} stroke={THEME.border} strokeWidth="1" />
      <rect x="8" y="8" width="684" height="30" rx="14" fill={THEME.surfaceAlt} />
      <rect x="8" y="26" width="684" height="12" fill={THEME.surfaceAlt} />
      <text x="20" y="27" fill={THEME.accent} fontSize="10" fontWeight="700" fontFamily="'DM Sans',sans-serif" letterSpacing="1.5">
        {floor.label.toUpperCase()}
      </text>

      {floor.rooms.map(room => {
        const severity = roomSev(room.id);
        const residents = getResInRoom(room.id);
        const isSelected = residents.some(r => r.id === selectedId);
        const inactive = room.type === "room" && !room.beacon;
        const colors = inactive
          ? { fill: "#f8f9fb", stroke: THEME.border }
          : roomColors[room.type] || roomColors.room;

        return (
          <g key={room.id} style={{ cursor: residents.length ? "pointer" : "default" }}
            onClick={() => residents.length && onSelect(residents[0].id)}>
            {severity === "critical" && (
              <rect x={room.x - 4} y={room.y - 4} width={room.w + 8} height={room.h + 8}
                rx="10" fill="none" stroke={THEME.danger} strokeWidth="2.5" filter="url(#ag-r)">
                <animate attributeName="opacity" values="0.3;0.85;0.3" dur="1.5s" repeatCount="indefinite" />
              </rect>
            )}
            {severity === "warning" && (
              <rect x={room.x - 3} y={room.y - 3} width={room.w + 6} height={room.h + 6}
                rx="9" fill="none" stroke={THEME.warn} strokeWidth="2" filter="url(#ag-y)">
                <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite" />
              </rect>
            )}

            <rect x={room.x} y={room.y} width={room.w} height={room.h}
              rx="10" fill={room.type === "hall" ? "url(#hg)" : colors.fill}
              stroke={isSelected ? THEME.accent : severity ? sev(severity) : colors.stroke}
              strokeWidth={isSelected ? 2.5 : 1}
              filter={room.type !== "hall" ? "url(#shd)" : undefined} />

            {room.type === "hall" ? (
              <text x={room.x + room.w / 2} y={room.y + room.h / 2 + 3} textAnchor="middle"
                fill={THEME.textSubtle} fontSize="9" fontWeight="600" letterSpacing="3" fontFamily="'DM Sans',sans-serif">PASILLO</text>
            ) : (
              <>
                {room.icon && <text x={room.x + room.w - 14} y={room.y + 20} textAnchor="end" fontSize="13">{room.icon}</text>}
                <text x={room.x + 14} y={room.y + 20} fill={THEME.textMuted} fontSize="11" fontWeight="700" fontFamily="'DM Sans',sans-serif" letterSpacing="0.3">{room.name}</text>
              </>
            )}

            {/* BALIZA */}
            {room.beacon && (
              <g>
                <circle cx={room.x + room.w - 26} cy={room.y + room.h - 26} r="14"
                  fill={THEME.accentSoft} stroke={THEME.accent} strokeWidth="1.5" />
                <circle cx={room.x + room.w - 26} cy={room.y + room.h - 26} r="20"
                  fill="none" stroke={THEME.accent} strokeWidth="1" opacity="0.25">
                  <animate attributeName="r" values="14;22;14" dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0;0.4" dur="2.5s" repeatCount="indefinite" />
                </circle>
                <text x={room.x + room.w - 26} y={room.y + room.h - 22} textAnchor="middle" fontSize="12">📡</text>
                <text x={room.x + room.w - 26} y={room.y + room.h - 8} textAnchor="middle"
                  fill={THEME.accent} fontSize="8" fontWeight="800" fontFamily="'DM Sans',sans-serif">B{room.beacon}</text>
              </g>
            )}

            {/* PULSERA */}
            {residents.map((res, i) => {
              const st = res.estado_actual || {};
              const hr = st.heart_rate?.value || 0;
              const spo2 = st.spo2?.value || 0;
              const hrS = vitalSt("hr", hr, { hr_min: res.umbral_hr_min, hr_max: res.umbral_hr_max });
              const spS = vitalSt("spo2", spo2, { spo2_crit: res.umbral_spo2_crit, spo2_warn: res.umbral_spo2_warn });
              const worst = hrS === "danger" || spS === "danger" ? "danger" : hrS === "warn" || spS === "warn" ? "warn" : hrS === "offline" && spS === "offline" ? "offline" : "ok";
              const cx = room.x + 28 + (i % 2) * 50;
              const cy = room.y + 56 + Math.floor(i / 2) * 36;
              return (
                <g key={res.id} onClick={e => { e.stopPropagation(); onSelect(res.id); }} style={{ cursor: "pointer" }}>
                  {/* Anillo de pulso para indicar dispositivo BLE en vivo */}
                  <circle cx={cx} cy={cy} r="14" fill="none" stroke={res.color} strokeWidth="1" opacity="0.4">
                    <animate attributeName="r" values="14;22;14" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={cx} cy={cy} r="13" fill={`${res.color}20`} stroke={res.color} strokeWidth="2" />
                  <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
                    fill={res.color} fontSize="9" fontWeight="800" fontFamily="'DM Sans',sans-serif">
                    {res.nombre[0]}{res.apellidos[0]}
                  </text>
                  <circle cx={cx + 10} cy={cy - 10} r="4" fill={stCol(worst)} stroke={THEME.surface} strokeWidth="1.5">
                    {worst === "danger" && <animate attributeName="r" values="4;5.5;4" dur="1s" repeatCount="indefinite" />}
                  </circle>
                  {hr > 0 && (
                    <text x={cx + 20} y={cy - 4} fill={stCol(hrS)} fontSize="8.5" fontFamily="'JetBrains Mono',monospace" fontWeight="700">
                      ♥{hr}
                    </text>
                  )}
                  {spo2 > 0 && (
                    <text x={cx + 20} y={cy + 7} fill={stCol(spS)} fontSize="8.5" fontFamily="'JetBrains Mono',monospace" fontWeight="700">
                      {spo2}%
                    </text>
                  )}
                </g>
              );
            })}

            {room.type === "room" && residents.length === 0 && room.beacon && (
              <text x={room.x + room.w / 2} y={room.y + room.h / 2 + 6} textAnchor="middle"
                fill={THEME.textSubtle} fontSize="10" fontFamily="'DM Sans',sans-serif" fontStyle="italic">sin pulsera</text>
            )}
            {inactive && (
              <text x={room.x + room.w / 2} y={room.y + room.h / 2 + 6} textAnchor="middle"
                fill={THEME.border} fontSize="9" fontFamily="'DM Sans',sans-serif" letterSpacing="1">SIN BALIZA</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── VITAL GAUGE ────────────────────────────────────────────
function VitalGauge({ label, value, unit, min, max, warnLow, critLow, warnHigh, critHigh, icon, timestamp }) {
  const status =
    value === 0 ? "offline" :
    (critLow !== undefined && value < critLow) || (critHigh !== undefined && value > critHigh) ? "danger" :
    (warnLow !== undefined && value < warnLow) || (warnHigh !== undefined && value > warnHigh) ? "warn" : "ok";
  const color = stCol(status);
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const isOffline = status === "offline";
  const isBeating = value > 0 && label.includes("Cardíaca");

  if (isOffline) {
    return (
      <div style={{ background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: "16px 18px", boxShadow: THEME.shadow }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ color: THEME.textSubtle, fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>{icon} {label}</span>
          <span style={{ fontSize: 9, color: THEME.textSubtle, background: THEME.border, borderRadius: 4, padding: "2px 7px", fontWeight: 700, letterSpacing: 0.5 }}>SIN DATOS</span>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ height: 10, width: "55%", borderRadius: 6, background: `linear-gradient(90deg,${THEME.border},${THEME.surfaceAlt},${THEME.border})`, backgroundSize: "200% 100%", animation: "shimmer 1.8s ease-in-out infinite" }} />
          <div style={{ height: 7, width: "30%", borderRadius: 6, background: `linear-gradient(90deg,${THEME.border},${THEME.surfaceAlt},${THEME.border})`, backgroundSize: "200% 100%", animation: "shimmer 1.8s ease-in-out infinite 0.3s", marginTop: 8 }} />
        </div>
        <div style={{ height: 4, background: THEME.border, borderRadius: 3, opacity: 0.6 }} />
      </div>
    );
  }

  return (
    <div style={{
      background: `linear-gradient(135deg,${color}12,${color}04)`,
      border: `1px solid ${color}35`,
      borderRadius: 14, padding: "16px 18px",
      position: "relative", overflow: "hidden",
      boxShadow: THEME.shadow,
      transition: "border-color 0.3s",
    }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at top right,${color}18,transparent)`, borderRadius: "0 14px 0 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ color: THEME.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
          <span style={{ display: "inline-block", animation: isBeating ? `heartbeat ${(60/value).toFixed(2)}s ease-in-out infinite` : "none" }}>{icon}</span>
          {" "}{label}
        </span>
        <span style={{ color: THEME.textSubtle, fontSize: 10 }}>{timeAgo(timestamp)}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 10 }}>
        <span style={{
          color, fontSize: 40, fontWeight: 800,
          fontFamily: "'JetBrains Mono',monospace", lineHeight: 1,
          letterSpacing: "-1px",
          textShadow: status === "danger" ? `0 0 20px ${color}55` : "none",
        }}>{value}</span>
        <span style={{ color: `${color}b0`, fontSize: 15, fontWeight: 600 }}>{unit}</span>
      </div>
      <div style={{ height: 5, background: `${THEME.border}80`, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: `linear-gradient(90deg,${color}80,${color})`, transition: "width 1s cubic-bezier(0.4,0,0.2,1)", boxShadow: `0 0 8px ${color}60` }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 9, color: THEME.textSubtle }}>
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

// ─── MINI CHART ─────────────────────────────────────────────
function MiniChart({ data, color, height = 40 }) {
  if (!data || data.length < 2) return (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 9, color: THEME.textSubtle, letterSpacing: 0.5 }}>acumulando datos…</div>
    </div>
  );
  const mn = Math.min(...data) - 2, mx = Math.max(...data) + 2, rng = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${height - ((v - mn) / rng) * (height - 4) - 2}`).join(" ");
  const gid = `g${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 100 ${height}`} style={{ width: "100%", height, display: "block" }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts} 100,${height}`} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── RESIDENT DETAIL ────────────────────────────────────────
function ResidentDetail({ residente, alertas, hrHistory, spo2History, onClose, onAck }) {
  if (!residente) return null;
  const st = residente.estado_actual || {};
  const hr = st.heart_rate?.value || 0, spo2 = st.spo2?.value || 0;
  const resAlertas = alertas.filter(a => a.residente_id === residente.id);
  return (
    <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 16, overflow: "hidden", boxShadow: THEME.shadow }}>
      {/* Accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${residente.color}, ${residente.color}60, transparent)` }} />
      <div style={{ background: `linear-gradient(160deg,${residente.color}12,${residente.color}03 60%,transparent)`, padding: "18px 18px 14px", borderBottom: `1px solid ${THEME.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Avatar residente={residente} size={52} />
            <div>
              <h3 style={{ margin: 0, color: THEME.text, fontSize: 17, fontWeight: 800, letterSpacing: "-0.3px" }}>{residente.nombre} {residente.apellidos}</h3>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ background: `${residente.color}15`, color: residente.color, border: `1px solid ${residente.color}30`, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
                  📍 {roomLabel(residente.ubicacion_actual ?? residente.habitacion_id)}
                </span>
                <span style={{ background: THEME.surfaceAlt, color: THEME.textMuted, border: `1px solid ${THEME.border}`, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>
                  {residente.dispositivo_ble}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, borderRadius: 8, color: THEME.textMuted, width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>✕</button>
        </div>
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <VitalGauge label="Frecuencia Cardíaca" value={hr} unit="bpm" icon="♥" min={30} max={140} warnLow={55} warnHigh={95} critLow={residente.umbral_hr_min} critHigh={residente.umbral_hr_max} timestamp={st.heart_rate?.timestamp} />
          <VitalGauge label="Saturación O₂" value={spo2} unit="%" icon="◉" min={80} max={100} warnLow={residente.umbral_spo2_warn} critLow={residente.umbral_spo2_crit} timestamp={st.spo2?.timestamp} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: THEME.textMuted, marginBottom: 6, fontWeight: 700, letterSpacing: 0.3 }}>PULSO · ÚLTIMA HORA</div>
            <MiniChart data={hrHistory} color={THEME.danger} />
          </div>
          <div style={{ background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: THEME.textMuted, marginBottom: 6, fontWeight: 700, letterSpacing: 0.3 }}>SpO₂ · ÚLTIMA HORA</div>
            <MiniChart data={spo2History} color={THEME.accent} />
          </div>
        </div>
        {residente.notas_medicas && (
          <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, color: "#6d28d9", fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>📋 NOTAS</div>
            <div style={{ fontSize: 12, color: "#5b21b6", lineHeight: 1.5 }}>{residente.notas_medicas}</div>
          </div>
        )}
        {resAlertas.length > 0 && (
          <div>
            <div style={{ fontSize: 10, color: THEME.textMuted, fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>ALERTAS ACTIVAS ({resAlertas.length})</div>
            {resAlertas.map(a => (
              <div key={a.id} style={{ background: `${sev(a.severidad)}10`, border: `1px solid ${sev(a.severidad)}30`, borderLeft: `3px solid ${sev(a.severidad)}`, borderRadius: 10, padding: "10px 14px", marginBottom: 6 }}>
                <div style={{ color: sev(a.severidad), fontSize: 12, fontWeight: 700 }}>{a.mensaje}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, alignItems: "center" }}>
                  <span style={{ color: THEME.textSubtle, fontSize: 10 }}>{timeAgo(a.created_at)}</span>
                  <button onClick={() => onAck(a.id)} style={{ background: `${sev(a.severidad)}15`, border: `1px solid ${sev(a.severidad)}50`, color: sev(a.severidad), padding: "4px 14px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>✓ Reconocer</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ALERTS PANEL ───────────────────────────────────────────
function AlertsPanel({ alertas, residentes, onSelect, onAck }) {
  if (!alertas.length) return (
    <div style={{ textAlign: "center", padding: "24px 20px", color: THEME.textSubtle }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${THEME.ok}12`, border: `1.5px solid ${THEME.ok}30`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 20 }}>✓</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: THEME.textMuted }}>Todo en orden</div>
      <div style={{ fontSize: 11, marginTop: 4, color: THEME.textSubtle }}>Sin alertas activas</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {alertas.map(a => {
        const res = residentes.find(r => r.id === a.residente_id);
        return (
          <div key={a.id} onClick={() => onSelect(a.residente_id)} style={{ background: `${sev(a.severidad)}12`, border: `1px solid ${sev(a.severidad)}25`, borderLeft: `3px solid ${sev(a.severidad)}`, borderRadius: "0 10px 10px 0", padding: "10px 14px", cursor: "pointer", transition: "background 0.2s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {res && <Avatar residente={res} size={22} />}
                <span style={{ color: THEME.text, fontSize: 12, fontWeight: 700 }}>{res?.nombre} {res?.apellidos?.[0]}.</span>
              </div>
              <span style={{ background: `${sev(a.severidad)}20`, color: sev(a.severidad), fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{a.severidad}</span>
            </div>
            <div style={{ color: THEME.textMuted, fontSize: 11, lineHeight: 1.4 }}>{a.mensaje}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, alignItems: "center" }}>
              <span style={{ color: THEME.textSubtle, fontSize: 10 }}>{timeAgo(a.created_at)}</span>
              <button onClick={e => { e.stopPropagation(); onAck(a.id); }} style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.textMuted, padding: "3px 12px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 600 }}>ACK</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── EVENTS LOG (colapsable) ─────────────────────────────────
const EVENT_COLOR = { medicion: "#1a6fff", ubicacion: "#10b981", alerta: "#ef4444", conexion: "#94a3b8", sync: "#a78bfa", raw: "#f59e0b", error: "#ef4444" };

function EventsLog({ wsEvents, wsConnected }) {
  const [open, setOpen] = useState(false);
  const errCount = wsEvents.filter(e => e.tipo === "error").length;
  return (
    <div style={{ border: `1px solid ${THEME.border}`, borderRadius: 10, overflow: "hidden" }}>
      <button onClick={() => setOpen(p => !p)} style={{
        width: "100%", background: THEME.surfaceAlt, border: "none",
        padding: "8px 12px", cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 10, color: THEME.textMuted, fontWeight: 700, letterSpacing: 0.6, display: "flex", alignItems: "center", gap: 6 }}>
          EVENTOS WS
          {wsEvents.length > 0 && (
            <span style={{ background: errCount > 0 ? `${THEME.danger}15` : `${THEME.ok}15`, color: errCount > 0 ? THEME.danger : THEME.ok, borderRadius: 10, padding: "1px 6px", fontSize: 9, fontWeight: 800 }}>
              {wsEvents.length}
            </span>
          )}
        </span>
        <span style={{ fontSize: 10, color: THEME.textSubtle }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ background: "#f8f9fb", fontFamily: "'JetBrains Mono', monospace" }}>
          {wsEvents.length === 0 ? (
            <div style={{ padding: "14px 12px", fontSize: 10, color: THEME.textSubtle, textAlign: "center" }}>
              {wsConnected ? "Esperando eventos…" : "Sin conexión al servidor"}
            </div>
          ) : (
            wsEvents.slice(0, 8).map((ev, i) => (
              <div key={i} style={{
                padding: "5px 10px",
                borderBottom: i < Math.min(wsEvents.length, 8) - 1 ? `1px solid ${THEME.border}` : "none",
                display: "flex", gap: 8, alignItems: "baseline",
                background: ev.tipo === "error" ? `${THEME.danger}05` : "transparent",
              }}>
                <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: 0.5, color: EVENT_COLOR[ev.tipo] || THEME.textSubtle, minWidth: 52, textTransform: "uppercase" }}>{ev.tipo}</span>
                <span style={{ fontSize: 9, color: THEME.textMuted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.resumen}</span>
                <span style={{ fontSize: 8, color: THEME.textSubtle, whiteSpace: "nowrap" }}>{Math.round((Date.now() - ev.ts) / 1000)}s</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── PANEL DE DISPOSITIVOS (PULSERA + BALIZAS) ──────────────

function DevicesPanel({ pulsera, balizas, wsConnected, pulseraActiva, balizaVista, balizaRssi, balizaHeartbeat, wsEvents, onSelectPulsera, selectedId, apiUrl }) {
  const st = pulsera?.estado_actual || {};
  const hr = st.heart_rate?.value || 0;
  const spo2 = st.spo2?.value || 0;
  const lastTs = st.heart_rate?.timestamp || st.spo2?.timestamp;
  const activeBeacon = pulsera?.ubicacion_actual === 1 ? 1 : pulsera?.ubicacion_actual === 2 ? 2 : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Pulsera */}
      <div>
        <div style={{ fontSize: 10, color: THEME.textMuted, fontWeight: 700, letterSpacing: 0.6, padding: "0 4px 8px" }}>
          PULSERA
        </div>
        {pulsera && (
          <div
            onClick={() => onSelectPulsera(pulsera.id)}
            style={{
              background: selectedId === pulsera.id ? THEME.accentSoft : THEME.surface,
              border: `1px solid ${selectedId === pulsera.id ? `${THEME.accent}55` : THEME.border}`,
              borderRadius: 12, padding: 12, cursor: "pointer",
              transition: "all 0.15s",
              boxShadow: THEME.shadow,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Avatar residente={pulsera} size={36} showStatus status={pulseraActiva ? "ok" : "offline"} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: THEME.text, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {pulsera.dispositivo_ble}
                </div>
                <div style={{ color: THEME.textMuted, fontSize: 11 }}>
                  {pulsera.nombre} {pulsera.apellidos} · {roomLabel(pulsera.habitacion_id)}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div style={{ flex: 1, background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "6px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: THEME.textSubtle, fontWeight: 600 }}>♥ HR</div>
                <div style={{ fontSize: 14, color: pulseraActiva && hr > 0 ? THEME.danger : THEME.textSubtle, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{pulseraActiva && hr > 0 ? hr : "—"}</div>
              </div>
              <div style={{ flex: 1, background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "6px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: THEME.textSubtle, fontWeight: 600 }}>◉ SpO₂</div>
                <div style={{ fontSize: 14, color: pulseraActiva && spo2 > 0 ? THEME.accent : THEME.textSubtle, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{pulseraActiva && spo2 > 0 ? `${spo2}%` : "—"}</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 10, color: THEME.textSubtle }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", display: "inline-block",
                  background: !wsConnected ? THEME.offline : pulseraActiva ? THEME.ok : THEME.warn }} />
                {!wsConnected ? "Sin servidor" : pulseraActiva ? "Activa" : "Sin señal BLE"}
              </span>
              <span>{pulseraActiva ? timeAgo(lastTs) : "—"}</span>
            </div>
          </div>
        )}
      </div>

      {/* Balizas */}
      <div>
        <div style={{ fontSize: 10, color: THEME.textMuted, fontWeight: 700, letterSpacing: 0.6, padding: "0 4px 8px" }}>
          BALIZAS · {balizas.length}/2
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {balizas.map(b => {
            const isActive = b.id === activeBeacon;
            const lastVista = balizaVista?.[b.id];
            const rssiVal = balizaRssi?.[b.id];
            const lastHb = balizaHeartbeat?.[b.id];
            const isOnline = wsConnected && lastHb && (Date.now() - lastHb) < 25000;
            const vistaMakeMs = lastVista ? Date.now() - lastVista : null;
            const vistaLabel = !wsConnected ? "—" : lastVista ? `hace ${Math.round(vistaMakeMs / 1000)}s` : "sin pulsera cerca";
            // Color del RSSI: verde > -60, amarillo -60/-80, rojo < -80
            const rssiColor = rssiVal == null ? THEME.textSubtle
              : rssiVal > -60 ? THEME.ok
              : rssiVal > -80 ? THEME.warn
              : THEME.danger;
            // Barras de señal (1-4 barras según RSSI)
            const bars = rssiVal == null ? 0 : rssiVal > -60 ? 4 : rssiVal > -70 ? 3 : rssiVal > -80 ? 2 : 1;
            return (
              <div key={b.id} style={{
                background: isActive ? `${THEME.accent}10` : THEME.surface,
                border: `1px solid ${isActive ? `${THEME.accent}45` : THEME.border}`,
                borderRadius: 12, padding: "10px 12px",
                boxShadow: THEME.shadow, transition: "all 0.2s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: isActive ? THEME.accent : THEME.surfaceAlt,
                      border: `1px solid ${isActive ? THEME.accent : THEME.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                      boxShadow: isActive ? `0 0 0 4px ${THEME.accent}20` : "none",
                    }}>📡</div>
                    <div style={{
                      position: "absolute", bottom: -2, right: -2,
                      width: 11, height: 11, borderRadius: "50%",
                      background: !wsConnected ? THEME.offline : isOnline ? THEME.ok : THEME.danger,
                      border: `2px solid ${THEME.surface}`,
                      boxShadow: isOnline ? `0 0 5px ${THEME.ok}80` : "none",
                    }} title={!wsConnected ? "Sin servidor" : isOnline ? "Enchufada" : "Apagada / sin señal"} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ color: THEME.text, fontSize: 12, fontWeight: 700 }}>Baliza {b.id} · {b.room}</div>
                      {/* Barras de señal */}
                      {lastVista && (
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
                          {[1,2,3,4].map(i => (
                            <div key={i} style={{
                              width: 4, borderRadius: 2,
                              height: 4 + i * 3,
                              background: i <= bars ? rssiColor : THEME.border,
                            }} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: THEME.textMuted, marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                      {isActive && <span style={{ color: THEME.accent, fontWeight: 700 }}>detectando ·</span>}
                      {rssiVal != null && (
                        <span style={{ color: rssiColor, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>
                          {rssiVal} dBm ·
                        </span>
                      )}
                      <span style={{ color: THEME.textSubtle }}>{vistaLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LOG DE EVENTOS WS — colapsable */}
      <EventsLog wsEvents={wsEvents} wsConnected={wsConnected} />

      {/* PANEL DE DIAGNÓSTICO */}
      <DiagPanel balizas={balizas} pulsera={pulsera} wsConnected={wsConnected} apiUrl={apiUrl} />
    </div>
  );
}

// ─── PANEL DE DIAGNÓSTICO ────────────────────────────────────
function DiagPanel({ balizas, pulsera, wsConnected, apiUrl }) {
  const [loading, setLoading] = useState({});
  const [redisState, setRedisState] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const simularUbicacion = async (nodoId, rssi) => {
    if (!apiUrl) return;
    setLoading(p => ({ ...p, [nodoId]: true }));
    try {
      const res = await fetch(
        `${apiUrl}/api/debug/ubicacion?nodo_id=${nodoId}&device_id=${pulsera?.dispositivo_ble || "PULSERA_001"}&rssi=${rssi}`,
        { method: "POST", headers: { "ngrok-skip-browser-warning": "true" } }
      );
      const data = await res.json();
      console.log("debug ubicacion:", data);
    } catch (e) {
      console.error("Error test baliza:", e);
    } finally {
      setLoading(p => ({ ...p, [nodoId]: false }));
    }
  };

  const forzarHandover = async (fromNodo) => {
    if (!apiUrl) return;
    setLoading(p => ({ ...p, [`ho${fromNodo}`]: true }));
    try {
      const res = await fetch(`${apiUrl}/api/debug/handover?from_nodo=${fromNodo}`, { method: "POST", headers: { "ngrok-skip-browser-warning": "true" } });
      const data = await res.json();
      console.log("handover:", data);
    } catch (e) {
      console.error("Error handover:", e);
    } finally {
      setLoading(p => ({ ...p, [`ho${fromNodo}`]: false }));
    }
  };

  const fetchRedisState = async () => {
    if (!apiUrl) return;
    try {
      const res = await fetch(`${apiUrl}/api/debug/estado`, { headers: { "ngrok-skip-browser-warning": "true" } });
      setRedisState(await res.json());
    } catch { setRedisState(null); }
  };

  return (
    <div style={{ border: `1px solid ${THEME.border}`, borderRadius: 10, overflow: "hidden" }}>
      <button
        onClick={() => { setExpanded(p => !p); if (!expanded) fetchRedisState(); }}
        style={{
          width: "100%", background: THEME.surfaceAlt, border: "none",
          padding: "8px 12px", cursor: "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}
      >
        <span style={{ fontSize: 10, color: THEME.textMuted, fontWeight: 700, letterSpacing: 0.6 }}>
          🔧 DIAGNÓSTICO
        </span>
        <span style={{ fontSize: 10, color: THEME.textSubtle }}>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Test manual de cada baliza */}
          <div>
            <div style={{ fontSize: 9, color: THEME.textSubtle, marginBottom: 6, fontWeight: 700 }}>
              SIMULAR PRESENCIA (prueba servidor + frontend)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {balizas.map(b => (
                <div key={b.id} style={{ display: "flex", gap: 6 }}>
                  <div style={{ flex: 1, fontSize: 10, color: THEME.textMuted, alignSelf: "center" }}>
                    📡 Baliza {b.id} · {b.room}
                  </div>
                  <button
                    disabled={loading[b.id]}
                    onClick={() => simularUbicacion(b.id, -45)}
                    style={{
                      fontSize: 9, fontWeight: 700, padding: "4px 8px", borderRadius: 5, cursor: "pointer",
                      background: `${THEME.ok}15`, border: `1px solid ${THEME.ok}40`, color: THEME.ok,
                      opacity: loading[b.id] ? 0.5 : 1,
                    }}
                  >
                    {loading[b.id] ? "…" : "CERCA −45"}
                  </button>
                  <button
                    disabled={loading[b.id]}
                    onClick={() => simularUbicacion(b.id, -80)}
                    style={{
                      fontSize: 9, fontWeight: 700, padding: "4px 8px", borderRadius: 5, cursor: "pointer",
                      background: `${THEME.warn}15`, border: `1px solid ${THEME.warn}40`, color: THEME.warn,
                      opacity: loading[b.id] ? 0.5 : 1,
                    }}
                  >
                    LEJOS −80
                  </button>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 9, color: THEME.textSubtle, marginTop: 6 }}>
              Si el mapa cambia → servidor + frontend OK. Si no → revisar logs del servidor.
            </div>
          </div>

          {/* Forzar handover físico */}
          <div>
            <div style={{ fontSize: 9, color: THEME.textSubtle, marginBottom: 6, fontWeight: 700 }}>
              FORZAR HANDOVER FÍSICO (requiere firmware actualizado)
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {balizas.map(b => (
                <button
                  key={b.id}
                  disabled={loading[`ho${b.id}`]}
                  onClick={() => forzarHandover(b.id)}
                  style={{
                    flex: 1, fontSize: 9, fontWeight: 700, padding: "5px 6px",
                    borderRadius: 5, cursor: "pointer",
                    background: `${THEME.accent}12`, border: `1px solid ${THEME.accent}40`,
                    color: THEME.accent,
                    opacity: loading[`ho${b.id}`] ? 0.5 : 1,
                  }}
                >
                  {loading[`ho${b.id}`] ? "…" : `⚡ Ceder B${b.id}`}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 9, color: THEME.textSubtle, marginTop: 5 }}>
              Envía comando MQTT al nodo para que suelte la pulsera.<br/>
              El nodo vecino la tomará si está más cerca.
            </div>
          </div>

          {/* Estado Redis */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 9, color: THEME.textSubtle, fontWeight: 700 }}>ESTADO REDIS</div>
              <button
                onClick={fetchRedisState}
                style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, cursor: "pointer", background: THEME.accentSoft, border: `1px solid ${THEME.accent}40`, color: THEME.accent, fontWeight: 600 }}
              >↻ Refrescar</button>
            </div>
            {redisState ? (
              <div style={{ background: "#f8f9fb", border: `1px solid ${THEME.border}`, borderRadius: 7, padding: "8px 10px", fontFamily: "'JetBrains Mono',monospace", fontSize: 9 }}>
                {Object.entries(redisState).map(([ble, d]) => (
                  <div key={ble} style={{ marginBottom: 6 }}>
                    <span style={{ color: THEME.accent, fontWeight: 700 }}>{ble}</span>
                    <div style={{ color: THEME.textMuted, paddingLeft: 8 }}>
                      ubicación: Hab {d.ubicacion_actual ?? "—"}<br/>
                      B1 RSSI: {d.rssi_baliza1 != null ? `${d.rssi_baliza1} dBm` : <span style={{ color: THEME.danger }}>sin datos (TTL expirado)</span>}<br/>
                      B2 RSSI: {d.rssi_baliza2 != null ? `${d.rssi_baliza2} dBm` : <span style={{ color: THEME.danger }}>sin datos (TTL expirado)</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 9, color: THEME.textSubtle }}>Haz clic en "Refrescar" para ver el estado</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SERVER SETUP ────────────────────────────────────────────
function ServerSetup({ onConnect, currentUrl }) {
  const [ip, setIp] = useState(currentUrl || PROD_URL);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");

  const buildApiUrl = (v) => {
    const s = v.trim();
    if (s.startsWith("http")) return s.replace(/\/$/, "");
    return `http://${s}:8000`;
  };

  const handleConnect = async () => {
    if (!ip.trim()) { setError("Introduce una URL o IP"); return; }
    setTesting(true); setError("");
    try {
      const apiBase = buildApiUrl(ip);
      const r = await fetch(`${apiBase}/api/debug/estado`,
        { signal: AbortSignal.timeout(5000), headers: { "ngrok-skip-browser-warning": "true" } });
      if (r.ok) { localStorage.setItem("serverIP", ip.trim()); onConnect(ip.trim()); }
      else setError("El servidor respondió con error.");
    } catch {
      setError("No se pudo conectar. Verifica la URL y que el servidor esté en marcha.");
    } finally { setTesting(false); }
  };

  return (
    <div style={{ minHeight: "100svh", background: THEME.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'DM Sans',-apple-system,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@600&display=swap'); *{box-sizing:border-box;margin:0;padding:0;} body{background:${THEME.bg}}`}</style>
      <div style={{ background: THEME.surface, borderRadius: 22, padding: "36px 28px", width: "100%", maxWidth: 380, boxShadow: THEME.shadowLg }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#1a6fff,#0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 8px 24px rgba(26,111,255,0.35)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: THEME.text, letterSpacing: "-0.3px" }}>Monitor BLE</h1>
          <p style={{ fontSize: 12, color: THEME.textMuted, marginTop: 5 }}>Residencia · Datos en tiempo real</p>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: THEME.textMuted, letterSpacing: 0.8, marginBottom: 8 }}>URL DEL SERVIDOR</label>
          <input
            value={ip} onChange={e => { setIp(e.target.value.replace(/,/g, ".")); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleConnect()}
            placeholder="https://xxx.ngrok-free.app o 192.168.x.x" inputMode="url"
            autoCapitalize="none" autoCorrect="off" spellCheck={false}
            style={{ width: "100%", padding: "13px 14px", borderRadius: 11, fontSize: 14, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, letterSpacing: 0.5, border: `1.5px solid ${error ? THEME.danger : THEME.border}`, background: THEME.surfaceAlt, color: THEME.text, outline: "none" }}
          />
          {error
            ? <p style={{ color: THEME.danger, fontSize: 11, marginTop: 7 }}>⚠ {error}</p>
            : <p style={{ color: THEME.textSubtle, fontSize: 11, marginTop: 7 }}>
                URL pública (ngrok) o IP local del servidor.
              </p>
          }
        </div>

        <button onClick={handleConnect} disabled={testing} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#1a6fff,#0ea5e9)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: testing ? "wait" : "pointer", boxShadow: "0 4px 16px rgba(26,111,255,0.4)", marginBottom: 10, opacity: testing ? 0.8 : 1 }}>
          {testing ? "Comprobando conexión…" : "Conectar al servidor →"}
        </button>
        <button onClick={() => { localStorage.setItem("serverIP", "demo"); onConnect("demo"); }} style={{ width: "100%", padding: 12, borderRadius: 12, background: "transparent", border: `1px solid ${THEME.border}`, color: THEME.textMuted, fontSize: 13, cursor: "pointer" }}>
          Ver demo (sin servidor)
        </button>
      </div>
    </div>
  );
}

// ─── MOBILE NAV ──────────────────────────────────────────────
function MobileNav({ activeTab, setActiveTab, alertCount }) {
  const tabs = [
    { id: "map",     icon: "📍", label: "Mapa" },
    { id: "devices", icon: "📡", label: "Dispositivos" },
    { id: "detail",  icon: "👤", label: "Detalle" },
    { id: "alerts",  icon: "🔔", label: "Alertas", badge: alertCount },
  ];
  return (
    <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: THEME.surface, borderTop: `1px solid ${THEME.border}`, display: "flex", paddingBottom: "env(safe-area-inset-bottom,0px)", boxShadow: "0 -2px 16px rgba(15,23,42,0.07)" }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex: 1, padding: "10px 4px 8px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: activeTab === t.id ? THEME.accent : THEME.textSubtle, fontFamily: "'DM Sans',sans-serif", position: "relative" }}>
          {activeTab === t.id && <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 2.5, background: THEME.accent, borderRadius: "0 0 3px 3px" }} />}
          <span style={{ fontSize: 22 }}>{t.icon}</span>
          <span style={{ fontSize: 10, fontWeight: activeTab === t.id ? 700 : 500 }}>{t.label}</span>
          {t.badge > 0 && <span style={{ position: "absolute", top: 7, left: "calc(50% + 7px)", background: THEME.danger, color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 8, padding: "1px 5px", minWidth: 16, textAlign: "center" }}>{t.badge}</span>}
        </button>
      ))}
    </nav>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────
export default function App() {
  // ── Config dinámica ─────────────────────────────────────────
  const [serverIP, setServerIP] = useState(() => localStorage.getItem("serverIP") || PROD_URL);
  const [showSettings, setShowSettings] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState("map");

  // Construye URLs soportando tanto IP local como dominio ngrok completo
  const buildUrls = (s) => {
    if (!s || s === "demo") return { api: null, ws: null };
    const base = s.startsWith("http") ? s.replace(/\/$/, "") : `http://${s}:8000`;
    const wsBase = base.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
    return { api: base, ws: `${wsBase}/ws` };
  };
  const { api: API_URL, ws: WS_URL } = buildUrls(serverIP);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleConnect = (ip) => { localStorage.setItem("serverIP", ip); setServerIP(ip); setShowSettings(false); };
  const handleChangeServer = () => setShowSettings(true);

  // ── Estado principal ─────────────────────────────────────────
  const [residentes, setResidentes] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [clock, setClock] = useState(new Date());
  const [hrH, setHrH] = useState({});
  const [spH, setSpH] = useState({});
  const [wsConnected, setWsConnected] = useState(false);
  const [pulseraActiva, setPulseraActiva] = useState(false);
  const [balizaVista, setBalizaVista] = useState({ 1: null, 2: null, 3: null });
  const [balizaRssi, setBalizaRssi] = useState({ 1: null, 2: null, 3: null });
  const [balizaHeartbeat, setBalizaHeartbeat] = useState({ 1: null, 2: null, 3: null });
  const [wsEvents, setWsEvents] = useState([]);
  const [locationHistory, setLocationHistory] = useState([]);
  const [toasts, setToasts] = useState([]);
  const prevLocationRef = useRef({});

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const init = INITIAL_RESIDENTES.map(r => ({
      ...r,
      nombre_completo: `${r.nombre} ${r.apellidos}`,
      ubicacion_actual: r.habitacion_id,
      activo: true,
      estado_actual: {
        heart_rate: { value: 0, valid: false, timestamp: null },
        spo2:       { value: 0, valid: false, timestamp: null },
      },
    }));
    setResidentes(init);
    if (init.length === 1) setSelectedId(init[0].id);

    const h = {}, s = {};
    init.forEach(r => { h[r.id] = []; s[r.id] = []; });
    setHrH(h);
    setSpH(s);

    setAlertas([]);
  }, []);

  // WebSocket — conecta solo si hay servidor configurado
  useEffect(() => {
    if (!WS_URL) return;  // modo demo o sin configurar
    let ws;
    const lastPulseraTsRef = { current: 0 };

    const addEvent = (tipo, resumen) => {
      setWsEvents(prev => [
        { tipo, resumen, ts: Date.now() },
        ...prev.slice(0, 19),
      ]);
    };

    try {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setWsConnected(true);
        setPulseraActiva(false);
        addEvent("conexion", `WS conectado a ${WS_URL}`);
      };

      ws.onmessage = (ev) => {
        try {
          const raw = ev.data;
          const msg = JSON.parse(raw);

          if (msg.event === "medicion" && msg.data) {
            lastPulseraTsRef.current = Date.now();
            setPulseraActiva(true);
            const { valor, residente_id } = msg.data;
            // Normalizar: el firmware ESP32 usa "hr", el gateway Python usa "heart_rate"
            const tipo = msg.data.tipo === "hr" ? "heart_rate"
                       : msg.data.tipo === "fall" ? "caida"
                       : msg.data.tipo; // spo2 ya es correcto
            addEvent("medicion", `${tipo === "heart_rate" ? "HR" : tipo === "spo2" ? "SpO₂" : tipo} = ${valor}  (residente ${residente_id})`);
            setResidentes(prev => prev.map(r => r.id === residente_id
              ? { ...r, estado_actual: { ...r.estado_actual, [tipo]: { value: valor, valid: true, timestamp: msg.data.timestamp } } }
              : r));
            setHrH(prev => {
              if (tipo !== "heart_rate") return prev;
              const arr = prev[residente_id] || [];
              return { ...prev, [residente_id]: [...arr.slice(-19), valor] };
            });
            setSpH(prev => {
              if (tipo !== "spo2") return prev;
              const arr = prev[residente_id] || [];
              return { ...prev, [residente_id]: [...arr.slice(-19), valor] };
            });

          } else if (msg.event === "ubicacion" && msg.data) {
            lastPulseraTsRef.current = Date.now();
            setPulseraActiva(true);
            const { residente_id, habitacion_id, nodo_id, rssi } = msg.data;
            const balizaReportando = nodo_id ?? habitacion_id;
            addEvent("ubicacion", `Baliza ${balizaReportando} RSSI ${rssi ?? "?"} → Hab ${habitacion_id}`);
            setBalizaVista(prev => ({ ...prev, [balizaReportando]: Date.now() }));
            setBalizaRssi(prev => ({ ...prev, [balizaReportando]: rssi ?? null }));

            // Historial de movimiento + toast cuando cambia de habitación
            const prevHab = prevLocationRef.current[residente_id];
            if (prevHab !== habitacion_id) {
              const newEntry = { habitacion_id, roomName: roomLabel(habitacion_id), ts: Date.now() };
              setLocationHistory(h => [newEntry, ...h.slice(0, 9)]);
              if (prevHab !== undefined) {
                const toastId = Date.now();
                const t = { id: toastId, title: `Pulsera → ${roomLabel(habitacion_id)}`, subtitle: `Desde ${roomLabel(prevHab)}`, color: THEME.accent, icon: "📍" };
                setToasts(prev => [...prev.slice(-2), t]);
                setTimeout(() => setToasts(prev => prev.filter(x => x.id !== toastId)), 4000);
              }
            }
            prevLocationRef.current[residente_id] = habitacion_id;

            setResidentes(prev => prev.map(r => r.id === residente_id
              ? { ...r, ubicacion_actual: habitacion_id }
              : r));

          } else if (msg.event === "alerta" && msg.data) {
            addEvent("alerta", msg.data.mensaje);
            const toastId = Date.now();
            const sevColor = sev(msg.data.severidad);
            const sevIcon = msg.data.severidad === "critical" ? "🚨" : "⚠️";
            const t = { id: toastId, title: msg.data.mensaje.slice(0, 70), subtitle: msg.data.severidad === "critical" ? "ALERTA CRÍTICA" : "Aviso", color: sevColor, icon: sevIcon };
            setToasts(prev => [...prev.slice(-2), t]);
            setTimeout(() => setToasts(prev => prev.filter(x => x.id !== toastId)), msg.data.severidad === "critical" ? 8000 : 5000);
            setAlertas(prev => [msg.data, ...prev]);

          } else if (msg.event === "baliza_heartbeat" && msg.data) {
            const { nodo_id } = msg.data;
            setBalizaHeartbeat(prev => ({ ...prev, [nodo_id]: Date.now() }));

          } else if (msg.event === "state_sync" && msg.data) {
            addEvent("sync", "Sincronización de estado recibida");

          } else {
            // Evento desconocido — mostrar raw truncado para debug
            addEvent("raw", raw.slice(0, 80));
          }
        } catch (e) {
          addEvent("error", `Mensaje no parseable: ${ev.data?.slice(0, 60)}`);
        }
      };

      ws.onerror = (e) => {
        setWsConnected(false);
        setPulseraActiva(false);
        addEvent("error", "Error en WebSocket");
      };
      ws.onclose = () => {
        setWsConnected(false);
        setPulseraActiva(false);
        addEvent("conexion", "WS desconectado");
      };
    } catch (e) {
      addEvent("error", `No se pudo abrir WS: ${e.message}`);
    }

    // Watchdog: pulsera sin datos 30 s → marcar inactiva
    const watchdog = setInterval(() => {
      if (lastPulseraTsRef.current > 0 && Date.now() - lastPulseraTsRef.current > 30000) {
        setPulseraActiva(false);
      }
    }, 10000);

    return () => {
      clearInterval(watchdog);
      if (ws) try { ws.close(); } catch (e) { /* ignore */ }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverIP]);

  // useMemo debe ir ANTES de cualquier return condicional (reglas de hooks)
  const balizas = useMemo(() => [
    { id: 1, room: "Habitación 1" },
    { id: 2, room: "Habitación 2" },
    { id: 3, room: "Comedor" },
  ], []);

  const handleAck = (id) => setAlertas(p => p.filter(a => a.id !== id));
  const selectedRes = residentes.find(r => r.id === selectedId);
  const pulsera = residentes[0];
  const critCount = alertas.filter(a => a.severidad === "critical").length;
  const warnCount = alertas.filter(a => a.severidad === "warning").length;
  const hrNow = pulsera?.estado_actual?.heart_rate?.value || 0;
  const spNow = pulsera?.estado_actual?.spo2?.value || 0;

  // ── Modal de ajustes de servidor (overlay) ──────────────────
  const settingsModal = showSettings && (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) setShowSettings(false); }}>
      <div style={{ width: "100%", maxWidth: 400, borderRadius: 22, overflow: "hidden", boxShadow: "0 24px 64px rgba(15,23,42,0.25)" }}>
        <ServerSetup onConnect={handleConnect} currentUrl={serverIP !== "demo" ? serverIP : PROD_URL} />
        <div style={{ background: THEME.surface, padding: "0 28px 20px", display: "flex", gap: 10 }}>
          <button onClick={() => setShowSettings(false)} style={{ flex: 1, padding: 11, borderRadius: 10, border: `1px solid ${THEME.border}`, background: THEME.surfaceAlt, color: THEME.textMuted, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
          <button onClick={() => { localStorage.setItem("serverIP", "demo"); setServerIP("demo"); setShowSettings(false); }} style={{ flex: 1, padding: 11, borderRadius: 10, border: `1px solid ${THEME.border}`, background: "transparent", color: THEME.textSubtle, fontSize: 13, cursor: "pointer" }}>Ver demo</button>
        </div>
      </div>
    </div>
  );

  // ── LAYOUT MÓVIL ────────────────────────────────────────────
  if (isMobile) {
    const sharedStyles = { fontFamily: "'DM Sans',-apple-system,sans-serif", background: THEME.bg, color: THEME.text, minHeight: "100svh" };
    const panelStyle = { flex: 1, overflow: "auto", padding: "14px 14px 80px" };
    return (
      <div style={sharedStyles}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap'); @keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.4}} @keyframes heartbeat{0%,100%{transform:scale(1)}14%{transform:scale(1.3)}28%{transform:scale(1)}42%{transform:scale(1.18)}70%{transform:scale(1)}} @keyframes toastIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}} @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}} *{box-sizing:border-box;margin:0;padding:0} body{background:${THEME.bg}} button:hover{filter:brightness(0.97)} ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:${THEME.borderStr};border-radius:2px}`}</style>
        {/* Header móvil */}
        <header style={{ background: THEME.surface, borderBottom: `1px solid ${THEME.border}`, padding: "0 16px", height: 52, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50, boxShadow: THEME.shadow }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#1a6fff,#0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(26,111,255,0.35)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text, letterSpacing: "-0.2px", lineHeight: 1.2 }}>Monitor BLE</div>
              <div style={{ fontSize: 10, color: THEME.textMuted }}>1 pulsera · 3 balizas</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: "3px 8px", fontSize: 10 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: wsConnected ? THEME.ok : THEME.offline, boxShadow: wsConnected ? `0 0 5px ${THEME.ok}` : "none" }} />
              <span style={{ color: wsConnected ? THEME.ok : THEME.textSubtle, fontWeight: 600 }}>{wsConnected ? "Online" : "Offline"}</span>
            </span>
            <button onClick={handleChangeServer} title="Cambiar servidor" style={{ background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, borderRadius: 7, width: 30, height: 30, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", color: THEME.textMuted }}>⚙</button>
          </div>
        </header>

        {/* Contenido por pestaña */}
        <div style={panelStyle}>
          {activeTab === "map" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <FloorMap floor={RESIDENCIA} residentes={residentes} alertas={alertas} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); setActiveTab("detail"); }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: "12px 14px", boxShadow: THEME.shadow }}>
                  <div style={{ fontSize: 9, color: THEME.textMuted, fontWeight: 700, marginBottom: 6 }}>PULSERA</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: !wsConnected ? THEME.offline : pulseraActiva ? THEME.ok : THEME.warn }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: !wsConnected ? THEME.offline : pulseraActiva ? THEME.ok : THEME.warn }}>{!wsConnected ? "Offline" : pulseraActiva ? "Activa" : "Sin señal"}</span>
                  </div>
                </div>
                <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: "12px 14px", boxShadow: THEME.shadow }}>
                  <div style={{ fontSize: 9, color: THEME.textMuted, fontWeight: 700, marginBottom: 6 }}>♥ HR</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: pulseraActiva && hrNow > 0 ? THEME.danger : THEME.textSubtle, fontFamily: "'JetBrains Mono',monospace" }}>{pulseraActiva && hrNow > 0 ? hrNow : "—"}</div>
                  {pulseraActiva && hrNow > 0 && <div style={{ fontSize: 9, color: `${THEME.danger}80` }}>bpm</div>}
                </div>
                <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: "12px 14px", boxShadow: THEME.shadow }}>
                  <div style={{ fontSize: 9, color: THEME.textMuted, fontWeight: 700, marginBottom: 6 }}>◉ SpO₂</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: pulseraActiva && spNow > 0 ? THEME.accent : THEME.textSubtle, fontFamily: "'JetBrains Mono',monospace" }}>{pulseraActiva && spNow > 0 ? spNow : "—"}</div>
                  {pulseraActiva && spNow > 0 && <div style={{ fontSize: 9, color: `${THEME.accent}80` }}>%</div>}
                </div>
              </div>
            </div>
          )}
          {activeTab === "devices" && (
            <DevicesPanel pulsera={pulsera} balizas={balizas} wsConnected={wsConnected} pulseraActiva={pulseraActiva} balizaVista={balizaVista} balizaRssi={balizaRssi} balizaHeartbeat={balizaHeartbeat} wsEvents={wsEvents} onSelectPulsera={(id) => { setSelectedId(id); setActiveTab("detail"); }} selectedId={selectedId} apiUrl={API_URL} />
          )}
          {activeTab === "detail" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {selectedRes
                ? <ResidentDetail residente={selectedRes} alertas={alertas} hrHistory={hrH[selectedRes.id] || []} spo2History={spH[selectedRes.id] || []} onClose={() => setSelectedId(null)} onAck={handleAck} />
                : <div style={{ textAlign: "center", padding: "60px 20px", color: THEME.textSubtle }}>
                    <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>👤</div>
                    <div style={{ fontWeight: 600, color: THEME.textMuted }}>Selecciona la pulsera</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Toca en el mapa o en Dispositivos</div>
                  </div>
              }
              <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 700, letterSpacing: 0.5, marginBottom: 10 }}>📍 HISTORIAL DE UBICACIÓN</div>
                <LocationHistory history={locationHistory} />
              </div>
            </div>
          )}
          {activeTab === "alerts" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 700 }}>🔔 ALERTAS</span>
                  {alertas.length > 0 && <span style={{ background: `${THEME.danger}15`, color: THEME.danger, fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4 }}>{alertas.length}</span>}
                </div>
                <AlertsPanel alertas={alertas} residentes={residentes} onSelect={(id) => { setSelectedId(id); setActiveTab("detail"); }} onAck={handleAck} />
              </div>
            </div>
          )}
        </div>
        <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} alertCount={alertas.length} />
        <Toast toasts={toasts} onDismiss={(id) => setToasts(t => t.filter(x => x.id !== id))} />
        {settingsModal}
      </div>
    );
  }

  // ── LAYOUT DESKTOP ──────────────────────────────────────────
  return (
    <div style={{ background: THEME.bg, color: THEME.text, minHeight: "100vh", fontFamily: "'DM Sans',-apple-system,sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes heartbeat { 0%,100%{transform:scale(1)} 14%{transform:scale(1.3)} 28%{transform:scale(1)} 42%{transform:scale(1.18)} 70%{transform:scale(1)} }
        @keyframes toastIn { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        button:focus-visible { outline: 2px solid ${THEME.accent}; outline-offset: 2px; }
        aside::-webkit-scrollbar { width: 4px; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${THEME.borderStr}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${THEME.textSubtle}; }
        body { margin: 0; background: ${THEME.bg}; }
        button:hover { filter: brightness(0.97); }
      `}</style>

      {/* ACCENT TOP BAR */}
      <div style={{ height: 3, background: "linear-gradient(90deg,#1a6fff,#0ea5e9,#6366f1,#1a6fff)", backgroundSize: "200% 100%", animation: "shimmer 4s linear infinite", flexShrink: 0 }} />

      {/* HEADER */}
      <header style={{
        background: THEME.surface,
        borderBottom: `1px solid ${THEME.border}`,
        padding: "0 24px", height: 57,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 3, zIndex: 50,
        boxShadow: THEME.shadow,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: "linear-gradient(135deg,#1a6fff,#0ea5e9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff",
            boxShadow: "0 6px 18px rgba(26,111,255,0.35)",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: THEME.text, letterSpacing: "-0.3px", lineHeight: 1.2 }}>Residencia · Monitor BLE</h1>
            <span style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 500 }}>1 pulsera · 3 balizas · datos en vivo</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {alertas.length > 0 && (
            <div style={{ display: "flex", gap: 8 }}>
              {critCount > 0 && (
                <div style={{ background: `${THEME.danger}15`, border: `1px solid ${THEME.danger}40`, color: THEME.danger, padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ animation: "pulse-dot 1s infinite" }}>●</span>{critCount} Crítica{critCount > 1 && "s"}
                </div>
              )}
              {warnCount > 0 && (
                <div style={{ background: `${THEME.warn}15`, border: `1px solid ${THEME.warn}40`, color: THEME.warn, padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                  ⚠ {warnCount} Aviso{warnCount > 1 && "s"}
                </div>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, fontSize: 11, color: THEME.textMuted, alignItems: "center" }}>
            {/* Indicador servidor */}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, borderRadius: 20, padding: "3px 10px" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: wsConnected ? THEME.ok : THEME.offline, boxShadow: wsConnected ? `0 0 6px ${THEME.ok}90` : "none", flexShrink: 0 }} />
              <span style={{ color: wsConnected ? THEME.ok : THEME.textSubtle, fontWeight: 600 }}>{wsConnected ? "Servidor" : "Sin servidor"}</span>
            </span>
            {/* Indicador pulsera */}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, borderRadius: 20, padding: "3px 10px" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                background: !wsConnected ? THEME.offline : pulseraActiva ? THEME.ok : THEME.warn,
                boxShadow: pulseraActiva ? `0 0 6px ${THEME.ok}90` : "none" }} />
              <span style={{ color: !wsConnected ? THEME.textSubtle : pulseraActiva ? THEME.ok : THEME.warn, fontWeight: 600 }}>
                {!wsConnected ? "Pulsera —" : pulseraActiva ? "Pulsera activa" : "Sin pulsera"}
              </span>
            </span>
            <span style={{ color: THEME.border }}>|</span>
            <span><span style={{ color: THEME.accent, fontWeight: 700 }}>3/3</span> balizas</span>
          </div>
          <div style={{ background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "6px 14px", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: THEME.textMuted, letterSpacing: 1 }}>
            {clock.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        </div>
      </header>

      {/* BODY */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* LEFT: Dispositivos */}
        <aside style={{ width: 300, borderRight: `1px solid ${THEME.border}`, background: THEME.surface, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 14px 10px", borderBottom: `1px solid ${THEME.border}` }}>
            <div style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 700, letterSpacing: 0.6 }}>DISPOSITIVOS</div>
            <div style={{ fontSize: 11, color: THEME.textSubtle, marginTop: 2 }}>Hardware desplegado</div>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
            <DevicesPanel pulsera={pulsera} balizas={balizas} wsConnected={wsConnected} pulseraActiva={pulseraActiva} balizaVista={balizaVista} balizaRssi={balizaRssi} balizaHeartbeat={balizaHeartbeat} wsEvents={wsEvents} onSelectPulsera={setSelectedId} selectedId={selectedId} apiUrl={API_URL} />
          </div>
        </aside>

        {/* CENTER: Mapa */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: THEME.bg }}>
          <div style={{ display: "flex", padding: "12px 20px", borderBottom: `1px solid ${THEME.border}`, background: THEME.surface, alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text, whiteSpace: "nowrap" }}>
              <span style={{ marginRight: 6 }}>📍</span>Plano
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: THEME.textSubtle, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: wsConnected ? THEME.ok : THEME.offline, boxShadow: wsConnected ? `0 0 6px ${THEME.ok}80` : "none", display: "inline-block", flexShrink: 0 }} />
                {wsConnected ? "En vivo · baliza activa reporta ubicación" : "Sin servidor · modo local"}
              </div>
            </div>
          </div>
          <div style={{ flex: 1, padding: 20, overflow: "auto" }}>
            <FloorMap floor={RESIDENCIA} residentes={residentes} alertas={alertas} selectedId={selectedId} onSelect={setSelectedId} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 16 }}>
              {/* Stat: Estado pulsera */}
              <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: "14px 16px", boxShadow: THEME.shadow }}>
                <div style={{ fontSize: 10, color: THEME.textMuted, fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>PULSERA</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: !wsConnected ? THEME.offline : pulseraActiva ? THEME.ok : THEME.warn, boxShadow: pulseraActiva ? `0 0 8px ${THEME.ok}80` : "none" }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: !wsConnected ? THEME.offline : pulseraActiva ? THEME.ok : THEME.warn }}>{!wsConnected ? "Offline" : pulseraActiva ? "Activa" : "Sin señal"}</span>
                </div>
                <div style={{ fontSize: 10, color: THEME.textSubtle, marginTop: 6 }}>
                  {pulseraActiva ? `Hab. ${pulsera?.ubicacion_actual ?? "—"}` : wsConnected ? "Esperando BLE…" : "Sin servidor"}
                </div>
              </div>
              {/* Stat: HR */}
              <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: "14px 16px", boxShadow: THEME.shadow, overflow: "hidden" }}>
                <div style={{ fontSize: 10, color: THEME.textMuted, fontWeight: 700, marginBottom: 4, letterSpacing: 0.5 }}>
                  <span style={{ display: "inline-block", animation: pulseraActiva && hrNow > 0 ? `heartbeat ${(60/hrNow).toFixed(2)}s ease-in-out infinite` : "none" }}>♥</span> HR
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                  <span style={{ fontSize: 26, fontWeight: 700, color: pulseraActiva && hrNow > 0 ? THEME.danger : THEME.textSubtle, fontFamily: "'JetBrains Mono',monospace" }}>{pulseraActiva && hrNow > 0 ? hrNow : "—"}</span>
                  {pulseraActiva && hrNow > 0 && <span style={{ fontSize: 11, color: `${THEME.danger}90`, fontWeight: 600 }}>bpm</span>}
                </div>
                {(hrH[pulsera?.id] || []).length > 2 && (
                  <div style={{ marginTop: 4, opacity: 0.65 }}>
                    <MiniChart data={(hrH[pulsera?.id] || []).slice(-14)} color={THEME.danger} height={26} />
                  </div>
                )}
              </div>
              {/* Stat: SpO2 */}
              <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: "14px 16px", boxShadow: THEME.shadow, overflow: "hidden" }}>
                <div style={{ fontSize: 10, color: THEME.textMuted, fontWeight: 700, marginBottom: 4, letterSpacing: 0.5 }}>◉ SpO₂</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                  <span style={{ fontSize: 26, fontWeight: 700, color: pulseraActiva && spNow > 0 ? THEME.accent : THEME.textSubtle, fontFamily: "'JetBrains Mono',monospace" }}>{pulseraActiva && spNow > 0 ? spNow : "—"}</span>
                  {pulseraActiva && spNow > 0 && <span style={{ fontSize: 11, color: `${THEME.accent}90`, fontWeight: 600 }}>%</span>}
                </div>
                {(spH[pulsera?.id] || []).length > 2 && (
                  <div style={{ marginTop: 4, opacity: 0.65 }}>
                    <MiniChart data={(spH[pulsera?.id] || []).slice(-14)} color={THEME.accent} height={26} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* RIGHT: Detalle + Alertas */}
        <aside style={{ width: 360, borderLeft: `1px solid ${THEME.border}`, background: THEME.surface, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, overflow: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            {selectedRes ? (
              <ResidentDetail
                residente={selectedRes}
                alertas={alertas}
                hrHistory={hrH[selectedRes.id] || []}
                spo2History={spH[selectedRes.id] || []}
                onClose={() => setSelectedId(null)}
                onAck={handleAck}
              />
            ) : (
              <div style={{ background: THEME.surfaceAlt, border: `1px dashed ${THEME.border}`, borderRadius: 14, padding: "40px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 44, marginBottom: 12, opacity: 0.3 }}>👤</div>
                <div style={{ color: THEME.textMuted, fontSize: 13, fontWeight: 600 }}>Selecciona la pulsera</div>
                <div style={{ color: THEME.textSubtle, fontSize: 11, marginTop: 4 }}>Haz clic en el mapa o en el panel izquierdo</div>
              </div>
            )}

            {/* Historial de movimiento */}
            <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 16, boxShadow: THEME.shadow }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 700, letterSpacing: 0.5 }}>📍 HISTORIAL DE UBICACIÓN</span>
                {locationHistory.length > 0 && (
                  <span style={{ fontSize: 10, color: THEME.textSubtle }}>{locationHistory.length} evento{locationHistory.length > 1 ? "s" : ""}</span>
                )}
              </div>
              <LocationHistory history={locationHistory} />
            </div>

            {/* Alertas */}
            <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 16, boxShadow: THEME.shadow, flex: selectedRes ? "0 0 auto" : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 700, letterSpacing: 0.5 }}>🔔 ALERTAS</span>
                {alertas.length > 0 && (
                  <span style={{ background: `${THEME.danger}15`, color: THEME.danger, fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4 }}>{alertas.length}</span>
                )}
              </div>
              <AlertsPanel alertas={alertas} residentes={residentes} onSelect={setSelectedId} onAck={handleAck} />
            </div>
          </div>
        </aside>
      </div>
      <Toast toasts={toasts} onDismiss={(id) => setToasts(t => t.filter(x => x.id !== id))} />
      {settingsModal}
    </div>
  );
}
