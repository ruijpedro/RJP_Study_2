
import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

const APP_NAME = "RJP Study";
const OWNER_NAME = "Rui Pedro";
const DRIVE_ROOT = "RJP_Study";
const STORAGE_KEY = "RJP_STUDY_DRIVE_SYNC_V1";
const DISCLAIMER_KEY = `${STORAGE_KEY}_DISCLAIMER_ACCEPTED`;
const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxRYMRdF4SfAZ-aBEiA3fQaI8I2V0Z3f8IN9tZ6iwI1igze9tg-0xc2FoJmGlMlF0csXQ/exec";

const CATEGORIES = ["Exames", "Apontamentos", "Aulas", "Fichas", "Resumos", "Trabalhos", "Testes", "Imagens", "Vídeos", "Outros"];

const initialData = {
  subjects: [],
  documents: [],
  exercises: [],
  events: [],
  examMode: { enabled: false, subjectName: "", examDate: "", targetHours: 20 },
  google: { scriptUrl: DEFAULT_SCRIPT_URL, lastSync: "" }
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function safeParse(text, fallback) {
  try { return JSON.parse(text) || fallback; } catch { return fallback; }
}

function sanitizeForStorage(value) {
  return {
    ...value,
    documents: (value.documents || []).map(d => ({ ...d, fileData: "", fileObject: null }))
  };
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? { ...initialData, ...sanitizeForStorage(safeParse(saved, initialData)) } : initialData;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function daysUntil(date) {
  if (!date) return null;
  const today = new Date();
  const target = new Date(date);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function formatDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("pt-PT");
}

function monthName(date) {
  return date.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
}

function inferCategory(fileName = "", mimeType = "") {
  const n = fileName.toLowerCase();
  const m = mimeType.toLowerCase();
  if (n.includes("exame")) return "Exames";
  if (n.includes("apont")) return "Apontamentos";
  if (n.includes("aula")) return "Aulas";
  if (n.includes("ficha")) return "Fichas";
  if (n.includes("resumo")) return "Resumos";
  if (n.includes("trabalho")) return "Trabalhos";
  if (n.includes("teste")) return "Testes";
  if (m.includes("image") || /\.(png|jpg|jpeg|webp)$/i.test(n)) return "Imagens";
  if (m.includes("video") || /\.(mp4|mov|avi|mkv)$/i.test(n)) return "Vídeos";
  return "Outros";
}

function inferType(fileName = "", mimeType = "") {
  const n = fileName.toLowerCase();
  const m = mimeType.toLowerCase();
  if (m.includes("pdf") || n.endsWith(".pdf")) return "PDF";
  if (/\.(xlsx|xls)$/i.test(n)) return "Excel";
  if (/\.(doc|docx)$/i.test(n)) return "Word";
  if (m.includes("image") || /\.(png|jpg|jpeg|webp)$/i.test(n)) return "Imagem";
  if (m.includes("video") || /\.(mp4|mov|avi|mkv)$/i.test(n)) return "Vídeo";
  return "Documento";
}

function App() {
  const [data, setData] = useState(loadData);
  const [page, setPage] = useState("dashboard");
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [accepted, setAccepted] = useState(localStorage.getItem(DISCLAIMER_KEY) === "yes");
  const [busy, setBusy] = useState(false);

  const [subjectForm, setSubjectForm] = useState({ name: "", year: "", course: "", color: "#0f2742", difficulty: "3", weeklyHours: "2", teacher: "", notes: "" });
  const [docForm, setDocForm] = useState({ subjectId: "", category: "Exames", notes: "", link: "" });
  const [selectedDocFiles, setSelectedDocFiles] = useState([]);
  const [exerciseForm, setExerciseForm] = useState({ subjectId: "", documentId: "", title: "", status: "Por fazer", notes: "" });
  const [eventForm, setEventForm] = useState({ subjectId: "", title: "", type: "Teste", date: "", topics: "" });
  const [examForm, setExamForm] = useState({ subjectName: data.examMode?.subjectName || "", examDate: data.examMode?.examDate || "", targetHours: data.examMode?.targetHours || 20 });
  const [googleForm, setGoogleForm] = useState({ scriptUrl: data.google?.scriptUrl || DEFAULT_SCRIPT_URL });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeForStorage(data))); } catch (err) { console.warn(err); }
  }, [data]);

  const globalStats = useMemo(() => {
    const total = data.exercises.length;
    const done = data.exercises.filter(e => e.status === "Resolvido").length;
    const review = data.exercises.filter(e => e.status === "Rever").length;
    const stuck = data.exercises.filter(e => e.status === "Não percebi").length;
    const progress = total ? Math.round((done / total) * 100) : 0;
    return { total, done, review, stuck, progress };
  }, [data]);

  function getSubject(id) { return data.subjects.find(s => String(s.id) === String(id)); }
  function getDocument(id) { return data.documents.find(d => String(d.id) === String(id)); }

  function getSubjectStats(subjectId) {
    const exercises = data.exercises.filter(e => String(e.subjectId) === String(subjectId));
    const documents = data.documents.filter(d => String(d.subjectId) === String(subjectId));
    const events = data.events.filter(e => String(e.subjectId) === String(subjectId));
    const done = exercises.filter(e => e.status === "Resolvido").length;
    const pending = exercises.filter(e => e.status !== "Resolvido").length;
    const progress = exercises.length ? Math.round((done / exercises.length) * 100) : 0;
    const futureEvents = events.map(e => ({ ...e, days: daysUntil(e.date) })).filter(e => e.days !== null && e.days >= 0).sort((a,b) => a.days - b.days);
    return { exercises, documents, events, done, pending, progress, nextEvent: futureEvents[0] || null };
  }

  function acceptDisclaimer() { localStorage.setItem(DISCLAIMER_KEY, "yes"); setAccepted(true); }
  function openSubject(id) { setSelectedSubjectId(id); setPage("subjectFolder"); }

  function getScriptUrl() { return (googleForm.scriptUrl || data.google?.scriptUrl || "").trim(); }
  function validateScriptUrl(showAlert = true) {
    const scriptUrl = getScriptUrl();
    if (!scriptUrl || !scriptUrl.includes("script.google.com/macros/s/") || !scriptUrl.endsWith("/exec")) {
      if (showAlert) alert("Coloca primeiro o URL /exec correto do Apps Script.");
      return "";
    }
    return scriptUrl;
  }

  function saveGoogleConfig(e) {
    e.preventDefault();
    const scriptUrl = googleForm.scriptUrl.trim();
    setData(d => ({ ...d, google: { ...d.google, scriptUrl } }));
    alert("Ligação Apps Script guardada.");
  }

  function openAppsScript(action = "", params = {}) {
    const scriptUrl = validateScriptUrl();
    if (!scriptUrl) return;
    const url = new URL(scriptUrl);
    if (action) url.searchParams.set("action", action);
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) url.searchParams.set(k, String(v)); });
    window.open(url.toString(), "_blank");
  }

  function jsonpRequest(action, params = {}) {
    const scriptUrl = validateScriptUrl();
    if (!scriptUrl) return Promise.reject(new Error("URL inválido"));
    return new Promise((resolve, reject) => {
      const callbackName = `rjp_cb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const url = new URL(scriptUrl);
      if (action) url.searchParams.set("action", action);
      url.searchParams.set("callback", callbackName);
      Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) url.searchParams.set(k, String(v)); });
      const script = document.createElement("script");
      const timeout = setTimeout(() => {
        delete window[callbackName]; script.remove(); reject(new Error("Tempo esgotado"));
      }, 20000);
      window[callbackName] = result => { clearTimeout(timeout); delete window[callbackName]; script.remove(); resolve(result); };
      script.onerror = () => { clearTimeout(timeout); delete window[callbackName]; script.remove(); reject(new Error("Erro Apps Script")); };
      script.src = url.toString();
      document.body.appendChild(script);
    });
  }

  async function postToAppsScript(payload) {
    const scriptUrl = validateScriptUrl(false);
    if (!scriptUrl) return false;
    try {
      await fetch(scriptUrl, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
      return true;
    } catch { return false; }
  }

  async function testAppsScript() { openAppsScript(); }

  function mergeDriveStructure(structure) {
    const incomingSubjects = [];
    const incomingDocuments = [];
    const existingSubjectsByName = new Map(data.subjects.map(s => [s.name.toLowerCase(), s]));

    (structure?.subjects || []).forEach(folder => {
      const key = String(folder.name || "").toLowerCase();
      let subject = existingSubjectsByName.get(key);
      if (!subject) {
        subject = { id: folder.id || uid(), name: folder.name, year: "", course: "", color: "#0f2742", difficulty: "3", weeklyHours: "2", teacher: "", notes: "Criada a partir do Google Drive", driveFolderId: folder.id, driveFolderUrl: folder.url };
        incomingSubjects.push(subject);
      }
      (folder.categories || []).forEach(cat => {
        (cat.files || []).forEach(file => {
          const docId = file.id || uid();
          incomingDocuments.push({
            id: docId,
            subjectId: subject.id,
            name: file.name,
            type: inferType(file.name, file.mimeType),
            category: cat.name,
            link: file.url,
            fileUrl: file.url,
            fileId: file.id,
            fileName: file.name,
            fileData: "",
            mimeType: file.mimeType || "",
            size: file.size || "",
            notes: "Sincronizado do Google Drive",
            uploadedToDrive: true
          });
        });
      });
    });

    setData(d => {
      const docKeys = new Set(d.documents.map(x => `${x.fileId || x.id}|${x.name}`));
      const docs = incomingDocuments.filter(x => !docKeys.has(`${x.fileId || x.id}|${x.name}`));
      const subjectKeys = new Set(d.subjects.map(x => x.name.toLowerCase()));
      const subs = incomingSubjects.filter(x => !subjectKeys.has(x.name.toLowerCase()));
      return { ...d, subjects: [...d.subjects, ...subs], documents: [...d.documents, ...docs] };
    });

    return { subjects: incomingSubjects.length, documents: incomingDocuments.length };
  }

  async function syncDriveStructure() {
    setBusy(true);
    try {
      const result = await jsonpRequest("listDriveStructure");
      if (!result?.ok) { alert(result?.error || "Não foi possível ler o Google Drive."); return; }
      const counts = mergeDriveStructure(result.data);
      alert(`Drive sincronizado. Pastas novas: ${counts.subjects}. Documentos lidos: ${counts.documents}.`);
    } catch (err) { alert("Erro ao sincronizar Drive: " + err.message); }
    finally { setBusy(false); }
  }

  function normalizeCloudData(cloud) {
    const subjects = (cloud?.disciplinas || []).map(x => ({ id: String(x.id || uid()), name: x.nome || x.name || "", year: x.ano || "", course: x.curso || "", color: x.cor || "#0f2742", difficulty: String(x.dificuldade || "3"), weeklyHours: String(x.horasSemana || x.weeklyHours || "2"), teacher: x.professor || "", notes: x.notas || "", driveFolderId: x.driveFolderId || "", driveFolderUrl: x.driveFolderUrl || "" }));
    const documents = (cloud?.documentos || []).map(x => ({ id: String(x.id || x.fileId || uid()), subjectId: String(x.disciplinaId || x.subjectId || ""), name: x.nome || x.name || "", type: x.tipo || x.type || "Documento", category: x.categoria || "Outros", link: x.fileUrl || x.link || "", fileUrl: x.fileUrl || x.link || "", fileId: x.fileId || "", notes: x.notas || "", fileName: x.nome || "", fileData: "", mimeType: x.mimeType || "", uploadedToDrive: Boolean(x.fileUrl || x.fileId) }));
    const exercises = (cloud?.exercicios || []).map(x => ({ id: String(x.id || uid()), subjectId: String(x.disciplinaId || x.subjectId || ""), documentId: String(x.documentoId || x.documentId || ""), title: x.titulo || x.title || "", status: x.estado || x.status || "Por fazer", notes: x.notas || "" }));
    const events = [
      ...(cloud?.eventos || []).map(x => ({ id: String(x.id || uid()), subjectId: String(x.disciplinaId || x.subjectId || ""), title: x.titulo || x.title || "", type: x.tipo || x.type || "Evento", date: String(x.data || x.date || "").slice(0,10), topics: x.materia || x.topics || "" })),
      ...(cloud?.exames || []).map(x => ({ id: String(x.id || uid()), subjectId: "", title: x.disciplina || "Exame", type: x.epoca ? `Exame ${x.epoca}` : "Exame", date: String(x.data || "").slice(0,10), topics: `${x.hora || ""} — ${x.disciplina || ""} — ${x.epoca || ""}` }))
    ];
    return { subjects, documents, exercises, events };
  }

  async function loadCloudData() {
    setBusy(true);
    try {
      const result = await jsonpRequest("getAll");
      if (!result?.ok) { alert(result?.error || "Não foi possível carregar dados da cloud."); return; }
      const normalized = normalizeCloudData(result.data);
      setData(d => ({ ...d, ...normalized, google: { ...d.google, lastSync: new Date().toISOString() } }));
      alert("Dados carregados da cloud.");
    } catch (err) { alert("Erro ao carregar dados da cloud: " + err.message); }
    finally { setBusy(false); }
  }

  async function saveCloudData() {
    setBusy(true);
    const ok = await postToAppsScript({ action: "syncAll", data: { perfil: OWNER_NAME || APP_NAME, subjects: data.subjects, documents: data.documents, exercises: data.exercises, events: data.events } });
    setBusy(false);
    alert(ok ? "Sincronização enviada para a cloud. Usa Carregar da Cloud para confirmar." : "Não foi possível enviar dados para a cloud.");
  }

  async function syncAll() {
    await saveCloudData();
    await syncDriveStructure();
    await loadCloudData();
  }

  async function sendDocumentsToDrive(subject, docs) {
    if (!validateScriptUrl(false) || docs.length === 0) return;
    await postToAppsScript({
      action: "uploadMultipleFiles",
      data: {
        perfil: OWNER_NAME || APP_NAME,
        disciplinaId: subject?.id || "",
        disciplinaNome: subject?.name || "Sem Disciplina",
        categoria: docForm.category || "Outros",
        notas: docForm.notes || "",
        files: docs.map(doc => ({ fileName: doc.fileName, fileData: doc.fileData, mimeType: doc.mimeType }))
      }
    });
  }

  function handleFile(e) {
    const files = Array.from(e.target.files || []);
    setSelectedDocFiles(files);
  }

  async function addDocument(e) {
    e.preventDefault();
    if (!docForm.subjectId) { alert("Escolhe primeiro a disciplina."); return; }
    const subject = getSubject(docForm.subjectId);

    if (selectedDocFiles.length > 0) {
      let uploadDocs = [];
      try {
        uploadDocs = await Promise.all(selectedDocFiles.map(async file => ({ id: uid(), subjectId: docForm.subjectId, name: file.name, type: inferType(file.name, file.type), category: docForm.category || inferCategory(file.name, file.type), link: "", notes: docForm.notes || "", fileName: file.name, fileData: await fileToDataUrl(file), mimeType: file.type || "application/octet-stream", size: file.size, uploadedToDrive: false })));
      } catch { alert("Não foi possível ler um ou mais ficheiros."); return; }
      const docsForApp = uploadDocs.map(doc => ({ ...doc, fileData: "", uploadedToDrive: Boolean(validateScriptUrl(false)) }));
      setData(d => ({ ...d, documents: [...d.documents, ...docsForApp] }));
      await sendDocumentsToDrive(subject, uploadDocs);
      alert(`${docsForApp.length} documento(s) adicionados. Se o Apps Script estiver configurado, o envio para Drive foi iniciado.`);
      setSelectedDocFiles([]);
      setDocForm({ subjectId: "", category: "Exames", notes: "", link: "" });
      return;
    }

    if (!docForm.link.trim()) { alert("Seleciona ficheiros ou coloca um link."); return; }
    const doc = { id: uid(), subjectId: docForm.subjectId, name: docForm.link.split('/').pop() || "Documento", type: "Link", category: docForm.category, link: docForm.link, notes: docForm.notes, fileName: "", fileData: "" };
    setData(d => ({ ...d, documents: [...d.documents, doc] }));
    setDocForm({ subjectId: "", category: "Exames", notes: "", link: "" });
  }

  function deleteDocument(id) { setData(d => ({ ...d, documents: d.documents.filter(x => x.id !== id), exercises: d.exercises.filter(x => x.documentId !== id) })); }
  function openDocument(doc) { if (doc.link || doc.fileUrl) window.open(doc.link || doc.fileUrl, "_blank"); else alert("Documento guardado localmente/Drive, sem link disponível ainda."); }

  function addSubject(e) { e.preventDefault(); if (!subjectForm.name.trim()) return; setData(d => ({ ...d, subjects: [...d.subjects, { id: uid(), ...subjectForm }] })); setSubjectForm({ name: "", year: "", course: "", color: "#0f2742", difficulty: "3", weeklyHours: "2", teacher: "", notes: "" }); }
  function deleteSubject(id) { setData(d => ({ ...d, subjects: d.subjects.filter(s => s.id !== id), documents: d.documents.filter(x => x.subjectId !== id), exercises: d.exercises.filter(x => x.subjectId !== id), events: d.events.filter(x => x.subjectId !== id) })); if (selectedSubjectId === id) { setSelectedSubjectId(null); setPage("subjects"); } }
  function addExercise(e) { e.preventDefault(); if (!exerciseForm.subjectId || !exerciseForm.title.trim()) return; setData(d => ({ ...d, exercises: [...d.exercises, { id: uid(), ...exerciseForm }] })); setExerciseForm({ subjectId: "", documentId: "", title: "", status: "Por fazer", notes: "" }); }
  function updateExerciseStatus(id, status) { setData(d => ({ ...d, exercises: d.exercises.map(ex => ex.id === id ? { ...ex, status } : ex) })); }
  function deleteExercise(id) { setData(d => ({ ...d, exercises: d.exercises.filter(x => x.id !== id) })); }
  function addEvent(e) { e.preventDefault(); if (!eventForm.subjectId || !eventForm.title.trim() || !eventForm.date) return; setData(d => ({ ...d, events: [...d.events, { id: uid(), ...eventForm }] })); setEventForm({ subjectId: "", title: "", type: "Teste", date: "", topics: "" }); }
  function deleteEvent(id) { setData(d => ({ ...d, events: d.events.filter(x => x.id !== id) })); }
  function shareWhatsApp(text) { window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank"); }
  function googleCalendarLink(event) { const date = event.date?.replaceAll("-", "") || ""; const title = encodeURIComponent(`${APP_NAME} - ${event.type}: ${event.title}`); const details = encodeURIComponent(event.topics || ""); return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${date}/${date}&details=${details}`; }
  function generatePlan(subject) { const stats = getSubjectStats(subject.id); const difficulty = Number(subject.difficulty || 3); const baseHours = Number(subject.weeklyHours || 2); const urgentBonus = stats.nextEvent && stats.nextEvent.days <= 7 ? 1.5 : 0; const recommended = Math.max(1, Math.round((baseHours + stats.pending * 0.25 + difficulty * 0.3 + urgentBonus) * 10) / 10); return { pending: stats.pending, recommended, text: `${subject.name}: ${recommended}h recomendadas esta semana. Exercícios pendentes/rever: ${stats.pending}.` }; }
  function saveExamMode(e) { e.preventDefault(); setData(d => ({ ...d, examMode: { enabled: true, subjectName: examForm.subjectName, examDate: examForm.examDate, targetHours: Number(examForm.targetHours || 20) } })); }
  function disableExamMode() { setData(d => ({ ...d, examMode: { ...d.examMode, enabled: false } })); }
  function printWeeklyPlan() { window.print(); }
  function getCalendarDays() { const year = calendarMonth.getFullYear(); const month = calendarMonth.getMonth(); const last = new Date(year, month + 1, 0); const days = []; for (let d = 1; d <= last.getDate(); d++) { const date = new Date(year, month, d); const iso = date.toISOString().slice(0, 10); days.push({ day: d, date: iso, events: data.events.filter(ev => ev.date === iso) }); } return { title: monthName(calendarMonth), days }; }
  function previousMonth() { setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)); }
  function nextMonth() { setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)); }
  function subjectProgressBars() { return data.subjects.map(subject => { const stats = getSubjectStats(subject.id); return <div key={subject.id} className="progress-row"><div><strong>{subject.name}</strong><span>{stats.progress}%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${stats.progress}%`, background: subject.color }} /></div></div>; }); }

  const examesIPL = [
    { subjectId: "", title: "Análise de Estruturas", type: "Exame Normal", date: "2026-06-12", topics: "14h30 — AE — Época Normal" },
    { subjectId: "", title: "Mecânica dos Solos e Fundações II", type: "Exame Normal", date: "2026-06-16", topics: "14h30 — MSF II — Época Normal" },
    { subjectId: "", title: "Resistência dos Materiais II", type: "Exame Normal", date: "2026-06-25", topics: "14h30 — RM II — Época Normal" },
    { subjectId: "", title: "Mecânica dos Solos e Fundações II", type: "Recurso", date: "2026-07-06", topics: "14h30 — MSF II — Recurso" },
    { subjectId: "", title: "Análise de Estruturas", type: "Recurso", date: "2026-07-15", topics: "09h30 — AE — Recurso" },
    { subjectId: "", title: "Resistência dos Materiais II", type: "Recurso", date: "2026-07-17", topics: "14h30 — RM II — Recurso" },
    { subjectId: "", title: "Mecânica dos Solos e Fundações II", type: "Especial", date: "2026-07-20", topics: "14h30 — MSF II — Especial" },
    { subjectId: "", title: "Análise de Estruturas", type: "Especial", date: "2026-07-23", topics: "09h30 — AE — Especial" },
    { subjectId: "", title: "Resistência dos Materiais II", type: "Especial", date: "2026-07-23", topics: "14h30 — RM II — Especial" }
  ];
  function importExamesIPLLocal() { setData(d => { const existingKeys = new Set(d.events.map(ev => `${ev.title}|${ev.type}|${ev.date}|${ev.topics}`)); const novos = examesIPL.filter(ev => !existingKeys.has(`${ev.title}|${ev.type}|${ev.date}|${ev.topics}`)).map(ev => ({ id: uid(), ...ev })); if (novos.length === 0) { alert("Os exames já estavam importados."); return d; } alert(`${novos.length} exames importados para o calendário interno.`); return { ...d, events: [...d.events, ...novos] }; }); }
  function exportExamesToGoogleCalendar() { openAppsScript("exportExamesToCalendar"); }

  if (!accepted) return <div className="disclaimer-screen"><div className="disclaimer-card"><img src="/logo.png" alt={APP_NAME} className="disclaimer-logo" /><h1>{APP_NAME}</h1><h2>Aviso Legal / Disclaimer</h2><p>O {APP_NAME} é uma ferramenta de apoio ao estudo, organização académica e planeamento pessoal.</p><p>Não substitui professores, explicadores ou instituições de ensino, nem garante resultados académicos.</p><p>O utilizador é responsável pela validação das datas, documentos, matérias, exercícios e planos introduzidos.</p><button onClick={acceptDisclaimer}>Li e aceito</button></div></div>;

  const calendar = getCalendarDays();
  const examDays = data.examMode?.examDate ? daysUntil(data.examMode.examDate) : null;

  return <div className="app">
    <aside>
      <div className="brand"><img src="/logo.png" alt={APP_NAME} /><div><h1>{APP_NAME}</h1><span>{OWNER_NAME ? OWNER_NAME + " • " : ""}Organiza • Planeia • Alcança</span></div></div>
      <button onClick={() => setPage("dashboard")}>Dashboard</button>
      <button onClick={() => setPage("subjects")}>Disciplinas</button>
      <button onClick={() => setPage("documents")}>Documentos</button>
      <button onClick={() => setPage("exercises")}>Exercícios</button>
      <button onClick={() => setPage("calendar")}>Calendário</button>
      <button onClick={() => setPage("stats")}>Estatísticas</button>
      <button onClick={() => setPage("exam")}>Modo Exame</button>
      <button onClick={() => setPage("google")}>Google/Drive</button>
      <button className="btn-sync" onClick={syncAll} disabled={busy}>🔄 Sincronizar</button>
    </aside>

    <main>
      {page === "dashboard" && <section><h2>Dashboard</h2>{busy && <div className="item">Sincronização em curso...</div>}{data.examMode?.enabled && <div className="exam-banner"><h3>Modo Exame — {data.examMode.subjectName}</h3><strong>{examDays !== null ? `${examDays} dias até ao exame` : "Data não definida"}</strong></div>}<div className="grid"><div className="card clickable" onClick={() => setPage("subjects")}><h3>Disciplinas</h3><strong>{data.subjects.length}</strong></div><div className="card clickable" onClick={() => setPage("documents")}><h3>Documentos</h3><strong>{data.documents.length}</strong></div><div className="card clickable" onClick={() => setPage("exercises")}><h3>Exercícios</h3><strong>{globalStats.total}</strong></div><div className="card clickable" onClick={() => setPage("stats")}><h3>Preparação</h3><strong>{globalStats.progress}%</strong></div></div>{data.subjects.length === 0 && <div className="empty"><h3>Ainda não existem disciplinas</h3><p>Cria uma disciplina manualmente ou usa Google/Drive → Sincronizar Drive.</p><button onClick={() => setPage("subjects")}>+ Adicionar disciplina</button></div>}{data.subjects.map(subject => { const stats = getSubjectStats(subject.id); return <div key={subject.id} className="item clickable" style={{ borderLeftColor: subject.color }} onClick={() => openSubject(subject.id)}><h3>{subject.name}</h3><p>{stats.documents.length} documentos • {stats.exercises.length} exercícios</p><p>Preparação: {stats.progress}%</p>{stats.nextEvent && <p>Próximo: {stats.nextEvent.type} em {stats.nextEvent.days} dias</p>}</div>; })}</section>}

      {page === "subjects" && <section><h2>Disciplinas</h2><form className="form" onSubmit={addSubject}><input placeholder="Nome da disciplina" value={subjectForm.name} onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })} /><input placeholder="Ano" value={subjectForm.year} onChange={e => setSubjectForm({ ...subjectForm, year: e.target.value })} /><input placeholder="Curso" value={subjectForm.course} onChange={e => setSubjectForm({ ...subjectForm, course: e.target.value })} /><input type="color" value={subjectForm.color} onChange={e => setSubjectForm({ ...subjectForm, color: e.target.value })} /><input type="number" min="1" max="5" placeholder="Dificuldade 1-5" value={subjectForm.difficulty} onChange={e => setSubjectForm({ ...subjectForm, difficulty: e.target.value })} /><input type="number" placeholder="Horas semanais" value={subjectForm.weeklyHours} onChange={e => setSubjectForm({ ...subjectForm, weeklyHours: e.target.value })} /><input placeholder="Professor" value={subjectForm.teacher} onChange={e => setSubjectForm({ ...subjectForm, teacher: e.target.value })} /><input placeholder="Observações" value={subjectForm.notes} onChange={e => setSubjectForm({ ...subjectForm, notes: e.target.value })} /><button>+ Adicionar disciplina</button></form>{data.subjects.length === 0 && <div className="empty">Ainda não existem disciplinas.</div>}{data.subjects.map(subject => { const stats = getSubjectStats(subject.id); return <div key={subject.id} className="item clickable" style={{ borderLeftColor: subject.color }} onClick={() => openSubject(subject.id)}><h3>{subject.name}</h3><p>{subject.year} {subject.course && `• ${subject.course}`}</p><p>Dificuldade: {subject.difficulty}/5 • {subject.weeklyHours}h/semana</p><p>Preparação: {stats.progress}%</p><button onClick={e => { e.stopPropagation(); deleteSubject(subject.id); }}>Eliminar</button></div>; })}</section>}

      {page === "subjectFolder" && selectedSubjectId && <section>{(() => { const subject = getSubject(selectedSubjectId); if (!subject) return <p>Disciplina não encontrada.</p>; const stats = getSubjectStats(subject.id); const plan = generatePlan(subject); return <><button onClick={() => setPage("subjects")}>← Voltar às disciplinas</button><h2>{subject.name}</h2><p>{subject.year} {subject.course && `• ${subject.course}`}</p><p>Dificuldade: {subject.difficulty}/5 • {subject.weeklyHours}h/semana</p><div className="grid"><div className="card clickable" onClick={() => setPage("documents")}><h3>Documentos</h3><strong>{stats.documents.length}</strong></div><div className="card clickable" onClick={() => setPage("exercises")}><h3>Exercícios</h3><strong>{stats.exercises.length}</strong></div><div className="card clickable" onClick={() => setPage("calendar")}><h3>Avaliações</h3><strong>{stats.events.length}</strong></div><div className="card"><h3>Preparação</h3><strong>{stats.progress}%</strong></div></div><div className="item printable-plan"><h3>Plano automático</h3><p>{plan.text}</p>{stats.nextEvent && <p>Próxima avaliação: {stats.nextEvent.type} em {stats.nextEvent.days} dias.</p>}<button onClick={printWeeklyPlan}>Imprimir / Guardar PDF</button><button onClick={() => shareWhatsApp(`${APP_NAME}\n${subject.name}\n${plan.text}`)}>WhatsApp</button></div><div className="item"><h3>Documentos</h3>{CATEGORIES.map(cat => { const docs = stats.documents.filter(d => (d.category || "Outros") === cat); if (docs.length === 0) return null; return <div key={cat} className="mini"><strong>{cat}</strong>{docs.map(doc => <p key={doc.id}>{doc.name} <button onClick={() => openDocument(doc)}>Abrir</button></p>)}</div>; })}{stats.documents.length === 0 && <p>Sem documentos associados.</p>}</div><div className="item"><h3>Exercícios</h3>{stats.exercises.length === 0 && <p>Sem exercícios registados.</p>}{stats.exercises.map(ex => <p key={ex.id}>{ex.title} — <strong>{ex.status}</strong></p>)}</div></>; })()}</section>}

      {page === "documents" && <section><h2>Documentos</h2><form className="form" onSubmit={addDocument}><select value={docForm.subjectId} onChange={e => setDocForm({ ...docForm, subjectId: e.target.value })}><option value="">Disciplina</option>{data.subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><select value={docForm.category} onChange={e => setDocForm({ ...docForm, category: e.target.value })}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select><input placeholder="Link do documento / Drive" value={docForm.link} onChange={e => setDocForm({ ...docForm, link: e.target.value })} /><input type="file" multiple accept=".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg,.webp,.mp4,.mov" onChange={handleFile} /><input placeholder="Notas" value={docForm.notes} onChange={e => setDocForm({ ...docForm, notes: e.target.value })} /><button>Adicionar documento(s)</button></form>{selectedDocFiles.length > 0 && <div className="item"><h3>Ficheiros selecionados</h3>{selectedDocFiles.map(f => <p key={f.name}>{f.name}</p>)}</div>}{data.documents.length === 0 && <div className="empty">Ainda não existem documentos.</div>}{data.documents.map(doc => { const subject = getSubject(doc.subjectId); return <div key={doc.id} className="item"><h3>{doc.name}</h3><p>{subject?.name} • {doc.category || doc.type}</p>{doc.uploadedToDrive && <p>☁ Google Drive</p>}<button onClick={() => openDocument(doc)}>Abrir</button><button onClick={() => shareWhatsApp(`${APP_NAME}\nDocumento: ${doc.name}\nDisciplina: ${subject?.name || ""}\n${doc.link || doc.fileUrl || ""}`)}>WhatsApp</button><button onClick={() => deleteDocument(doc.id)}>Eliminar</button></div>; })}</section>}

      {page === "exercises" && <section><h2>Exercícios</h2><form className="form" onSubmit={addExercise}><select value={exerciseForm.subjectId} onChange={e => setExerciseForm({ ...exerciseForm, subjectId: e.target.value })}><option value="">Disciplina</option>{data.subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><select value={exerciseForm.documentId} onChange={e => setExerciseForm({ ...exerciseForm, documentId: e.target.value })}><option value="">Documento associado</option>{data.documents.map(doc => <option key={doc.id} value={doc.id}>{doc.name}</option>)}</select><input placeholder="Exercício / questão" value={exerciseForm.title} onChange={e => setExerciseForm({ ...exerciseForm, title: e.target.value })} /><select value={exerciseForm.status} onChange={e => setExerciseForm({ ...exerciseForm, status: e.target.value })}><option>Por fazer</option><option>Resolvido</option><option>Rever</option><option>Não percebi</option></select><input placeholder="Notas" value={exerciseForm.notes} onChange={e => setExerciseForm({ ...exerciseForm, notes: e.target.value })} /><button>Adicionar exercício</button></form>{data.exercises.length === 0 && <div className="empty">Ainda não existem exercícios.</div>}{data.exercises.map(ex => { const subject = getSubject(ex.subjectId); const doc = getDocument(ex.documentId); return <div key={ex.id} className="item"><h3>{ex.title}</h3><p>{subject?.name} {doc && `• ${doc.name}`}</p><select value={ex.status} onChange={e => updateExerciseStatus(ex.id, e.target.value)}><option>Por fazer</option><option>Resolvido</option><option>Rever</option><option>Não percebi</option></select><button onClick={() => deleteExercise(ex.id)}>Eliminar</button></div>; })}</section>}

      {page === "calendar" && <section><h2>Calendário mensal</h2><div className="calendar-header"><button onClick={previousMonth}>←</button><h3>{calendar.title}</h3><button onClick={nextMonth}>→</button></div><form className="form" onSubmit={addEvent}><select value={eventForm.subjectId} onChange={e => setEventForm({ ...eventForm, subjectId: e.target.value })}><option value="">Disciplina</option>{data.subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><select value={eventForm.type} onChange={e => setEventForm({ ...eventForm, type: e.target.value })}><option>Teste</option><option>Exame</option><option>Questão-aula</option><option>Sessão de estudo</option></select><input placeholder="Título" value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} /><input type="date" value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })} /><input placeholder="Matéria" value={eventForm.topics} onChange={e => setEventForm({ ...eventForm, topics: e.target.value })} /><button>Adicionar evento</button></form><div className="calendar-grid">{calendar.days.map(day => <div key={day.date} className="calendar-day"><strong>{day.day}</strong>{day.events.map(ev => { const subject = getSubject(ev.subjectId); return <div key={ev.id} className="calendar-event">{ev.type}: {subject?.name || ev.title}</div>; })}</div>)}</div>{data.events.map(ev => { const subject = getSubject(ev.subjectId); return <div key={ev.id} className="item"><h3>{ev.type}: {ev.title}</h3><p>{subject?.name} • {formatDate(ev.date)}</p><p>{ev.topics}</p><a href={googleCalendarLink(ev)} target="_blank" rel="noreferrer">Adicionar ao Google Calendar</a><button onClick={() => deleteEvent(ev.id)}>Eliminar</button></div>; })}</section>}

      {page === "stats" && <section><h2>Estatísticas</h2><div className="grid"><div className="card"><h3>Exercícios</h3><strong>{globalStats.total}</strong></div><div className="card"><h3>Resolvidos</h3><strong>{globalStats.done}</strong></div><div className="card"><h3>Rever</h3><strong>{globalStats.review}</strong></div><div className="card"><h3>Não percebi</h3><strong>{globalStats.stuck}</strong></div><div className="card"><h3>Preparação</h3><strong>{globalStats.progress}%</strong></div></div><div className="item"><h3>Progresso por disciplina</h3>{data.subjects.length === 0 && <p>Sem disciplinas.</p>}{subjectProgressBars()}</div></section>}

      {page === "exam" && <section><h2>Modo Exame</h2><form className="form" onSubmit={saveExamMode}><input placeholder="Disciplina" value={examForm.subjectName} onChange={e => setExamForm({ ...examForm, subjectName: e.target.value })} /><input type="date" value={examForm.examDate} onChange={e => setExamForm({ ...examForm, examDate: e.target.value })} /><input type="number" placeholder="Horas alvo" value={examForm.targetHours} onChange={e => setExamForm({ ...examForm, targetHours: e.target.value })} /><button>Ativar modo exame</button></form>{data.examMode?.enabled && <div className="exam-banner"><h3>{data.examMode.subjectName}</h3><strong>{examDays !== null ? `${examDays} dias até ao exame` : "Data não definida"}</strong><p>Horas alvo: {data.examMode.targetHours}h</p><button onClick={disableExamMode}>Desativar modo exame</button></div>}</section>}

      {page === "google" && <section><h2>Google Drive / Apps Script</h2><form className="form" onSubmit={saveGoogleConfig}><input placeholder="URL Apps Script terminado em /exec" value={googleForm.scriptUrl} onChange={e => setGoogleForm({ ...googleForm, scriptUrl: e.target.value })} /><button>Guardar ligação</button></form><div className="grid"><div className="card"><h3>Ligação</h3><p>Backend: Sheets, Drive e Calendar sem OAuth direto na APK.</p><button onClick={testAppsScript}>Testar ligação</button></div><div className="card"><h3>Pastas padrão</h3><p>Cria {DRIVE_ROOT} com Exames, Apontamentos, Aulas, Fichas, Resumos e Outras categorias.</p><button onClick={() => openAppsScript("setup")}>Preparar Drive/Sheets</button></div><div className="card"><h3>Sincronizar Drive</h3><p>Lê as pastas do Drive e atualiza disciplinas/documentos na APK e WebApp.</p><button onClick={syncDriveStructure}>📁 Sincronizar Drive</button></div><div className="card"><h3>Cloud</h3><p>Usa a mesma base Google Sheets/Drive na APK e na WebApp.</p><button onClick={saveCloudData}>Guardar tudo na Cloud</button><button onClick={loadCloudData}>Carregar da Cloud</button><button onClick={syncAll}>🔄 Sincronizar tudo</button></div><div className="card"><h3>Calendário</h3><p>Importar exames locais e exportar para Calendar pelo Apps Script.</p><button onClick={importExamesIPLLocal}>Importar exames</button><button onClick={exportExamesToGoogleCalendar}>Exportar Calendar</button></div></div></section>}
    </main>
  </div>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
