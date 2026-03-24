import { useState, useCallback } from "react";

const BODY_PARTS = {
  head: { label: { ru: "Голова", kk: "Бас", en: "Head" }, x: 200, y: 48, r: 32 },
  neck: { label: { ru: "Шея", kk: "Мойын", en: "Neck" }, x: 200, y: 100, r: 14 },
  chest: { label: { ru: "Грудь", kk: "Кеуде", en: "Chest" }, x: 200, y: 155, r: 34 },
  stomach: { label: { ru: "Живот", kk: "Қарын", en: "Stomach" }, x: 200, y: 215, r: 28 },
  leftArm: { label: { ru: "Левая рука", kk: "Сол қол", en: "Left arm" }, x: 130, y: 165, r: 18 },
  rightArm: { label: { ru: "Правая рука", kk: "Оң қол", en: "Right arm" }, x: 270, y: 165, r: 18 },
  back: { label: { ru: "Спина", kk: "Арқа", en: "Back" }, x: 200, y: 155, r: 34 },
  leftLeg: { label: { ru: "Левая нога", kk: "Сол аяқ", en: "Left leg" }, x: 170, y: 310, r: 22 },
  rightLeg: { label: { ru: "Правая нога", kk: "Оң аяқ", en: "Right leg" }, x: 230, y: 310, r: 22 },
};

const T = {
  ru: {
    title: "BMO", tagline: "Медицинский ИИ-ассистент",
    click: "Нажмите на область тела", sub: "ИИ даст конкретные рекомендации по лечению",
    zone: "Зона:", symptoms: "Опишите симптомы подробно", placeholder: "Например: острая боль, началась 2 дня назад, усиливается при движении...",
    temp: "Температура (°C)", pain: "Боль (1–10)", analyze: "Анализировать с ИИ",
    cancel: "Отмена", thinking: "ИИ анализирует ваши симптомы...",
    badge: "ИИ • ОФЛАЙН • PWA", users: "250 000+ пользователей", rating: "4.98/5",
    forDocs: "Для врачей", tariffs: "Тарифы", contacts: "Контакты",
    login: "Войти", register: "Регистрация", start: "Начать",
    features: "Почему BMO?",
    f1t: "Интерактивная 3D-модель", f1d: "Нажмите на любую часть — ИИ мгновенно анализирует зону боли",
    f2t: "Конкретные рекомендации", f2d: "Таблетки, дозировки, режим — как у реального врача",
    f3t: "Экстренные случаи", f3d: "Мгновенное распознавание опасных симптомов и вызовы 103",
    f4t: "Работает офлайн", f4d: "PWA — устанавливается за 1 сек, работает без интернета",
    faqTitle: "Частые вопросы",
    q1: "BMO ставит диагноз?", a1: "Нет. Только первичная оценка и рекомендации. Всегда консультируйтесь с врачом.",
    q2: "Данные в безопасности?", a2: "100% анонимно. Никаких личных данных не сохраняется.",
    q3: "Работает без интернета?", a3: "Да — после первой установки. Идеально для экстренных случаев.",
    rights: "© 2026 BMO. Все права защищены.",
    viewBack: "Вид сзади", viewFront: "Вид спереди",
  },
  kk: {
    title: "BMO", tagline: "Медициналық ЖИ-ассистент",
    click: "Дене аймағын басыңыз", sub: "ЖИ нақты ем ұсыныстарын береді",
    zone: "Аймақ:", symptoms: "Симптомдарды сипаттаңыз", placeholder: "Мысалы: өткір ауырсыну, 2 күн бұрын басталды...",
    temp: "Дене қызуы (°C)", pain: "Ауырсыну (1–10)", analyze: "ЖИ-мен талдау",
    cancel: "Болдырмау", thinking: "ЖИ симптомдарды талдауда...",
    badge: "ЖИ • ОФЛАЙН • PWA", users: "250 000+ пайдаланушылар", rating: "4.98/5",
    forDocs: "Дәрігерлер үшін", tariffs: "Тарифтер", contacts: "Байланыс",
    login: "Кіру", register: "Тіркелу", start: "Бастау",
    features: "Неге BMO?",
    f1t: "Интерактивті 3D-модель", f1d: "Кез келген жерді басыңыз — ЖІ лезде талдайды",
    f2t: "Нақты ұсыныстар", f2d: "Таблеткалар, дозалар, режим — нақты дәрігер сияқты",
    f3t: "Жедел жағдайлар", f3d: "Қауіпті симптомдарды лезде анықтап, 103 шақыру",
    f4t: "Офлайн жұмыс", f4d: "PWA — 1 сек орнатылады, интернетсіз жұмыс істейді",
    faqTitle: "Жиі қойылатын сұрақтар",
    q1: "BMO диагноз қоя ма?", a1: "Жоқ. Тек алдын ала бағалау. Дәрігермен кеңесіңіз.",
    q2: "Деректер қауіпсіз бе?", a2: "100% анонимды. Жеке деректер сақталмайды.",
    q3: "Интернетсіз жұмыс істейді ме?", a3: "Иә — бірінші орнатудан кейін.",
    rights: "© 2026 BMO. Барлық құқықтар қорғалған.",
    viewBack: "Артқы көрініс", viewFront: "Алдыңғы көрініс",
  },
  en: {
    title: "BMO", tagline: "Medical AI Assistant",
    click: "Tap a body area", sub: "AI gives specific treatment recommendations",
    zone: "Zone:", symptoms: "Describe your symptoms in detail", placeholder: "e.g. sharp pain, started 2 days ago, worse with movement...",
    temp: "Temperature (°C)", pain: "Pain level (1–10)", analyze: "Analyze with AI",
    cancel: "Cancel", thinking: "AI is analyzing your symptoms...",
    badge: "AI • OFFLINE • PWA", users: "250,000+ users", rating: "4.98/5",
    forDocs: "For doctors", tariffs: "Pricing", contacts: "Contact",
    login: "Login", register: "Register", start: "Start",
    features: "Why BMO?",
    f1t: "Interactive 3D Model", f1d: "Tap any body part — AI instantly analyzes pain zone",
    f2t: "Specific Recommendations", f2d: "Pills, dosages, regimen — just like a real doctor",
    f3t: "Emergency Detection", f3d: "Instantly recognizes dangerous symptoms and calls 103",
    f4t: "Works Offline", f4d: "PWA — installs in 1 sec, works without internet",
    faqTitle: "FAQ",
    q1: "Does BMO diagnose?", a1: "No. Initial assessment only. Always consult a doctor.",
    q2: "Is my data safe?", a2: "100% anonymous. No personal data stored.",
    q3: "Works without internet?", a3: "Yes — after first install. Perfect for emergencies.",
    rights: "© 2026 BMO. All rights reserved.",
    viewBack: "Back view", viewFront: "Front view",
  }
};

function HumanBodySVG({ selected, onSelect, showBack, lang }) {
  const hovered = null;
  const backParts = ["back"];
  const frontParts = ["head","neck","chest","stomach","leftArm","rightArm","leftLeg","rightLeg"];
  const visibleParts = showBack ? [...backParts,"leftArm","rightArm","leftLeg","rightLeg"] : frontParts;

  return (
    <svg viewBox="0 0 400 420" width="100%" height="100%" style={{maxHeight:420}}>
      <defs>
        <radialGradient id="bodyGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#e8c4a0"/>
          <stop offset="100%" stopColor="#c99068"/>
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Body silhouette */}
      <g opacity="0.15">
        <ellipse cx="200" cy="48" rx="30" ry="30" fill="#c99068"/>
        <rect x="175" y="92" width="50" height="12" rx="6" fill="#c99068"/>
        <rect x="155" y="104" width="90" height="100" rx="20" fill="#c99068"/>
        <rect x="155" y="195" width="90" height="85" rx="12" fill="#c99068"/>
        <rect x="110" y="110" width="40" height="85" rx="15" fill="#c99068"/>
        <rect x="250" y="110" width="40" height="85" rx="15" fill="#c99068"/>
        <rect x="160" y="278" width="35" height="100" rx="14" fill="#c99068"/>
        <rect x="205" y="278" width="35" height="100" rx="14" fill="#c99068"/>
      </g>

      {/* Clickable zones */}
      {visibleParts.map(partId => {
        const p = BODY_PARTS[partId];
        const isSelected = selected === partId;
        const isBack = partId === "back";
        
        return (
          <g key={partId} style={{cursor:"pointer"}} onClick={() => onSelect(partId)}>
            <circle
              cx={p.x} cy={p.y} r={p.r + 8}
              fill={isSelected ? "rgba(20,184,166,0.25)" : "rgba(255,255,255,0.04)"}
              stroke={isSelected ? "#14b8a6" : "rgba(255,255,255,0.15)"}
              strokeWidth={isSelected ? 2 : 1}
              style={{transition:"all 0.2s"}}
            />
            <circle
              cx={p.x} cy={p.y} r={isSelected ? 10 : 7}
              fill={isSelected ? "#14b8a6" : "#6366f1"}
              filter={isSelected ? "url(#glow)" : "none"}
              style={{transition:"all 0.2s"}}
            />
            {isSelected && (
              <>
                <circle cx={p.x} cy={p.y} r={14} fill="none" stroke="#14b8a6" strokeWidth="1.5" opacity="0.6">
                  <animate attributeName="r" values="10;20;10" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite"/>
                </circle>
              </>
            )}
            {isBack && (
              <text x={p.x} y={p.y - p.r - 14} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="11">
                ↩ спина
              </text>
            )}
          </g>
        );
      })}

      {/* Labels */}
      {visibleParts.map(partId => {
        const p = BODY_PARTS[partId];
        const isSelected = selected === partId;
        const lx = partId === "leftArm" ? p.x - 22 : partId === "rightArm" ? p.x + 22 : p.x;
        const anchor = partId === "leftArm" ? "end" : partId === "rightArm" ? "start" : "middle";
        return (
          <text key={partId+"-label"} x={lx} y={p.y + p.r + 16}
            textAnchor={anchor} fill={isSelected ? "#14b8a6" : "rgba(255,255,255,0.35)"}
            fontSize="10" fontWeight={isSelected ? "600" : "400"}
            style={{transition:"all 0.2s", pointerEvents:"none"}}>
            {p.label[lang]}
          </text>
        );
      })}
    </svg>
  );
}

function FeatureCard({icon, title, desc}) {
  return (
    <div style={{
      background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
      borderRadius:20, padding:"28px 24px", transition:"all 0.3s",
    }}
    onMouseEnter={e => { e.currentTarget.style.background="rgba(20,184,166,0.08)"; e.currentTarget.style.borderColor="rgba(20,184,166,0.3)"; e.currentTarget.style.transform="translateY(-4px)"; }}
    onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"; e.currentTarget.style.transform="translateY(0)"; }}>
      <div style={{fontSize:32, marginBottom:16}}>{icon}</div>
      <div style={{fontFamily:"'DM Serif Display',serif", fontSize:18, fontWeight:400, color:"#e2e8f0", marginBottom:10}}>{title}</div>
      <div style={{fontSize:14, color:"rgba(255,255,255,0.5)", lineHeight:1.6}}>{desc}</div>
    </div>
  );
}

export default function BMO() {
  const [lang, setLang] = useState("ru");
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [symptoms, setSymptoms] = useState("");
  const [temp, setTemp] = useState(36.6);
  const [pain, setPain] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showBack, setShowBack] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const t = T[lang];

  const handleSelect = useCallback((part) => {
    setSelected(part);
    setResult(null);
    setSymptoms("");
    setShowModal(true);
  }, []);

  const getPartName = (id) => id ? BODY_PARTS[id]?.label[lang] : "";

  const analyze = async () => {
    if (!selected) return;
    setLoading(true);
    setResult(null);

    const systemPrompt = `Вы — опытный врач-терапевт. Пользователь описал симптомы. 
Дайте КОНКРЕТНЫЙ ответ строго в JSON формате без markdown. Пример:
{
  "diagnosis": "Название диагноза (1-2 слова)",
  "probability": 85,
  "severity": "low|medium|high|critical",
  "explanation": "Краткое объяснение (1-2 предложения)",
  "medications": [
    {"name": "Название таблетки", "dose": "500мг", "frequency": "3 раза в день", "duration": "5 дней", "note": "После еды"},
    {"name": "Название 2", "dose": "...", "frequency": "...", "duration": "...", "note": "..."}
  ],
  "homeRemedies": ["Совет 1", "Совет 2", "Совет 3"],
  "warnings": ["Чего избегать 1", "Чего избегать 2"],
  "whenToCallDoctor": "Конкретное описание когда срочно к врачу",
  "recommendation": "НАБЛЮДАТЬ 24ч | К врачу завтра | Сегодня к врачу | ЗВОНИТЬ 103 СЕЙЧАС"
}
Отвечайте на языке: ${lang === 'ru' ? 'русском' : lang === 'kk' ? 'казахском' : 'английском'}.
ВАЖНО: возвращайте ТОЛЬКО JSON, без пояснений и markdown.`;

    const userMsg = `Зона боли: ${getPartName(selected)}
Симптомы: ${symptoms || "не описаны"}
Температура: ${temp}°C
Уровень боли: ${pain}/10`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: userMsg }]
        })
      });
      const data = await response.json();
      const text = data.content?.find(b => b.type === "text")?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
    } catch (e) {
      setResult({ error: true, explanation: "Ошибка соединения. Проверьте интернет." });
    }
    setLoading(false);
  };

  const severityColor = (s) => ({
    low: "#22c55e", medium: "#f59e0b", high: "#f97316", critical: "#ef4444"
  })[s] || "#6366f1";

  const severityLabel = (s) => ({
    low: { ru:"Низкая", kk:"Төмен", en:"Low" },
    medium: { ru:"Средняя", kk:"Орташа", en:"Medium" },
    high: { ru:"Высокая", kk:"Жоғары", en:"High" },
    critical: { ru:"КРИТИЧЕСКАЯ", kk:"КРИТИКАЛЫҚ", en:"CRITICAL" }
  })[s]?.[lang] || s;

  const base = {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    background: "#080c14",
    color: "#e2e8f0",
    minHeight: "100vh",
    overflowX: "hidden",
  };

  const glassCard = {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 24,
  };

  return (
    <div style={base}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #080c14; } ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        .btn-teal { background: linear-gradient(135deg,#0d9488,#0891b2); color:#fff; border:none; padding:14px 28px; border-radius:50px; font-size:15px; font-weight:600; cursor:pointer; transition:all 0.2s; box-shadow:0 4px 20px rgba(13,148,136,0.4); }
        .btn-teal:hover { transform:translateY(-2px); box-shadow:0 8px 30px rgba(13,148,136,0.6); }
        .btn-ghost { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.8); border:1px solid rgba(255,255,255,0.12); padding:10px 20px; border-radius:50px; font-size:14px; cursor:pointer; transition:all 0.2s; }
        .btn-ghost:hover { background:rgba(255,255,255,0.13); border-color:rgba(255,255,255,0.25); }
        .lang-btn { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.7); border:1px solid rgba(255,255,255,0.1); padding:6px 14px; border-radius:8px; font-size:13px; cursor:pointer; transition:all 0.2s; }
        .lang-btn.active { background:linear-gradient(135deg,#0d9488,#0891b2); color:#fff; border-color:transparent; }
        .med-card { background:rgba(13,148,136,0.12); border:1px solid rgba(13,148,136,0.3); border-radius:14px; padding:16px; margin-bottom:10px; }
        .remedy-item { display:flex; align-items:flex-start; gap:10px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.07); }
        .warning-item { background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25); border-radius:10px; padding:10px 14px; margin-bottom:8px; font-size:14px; color:#fca5a5; }
        .faq-item { border:1px solid rgba(255,255,255,0.08); border-radius:16px; overflow:hidden; margin-bottom:12px; }
        .faq-q { padding:20px 24px; cursor:pointer; font-size:16px; font-weight:500; display:flex; justify-content:space-between; align-items:center; transition:background 0.2s; }
        .faq-q:hover { background:rgba(255,255,255,0.05); }
        .faq-a { padding:0 24px 20px; color:rgba(255,255,255,0.6); line-height:1.7; font-size:15px; }
        input[type=range] { -webkit-appearance:none; width:100%; height:4px; background:rgba(255,255,255,0.15); border-radius:4px; outline:none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:20px; height:20px; border-radius:50%; background:linear-gradient(135deg,#0d9488,#0891b2); cursor:pointer; }
        textarea, input[type=number] { background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12); border-radius:14px; color:#e2e8f0; font-family:inherit; font-size:15px; outline:none; transition:border 0.2s; }
        textarea:focus, input[type=number]:focus { border-color:rgba(13,148,136,0.6); }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .slide-in { animation: slideIn 0.4s cubic-bezier(0.16,1,0.3,1); }
        @keyframes slideIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .badge-glow { box-shadow: 0 0 20px rgba(13,148,136,0.4); }
      `}</style>

      {/* NAV */}
      <nav style={{ position:"sticky", top:0, zIndex:50, background:"rgba(8,12,20,0.85)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.06)", padding:"14px 32px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:12, background:"linear-gradient(135deg,#0d9488,#0891b2)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Serif Display',serif", fontSize:16, color:"#fff", fontWeight:400 }}>B</div>
          <span style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, color:"#fff" }}>BMO</span>
          <span style={{ background:"rgba(13,148,136,0.2)", color:"#5eead4", border:"1px solid rgba(13,148,136,0.3)", borderRadius:6, fontSize:11, padding:"2px 8px", fontWeight:600 }}>AI</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ color:"rgba(255,255,255,0.4)", fontSize:14 }}>{t.forDocs}</span>
          <span style={{ color:"rgba(255,255,255,0.2)" }}>|</span>
          <span style={{ color:"rgba(255,255,255,0.4)", fontSize:14 }}>{t.tariffs}</span>
          <span style={{ color:"rgba(255,255,255,0.2)" }}>|</span>
          <span style={{ color:"rgba(255,255,255,0.4)", fontSize:14 }}>{t.contacts}</span>
          <div style={{ display:"flex", gap:4, marginLeft:8 }}>
            {["ru","kk","en"].map(l => (
              <button key={l} className={`lang-btn ${lang===l?"active":""}`} onClick={() => setLang(l)}>
                {l==="kk"?"KZ":l.toUpperCase()}
              </button>
            ))}
          </div>
          <button className="btn-ghost" style={{ padding:"8px 16px" }}>{t.login}</button>
          <button className="btn-teal" style={{ padding:"8px 20px", fontSize:14 }}>{t.register}</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight:"90vh", display:"flex", alignItems:"center", padding:"60px 32px", maxWidth:1280, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:64, alignItems:"center", width:"100%" }}>
          {/* Left */}
          <div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(13,148,136,0.15)", border:"1px solid rgba(13,148,136,0.3)", borderRadius:50, padding:"6px 16px", marginBottom:28 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:"#14b8a6" }} className="pulse"/>
              <span style={{ fontSize:13, color:"#5eead4", fontWeight:600, letterSpacing:1 }}>{t.badge}</span>
            </div>
            <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:"clamp(42px,5vw,72px)", lineHeight:1.1, marginBottom:24, fontWeight:400 }}>
              <span style={{ color:"#f1f5f9" }}>Пойми тело.</span><br/>
              <span style={{ background:"linear-gradient(135deg,#14b8a6,#38bdf8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Прими решение.</span><br/>
              <span style={{ color:"#f1f5f9" }}>За 47 секунд.</span>
            </h1>
            <p style={{ fontSize:18, color:"rgba(255,255,255,0.55)", lineHeight:1.7, marginBottom:40, maxWidth:480 }}>
              ИИ-анализ симптомов с конкретными рекомендациями: какие таблетки принять, в какой дозе и когда срочно вызвать врача.
            </p>
            <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:40 }}>
              <button className="btn-teal" onClick={() => { document.getElementById("body-section")?.scrollIntoView({behavior:"smooth"}); }}>
                {t.start} →
              </button>
            </div>
            <div style={{ display:"flex", gap:32, flexWrap:"wrap" }}>
              {[["👥", t.users], ["⭐", t.rating], ["📱", "PWA • Offline"]].map(([ic, lb]) => (
                <div key={lb} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:16 }}>{ic}</span>
                  <span style={{ color:"rgba(255,255,255,0.5)", fontSize:14 }}>{lb}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Body Model */}
          <div id="body-section">
            <div style={{ ...glassCard, padding:32 }}>
              <div style={{ textAlign:"center", marginBottom:24 }}>
                <h3 style={{ fontFamily:"'DM Serif Display',serif", fontSize:24, marginBottom:8, fontWeight:400 }}>{t.click}</h3>
                <p style={{ color:"rgba(255,255,255,0.45)", fontSize:14 }}>{t.sub}</p>
              </div>

              {/* Toggle front/back */}
              <div style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:16 }}>
                <button className={`lang-btn ${!showBack?"active":""}`} onClick={() => setShowBack(false)}>{t.viewFront}</button>
                <button className={`lang-btn ${showBack?"active":""}`} onClick={() => setShowBack(true)}>{t.viewBack}</button>
              </div>

              <div style={{ height:380, position:"relative" }}>
                <HumanBodySVG selected={selected} onSelect={handleSelect} showBack={showBack} lang={lang}/>
              </div>

              {selected && (
                <div style={{ marginTop:16, padding:"14px 20px", background:"rgba(13,148,136,0.15)", border:"1px solid rgba(13,148,136,0.3)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background:"#14b8a6" }} className="pulse"/>
                    <span style={{ color:"#5eead4", fontWeight:600 }}>{getPartName(selected)}</span>
                  </div>
                  <button className="btn-teal" style={{ padding:"8px 18px", fontSize:13 }} onClick={() => setShowModal(true)}>
                    Анализировать →
                  </button>
                </div>
              )}

              <p style={{ textAlign:"center", fontSize:12, color:"rgba(255,255,255,0.25)", marginTop:16 }}>
                🖱 Нажмите на зону • 🔄 Фронт / спина
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding:"80px 32px", maxWidth:1280, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:60 }}>
          <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:"clamp(32px,4vw,52px)", fontWeight:400, marginBottom:16 }}>{t.features}</h2>
          <p style={{ color:"rgba(255,255,255,0.45)", fontSize:16, maxWidth:500, margin:"0 auto" }}>
            Революционный подход к медицинской диагностике
          </p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:20 }}>
          <FeatureCard icon="🫀" title={t.f1t} desc={t.f1d}/>
          <FeatureCard icon="💊" title={t.f2t} desc={t.f2d}/>
          <FeatureCard icon="🚨" title={t.f3t} desc={t.f3d}/>
          <FeatureCard icon="📱" title={t.f4t} desc={t.f4d}/>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding:"80px 32px", maxWidth:800, margin:"0 auto" }}>
        <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:"clamp(28px,4vw,48px)", fontWeight:400, textAlign:"center", marginBottom:48 }}>{t.faqTitle}</h2>
        {[[t.q1,t.a1],[t.q2,t.a2],[t.q3,t.a3]].map(([q,a], i) => (
          <div key={i} className="faq-item">
            <div className="faq-q" onClick={() => setOpenFaq(openFaq===i?null:i)}>
              <span>{q}</span>
              <span style={{ color:"rgba(255,255,255,0.3)", fontSize:20 }}>{openFaq===i?"−":"+"}</span>
            </div>
            {openFaq===i && <div className="faq-a">{a}</div>}
          </div>
        ))}
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop:"1px solid rgba(255,255,255,0.07)", padding:"40px 32px", textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:13 }}>
        <div style={{ maxWidth:1280, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:8, marginBottom:16 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#0d9488,#0891b2)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Serif Display',serif", fontSize:13, color:"#fff" }}>B</div>
            <span style={{ fontFamily:"'DM Serif Display',serif", fontSize:16, color:"rgba(255,255,255,0.5)" }}>BMO Medical AI</span>
          </div>
          <p>{t.rights}</p>
          <p style={{ marginTop:8, fontSize:12, color:"rgba(255,255,255,0.2)" }}>⚠️ BMO не заменяет консультацию врача. Всегда обращайтесь к специалисту.</p>
        </div>
      </footer>

      {/* MODAL */}
      {showModal && selected && (
        <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(16px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
          onClick={e => { if (e.target===e.currentTarget && !loading) setShowModal(false); }}>
          <div style={{ ...glassCard, background:"rgba(8,14,26,0.98)", width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto", padding:0 }} className="slide-in">
            
            {/* Modal Header */}
            <div style={{ padding:"28px 28px 0", borderBottom:"1px solid rgba(255,255,255,0.08)", paddingBottom:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:14, background:"linear-gradient(135deg,#0d9488,#0891b2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🤖</div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:17 }}>Медицинский Робот BMO</div>
                    <div style={{ color:"#34d399", fontSize:12, display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:"#34d399", display:"inline-block" }} className="pulse"/>
                      онлайн • Claude AI
                    </div>
                  </div>
                </div>
                {!loading && (
                  <button onClick={() => { setShowModal(false); setResult(null); }}
                    style={{ background:"rgba(255,255,255,0.07)", border:"none", color:"rgba(255,255,255,0.5)", width:36, height:36, borderRadius:10, cursor:"pointer", fontSize:18 }}>✕</button>
                )}
              </div>
            </div>

            <div style={{ padding:28 }}>
              {/* Zone badge */}
              <div style={{ background:"rgba(13,148,136,0.15)", border:"1px solid rgba(13,148,136,0.3)", borderRadius:12, padding:"10px 16px", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ color:"rgba(255,255,255,0.5)", fontSize:14 }}>{t.zone}</span>
                <span style={{ color:"#5eead4", fontWeight:700, fontSize:16 }}>{getPartName(selected)}</span>
              </div>

              {!result ? (
                <>
                  {/* Symptoms */}
                  <div style={{ marginBottom:20 }}>
                    <label style={{ display:"block", color:"rgba(255,255,255,0.6)", fontSize:14, marginBottom:8 }}>{t.symptoms}</label>
                    <textarea value={symptoms} onChange={e=>setSymptoms(e.target.value)} rows={4}
                      style={{ width:"100%", padding:"14px 16px", resize:"none" }} placeholder={t.placeholder}/>
                  </div>

                  {/* Temp */}
                  <div style={{ marginBottom:20 }}>
                    <label style={{ display:"block", color:"rgba(255,255,255,0.6)", fontSize:14, marginBottom:8 }}>
                      {t.temp}: <span style={{ color:"#5eead4", fontWeight:600 }}>{temp}°C</span>
                    </label>
                    <input type="number" step="0.1" min="35" max="42" value={temp}
                      onChange={e=>setTemp(parseFloat(e.target.value))}
                      style={{ width:"100%", padding:"12px 16px", textAlign:"center", fontSize:24, fontWeight:600 }}/>
                  </div>

                  {/* Pain */}
                  <div style={{ marginBottom:28 }}>
                    <label style={{ display:"block", color:"rgba(255,255,255,0.6)", fontSize:14, marginBottom:12 }}>
                      {t.pain}: <span style={{ color:"#5eead4", fontWeight:600 }}>{pain}/10</span>
                    </label>
                    <input type="range" min="1" max="10" value={pain} onChange={e=>setPain(parseInt(e.target.value))}/>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"rgba(255,255,255,0.3)", marginTop:6 }}>
                      <span>Слабая</span><span>Умеренная</span><span>Сильная</span>
                    </div>
                  </div>

                  <button className="btn-teal" style={{ width:"100%", fontSize:16, padding:"16px" }}
                    onClick={analyze} disabled={loading}>
                    {loading ? (
                      <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                        <span className="spin" style={{ display:"inline-block", width:18, height:18, border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%" }}/>
                        {t.thinking}
                      </span>
                    ) : `🤖 ${t.analyze}`}
                  </button>
                </>
              ) : result.error ? (
                <div style={{ textAlign:"center", padding:"40px 20px", color:"rgba(255,255,255,0.5)" }}>
                  <div style={{ fontSize:40, marginBottom:16 }}>⚠️</div>
                  <p>{result.explanation}</p>
                  <button className="btn-ghost" style={{ marginTop:20 }} onClick={() => setResult(null)}>Попробовать снова</button>
                </div>
              ) : (
                <div className="slide-in">
                  {/* Diagnosis Header */}
                  <div style={{ background:"linear-gradient(135deg,rgba(13,148,136,0.2),rgba(8,145,178,0.2))", border:"1px solid rgba(13,148,136,0.4)", borderRadius:18, padding:24, marginBottom:20 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                      <div>
                        <div style={{ color:"#5eead4", fontSize:12, fontWeight:600, letterSpacing:1, marginBottom:4 }}>ДИАГНОЗ</div>
                        <h3 style={{ fontFamily:"'DM Serif Display',serif", fontSize:28, fontWeight:400, color:"#f1f5f9", lineHeight:1.2 }}>{result.diagnosis}</h3>
                      </div>
                      <div style={{ textAlign:"center" }}>
                        <div style={{ fontSize:36, fontWeight:700, color:"#14b8a6", lineHeight:1 }}>{result.probability}%</div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>уверенность</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ background:severityColor(result.severity)+"25", border:`1px solid ${severityColor(result.severity)}60`, borderRadius:20, padding:"4px 12px", fontSize:13, color:severityColor(result.severity), fontWeight:600 }}>
                        {severityLabel(result.severity)}
                      </div>
                      <p style={{ color:"rgba(255,255,255,0.6)", fontSize:14, lineHeight:1.5 }}>{result.explanation}</p>
                    </div>
                  </div>

                  {/* Recommendation banner */}
                  <div style={{ background: result.severity==="critical" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.15)", border:`1px solid ${result.severity==="critical"?"rgba(239,68,68,0.5)":"rgba(245,158,11,0.4)"}`, borderRadius:14, padding:"14px 18px", marginBottom:20, display:"flex", alignItems:"center", gap:12 }}>
                    <span style={{ fontSize:22 }}>{result.severity==="critical"?"🚨":"📋"}</span>
                    <div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontWeight:600, letterSpacing:1 }}>РЕКОМЕНДАЦИИ</div>
                      <div style={{ color: result.severity==="critical"?"#fca5a5":"#fcd34d", fontWeight:700, fontSize:17 }}>{result.recommendation}</div>
                    </div>
                  </div>

                  {/* Medications */}
                  {result.medications?.length > 0 && (
                    <div style={{ marginBottom:20 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                        <span style={{ fontSize:18 }}>💊</span>
                        <span style={{ fontWeight:700, fontSize:16 }}>Лекарства</span>
                      </div>
                      {result.medications.map((m, i) => (
                        <div key={i} className="med-card">
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                            <div style={{ fontWeight:700, fontSize:16, color:"#5eead4" }}>{m.name}</div>
                            <div style={{ background:"rgba(13,148,136,0.3)", color:"#5eead4", borderRadius:8, padding:"3px 10px", fontSize:12, fontWeight:600 }}>{m.dose}</div>
                          </div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
                            <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)" }}>🕐 {m.frequency}</div>
                            <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)" }}>📅 {m.duration}</div>
                            {m.note && <div style={{ fontSize:13, color:"rgba(255,255,255,0.45)" }}>ℹ️ {m.note}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Home Remedies */}
                  {result.homeRemedies?.length > 0 && (
                    <div style={{ marginBottom:20 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                        <span style={{ fontSize:18 }}>🏠</span>
                        <span style={{ fontWeight:700, fontSize:16 }}>Домашние средства</span>
                      </div>
                      {result.homeRemedies.map((r, i) => (
                        <div key={i} className="remedy-item">
                          <span style={{ color:"#14b8a6", fontWeight:700, fontSize:14 }}>✓</span>
                          <span style={{ color:"rgba(255,255,255,0.7)", fontSize:14 }}>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Warnings */}
                  {result.warnings?.length > 0 && (
                    <div style={{ marginBottom:20 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                        <span style={{ fontSize:18 }}>⚠️</span>
                        <span style={{ fontWeight:700, fontSize:16 }}>Чего избегать</span>
                      </div>
                      {result.warnings.map((w, i) => (
                        <div key={i} className="warning-item">⚠️ {w}</div>
                      ))}
                    </div>
                  )}

                  {/* When to call doctor */}
                  {result.whenToCallDoctor && (
                    <div style={{ background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.3)", borderRadius:14, padding:16, marginBottom:20 }}>
                      <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                        <span style={{ fontSize:18 }}>👨‍⚕️</span>
                        <div>
                          <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", fontWeight:600, letterSpacing:1, marginBottom:4 }}>СРОЧНО К ВРАЧУ, ЕСЛИ</div>
                          <div style={{ color:"#c7d2fe", fontSize:14, lineHeight:1.6 }}>{result.whenToCallDoctor}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display:"flex", gap:12 }}>
                    <button className="btn-ghost" style={{ flex:1 }} onClick={() => setResult(null)}>← Изменить</button>
                    <button className="btn-teal" style={{ flex:1 }} onClick={() => { setShowModal(false); setResult(null); }}>Закрыть</button>
                  </div>

                  <p style={{ textAlign:"center", fontSize:11, color:"rgba(255,255,255,0.2)", marginTop:16, lineHeight:1.5 }}>
                    ⚠️ Рекомендации носят информационный характер. Обратитесь к врачу для постановки диагноза.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
