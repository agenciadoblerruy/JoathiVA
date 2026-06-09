import { useState, useRef, useEffect, useCallback } from "react";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const G="#1A3D2B",G2="#245C3F",G3="#2E7A52",A="#E8A020",A2="#F5B942";
const BG="#0D1F16",BG2="#111E17",BG3="#162B1F",TXT="#E8F0EA",TXT2="#8FA898",ERR="#EF4444";
const WA_LINK = "https://wa.me/message/7GEKEMVKDBSRE1";

// ─── DEMO DATA ────────────────────────────────────────────────────────────────
const USERS = [
  { id:"c1",  role:"chofer",    name:"Carlos Mendoza",   legajo:"#4821",  empresa:"Joathi Logística", avatar:"👷", pin:"1234" },
  { id:"cl1", role:"cliente",   name:"Supermercados DIA",legajo:"CLI-09", empresa:"DIA S.A.",          avatar:"🏪", pin:"5678" },
  { id:"p1",  role:"proveedor", name:"TransAndina SRL",  legajo:"PRV-14", empresa:"TransAndina SRL",   avatar:"🚚", pin:"9012" },
  { id:"e1",  role:"ejecutivo", name:"Valentina Torres", legajo:"EJE-03", empresa:"Joathi Logística",  avatar:"👩‍💼", pin:"3456" },
];
const ROLE_META = {
  chofer:    { label:"Chofer",    color:G3,        icon:"👷",  desc:"Gestión de viajes y operativas"          },
  cliente:   { label:"Cliente",   color:"#5BB8F5", icon:"🏪",  desc:"Seguimiento de tus envíos en tiempo real" },
  proveedor: { label:"Proveedor", color:A,         icon:"🚚",  desc:"Control operativo y documentación"       },
  ejecutivo: { label:"Ejecutivo", color:"#A78BFA", icon:"👩‍💼", desc:"Supervisión y gestión integral"          },
};
const TRIPS = [
  { id:"VJ-2847", chofer:"Carlos Mendoza",  cliente:"Supermercados DIA",  origen:"CABA - Dep. Central", destino:"Rosario, Santa Fe",   estado:"en_ruta",   bultos:48, peso:"1.240 kg", eta:"14:30 hs",   progreso:62,  kms:"302 km", lat:-33.1235, lng:-60.6891 },
  { id:"VJ-2851", chofer:"Miguel Ferreyra", cliente:"Farmacia Del Pueblo", origen:"Rosario - Hub 3",     destino:"Córdoba Capital",     estado:"pendiente", bultos:12, peso:"340 kg",   eta:"18:00 hs",   progreso:0,   kms:"178 km", lat:-31.4135, lng:-64.1811 },
  { id:"VJ-2839", chofer:"Carlos Mendoza",  cliente:"TechZone SA",         origen:"GBA Norte",           destino:"CABA - Dep. Central", estado:"entregado", bultos:6,  peso:"95 kg",    eta:"Completado", progreso:100, kms:"54 km",  lat:-34.6037, lng:-58.3816 },
  { id:"VJ-2853", chofer:"Ramón Suárez",    cliente:"Ferretería López",    origen:"Mendoza Hub",         destino:"San Luis Capital",    estado:"en_ruta",   bultos:22, peso:"680 kg",   eta:"16:15 hs",   progreso:38,  kms:"267 km", lat:-33.2950, lng:-66.3356 },
];
const FLEET_POSITIONS = [
  { id:"VJ-2847", lat:-33.1235, lng:-60.6891, chofer:"Carlos Mendoza",  cliente:"Supermercados DIA"  },
  { id:"VJ-2853", lat:-33.2950, lng:-66.3356, chofer:"Ramón Suárez",    cliente:"Ferretería López"   },
];
const MY_TRIPS     = TRIPS.filter(t => t.chofer === "Carlos Mendoza");
const ACTIVE_COUNT = MY_TRIPS.filter(t => t.estado === "en_ruta").length;
const STATUS_CFG   = {
  en_ruta:  { label:"En Ruta",   color:A,        bg:`${A}20`     },
  pendiente:{ label:"Pendiente", color:"#5BB8F5", bg:"#5BB8F520" },
  entregado:{ label:"Entregado", color:"#4CAF7D", bg:"#4CAF7D20" },
};
const DOCS_CHOFER = [
  { id:"lic", icon:"🪪", title:"Licencia de Conducir", tipo:"Profesional Cat. D",  vence:"12/2026",    estado:"vigente" },
  { id:"prop",icon:"📄", title:"Libreta de Propiedad",  tipo:"Mercedes Atego 1726", vence:"Permanente", estado:"vigente" },
  { id:"seg", icon:"🛡️", title:"Seguro del Vehículo",   tipo:"RC Obligatorio + TC", vence:"08/2026",    estado:"vigente" },
  { id:"vtv", icon:"🔧", title:"VTV",                    tipo:"Turno asignado",      vence:"06/2026",    estado:"proximo" },
];
const DOCS_PROV = [
  { id:"rem1", viaje:"VJ-2847", tipo:"Remito",        nombre:"Remito-DIA-2847.pdf", estado:"pendiente", fecha:"27/05/2026" },
  { id:"gui1", viaje:"VJ-2847", tipo:"Guía de Carga", nombre:"Guia-2847.pdf",       estado:"aprobado",  fecha:"26/05/2026" },
  { id:"seg1", viaje:"VJ-2851", tipo:"Seguro",        nombre:"Poliza-RC-2024.pdf",  estado:"aprobado",  fecha:"01/01/2026" },
  { id:"vtv1", viaje:"VJ-2853", tipo:"VTV",           nombre:"VTV-ABC456.pdf",      estado:"vencido",   fecha:"01/03/2026" },
];
const CHAT_SYSTEM = `Eres JoathiVA, asistente virtual de Joathi Logística. Asistís a los choferes con viajes, rutas, documentación e incidentes. Respondé en español rioplatense, conciso y profesional.`;
function nowTime(){ return new Date().toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"}); }

// ─── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────
function useNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );
  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return false;
    const p = await Notification.requestPermission();
    setPermission(p);
    return p === "granted";
  }, []);
  const notify = useCallback((title, body, tag) => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try {
      new Notification(title, { body, tag, icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚛</text></svg>" });
    } catch {}
  }, []);
  return { permission, requestPermission, notify };
}

// ─── LEAFLET MAP ──────────────────────────────────────────────────────────────
function LeafletMap({ lat, lng, zoom=13, markers=[], route=[], height=200, style={} }) {
  const containerRef  = useRef(null);
  const mapRef        = useRef(null);
  const markersRef    = useRef([]);
  const routeRef      = useRef(null);
  const [ready, setReady] = useState(!!window.L);

  // Load Leaflet CSS + JS once
  useEffect(() => {
    if (window.L) { setReady(true); return; }
    if (!document.getElementById("lf-css")) {
      const css = document.createElement("link");
      css.id = "lf-css"; css.rel = "stylesheet";
      css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(css);
    }
    if (!document.getElementById("lf-js")) {
      const js = document.createElement("script");
      js.id = "lf-js";
      js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      js.onload = () => setReady(true);
      document.head.appendChild(js);
    }
  }, []);

  // Init map
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    const L = window.L;
    const map = L.map(containerRef.current, { center:[lat,lng], zoom, zoomControl:true, attributionControl:false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{ maxZoom:19 }).addTo(map);
    mapRef.current = map;
    return () => { if (mapRef.current){ mapRef.current.remove(); mapRef.current=null; } };
  }, [ready]);

  // Update markers
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L = window.L;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = markers.map(m => {
      const icon = L.divIcon({ html:`<div style="font-size:${m.size||22}px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))">${m.icon||"📍"}</div>`, className:"", iconSize:[28,28], iconAnchor:[14,14] });
      return L.marker([m.lat,m.lng],{icon}).addTo(mapRef.current).bindPopup(m.label||"");
    });
    if (routeRef.current){ routeRef.current.remove(); routeRef.current=null; }
    if (route.length>1){
      routeRef.current = L.polyline(route,{color:A,weight:4,opacity:0.8,dashArray:"8,4"}).addTo(mapRef.current);
    }
  }, [ready, JSON.stringify(markers), JSON.stringify(route)]);

  // Pan to new position
  useEffect(() => {
    if (mapRef.current) mapRef.current.panTo([lat,lng]);
  }, [lat,lng]);

  if (!ready) return (
    <div style={{ height, borderRadius:14, background:BG3, display:"flex", alignItems:"center", justifyContent:"center", ...style }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:28, marginBottom:8 }}>🗺️</div>
        <div style={{ fontSize:12, color:TXT2 }}>Cargando mapa...</div>
      </div>
    </div>
  );
  return <div ref={containerRef} style={{ height, borderRadius:14, overflow:"hidden", zIndex:1, ...style }}/>;
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
function JoathiLogo({ size=28 }) {
  return (
    <svg width={size*1.9} height={size} viewBox="0 0 76 40" fill="none">
      <rect x="2"  y="2"  width="7"  height="24" rx="1.5" fill={G}/>
      <rect x="2"  y="22" width="12" height="4"  rx="1.5" fill={G}/>
      <rect x="18" y="2"  width="7"  height="24" rx="1.5" fill={G}/>
      <rect x="18" y="22" width="14" height="4"  rx="1.5" fill={G}/>
      <rect x="2"  y="30" width="22" height="2.5" rx="1" fill={G}/>
      <rect x="2"  y="34" width="18" height="2.5" rx="1" fill={G}/>
      <rect x="18" y="30" width="24" height="2.5" rx="1" fill={A}/>
      <rect x="18" y="34" width="20" height="2.5" rx="1" fill={A}/>
      <polygon points="42,28 50,32.75 42,37.5" fill={A}/>
    </svg>
  );
}
function StatusBadge({ estado }) {
  const c = STATUS_CFG[estado];
  return <span style={{ background:c.bg,color:c.color,padding:"3px 10px",borderRadius:20,fontSize:10,fontWeight:700,letterSpacing:"0.05em",border:`1px solid ${c.color}40` }}>{c.label}</span>;
}
function ProgressBar({ value, color=A }) {
  return <div style={{ background:"rgba(255,255,255,0.07)",borderRadius:4,height:4,overflow:"hidden",marginTop:8 }}><div style={{ width:`${value}%`,height:"100%",background:color,borderRadius:4,boxShadow:`0 0 8px ${color}60`,transition:"width 1.2s ease" }}/></div>;
}
function Card({ children, style={}, onClick }) {
  return <div onClick={onClick} style={{ background:`linear-gradient(145deg,${BG3},${BG2})`,border:`1px solid rgba(232,160,32,0.12)`,borderRadius:16,...style }}>{children}</div>;
}
function SLabel({ children }) {
  return <div style={{ fontSize:11,fontWeight:700,color:TXT2,marginBottom:10,letterSpacing:"0.08em" }}>{children}</div>;
}
function TripCard({ trip, showChofer=false }) {
  return (
    <Card style={{ padding:"14px 16px",marginBottom:10 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6 }}>
        <div>
          <div style={{ fontSize:11,color:A,fontWeight:700,fontFamily:"'DM Mono',monospace" }}>#{trip.id}</div>
          <div style={{ fontSize:15,fontWeight:800,color:TXT,marginTop:2,letterSpacing:"-0.02em" }}>{trip.cliente}</div>
          {showChofer && <div style={{ fontSize:11,color:TXT2,marginTop:1 }}>🚛 {trip.chofer}</div>}
        </div>
        <StatusBadge estado={trip.estado}/>
      </div>
      <div style={{ fontSize:12,color:TXT2,margin:"5px 0 3px",display:"flex",gap:5 }}><span style={{fontSize:10}}>●</span>{trip.origen}</div>
      <div style={{ fontSize:12,color:TXT2,marginBottom:10,display:"flex",gap:5 }}><span style={{fontSize:10,color:A}}>➜</span>{trip.destino}</div>
      <div style={{ display:"flex",gap:16,marginBottom:4 }}>
        {[["Bultos",trip.bultos],["Peso",trip.peso],["ETA",trip.eta],["Dist.",trip.kms]].map(([l,v])=>(
          <div key={l}><div style={{fontSize:9,color:TXT2,marginBottom:2,letterSpacing:"0.06em"}}>{l}</div><div style={{fontSize:12,fontWeight:700,color:TXT}}>{v}</div></div>
        ))}
      </div>
      {trip.estado!=="pendiente"&&<ProgressBar value={trip.progreso}/>}
    </Card>
  );
}
function ConfirmModal({ title, body, confirmLabel, confirmColor, onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div style={{ background:BG2,borderRadius:20,padding:"28px 20px",border:`1px solid rgba(232,160,32,0.2)`,width:"100%",maxWidth:360,animation:"fsUp 0.25s ease" }}>
        <div style={{ fontSize:20,fontWeight:800,color:TXT,marginBottom:10,textAlign:"center" }}>{title}</div>
        <div style={{ fontSize:13,color:TXT2,lineHeight:1.6,textAlign:"center",marginBottom:24 }}>{body}</div>
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={onCancel} style={{ flex:1,padding:"13px",background:BG3,border:`1px solid rgba(255,255,255,0.1)`,borderRadius:12,color:TXT2,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Cancelar</button>
          <button onClick={onConfirm} style={{ flex:1,padding:"13px",background:confirmColor||`linear-gradient(135deg,${G2},${G3})`,border:"none",borderRadius:12,color:TXT,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
function LogoutBtn({ onLogout }) {
  return <button onClick={onLogout} style={{ width:"100%",marginTop:10,marginBottom:24,padding:"14px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:12,color:ERR,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Cerrar Sesión</button>;
}

// ─── NOTIFICATION BANNER ──────────────────────────────────────────────────────
function NotifBanner({ permission, onRequest }) {
  if (permission === "granted" || permission === "denied") return null;
  return (
    <div style={{ background:`${A}15`,border:`1px solid ${A}40`,borderRadius:12,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:10 }}>
      <span style={{ fontSize:20 }}>🔔</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12,fontWeight:700,color:TXT }}>Activar notificaciones</div>
        <div style={{ fontSize:11,color:TXT2,marginTop:1 }}>Recibí alertas de operativas y entregas</div>
      </div>
      <button onClick={onRequest} style={{ padding:"6px 12px",background:`linear-gradient(135deg,${G2},${G3})`,border:"none",borderRadius:10,color:TXT,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",flexShrink:0 }}>Activar</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [step, setStep] = useState("role");
  const [role, setRole] = useState(null);
  const [pin, setPin]   = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const meta = role ? ROLE_META[role] : null;

  const selectRole = r => { setRole(r); setStep("pin"); setPin(""); setError(""); };
  const back = () => { setStep("role"); setRole(null); setPin(""); setError(""); };
  const digit = d => {
    if (pin.length>=4) return;
    const n = pin+d; setPin(n);
    if (n.length===4) setTimeout(()=>attempt(n),150);
  };
  const attempt = p => {
    const u = USERS.find(u=>u.role===role&&u.pin===p);
    if (u) { onLogin(u); } else {
      setError("PIN incorrecto. Intentá nuevamente."); setShake(true); setPin("");
      setTimeout(()=>setShake(false),500);
    }
  };

  return (
    <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 28px",animation:"fsUp 0.4s ease" }}>
      <div style={{ marginBottom:36,textAlign:"center" }}>
        <div style={{ display:"flex",justifyContent:"center",marginBottom:10 }}><JoathiLogo size={36}/></div>
        <div style={{ fontSize:11,color:TXT2,letterSpacing:"0.12em",fontWeight:600 }}>PLATAFORMA OPERATIVA</div>
      </div>

      {step==="role" && (
        <>
          <div style={{ fontSize:15,fontWeight:700,color:TXT,marginBottom:20,textAlign:"center" }}>¿Con qué perfil ingresás?</div>
          <div style={{ width:"100%",display:"flex",flexDirection:"column",gap:10 }}>
            {["chofer","cliente","proveedor","ejecutivo"].map(r=>{
              const m=ROLE_META[r];
              return (
                <button key={r} onClick={()=>selectRole(r)} style={{ width:"100%",padding:"16px 18px",background:`linear-gradient(135deg,${BG3},${BG2})`,border:`1px solid ${m.color}30`,borderRadius:16,cursor:"pointer",display:"flex",alignItems:"center",gap:14,fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                  <div style={{ width:44,height:44,borderRadius:12,flexShrink:0,background:`${m.color}20`,border:`1px solid ${m.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>{m.icon}</div>
                  <div style={{ textAlign:"left" }}>
                    <div style={{ fontSize:14,fontWeight:800,color:TXT }}>{m.label}</div>
                    <div style={{ fontSize:11,color:TXT2,marginTop:2 }}>{m.desc}</div>
                  </div>
                  <div style={{ marginLeft:"auto",color:TXT2,fontSize:16 }}>›</div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {step==="pin" && meta && (
        <div style={{ width:"100%",animation:`${shake?"shake":"fsUp"} 0.3s ease` }}>
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:28 }}>
            <button onClick={back} style={{ background:"none",border:"none",color:TXT2,fontSize:22,cursor:"pointer",padding:"4px 8px 4px 0" }}>‹</button>
            <div style={{ width:46,height:46,borderRadius:12,background:`${meta.color}20`,border:`1px solid ${meta.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24 }}>{meta.icon}</div>
            <div><div style={{ fontSize:15,fontWeight:800,color:TXT }}>{meta.label}</div><div style={{ fontSize:11,color:TXT2 }}>Ingresá tu PIN de 4 dígitos</div></div>
          </div>
          <div style={{ display:"flex",justifyContent:"center",gap:16,marginBottom:10 }}>
            {[0,1,2,3].map(i=>(
              <div key={i} style={{ width:16,height:16,borderRadius:"50%",background:i<pin.length?meta.color:"rgba(255,255,255,0.15)",border:`2px solid ${i<pin.length?meta.color:"rgba(255,255,255,0.2)"}`,transition:"all 0.15s",boxShadow:i<pin.length?`0 0 10px ${meta.color}60`:"none" }}/>
            ))}
          </div>
          {error && <div style={{ textAlign:"center",color:ERR,fontSize:12,fontWeight:600,marginBottom:8 }}>{error}</div>}
          <div style={{ textAlign:"center",fontSize:11,color:TXT2,marginBottom:24,opacity:0.7 }}>Demo PIN: {USERS.find(u=>u.role===role)?.pin}</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10 }}>
            {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i)=>(
              <button key={i} onClick={()=>d==="⌫"?setPin(p=>p.slice(0,-1)):d!==""&&digit(String(d))} disabled={d===""} style={{ padding:"18px 0",background:d===""?"transparent":d==="⌫"?BG3:`linear-gradient(145deg,${BG3},${BG2})`,border:d===""?"none":`1px solid rgba(232,160,32,0.12)`,borderRadius:14,color:TXT,fontSize:d==="⌫"?20:22,fontWeight:700,cursor:d===""?"default":"pointer",fontFamily:"'DM Mono',monospace",opacity:d===""?0:1 }}>{d}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHOFER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function ChoferDashboard({ user, onLogout }) {
  const [tab, setTab]             = useState("home");
  const [operativa, setOperativa] = useState(null);
  const [elapsed, setElapsed]     = useState("00:00:00");
  const [gpsPos, setGpsPos]       = useState({ lat:-34.6037, lng:-58.3816 });
  const [messages, setMessages]   = useState([{ role:"assistant", content:`¡Hola, ${user.name.split(" ")[0]}! Soy JoathiVA 👋\nEstoy disponible para asistirte en tiempo real. ¿En qué puedo ayudarte?`, time:nowTime() }]);
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const messagesEnd = useRef(null);
  const timerRef    = useRef(null);
  const gpsWatchRef = useRef(null);
  const { permission, requestPermission, notify } = useNotifications();

  // Timer
  useEffect(()=>{
    if (operativa){
      timerRef.current = setInterval(()=>{
        const s=Math.floor((Date.now()-operativa.startTs)/1000);
        setElapsed(`${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`);
      },1000);
    } else { clearInterval(timerRef.current); setElapsed("00:00:00"); }
    return ()=>clearInterval(timerRef.current);
  },[operativa]);

  // Live GPS watch while operativa active
  useEffect(()=>{
    if (operativa && navigator.geolocation){
      gpsWatchRef.current = navigator.geolocation.watchPosition(
        p=>setGpsPos({lat:p.coords.latitude,lng:p.coords.longitude}),
        ()=>{},
        {enableHighAccuracy:true,maximumAge:5000}
      );
    } else if (gpsWatchRef.current){
      navigator.geolocation.clearWatch(gpsWatchRef.current);
    }
    return ()=>{ if(gpsWatchRef.current) navigator.geolocation.clearWatch(gpsWatchRef.current); };
  },[operativa]);

  useEffect(()=>{ messagesEnd.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  const getLocation = useCallback(()=>new Promise(resolve=>{
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude}),()=>resolve({lat:-34.6037,lng:-58.3816}));
    else resolve({lat:-34.6037,lng:-58.3816});
  }),[]);

  const startOp = async () => {
    if (operativa) return;
    const granted = await requestPermission();
    const loc = await getLocation();
    const t = nowTime();
    setOperativa({inicio:t,startTs:Date.now(),lat:loc.lat,lng:loc.lng});
    setGpsPos({lat:loc.lat,lng:loc.lng});
    if (granted) notify("🟢 Joathi Logística","Operativa iniciada · GPS activo","op-start");
    setMessages(p=>[...p,{role:"assistant",content:`✅ Operativa iniciada.\n📍 ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}\n🕐 Inicio: ${t}\n\nCompartís ubicación en tiempo real. ¡Buen viaje!`,time:t}]);
    // Simulated proximity alert after 20s
    setTimeout(()=>notify("📦 Entrega próxima","Tu próxima entrega en Supermercados DIA está a 8 km","delivery-prox"),20000);
    setConfirm(null); setTab("mapa");
  };

  const endOp = () => {
    const t = nowTime();
    notify("🔴 Joathi Logística",`Operativa finalizada · Duración: ${elapsed}`,"op-end");
    setMessages(p=>[...p,{role:"assistant",content:`🔴 Operativa finalizada.\n🕐 Fin: ${t} · Duración: ${elapsed}\n\nTracking GPS desactivado. Reporte generado. ¡Hasta la próxima!`,time:t}]);
    setOperativa(null); setConfirm(null); setTab("home");
  };

  const send = async () => {
    const text=input.trim(); if(!text||loading) return;
    const t=nowTime();
    setMessages(p=>[...p,{role:"user",content:text,time:t}]);
    setInput(""); setLoading(true);
    setMessages(p=>[...p,{role:"assistant",content:"",time:t,isLoading:true}]);
    try {
      const history=[...messages,{role:"user",content:text}].map(m=>({role:m.role,content:m.content}));
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:CHAT_SYSTEM,messages:history})});
      const data=await res.json();
      setMessages(p=>[...p.slice(0,-1),{role:"assistant",content:data.content?.[0]?.text||"Sin respuesta.",time:t}]);
    } catch { setMessages(p=>[...p.slice(0,-1),{role:"assistant",content:"⚠️ Error de conexión.",time:t}]); }
    setLoading(false);
  };

  const TABS=[{id:"home",icon:"⊞",label:"Inicio"},{id:"mapa",icon:"🗺️",label:"Mapa"},{id:"viajes",icon:"🚛",label:"Viajes"},{id:"va",icon:"🤖",label:"JoathiVA"},{id:"perfil",icon:"👤",label:"Perfil"}];

  // Route line for active trip (CABA → Rosario)
  const activeRoute = [[-34.6037,-58.3816],[-34.4,-59.2],[-33.8,-60.1],[-33.1235,-60.6891]];

  return (
    <>
      {/* TOP BAR */}
      <div style={{ padding:"48px 20px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,position:"relative",zIndex:10,background:`linear-gradient(180deg,${BG} 70%,transparent)` }}>
        <JoathiLogo size={28}/>
        <div style={{ display:"flex",gap:10,alignItems:"center" }}>
          {operativa && (
            <div style={{ display:"flex",alignItems:"center",gap:5,background:"rgba(76,175,125,0.15)",border:"1px solid rgba(76,175,125,0.3)",borderRadius:20,padding:"4px 10px" }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:"#4CAF7D",animation:"pulse 1.5s infinite" }}/>
              <span style={{ fontSize:10,color:"#4CAF7D",fontWeight:700,fontFamily:"'DM Mono',monospace" }}>{elapsed}</span>
            </div>
          )}
          <div style={{ width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${G2},${G})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,border:`2px solid ${G3}60` }}>{user.avatar}</div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ flex:1,overflowY:"auto",padding:"0 20px" }}>

        {/* HOME */}
        {tab==="home" && (
          <div style={{ animation:"fsUp 0.35s ease" }}>
            <NotifBanner permission={permission} onRequest={requestPermission}/>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:24,fontWeight:800,color:TXT,letterSpacing:"-0.03em" }}>Buen día, {user.name.split(" ")[0]} 👋</div>
              <div style={{ fontSize:13,color:TXT2,marginTop:2 }}>Miércoles 27 de mayo, 2026</div>
            </div>
            {/* Quick actions */}
            <div style={{ marginBottom:16 }}>
              <SLabel>ACCIONES RÁPIDAS</SLabel>
              <div style={{ display:"flex",gap:8 }}>
                {[{icon:"🗺️",label:"Mi Ruta",fn:()=>setTab("mapa")},{icon:"📦",label:"Cargas",fn:()=>setTab("viajes")},{icon:"📋",label:"Documentos",fn:()=>setTab("perfil")},{icon:"🚨",label:"Incidente",fn:()=>{setTab("va");setInput("Necesito reportar un incidente en ruta");}}].map(qa=>(
                  <button key={qa.label} onClick={qa.fn} style={{ flex:1,background:BG3,border:`1px solid rgba(232,160,32,0.1)`,borderRadius:12,padding:"12px 4px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:5 }}>
                    <span style={{ fontSize:20 }}>{qa.icon}</span>
                    <span style={{ fontSize:10,fontWeight:600,color:TXT2 }}>{qa.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Operativa */}
            {!operativa ? (
              <button onClick={()=>setConfirm({type:"start"})} style={{ width:"100%",padding:"15px",background:`linear-gradient(135deg,${G2},${G3})`,border:`1px solid ${G3}`,borderRadius:16,color:TXT,fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:`0 6px 24px ${G}60`,marginBottom:16 }}>
                <span style={{ fontSize:20 }}>🟢</span> Iniciar Operativa
              </button>
            ) : (
              <Card style={{ padding:"14px 16px",marginBottom:16,border:`1px solid ${A}40` }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}>
                  <div style={{ width:10,height:10,borderRadius:"50%",background:"#4CAF7D",animation:"pulse 2s infinite",flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12,fontWeight:800,color:"#4CAF7D",letterSpacing:"0.04em" }}>OPERATIVA EN CURSO</div>
                    <div style={{ fontSize:10,color:TXT2,marginTop:1 }}>Inicio: {operativa.inicio} · {elapsed}</div>
                  </div>
                  <div style={{ fontSize:10,fontWeight:700,color:A,fontFamily:"'DM Mono',monospace",textAlign:"right" }}>
                    {gpsPos.lat.toFixed(4)}<br/>{gpsPos.lng.toFixed(4)}
                  </div>
                </div>
                <div style={{ display:"flex",gap:8 }}>
                  <button onClick={()=>setTab("mapa")} style={{ flex:1,padding:"10px",background:`${G2}60`,border:`1px solid ${G3}40`,borderRadius:10,color:TXT,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>🗺️ Ver Mapa</button>
                  <button onClick={()=>setConfirm({type:"end"})} style={{ flex:1,padding:"10px",background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,color:ERR,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>🔴 Finalizar</button>
                </div>
              </Card>
            )}
            {/* Stats */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16 }}>
              {[{label:"Viajes Activos",val:String(ACTIVE_COUNT),icon:"🚛",color:A},{label:"Km Hoy",val:"302",icon:"📍",color:"#5BB8F5"},{label:"Entregas",val:`${MY_TRIPS.filter(t=>t.estado==="entregado").length}/${MY_TRIPS.length}`,icon:"📦",color:"#4CAF7D"},{label:"Puntualidad",val:"94%",icon:"⏱️",color:A2}].map(s=>(
                <Card key={s.label} style={{ padding:14 }}>
                  <div style={{ fontSize:22,marginBottom:6 }}>{s.icon}</div>
                  <div style={{ fontSize:24,fontWeight:800,color:s.color,letterSpacing:"-0.03em" }}>{s.val}</div>
                  <div style={{ fontSize:11,color:TXT2,marginTop:2 }}>{s.label}</div>
                </Card>
              ))}
            </div>
            <SLabel>VIAJE ACTIVO</SLabel>
            <TripCard trip={TRIPS[0]}/>
            {/* WhatsApp JoathiVA */}
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer" style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20,background:`linear-gradient(135deg,#1a4a1a,#1e3a1e)`,border:"1px solid #25D36630",borderRadius:16,padding:"14px 16px",textDecoration:"none",cursor:"pointer" }}>
              <div style={{ width:46,height:46,borderRadius:12,flexShrink:0,background:"#25D36620",border:"1px solid #25D36640",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24 }}>💬</div>
              <div>
                <div style={{ fontSize:14,fontWeight:800,color:TXT }}>JoathiVA en WhatsApp</div>
                <div style={{ fontSize:12,color:"#4CAF7D",marginTop:2 }}>Consultá desde WhatsApp →</div>
              </div>
            </a>
          </div>
        )}

        {/* MAPA */}
        {tab==="mapa" && (
          <div style={{ animation:"fsUp 0.35s ease" }}>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:22,fontWeight:800,color:TXT,letterSpacing:"-0.02em" }}>Mi Mapa</div>
              <div style={{ fontSize:13,color:TXT2,marginTop:2 }}>{operativa?"GPS activo · Actualizando...":"Sin operativa activa"}</div>
            </div>
            <LeafletMap
              lat={gpsPos.lat} lng={gpsPos.lng} zoom={8}
              height={320}
              markers={[
                {lat:gpsPos.lat,lng:gpsPos.lng,icon:"🚛",label:"Tu posición",size:26},
                {lat:-33.1235,lng:-60.6891,icon:"📦",label:"Destino: Supermercados DIA"},
              ]}
              route={operativa?activeRoute:[]}
              style={{ marginBottom:14 }}
            />
            {operativa && (
              <Card style={{ padding:"12px 16px",marginBottom:12 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:12,fontWeight:700,color:"#4CAF7D" }}>📡 GPS Activo</div>
                    <div style={{ fontSize:11,color:TXT2,marginTop:2,fontFamily:"'DM Mono',monospace" }}>{gpsPos.lat.toFixed(6)}, {gpsPos.lng.toFixed(6)}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:12,fontWeight:700,color:A }}>Destino</div>
                    <div style={{ fontSize:11,color:TXT2,marginTop:2 }}>Rosario, Santa Fe</div>
                  </div>
                </div>
              </Card>
            )}
            <SLabel>VIAJE EN RUTA</SLabel>
            <TripCard trip={TRIPS[0]}/>
          </div>
        )}

        {/* VIAJES */}
        {tab==="viajes" && (
          <div style={{ animation:"fsUp 0.35s ease" }}>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:22,fontWeight:800,color:TXT,letterSpacing:"-0.02em" }}>Mis Viajes</div>
              <div style={{ fontSize:13,color:TXT2,marginTop:2 }}>{MY_TRIPS.length} asignaciones hoy</div>
            </div>
            {MY_TRIPS.map(t=><TripCard key={t.id} trip={t}/>)}
          </div>
        )}

        {/* JOATHIVA CHAT */}
        {tab==="va" && (
          <div style={{ display:"flex",flexDirection:"column",height:"calc(100vh - 175px)",animation:"fsUp 0.35s ease" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14,paddingBottom:12,borderBottom:`1px solid rgba(232,160,32,0.12)` }}>
              <div style={{ width:42,height:42,borderRadius:12,flexShrink:0,background:`linear-gradient(135deg,${G2},${A})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:`0 4px 16px ${A}35` }}>🤖</div>
              <div>
                <div style={{ fontSize:15,fontWeight:800,color:TXT }}>JoathiVA</div>
                <div style={{ fontSize:11,color:"#4CAF7D",fontWeight:600 }}>● Activo ahora</div>
              </div>
              {operativa&&<div style={{ marginLeft:"auto",fontSize:10,color:A,background:`${A}15`,border:`1px solid ${A}30`,borderRadius:10,padding:"3px 8px",fontWeight:700 }}>📡 GPS activo</div>}
            </div>
            <div style={{ flex:1,overflowY:"auto",paddingRight:2 }}>
              {messages.map((m,i)=>(
                <div key={i} style={{ display:"flex",flexDirection:m.role==="user"?"row-reverse":"row",alignItems:"flex-end",gap:8,marginBottom:14,animation:"fsUp 0.3s ease" }}>
                  {m.role!=="user"&&<div style={{ width:32,height:32,borderRadius:"50%",flexShrink:0,background:`linear-gradient(135deg,${G2},${A})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,boxShadow:`0 0 14px ${A}40` }}>🤖</div>}
                  <div style={{ maxWidth:"80%",background:m.role==="user"?`linear-gradient(135deg,${G2},${G3})`:BG3,borderRadius:m.role==="user"?"16px 4px 16px 16px":"4px 16px 16px 16px",padding:"10px 14px",border:m.role==="user"?`1px solid ${G3}`:`1px solid rgba(232,160,32,0.15)` }}>
                    {m.isLoading?<div style={{ display:"flex",gap:4,padding:"2px 0" }}>{[0,1,2].map(i=><div key={i} style={{ width:6,height:6,borderRadius:"50%",background:TXT2,animation:`bounce 1.2s ${i*0.2}s infinite` }}/>)}</div>:<p style={{ margin:0,fontSize:13.5,lineHeight:1.6,color:TXT,fontFamily:"'Plus Jakarta Sans',sans-serif",whiteSpace:"pre-wrap" }}>{m.content}</p>}
                    <div style={{ fontSize:10,color:TXT2,marginTop:4,textAlign:m.role==="user"?"right":"left" }}>{m.time}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEnd}/>
            </div>
            <div style={{ padding:"8px 0 6px",display:"flex",gap:6,overflowX:"auto" }}>
              {["¿Cuál es mi próxima entrega?","Estado del tráfico","Docs. pendientes","Reportar demora"].map(s=>(
                <button key={s} onClick={()=>setInput(s)} style={{ background:`${G2}50`,border:`1px solid ${G3}60`,borderRadius:20,padding:"6px 12px",color:A2,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'Plus Jakarta Sans',sans-serif",flexShrink:0 }}>{s}</button>
              ))}
            </div>
            <div style={{ display:"flex",gap:8,paddingTop:8,paddingBottom:4 }}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Consultá a JoathiVA..." style={{ flex:1,background:BG3,border:`1px solid rgba(232,160,32,0.2)`,borderRadius:12,padding:"11px 14px",color:TXT,fontSize:13,outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif" }}/>
              <button onClick={send} disabled={loading||!input.trim()} style={{ width:46,height:46,borderRadius:12,flexShrink:0,background:loading||!input.trim()?BG3:`linear-gradient(135deg,${G2},${G3})`,border:loading||!input.trim()?`1px solid rgba(255,255,255,0.08)`:"none",cursor:loading||!input.trim()?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,transition:"all 0.2s" }}>➤</button>
            </div>
            {/* WhatsApp shortcut */}
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer" style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:"#25D36615",border:"1px solid #25D36630",borderRadius:12,textDecoration:"none",marginBottom:4 }}>
              <span style={{ fontSize:18 }}>💬</span>
              <span style={{ fontSize:12,fontWeight:700,color:"#4CAF7D" }}>Continuar en WhatsApp</span>
            </a>
          </div>
        )}

        {/* PERFIL */}
        {tab==="perfil" && (
          <div style={{ animation:"fsUp 0.35s ease" }}>
            <div style={{ textAlign:"center",marginBottom:20 }}>
              <div style={{ width:80,height:80,borderRadius:"50%",margin:"0 auto 12px",background:`linear-gradient(135deg,${G2},${A})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,boxShadow:`0 8px 32px ${G}60`,border:`3px solid ${G3}60` }}>{user.avatar}</div>
              <div style={{ fontSize:20,fontWeight:800,color:TXT,letterSpacing:"-0.02em" }}>{user.name}</div>
              <div style={{ fontSize:12,color:A,fontWeight:700,marginTop:3 }}>Chofer Senior · Legajo {user.legajo}</div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:18 }}>
              {[["Viajes","1.247"],["Km Totales","98.4k"],["Rating","4.9 ⭐"]].map(([l,v])=>(
                <Card key={l} style={{ padding:"12px 10px",textAlign:"center" }}><div style={{ fontSize:16,fontWeight:800,color:TXT }}>{v}</div><div style={{ fontSize:10,color:TXT2,marginTop:2 }}>{l}</div></Card>
              ))}
            </div>
            {[["🚛","Unidad","Mercedes Atego 1726 · ABC 123"],["🏢","Base","Hub CABA Central"],["📅","Antigüedad","6 años en Joathi"]].map(([ic,l,v])=>(
              <div key={l} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:`1px solid rgba(232,160,32,0.08)` }}>
                <span style={{ fontSize:18,width:28,textAlign:"center" }}>{ic}</span>
                <div><div style={{ fontSize:10,color:TXT2,letterSpacing:"0.05em" }}>{l}</div><div style={{ fontSize:13,fontWeight:600,color:TXT,marginTop:1 }}>{v}</div></div>
              </div>
            ))}
            <div style={{ marginTop:18,marginBottom:8 }}>
              <SLabel>DOCUMENTACIÓN</SLabel>
              {DOCS_CHOFER.map(doc=>(
                <Card key={doc.id} style={{ padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:14 }}>
                  <div style={{ width:46,height:46,borderRadius:12,flexShrink:0,background:doc.estado==="proximo"?`${A}20`:`${G2}50`,border:`1px solid ${doc.estado==="proximo"?A:G3}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>{doc.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,fontWeight:800,color:TXT }}>{doc.title}</div>
                    <div style={{ fontSize:11,color:TXT2,marginTop:2 }}>{doc.tipo}</div>
                    <div style={{ display:"flex",alignItems:"center",gap:6,marginTop:5 }}>
                      <span style={{ fontSize:10,color:doc.estado==="proximo"?A:"#4CAF7D",fontWeight:700,background:doc.estado==="proximo"?`${A}15`:"#4CAF7D15",padding:"2px 8px",borderRadius:10,border:`1px solid ${doc.estado==="proximo"?A:"#4CAF7D"}30` }}>{doc.estado==="proximo"?"⚠ Próx a vencer":"✓ Vigente"}</span>
                      <span style={{ fontSize:10,color:TXT2 }}>Vence: {doc.vence}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <LogoutBtn onLogout={onLogout}/>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ display:"flex",background:`${BG2}F8`,borderTop:`1px solid rgba(232,160,32,0.12)`,backdropFilter:"blur(20px)",padding:"8px 0 22px",flexShrink:0,position:"relative",zIndex:10 }}>
        {TABS.map(t=>{
          const active=tab===t.id;
          return (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 0",position:"relative" }}>
              {active&&<div style={{ position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:28,height:2.5,background:A,borderRadius:2,boxShadow:`0 0 10px ${A}` }}/>}
              <span style={{ fontSize:16,filter:active?"none":"grayscale(1) opacity(0.4)",transition:"filter 0.2s" }}>{t.icon}</span>
              <span style={{ fontSize:9,fontWeight:active?700:500,color:active?A:TXT2,transition:"color 0.2s" }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {confirm?.type==="start"&&!operativa&&<ConfirmModal title="¿Iniciar Operativa?" confirmLabel="🟢 Confirmar Inicio" body="Se registrará tu ubicación GPS en tiempo real y recibirás notificaciones de entregas." onConfirm={startOp} onCancel={()=>setConfirm(null)}/>}
      {confirm?.type==="end"&&<ConfirmModal title="¿Finalizar Operativa?" confirmLabel="🔴 Confirmar Fin" confirmColor="rgba(239,68,68,0.85)" body={`Duración actual: ${elapsed}. Se cerrará el tracking GPS.`} onConfirm={endOp} onCancel={()=>setConfirm(null)}/>}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENTE DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function ClienteDashboard({ user, onLogout }) {
  const myTrips = TRIPS.filter(t=>t.cliente===user.name);
  const [sel, setSel] = useState(myTrips[0]||null);
  const [pos, setPos] = useState({lat:sel?.lat??-34.6037,lng:sel?.lng??-58.3816});
  const { permission, requestPermission, notify } = useNotifications();

  useEffect(()=>{
    if (!sel||sel.estado!=="en_ruta") return;
    notify("🚛 Joathi Logística",`Tu envío ${sel.id} está en camino · ETA: ${sel.eta}`,"client-notif");
    const iv=setInterval(()=>{
      setPos(p=>({lat:p.lat+(Math.random()-0.5)*0.003,lng:p.lng+(Math.random()-0.5)*0.004}));
    },3000);
    return ()=>clearInterval(iv);
  },[sel]);

  const route=[[-34.6037,-58.3816],[-34.4,-59.2],[-33.8,-60.1],[-33.1235,-60.6891]];
  const timeline=[
    {icon:"✅",label:"Pedido confirmado",    time:"08:00 hs",done:true},
    {icon:"📦",label:"Carga retirada",        time:"09:30 hs",done:true},
    {icon:"🚛",label:"En camino a destino",   time:"10:15 hs",done:sel?.estado==="en_ruta"||sel?.estado==="entregado"},
    {icon:"📍",label:"Llegada a destino",     time:sel?.eta||"—",done:sel?.estado==="entregado"},
    {icon:"🎉",label:"Entregado",             time:sel?.estado==="entregado"?"Completado":"—",done:sel?.estado==="entregado"},
  ];

  return (
    <>
      <div style={{ padding:"48px 20px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,background:`linear-gradient(180deg,${BG} 70%,transparent)` }}>
        <JoathiLogo size={28}/>
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          <span style={{ fontSize:10,color:"#5BB8F5",fontWeight:700,background:"rgba(91,184,245,0.12)",border:"1px solid rgba(91,184,245,0.3)",borderRadius:10,padding:"3px 10px" }}>CLIENTE</span>
          <div style={{ width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#1e3a5f,#2563A8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>{user.avatar}</div>
        </div>
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"0 20px" }}>
        <div style={{ animation:"fsUp 0.35s ease" }}>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:22,fontWeight:800,color:TXT,letterSpacing:"-0.02em" }}>Mis Envíos</div>
            <div style={{ fontSize:13,color:TXT2,marginTop:2 }}>{user.name}</div>
          </div>
          <NotifBanner permission={permission} onRequest={async()=>{ await requestPermission(); notify("🔔 Joathi Logística","Notificaciones activadas para tus envíos","client-perm"); }}/>
          {myTrips.length>1&&(
            <div style={{ display:"flex",gap:8,marginBottom:14,overflowX:"auto" }}>
              {myTrips.map(t=><button key={t.id} onClick={()=>setSel(t)} style={{ flexShrink:0,padding:"6px 14px",background:sel?.id===t.id?`${G2}80`:BG3,border:`1px solid ${sel?.id===t.id?A:"rgba(255,255,255,0.1)"}`,borderRadius:20,color:sel?.id===t.id?A:TXT2,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif" }}>#{t.id}</button>)}
            </div>
          )}
          {sel&&(
            <>
              {/* REAL MAP */}
              <LeafletMap
                lat={pos.lat} lng={pos.lng} zoom={7}
                height={240}
                markers={[
                  {lat:pos.lat,lng:pos.lng,icon:"🚛",label:`Camión · ${sel.chofer}`,size:26},
                  {lat:-34.6037,lng:-58.3816,icon:"🏭",label:"Origen: CABA"},
                  {lat:-33.1235,lng:-60.6891,icon:"🏪",label:"Destino: Supermercados DIA"},
                ]}
                route={sel.estado==="en_ruta"?route:[]}
                style={{ marginBottom:14 }}
              />
              {sel.estado==="en_ruta"&&(
                <div style={{ display:"flex",alignItems:"center",gap:6,background:"rgba(76,175,125,0.12)",border:"1px solid rgba(76,175,125,0.3)",borderRadius:12,padding:"8px 12px",marginBottom:12 }}>
                  <div style={{ width:6,height:6,borderRadius:"50%",background:"#4CAF7D",animation:"pulse 1.5s infinite" }}/>
                  <span style={{ fontSize:12,color:"#4CAF7D",fontWeight:700 }}>GPS Activo · Posición actualizando cada 3s</span>
                </div>
              )}
              <Card style={{ padding:"14px 16px",marginBottom:14 }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
                  <div style={{ fontSize:12,color:A,fontWeight:700,fontFamily:"'DM Mono',monospace" }}>#{sel.id}</div>
                  <StatusBadge estado={sel.estado}/>
                </div>
                <div style={{ display:"flex",gap:12 }}>
                  {[["Origen",sel.origen],["Destino",sel.destino],["ETA",sel.eta]].map(([l,v])=>(
                    <div key={l} style={{ flex:1 }}><div style={{ fontSize:9,color:TXT2,letterSpacing:"0.06em" }}>{l}</div><div style={{ fontSize:11,fontWeight:700,color:TXT,marginTop:2 }}>{v}</div></div>
                  ))}
                </div>
                {sel.estado!=="pendiente"&&<ProgressBar value={sel.progreso}/>}
              </Card>
              <Card style={{ padding:"12px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:12 }}>
                <div style={{ width:40,height:40,borderRadius:10,background:`${G2}60`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>👷</div>
                <div><div style={{ fontSize:11,color:TXT2 }}>Chofer asignado</div><div style={{ fontSize:14,fontWeight:800,color:TXT }}>{sel.chofer}</div></div>
                <div style={{ marginLeft:"auto",display:"flex",gap:8 }}>
                  <button style={{ width:36,height:36,borderRadius:10,background:`${G2}60`,border:`1px solid ${G3}50`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,cursor:"pointer" }}>📞</button>
                  <a href={WA_LINK} target="_blank" rel="noopener noreferrer" style={{ width:36,height:36,borderRadius:10,background:"#25D36620",border:"1px solid #25D36640",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,cursor:"pointer" }}>💬</a>
                </div>
              </Card>
              <SLabel>ESTADO DEL ENVÍO</SLabel>
              <Card style={{ padding:"14px 16px",marginBottom:20 }}>
                {timeline.map((s,i)=>(
                  <div key={i} style={{ display:"flex",alignItems:"flex-start",gap:12,marginBottom:i<timeline.length-1?14:0 }}>
                    <div style={{ display:"flex",flexDirection:"column",alignItems:"center" }}>
                      <div style={{ width:32,height:32,borderRadius:10,background:s.done?`${G2}80`:"rgba(255,255,255,0.05)",border:`1px solid ${s.done?G3:"rgba(255,255,255,0.1)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>{s.done?s.icon:"○"}</div>
                      {i<timeline.length-1&&<div style={{ width:2,height:14,background:s.done?G3:"rgba(255,255,255,0.08)",marginTop:4,borderRadius:1 }}/>}
                    </div>
                    <div style={{ paddingTop:6 }}><div style={{ fontSize:13,fontWeight:700,color:s.done?TXT:TXT2 }}>{s.label}</div><div style={{ fontSize:11,color:TXT2,marginTop:1 }}>{s.time}</div></div>
                  </div>
                ))}
              </Card>
            </>
          )}
          {myTrips.length===0&&<div style={{ textAlign:"center",padding:"40px 0",color:TXT2 }}>No tenés envíos activos actualmente.</div>}
          <LogoutBtn onLogout={onLogout}/>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVEEDOR DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function ProveedorDashboard({ user, onLogout }) {
  const [tabP, setTabP] = useState("operativas");
  const [docs, setDocs] = useState(DOCS_PROV);
  const [uploadMsg, setUploadMsg] = useState("");
  const { permission, requestPermission, notify } = useNotifications();
  const activeOps = TRIPS.filter(t=>t.estado==="en_ruta");
  const DS = { aprobado:{color:"#4CAF7D",bg:"#4CAF7D15",label:"✓ Aprobado"},pendiente:{color:A,bg:`${A}15`,label:"⏳ Pendiente"},vencido:{color:ERR,bg:`${ERR}15`,label:"✗ Vencido"} };

  const simulateUpload = (docId) => {
    setUploadMsg("Subiendo documento...");
    setTimeout(()=>{
      setDocs(prev=>prev.map(d=>d.id===docId?{...d,estado:"aprobado"}:d));
      setUploadMsg("✅ Documento cargado correctamente.");
      notify("📋 Joathi Logística","Documento aprobado correctamente","doc-upload");
      setTimeout(()=>setUploadMsg(""),3000);
    },1500);
  };

  return (
    <>
      <div style={{ padding:"48px 20px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,background:`linear-gradient(180deg,${BG} 70%,transparent)` }}>
        <JoathiLogo size={28}/>
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          <span style={{ fontSize:10,color:A,fontWeight:700,background:`${A}15`,border:`1px solid ${A}40`,borderRadius:10,padding:"3px 10px" }}>PROVEEDOR</span>
          <div style={{ width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${G},${A}80)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>{user.avatar}</div>
        </div>
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"0 20px" }}>
        <div style={{ animation:"fsUp 0.35s ease" }}>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:22,fontWeight:800,color:TXT,letterSpacing:"-0.02em" }}>{user.name}</div>
            <div style={{ fontSize:13,color:TXT2,marginTop:2 }}>{user.empresa}</div>
          </div>
          <NotifBanner permission={permission} onRequest={requestPermission}/>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16 }}>
            {[{label:"Op. Activas",val:String(activeOps.length),color:A},{label:"Docs Pend.",val:String(docs.filter(d=>d.estado==="pendiente").length),color:"#5BB8F5"},{label:"Docs Venc.",val:String(docs.filter(d=>d.estado==="vencido").length),color:ERR}].map(s=>(
              <Card key={s.label} style={{ padding:"12px 10px",textAlign:"center" }}><div style={{ fontSize:22,fontWeight:800,color:s.color }}>{s.val}</div><div style={{ fontSize:10,color:TXT2,marginTop:2 }}>{s.label}</div></Card>
            ))}
          </div>
          <div style={{ display:"flex",gap:8,marginBottom:16 }}>
            {[["operativas","🚛 Operativas"],["docs","📋 Documentos"],["mapa","🗺️ Mapa Flota"]].map(([id,label])=>(
              <button key={id} onClick={()=>setTabP(id)} style={{ flex:1,padding:"9px 4px",background:tabP===id?`linear-gradient(135deg,${G2},${G3})`:BG3,border:`1px solid ${tabP===id?G3:"rgba(255,255,255,0.08)"}`,borderRadius:12,color:tabP===id?TXT:TXT2,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{label}</button>
            ))}
          </div>

          {tabP==="operativas"&&(
            <>
              <SLabel>OPERATIVAS ACTIVAS</SLabel>
              {activeOps.map(t=><TripCard key={t.id} trip={t} showChofer/>)}
              <SLabel>OTRAS OPERATIVAS</SLabel>
              {TRIPS.filter(t=>t.estado!=="en_ruta").map(t=><TripCard key={t.id} trip={t} showChofer/>)}
            </>
          )}

          {tabP==="mapa"&&(
            <>
              <SLabel>MAPA DE FLOTA EN TIEMPO REAL</SLabel>
              <LeafletMap
                lat={-33.5} lng={-62.0} zoom={6}
                height={300}
                markers={FLEET_POSITIONS.map(f=>({lat:f.lat,lng:f.lng,icon:"🚛",label:`${f.id} · ${f.chofer}`,size:22}))}
                style={{ marginBottom:14 }}
              />
              <SLabel>UNIDADES ACTIVAS</SLabel>
              {FLEET_POSITIONS.map(f=>(
                <Card key={f.id} style={{ padding:"12px 14px",marginBottom:10,display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:40,height:40,borderRadius:10,background:`${G2}60`,border:`1px solid ${G3}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>🚛</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,fontWeight:800,color:TXT }}>{f.id}</div>
                    <div style={{ fontSize:11,color:TXT2,marginTop:1 }}>{f.chofer} · {f.cliente}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:10,color:"#4CAF7D",fontWeight:700 }}>● En Ruta</div>
                    <div style={{ fontSize:10,color:TXT2,fontFamily:"'DM Mono',monospace",marginTop:2 }}>{f.lat.toFixed(3)}, {f.lng.toFixed(3)}</div>
                  </div>
                </Card>
              ))}
            </>
          )}

          {tabP==="docs"&&(
            <>
              <SLabel>DOCUMENTACIÓN</SLabel>
              {uploadMsg&&<div style={{ background:`${G2}40`,border:`1px solid ${G3}`,borderRadius:12,padding:"10px 14px",marginBottom:12,fontSize:13,color:TXT,fontWeight:600,animation:"fsUp 0.3s ease" }}>{uploadMsg}</div>}
              {docs.map(doc=>{
                const ds=DS[doc.estado];
                return (
                  <Card key={doc.id} style={{ padding:"14px 16px",marginBottom:10 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6 }}>
                      <div>
                        <div style={{ fontSize:10,color:A,fontWeight:700,fontFamily:"'DM Mono',monospace" }}>Viaje #{doc.viaje}</div>
                        <div style={{ fontSize:14,fontWeight:800,color:TXT,marginTop:2 }}>{doc.tipo}</div>
                        <div style={{ fontSize:11,color:TXT2,marginTop:1 }}>{doc.nombre}</div>
                      </div>
                      <span style={{ background:ds.bg,color:ds.color,padding:"3px 10px",borderRadius:20,fontSize:10,fontWeight:700,border:`1px solid ${ds.color}40`,flexShrink:0 }}>{ds.label}</span>
                    </div>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:8 }}>
                      <span style={{ fontSize:11,color:TXT2 }}>Fecha: {doc.fecha}</span>
                      {doc.estado!=="aprobado"&&<button onClick={()=>simulateUpload(doc.id)} style={{ padding:"6px 14px",background:`linear-gradient(135deg,${G2},${G3})`,border:"none",borderRadius:10,color:TXT,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif" }}>📤 Adjuntar</button>}
                    </div>
                  </Card>
                );
              })}
            </>
          )}
          <LogoutBtn onLogout={onLogout}/>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTIVO DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function EjecutivoDashboard({ user, onLogout }) {
  const [tabE, setTabE] = useState("overview");
  const { permission, requestPermission, notify } = useNotifications();
  const kpis=[{label:"Op. En Ruta",val:String(TRIPS.filter(t=>t.estado==="en_ruta").length),color:A,icon:"🚛"},{label:"Pendientes",val:String(TRIPS.filter(t=>t.estado==="pendiente").length),color:"#5BB8F5",icon:"⏳"},{label:"Entregadas",val:String(TRIPS.filter(t=>t.estado==="entregado").length),color:"#4CAF7D",icon:"✅"},{label:"Choferes",val:"3",color:"#A78BFA",icon:"👷"},{label:"Km Totales",val:"801",color:A2,icon:"📍"},{label:"Puntualidad",val:"94%",color:"#4CAF7D",icon:"⭐"}];
  const alerts=[{icon:"⚠️",color:A,msg:"VTV vencida · Vehículo ABC 456 (Ramón Suárez)"},{icon:"📋",color:"#5BB8F5",msg:"Remito pendiente · VJ-2847 · DIA"},{icon:"🕐",color:"#A78BFA",msg:"Demora estimada 45 min · VJ-2853 · Mendoza"}];

  return (
    <>
      <div style={{ padding:"48px 20px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,background:`linear-gradient(180deg,${BG} 70%,transparent)` }}>
        <JoathiLogo size={28}/>
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          <span style={{ fontSize:10,color:"#A78BFA",fontWeight:700,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:10,padding:"3px 10px" }}>EJECUTIVO</span>
          <div style={{ width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#4c1d95,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>{user.avatar}</div>
        </div>
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"0 20px" }}>
        <div style={{ animation:"fsUp 0.35s ease" }}>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:22,fontWeight:800,color:TXT,letterSpacing:"-0.02em" }}>Buen día, {user.name.split(" ")[0]} 👋</div>
            <div style={{ fontSize:13,color:TXT2,marginTop:2 }}>Panel Ejecutivo · Joathi Logística</div>
          </div>
          <NotifBanner permission={permission} onRequest={async()=>{ await requestPermission(); notify("🔔 Joathi Logística","Alertas ejecutivas activadas","exec-perm"); }}/>
          <div style={{ display:"flex",gap:8,marginBottom:16 }}>
            {[["overview","📊 Resumen"],["flota","🗺️ Flota"],["operativas","🚛 Operativas"],["alertas","🔔 Alertas"]].map(([id,label])=>(
              <button key={id} onClick={()=>setTabE(id)} style={{ flex:1,padding:"8px 2px",background:tabE===id?"linear-gradient(135deg,#4c1d95,#7c3aed)":BG3,border:`1px solid ${tabE===id?"rgba(167,139,250,0.5)":"rgba(255,255,255,0.08)"}`,borderRadius:12,color:tabE===id?TXT:TXT2,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{label}</button>
            ))}
          </div>

          {tabE==="overview"&&(
            <>
              <SLabel>KPIs DEL DÍA</SLabel>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16 }}>
                {kpis.map(k=>(
                  <Card key={k.label} style={{ padding:14 }}><div style={{ fontSize:20,marginBottom:6 }}>{k.icon}</div><div style={{ fontSize:24,fontWeight:800,color:k.color,letterSpacing:"-0.03em" }}>{k.val}</div><div style={{ fontSize:11,color:TXT2,marginTop:2 }}>{k.label}</div></Card>
                ))}
              </div>
              <SLabel>ALERTAS ACTIVAS</SLabel>
              {alerts.map((a,i)=>(
                <Card key={i} style={{ padding:"12px 14px",marginBottom:10,display:"flex",alignItems:"center",gap:12,border:`1px solid ${a.color}25` }}>
                  <span style={{ fontSize:20 }}>{a.icon}</span>
                  <span style={{ fontSize:13,color:TXT,fontWeight:600,lineHeight:1.4 }}>{a.msg}</span>
                </Card>
              ))}
            </>
          )}

          {tabE==="flota"&&(
            <>
              <SLabel>MAPA DE FLOTA EN TIEMPO REAL</SLabel>
              <LeafletMap
                lat={-33.5} lng={-62.0} zoom={5}
                height={320}
                markers={FLEET_POSITIONS.map(f=>({lat:f.lat,lng:f.lng,icon:"🚛",label:`${f.id} · ${f.chofer} → ${f.cliente}`,size:24}))}
                style={{ marginBottom:14 }}
              />
              <SLabel>UNIDADES EN RUTA</SLabel>
              {FLEET_POSITIONS.map(f=>(
                <Card key={f.id} style={{ padding:"12px 14px",marginBottom:10 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
                    <div style={{ fontSize:13,fontWeight:800,color:TXT }}>{f.id}</div>
                    <span style={{ background:`${A}20`,color:A,padding:"2px 10px",borderRadius:20,fontSize:10,fontWeight:700 }}>En Ruta</span>
                  </div>
                  <div style={{ fontSize:11,color:TXT2 }}>🚛 {f.chofer} → 📦 {f.cliente}</div>
                  <div style={{ fontSize:10,color:A,fontFamily:"'DM Mono',monospace",marginTop:4 }}>{f.lat.toFixed(4)}, {f.lng.toFixed(4)}</div>
                </Card>
              ))}
            </>
          )}

          {tabE==="operativas"&&(
            <>
              <SLabel>TODAS LAS OPERATIVAS</SLabel>
              {TRIPS.map(t=><TripCard key={t.id} trip={t} showChofer/>)}
            </>
          )}

          {tabE==="alertas"&&(
            <>
              <SLabel>ALERTAS Y NOVEDADES</SLabel>
              {alerts.map((a,i)=>(
                <Card key={i} style={{ padding:"16px",marginBottom:12,border:`1px solid ${a.color}30` }}>
                  <div style={{ display:"flex",alignItems:"flex-start",gap:12 }}>
                    <div style={{ width:44,height:44,borderRadius:12,background:`${a.color}15`,border:`1px solid ${a.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>{a.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14,fontWeight:800,color:TXT,lineHeight:1.4 }}>{a.msg}</div>
                      <div style={{ fontSize:11,color:TXT2,marginTop:4 }}>Hace 12 min · Sin resolver</div>
                      <div style={{ display:"flex",gap:8,marginTop:10 }}>
                        <button style={{ padding:"7px 14px",background:`${a.color}15`,border:`1px solid ${a.color}40`,borderRadius:10,color:a.color,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Gestionar →</button>
                        <a href={WA_LINK} target="_blank" rel="noopener noreferrer" style={{ padding:"7px 14px",background:"#25D36615",border:"1px solid #25D36640",borderRadius:10,color:"#4CAF7D",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",textDecoration:"none",display:"flex",alignItems:"center",gap:4 }}>💬 WhatsApp</a>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
          <LogoutBtn onLogout={onLogout}/>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(null);
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0} body{background:${BG}} ::-webkit-scrollbar{width:0}
        @keyframes fsUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes bounce{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
        .leaflet-container{font-family:'Plus Jakarta Sans',sans-serif!important}
        input::placeholder{color:${TXT2}} button:active{transform:scale(.97)}
      `}</style>
      <div style={{ width:"100%",maxWidth:430,margin:"0 auto",height:"100vh",display:"flex",flexDirection:"column",background:BG,fontFamily:"'Plus Jakarta Sans',sans-serif",overflow:"hidden",position:"relative" }}>
        <div style={{ position:"absolute",top:-60,right:-60,width:260,height:260,borderRadius:"50%",background:`radial-gradient(circle,${G2}25 0%,transparent 70%)`,pointerEvents:"none" }}/>
        <div style={{ position:"absolute",bottom:60,left:-80,width:220,height:220,borderRadius:"50%",background:`radial-gradient(circle,${A}10 0%,transparent 70%)`,pointerEvents:"none" }}/>
        {!user                      && <LoginScreen          onLogin={setUser}/>}
        {user?.role==="chofer"      && <ChoferDashboard      user={user} onLogout={()=>setUser(null)}/>}
        {user?.role==="cliente"     && <ClienteDashboard     user={user} onLogout={()=>setUser(null)}/>}
        {user?.role==="proveedor"   && <ProveedorDashboard   user={user} onLogout={()=>setUser(null)}/>}
        {user?.role==="ejecutivo"   && <EjecutivoDashboard   user={user} onLogout={()=>setUser(null)}/>}
      </div>
    </>
  );
}
