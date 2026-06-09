import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

const STORAGE_KEY = "RJP_STUDY_V43";
const DISCLAIMER_KEY = "RJP_STUDY_DISCLAIMER_ACCEPTED";

const initialData = {
  subjects: [],
  documents: [],
  exercises: [],
  events: [],
  examMode: { enabled: false, subjectName: "RMII", examDate: "", targetHours: 20 },
  google: {
    clientId: "",
    apiKey: "",
    scriptUrl: "https://script.google.com/macros/s/AKfycbwVH-6V-ruKKd-K7hoeWQ8MUX7fELqFzI80h224pHE8c4aVbhj7NP21CUcOPz8cd6Rq/exec",
    signedIn: false,
    userEmail: "",
    userName: "",
    userPhoto: "",
    accessToken: "",
    driveFolderId: "",
    driveFolderLink: ""
  }
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? sanitizeLoadedData({ ...initialData, ...JSON.parse(saved) }) : initialData;
  } catch {
    return initialData;
  }
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

function sanitizeForStorage(value) {
  return {
    ...value,
    documents: (value.documents || []).map(doc => ({
      ...doc,
      fileData: ""
    }))
  };
}

function sanitizeLoadedData(value) {
  return {
    ...value,
    documents: (value.documents || []).map(doc => ({
      ...doc,
      fileData: ""
    }))
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


function App() {
  const [data, setData] = useState(loadData);
  const [page, setPage] = useState("dashboard");
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [accepted, setAccepted] = useState(localStorage.getItem(DISCLAIMER_KEY) === "yes");

  const [subjectForm, setSubjectForm] = useState({
    name: "", year: "", course: "", color: "#0f2742", difficulty: "3",
    weeklyHours: "2", teacher: "", notes: ""
  });

  const [docForm, setDocForm] = useState({
    subjectId: "", name: "", type: "PDF", link: "", notes: "", fileName: "", fileData: ""
  });

  const [selectedDocFiles, setSelectedDocFiles] = useState([]);

  const [exerciseForm, setExerciseForm] = useState({
    subjectId: "", documentId: "", title: "", status: "Por fazer", notes: ""
  });

  const [eventForm, setEventForm] = useState({
    subjectId: "", title: "", type: "Teste", date: "", topics: ""
  });

  const [examForm, setExamForm] = useState({
    subjectName: data.examMode?.subjectName || "RMII",
    examDate: data.examMode?.examDate || "",
    targetHours: data.examMode?.targetHours || 20
  });

  const [googleForm, setGoogleForm] = useState({
    scriptUrl: data.google?.scriptUrl || "https://script.google.com/macros/s/AKfycbwVH-6V-ruKKd-K7hoeWQ8MUX7fELqFzI80h224pHE8c4aVbhj7NP21CUcOPz8cd6Rq/exec"
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeForStorage(data)));
    } catch (err) {
      console.warn("Não foi possível guardar todos os dados no localStorage.", err);
    }
  }, [data]);

  const globalStats = useMemo(() => {
    const total = data.exercises.length;
    const done = data.exercises.filter(e => e.status === "Resolvido").length;
    const review = data.exercises.filter(e => e.status === "Rever").length;
    const stuck = data.exercises.filter(e => e.status === "Não percebi").length;
    const progress = total ? Math.round((done / total) * 100) : 0;
    return { total, done, review, stuck, progress };
  }, [data]);

  function getSubject(id) { return data.subjects.find(s => s.id === id); }
  function getDocument(id) { return data.documents.find(d => d.id === id); }

  function getSubjectStats(subjectId) {
    const exercises = data.exercises.filter(e => e.subjectId === subjectId);
    const documents = data.documents.filter(d => d.subjectId === subjectId);
    const events = data.events.filter(e => e.subjectId === subjectId);
    const done = exercises.filter(e => e.status === "Resolvido").length;
    const review = exercises.filter(e => e.status === "Rever").length;
    const stuck = exercises.filter(e => e.status === "Não percebi").length;
    const pending = exercises.filter(e => e.status !== "Resolvido").length;
    const progress = exercises.length ? Math.round((done / exercises.length) * 100) : 0;
    const futureEvents = events
      .map(e => ({ ...e, days: daysUntil(e.date) }))
      .filter(e => e.days !== null && e.days >= 0)
      .sort((a, b) => a.days - b.days);
    return { exercises, documents, events, done, review, stuck, pending, progress, nextEvent: futureEvents[0] || null };
  }

  function acceptDisclaimer() {
    localStorage.setItem(DISCLAIMER_KEY, "yes");
    setAccepted(true);
  }

  function openSubject(id) {
    setSelectedSubjectId(id);
    setPage("subjectFolder");
  }

  function addSubject(e) {
    e.preventDefault();
    if (!subjectForm.name.trim()) return;
    setData(d => ({ ...d, subjects: [...d.subjects, { id: uid(), ...subjectForm }] }));
    setSubjectForm({ name: "", year: "", course: "", color: "#0f2742", difficulty: "3", weeklyHours: "2", teacher: "", notes: "" });
  }

  function deleteSubject(id) {
    setData(d => ({
      ...d,
      subjects: d.subjects.filter(s => s.id !== id),
      documents: d.documents.filter(x => x.subjectId !== id),
      exercises: d.exercises.filter(x => x.subjectId !== id),
      events: d.events.filter(x => x.subjectId !== id)
    }));
    if (selectedSubjectId === id) {
      setSelectedSubjectId(null);
      setPage("subjects");
    }
  }

  function getScriptUrl() {
    return (googleForm.scriptUrl || data.google?.scriptUrl || "").trim();
  }

  function validateScriptUrl() {
    const scriptUrl = getScriptUrl();

    if (!scriptUrl || !scriptUrl.includes("script.google.com/macros/s/") || !scriptUrl.endsWith("/exec")) {
      return "";
    }

    return scriptUrl;
  }

  async function sendDocumentsToDrive(subject, docs) {
    const scriptUrl = validateScriptUrl();

    if (!scriptUrl) {
      return;
    }

    const payload = {
      action: "uploadMultipleFiles",
      data: {
        perfil: "Rui",
        disciplinaId: subject?.id || "",
        disciplinaNome: subject?.name || "Sem Disciplina",
        categoria: docForm.type === "PDF" ? "PDFs" : docForm.type,
        notas: docForm.notes || "",
        files: docs.map(doc => ({
          fileName: doc.fileName,
          fileData: doc.fileData,
          mimeType: doc.mimeType
        }))
      }
    };

    try {
      await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
    } catch {
      // O Apps Script pode executar mesmo quando o browser devolve resposta opaca.
    }
  }

  function handleFile(e) {
    const files = Array.from(e.target.files || []);
    setSelectedDocFiles(files);

    if (files.length === 0) {
      setDocForm(f => ({ ...f, name: "", fileName: "", fileData: "" }));
      return;
    }

    setDocForm(f => ({
      ...f,
      name: files.length === 1 ? (f.name || files[0].name) : `${files.length} documentos selecionados`,
      fileName: files.length === 1 ? files[0].name : `${files.length} ficheiros`,
      fileData: ""
    }));
  }

  async function addDocument(e) {
    e.preventDefault();

    if (!docForm.subjectId) {
      alert("Escolhe primeiro a disciplina.");
      return;
    }

    const subject = getSubject(docForm.subjectId);

    if (selectedDocFiles.length > 0) {
      let uploadDocs = [];

      try {
        uploadDocs = await Promise.all(selectedDocFiles.map(async file => ({
          id: uid(),
          subjectId: docForm.subjectId,
          name: file.name,
          type: docForm.type || "Documento",
          link: "",
          notes: docForm.notes || "",
          fileName: file.name,
          fileData: await fileToDataUrl(file),
          mimeType: file.type || "application/octet-stream",
          size: file.size
        })));
      } catch {
        alert("Não foi possível ler um ou mais ficheiros.");
        return;
      }

      const docsForApp = uploadDocs.map(doc => ({
        id: doc.id,
        subjectId: doc.subjectId,
        name: doc.name,
        type: doc.type,
        link: "",
        notes: doc.notes,
        fileName: doc.fileName,
        fileData: "",
        mimeType: doc.mimeType,
        size: doc.size,
        uploadedToDrive: true
      }));

      setData(d => ({ ...d, documents: [...d.documents, ...docsForApp] }));

      await sendDocumentsToDrive(subject, uploadDocs);

      alert(`${docsForApp.length} documento(s) adicionados. O envio para a pasta da disciplina no Google Drive foi iniciado.`);
      setSelectedDocFiles([]);
      setDocForm({ subjectId: "", name: "", type: "PDF", link: "", notes: "", fileName: "", fileData: "" });
      return;
    }

    if (!docForm.name.trim() && !docForm.link.trim()) {
      alert("Indica um nome, um link ou seleciona ficheiros.");
      return;
    }

    const doc = {
      id: uid(),
      subjectId: docForm.subjectId,
      name: docForm.name,
      type: docForm.type,
      link: docForm.link,
      notes: docForm.notes,
      fileName: "",
      fileData: ""
    };

    setData(d => ({ ...d, documents: [...d.documents, doc] }));
    setDocForm({ subjectId: "", name: "", type: "PDF", link: "", notes: "", fileName: "", fileData: "" });
  }

  function deleteDocument(id) {
    setData(d => ({ ...d, documents: d.documents.filter(x => x.id !== id), exercises: d.exercises.filter(x => x.documentId !== id) }));
  }

  function openDocument(doc) {
    if (doc.fileData) {
      const win = window.open();
      win.document.write(`<iframe src="${doc.fileData}" style="width:100%;height:100vh;border:0"></iframe>`);
      return;
    }

    if (doc.fileUrl) {
      window.open(doc.fileUrl, "_blank");
      return;
    }

    if (doc.link) {
      window.open(doc.link, "_blank");
      return;
    }

    alert("Documento registado. O ficheiro foi enviado para a pasta da disciplina no Google Drive.");
  }

  function addExercise(e) {
    e.preventDefault();
    if (!exerciseForm.subjectId || !exerciseForm.title.trim()) return;
    setData(d => ({ ...d, exercises: [...d.exercises, { id: uid(), ...exerciseForm }] }));
    setExerciseForm({ subjectId: "", documentId: "", title: "", status: "Por fazer", notes: "" });
  }

  function updateExerciseStatus(id, status) {
    setData(d => ({ ...d, exercises: d.exercises.map(ex => ex.id === id ? { ...ex, status } : ex) }));
  }

  function deleteExercise(id) {
    setData(d => ({ ...d, exercises: d.exercises.filter(x => x.id !== id) }));
  }

  function addEvent(e) {
    e.preventDefault();
    if (!eventForm.subjectId || !eventForm.title.trim() || !eventForm.date) return;
    setData(d => ({ ...d, events: [...d.events, { id: uid(), ...eventForm }] }));
    setEventForm({ subjectId: "", title: "", type: "Teste", date: "", topics: "" });
  }

  function deleteEvent(id) {
    setData(d => ({ ...d, events: d.events.filter(x => x.id !== id) }));
  }

  function shareWhatsApp(text) {
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
  }

  function googleCalendarLink(event) {
    const date = event.date?.replaceAll("-", "") || "";
    const title = encodeURIComponent(`RJP_Study - ${event.type}: ${event.title}`);
    const details = encodeURIComponent(event.topics || "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${date}/${date}&details=${details}`;
  }

  function generatePlan(subject) {
    const stats = getSubjectStats(subject.id);
    const difficulty = Number(subject.difficulty || 3);
    const baseHours = Number(subject.weeklyHours || 2);
    const urgentBonus = stats.nextEvent && stats.nextEvent.days <= 7 ? 1.5 : 0;
    const recommended = Math.max(1, Math.round((baseHours + stats.pending * 0.25 + difficulty * 0.3 + urgentBonus) * 10) / 10);
    return { pending: stats.pending, recommended, text: `${subject.name}: ${recommended}h recomendadas esta semana. Exercícios pendentes/rever: ${stats.pending}.` };
  }

  function saveExamMode(e) {
    e.preventDefault();
    setData(d => ({ ...d, examMode: { enabled: true, subjectName: examForm.subjectName, examDate: examForm.examDate, targetHours: Number(examForm.targetHours || 20) } }));
  }

  function disableExamMode() {
    setData(d => ({ ...d, examMode: { ...d.examMode, enabled: false } }));
  }

  function saveGoogleConfig(e) {
    e.preventDefault();
    setData(d => ({
      ...d,
      google: {
        ...d.google,
        scriptUrl: googleForm.scriptUrl.trim()
      }
    }));
    alert("Ligação Apps Script guardada.");
  }

  function openAppsScript(action = "", params = {}) {
    const scriptUrl = validateScriptUrl();
    if (!scriptUrl) {
      alert("Coloca primeiro o URL /exec correto do Apps Script.");
      return;
    }

    const url = new URL(scriptUrl);

    if (action) {
      url.searchParams.set("action", action);
    }

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });

    window.open(url.toString(), "_blank");
  }

  function testAppsScript() {
    openAppsScript();
  }

  function jsonpRequest(action, params = {}) {
    const scriptUrl = validateScriptUrl();

    if (!scriptUrl) {
      alert("Coloca primeiro o URL /exec correto do Apps Script.");
      return Promise.reject(new Error("URL Apps Script inválido"));
    }

    return new Promise((resolve, reject) => {
      const callbackName = `rjpCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const url = new URL(scriptUrl);

      url.searchParams.set("action", action);
      url.searchParams.set("callback", callbackName);

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });

      const script = document.createElement("script");

      window[callbackName] = result => {
        delete window[callbackName];
        script.remove();
        resolve(result);
      };

      script.onerror = () => {
        delete window[callbackName];
        script.remove();
        reject(new Error("Erro ao contactar Apps Script"));
      };

      script.src = url.toString();
      document.body.appendChild(script);
    });
  }

  function normalizeCloudData(cloud) {
    const disciplinas = cloud?.disciplinas || [];
    const documentos = cloud?.documentos || [];
    const exercicios = cloud?.exercicios || [];
    const eventos = cloud?.eventos || [];
    const exames = cloud?.exames || [];

    const subjects = disciplinas.map(x => ({
      id: String(x.id || uid()),
      name: x.nome || x.name || "",
      year: x.ano || "",
      course: x.curso || "",
      color: x.cor || "#0f2742",
      difficulty: String(x.dificuldade || "3"),
      weeklyHours: String(x.horasSemana || x.weeklyHours || "2"),
      teacher: x.professor || "",
      notes: x.notas || ""
    }));

    const documents = documentos.map(x => ({
      id: String(x.id || uid()),
      subjectId: String(x.disciplinaId || x.subjectId || ""),
      name: x.nome || x.name || "",
      type: x.tipo || x.type || "Documento",
      link: x.fileUrl || x.link || "",
      notes: x.notas || "",
      fileName: x.nome || "",
      fileData: "",
      fileUrl: x.fileUrl || x.link || "",
      mimeType: x.mimeType || "",
      uploadedToDrive: Boolean(x.fileUrl || x.fileId)
    }));

    const exercises = exercicios.map(x => ({
      id: String(x.id || uid()),
      subjectId: String(x.disciplinaId || x.subjectId || ""),
      documentId: String(x.documentoId || x.documentId || ""),
      title: x.titulo || x.title || "",
      status: x.estado || x.status || "Por fazer",
      notes: x.notas || ""
    }));

    const normalEvents = eventos.map(x => ({
      id: String(x.id || uid()),
      subjectId: String(x.disciplinaId || x.subjectId || ""),
      title: x.titulo || x.title || "",
      type: x.tipo || x.type || "Evento",
      date: String(x.data || x.date || "").slice(0, 10),
      topics: x.materia || x.topics || ""
    }));

    const examEvents = exames.map(x => ({
      id: String(x.id || uid()),
      subjectId: "",
      title: x.disciplina || "Exame",
      type: x.epoca ? `Exame ${x.epoca}` : "Exame",
      date: String(x.data || "").slice(0, 10),
      topics: `${x.hora || ""} — ${x.disciplina || ""} — ${x.epoca || ""}`
    }));

    return { subjects, documents, exercises, events: [...normalEvents, ...examEvents] };
  }

  async function loadCloudData() {
    try {
      const result = await jsonpRequest("getAll");

      if (!result?.ok) {
        alert(result?.error || "Não foi possível carregar dados da cloud.");
        return;
      }

      const normalized = normalizeCloudData(result.data);

      setData(d => ({
        ...d,
        subjects: normalized.subjects,
        documents: normalized.documents,
        exercises: normalized.exercises,
        events: normalized.events
      }));

      alert("Dados carregados da cloud.");
    } catch {
      alert("Erro ao carregar dados da cloud. Confirma o URL Apps Script.");
    }
  }

  async function saveCloudData() {
    const scriptUrl = validateScriptUrl();

    if (!scriptUrl) {
      alert("Coloca primeiro o URL /exec correto do Apps Script.");
      return;
    }

    const payload = {
      action: "syncAll",
      data: {
        perfil: "Rui",
        subjects: data.subjects,
        documents: data.documents,
        exercises: data.exercises,
        events: data.events
      }
    };

    try {
      await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      alert("Sincronização enviada para a cloud. Aguarda alguns segundos e usa Carregar da Cloud para confirmar.");
    } catch {
      alert("Não foi possível enviar dados para a cloud.");
    }
  }

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

  function importExamesIPLLocal() {
    setData(d => {
      const existingKeys = new Set(d.events.map(ev => `${ev.title}|${ev.type}|${ev.date}|${ev.topics}`));
      const novos = examesIPL
        .filter(ev => !existingKeys.has(`${ev.title}|${ev.type}|${ev.date}|${ev.topics}`))
        .map(ev => ({ id: uid(), ...ev }));

      if (novos.length === 0) {
        alert("Os exames IPL já estavam importados.");
        return d;
      }

      alert(`${novos.length} exames IPL importados para o calendário interno.`);
      return { ...d, events: [...d.events, ...novos] };
    });
  }

  function exportExamesToGoogleCalendar() {
    openAppsScript("exportExamesToCalendar");
  }

  function printWeeklyPlan() { window.print(); }

  function getCalendarDays() {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const last = new Date(year, month + 1, 0);
    const days = [];
    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(year, month, d);
      const iso = date.toISOString().slice(0, 10);
      days.push({ day: d, date: iso, events: data.events.filter(ev => ev.date === iso) });
    }
    return { title: monthName(calendarMonth), days };
  }

  function previousMonth() {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  }

  function subjectProgressBars() {
    return data.subjects.map(subject => {
      const stats = getSubjectStats(subject.id);
      return (
        <div key={subject.id} className="progress-row">
          <div><strong>{subject.name}</strong><span>{stats.progress}%</span></div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${stats.progress}%`, background: subject.color }} />
          </div>
        </div>
      );
    });
  }

  if (!accepted) {
    return (
      <div className="disclaimer-screen">
        <div className="disclaimer-card">
          <img src="/logo.png" alt="RJP Study" className="disclaimer-logo" />
          <h1>RJP_Study</h1>
          <h2>Aviso Legal / Disclaimer</h2>
          <p>O RJP_Study é uma ferramenta de apoio ao estudo, organização académica e planeamento pessoal.</p>
          <p>Não substitui professores, explicadores ou instituições de ensino, nem garante resultados académicos.</p>
          <p>O utilizador é responsável pela validação das datas, documentos, matérias, exercícios e planos introduzidos.</p>
          <button onClick={acceptDisclaimer}>Li e aceito</button>
        </div>
      </div>
    );
  }

  const calendar = getCalendarDays();
  const examDays = data.examMode?.examDate ? daysUntil(data.examMode.examDate) : null;

  return (
    <div className="app">
      <aside>
        <div className="brand">
          <img src="/logo.png" alt="RJP Study" />
          <div><h1>RJP_Study</h1><span>Organiza • Planeia • Alcança</span></div>
        </div>
        <button onClick={() => setPage("dashboard")}>Dashboard</button>
        <button onClick={() => setPage("subjects")}>Disciplinas</button>
        <button onClick={() => setPage("documents")}>Documentos</button>
        <button onClick={() => setPage("exercises")}>Exercícios</button>
        <button onClick={() => setPage("calendar")}>Calendário</button>
        <button onClick={() => setPage("stats")}>Estatísticas</button>
        <button onClick={() => setPage("exam")}>Modo Exame</button>
        <button onClick={() => setPage("google")}>Google</button>
      </aside>

      <main>
        {page === "dashboard" && (
          <section>
            <h2>Dashboard</h2>
            {data.examMode?.enabled && (
              <div className="exam-banner">
                <h3>Modo Exame — {data.examMode.subjectName}</h3>
                <strong>{examDays !== null ? `${examDays} dias até ao exame` : "Data não definida"}</strong>
              </div>
            )}
            <div className="grid">
              <div className="card clickable" onClick={() => setPage("subjects")}><h3>Disciplinas</h3><strong>{data.subjects.length}</strong></div>
              <div className="card clickable" onClick={() => setPage("documents")}><h3>Documentos</h3><strong>{data.documents.length}</strong></div>
              <div className="card clickable" onClick={() => setPage("exercises")}><h3>Exercícios</h3><strong>{globalStats.total}</strong></div>
              <div className="card clickable" onClick={() => setPage("stats")}><h3>Preparação</h3><strong>{globalStats.progress}%</strong></div>
            </div>
            {data.subjects.length === 0 && <div className="empty"><h3>Ainda não existem disciplinas</h3><p>Começa por criar a tua primeira disciplina.</p><button onClick={() => setPage("subjects")}>+ Adicionar disciplina</button></div>}
            {data.subjects.map(subject => {
              const stats = getSubjectStats(subject.id);
              return (
                <div key={subject.id} className="item clickable" style={{ borderLeftColor: subject.color }} onClick={() => openSubject(subject.id)}>
                  <h3>{subject.name}</h3>
                  <p>{stats.documents.length} documentos • {stats.exercises.length} exercícios</p>
                  <p>Preparação: {stats.progress}%</p>
                  {stats.nextEvent && <p>Próximo: {stats.nextEvent.type} em {stats.nextEvent.days} dias</p>}
                </div>
              );
            })}
          </section>
        )}

        {page === "subjects" && (
          <section>
            <h2>Disciplinas</h2>
            <form className="form" onSubmit={addSubject}>
              <input placeholder="Nome da disciplina" value={subjectForm.name} onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })} />
              <input placeholder="Ano" value={subjectForm.year} onChange={e => setSubjectForm({ ...subjectForm, year: e.target.value })} />
              <input placeholder="Curso" value={subjectForm.course} onChange={e => setSubjectForm({ ...subjectForm, course: e.target.value })} />
              <input type="color" value={subjectForm.color} onChange={e => setSubjectForm({ ...subjectForm, color: e.target.value })} />
              <input type="number" min="1" max="5" placeholder="Dificuldade 1-5" value={subjectForm.difficulty} onChange={e => setSubjectForm({ ...subjectForm, difficulty: e.target.value })} />
              <input type="number" placeholder="Horas semanais" value={subjectForm.weeklyHours} onChange={e => setSubjectForm({ ...subjectForm, weeklyHours: e.target.value })} />
              <input placeholder="Professor" value={subjectForm.teacher} onChange={e => setSubjectForm({ ...subjectForm, teacher: e.target.value })} />
              <input placeholder="Observações" value={subjectForm.notes} onChange={e => setSubjectForm({ ...subjectForm, notes: e.target.value })} />
              <button>+ Adicionar disciplina</button>
            </form>
            {data.subjects.length === 0 && <div className="empty">Ainda não existem disciplinas.</div>}
            {data.subjects.map(subject => {
              const stats = getSubjectStats(subject.id);
              return (
                <div key={subject.id} className="item clickable" style={{ borderLeftColor: subject.color }} onClick={() => openSubject(subject.id)}>
                  <h3>{subject.name}</h3>
                  <p>{subject.year} {subject.course && `• ${subject.course}`}</p>
                  <p>Dificuldade: {subject.difficulty}/5 • {subject.weeklyHours}h/semana</p>
                  <p>Preparação: {stats.progress}%</p>
                  <button onClick={e => { e.stopPropagation(); deleteSubject(subject.id); }}>Eliminar</button>
                </div>
              );
            })}
          </section>
        )}

        {page === "subjectFolder" && selectedSubjectId && (
          <section>
            {(() => {
              const subject = getSubject(selectedSubjectId);
              if (!subject) return <p>Disciplina não encontrada.</p>;
              const stats = getSubjectStats(subject.id);
              const plan = generatePlan(subject);
              return (
                <>
                  <button onClick={() => setPage("subjects")}>← Voltar às disciplinas</button>
                  <h2>{subject.name}</h2>
                  <p>{subject.year} {subject.course && `• ${subject.course}`}</p>
                  <p>Dificuldade: {subject.difficulty}/5 • {subject.weeklyHours}h/semana</p>
                  <div className="grid">
                    <div className="card clickable" onClick={() => setPage("documents")}><h3>Documentos</h3><strong>{stats.documents.length}</strong></div>
                    <div className="card clickable" onClick={() => setPage("exercises")}><h3>Exercícios</h3><strong>{stats.exercises.length}</strong></div>
                    <div className="card clickable" onClick={() => setPage("calendar")}><h3>Avaliações</h3><strong>{stats.events.length}</strong></div>
                    <div className="card"><h3>Preparação</h3><strong>{stats.progress}%</strong></div>
                  </div>
                  <div className="item printable-plan">
                    <h3>Plano automático</h3><p>{plan.text}</p>
                    {stats.nextEvent && <p>Próxima avaliação: {stats.nextEvent.type} em {stats.nextEvent.days} dias.</p>}
                    <button onClick={printWeeklyPlan}>Imprimir / Guardar PDF</button>
                    <button onClick={() => shareWhatsApp(`RJP_Study\n${subject.name}\n${plan.text}`)}>WhatsApp</button>
                  </div>
                  <div className="item"><h3>Documentos</h3>{stats.documents.length === 0 && <p>Sem documentos associados.</p>}{stats.documents.map(doc => <div key={doc.id} className="mini"><strong>{doc.name}</strong><br />{doc.type}<br /><br /><button onClick={() => openDocument(doc)}>Abrir</button><button onClick={() => shareWhatsApp(`RJP_Study\nDocumento: ${doc.name}\nDisciplina: ${subject.name}\nTipo: ${doc.type}\n${doc.link || ""}`)}>WhatsApp</button></div>)}</div>
                  <div className="item"><h3>Exercícios</h3>{stats.exercises.length === 0 && <p>Sem exercícios registados.</p>}{stats.exercises.map(ex => <p key={ex.id}>{ex.title} — <strong>{ex.status}</strong></p>)}</div>
                </>
              );
            })()}
          </section>
        )}

        {page === "documents" && (
          <section>
            <h2>Documentos</h2>
            <form className="form" onSubmit={addDocument}>
              <select value={docForm.subjectId} onChange={e => setDocForm({ ...docForm, subjectId: e.target.value })}><option value="">Disciplina</option>{data.subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
              <select value={docForm.type} onChange={e => setDocForm({ ...docForm, type: e.target.value })}><option>PDF</option><option>Excel</option><option>Resumo</option><option>Matriz</option><option>Exame</option><option>Ficha</option><option>Apontamentos</option></select>
              <input placeholder="Nome do documento" value={docForm.name} onChange={e => setDocForm({ ...docForm, name: e.target.value })} />
              <input placeholder="Link do documento / Drive" value={docForm.link} onChange={e => setDocForm({ ...docForm, link: e.target.value })} />
              <input type="file" multiple accept=".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={handleFile} />
              {selectedDocFiles.length > 0 && (
                <div className="selected-files">
                  <strong>{selectedDocFiles.length} ficheiro(s) selecionado(s):</strong>
                  {selectedDocFiles.map(file => (
                    <span key={`${file.name}-${file.size}`}>{file.name}</span>
                  ))}
                </div>
              )}
              <input placeholder="Notas" value={docForm.notes} onChange={e => setDocForm({ ...docForm, notes: e.target.value })} />
              <button>Adicionar documento(s)</button>
            </form>
            {data.documents.length === 0 && <div className="empty">Ainda não existem documentos.</div>}
            {data.documents.map(doc => {
              const subject = getSubject(doc.subjectId);
              return <div key={doc.id} className="item"><h3>{doc.name}</h3><p>{subject?.name} • {doc.type}</p>{doc.fileName && <p>Ficheiro: {doc.fileName}</p>}<button onClick={() => openDocument(doc)}>Abrir</button><button onClick={() => shareWhatsApp(`RJP_Study\nDocumento: ${doc.name}\nDisciplina: ${subject?.name || ""}\nTipo: ${doc.type}\n${doc.link || ""}`)}>WhatsApp</button><button onClick={() => deleteDocument(doc.id)}>Eliminar</button></div>;
            })}
          </section>
        )}

        {page === "exercises" && (
          <section>
            <h2>Exercícios</h2>
            <form className="form" onSubmit={addExercise}>
              <select value={exerciseForm.subjectId} onChange={e => setExerciseForm({ ...exerciseForm, subjectId: e.target.value })}><option value="">Disciplina</option>{data.subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
              <select value={exerciseForm.documentId} onChange={e => setExerciseForm({ ...exerciseForm, documentId: e.target.value })}><option value="">Documento associado</option>{data.documents.map(doc => <option key={doc.id} value={doc.id}>{doc.name}</option>)}</select>
              <input placeholder="Exercício / questão" value={exerciseForm.title} onChange={e => setExerciseForm({ ...exerciseForm, title: e.target.value })} />
              <select value={exerciseForm.status} onChange={e => setExerciseForm({ ...exerciseForm, status: e.target.value })}><option>Por fazer</option><option>Resolvido</option><option>Rever</option><option>Não percebi</option></select>
              <input placeholder="Notas" value={exerciseForm.notes} onChange={e => setExerciseForm({ ...exerciseForm, notes: e.target.value })} />
              <button>Adicionar exercício</button>
            </form>
            {data.exercises.length === 0 && <div className="empty">Ainda não existem exercícios.</div>}
            {data.exercises.map(ex => {
              const subject = getSubject(ex.subjectId);
              const doc = getDocument(ex.documentId);
              return <div key={ex.id} className="item"><h3>{ex.title}</h3><p>{subject?.name} {doc && `• ${doc.name}`}</p><select value={ex.status} onChange={e => updateExerciseStatus(ex.id, e.target.value)}><option>Por fazer</option><option>Resolvido</option><option>Rever</option><option>Não percebi</option></select><button onClick={() => deleteExercise(ex.id)}>Eliminar</button></div>;
            })}
          </section>
        )}

        {page === "calendar" && (
          <section>
            <h2>Calendário mensal</h2>
            <div className="calendar-header"><button onClick={previousMonth}>←</button><h3>{calendar.title}</h3><button onClick={nextMonth}>→</button></div>
            <form className="form" onSubmit={addEvent}>
              <select value={eventForm.subjectId} onChange={e => setEventForm({ ...eventForm, subjectId: e.target.value })}><option value="">Disciplina</option>{data.subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
              <select value={eventForm.type} onChange={e => setEventForm({ ...eventForm, type: e.target.value })}><option>Teste</option><option>Exame</option><option>Questão-aula</option><option>Sessão de estudo</option></select>
              <input placeholder="Título" value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} />
              <input type="date" value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })} />
              <input placeholder="Matéria" value={eventForm.topics} onChange={e => setEventForm({ ...eventForm, topics: e.target.value })} />
              <button>Adicionar evento</button>
            </form>
            <div className="calendar-grid">{calendar.days.map(day => <div key={day.date} className="calendar-day"><strong>{day.day}</strong>{day.events.map(ev => { const subject = getSubject(ev.subjectId); return <div key={ev.id} className="calendar-event">{ev.type}: {subject?.name || ev.title}</div>; })}</div>)}</div>
            {data.events.map(ev => { const subject = getSubject(ev.subjectId); return <div key={ev.id} className="item"><h3>{ev.type}: {ev.title}</h3><p>{subject?.name} • {formatDate(ev.date)}</p><p>{ev.topics}</p><a href={googleCalendarLink(ev)} target="_blank" rel="noreferrer">Adicionar ao Google Calendar</a><button onClick={() => deleteEvent(ev.id)}>Eliminar</button></div>; })}
          </section>
        )}

        {page === "stats" && (
          <section>
            <h2>Estatísticas</h2>
            <div className="grid"><div className="card"><h3>Exercícios</h3><strong>{globalStats.total}</strong></div><div className="card"><h3>Resolvidos</h3><strong>{globalStats.done}</strong></div><div className="card"><h3>Rever</h3><strong>{globalStats.review}</strong></div><div className="card"><h3>Não percebi</h3><strong>{globalStats.stuck}</strong></div><div className="card"><h3>Preparação</h3><strong>{globalStats.progress}%</strong></div></div>
            <div className="item"><h3>Progresso por disciplina</h3>{data.subjects.length === 0 && <p>Sem disciplinas.</p>}{subjectProgressBars()}</div>
          </section>
        )}

        {page === "exam" && (
          <section>
            <h2>Modo Exame</h2>
            <form className="form" onSubmit={saveExamMode}><input placeholder="Disciplina" value={examForm.subjectName} onChange={e => setExamForm({ ...examForm, subjectName: e.target.value })} /><input type="date" value={examForm.examDate} onChange={e => setExamForm({ ...examForm, examDate: e.target.value })} /><input type="number" placeholder="Horas alvo" value={examForm.targetHours} onChange={e => setExamForm({ ...examForm, targetHours: e.target.value })} /><button>Ativar modo exame</button></form>
            {data.examMode?.enabled && <div className="exam-banner"><h3>{data.examMode.subjectName}</h3><strong>{examDays !== null ? `${examDays} dias até ao exame` : "Data não definida"}</strong><p>Horas alvo: {data.examMode.targetHours}h</p><button onClick={disableExamMode}>Desativar modo exame</button></div>}
          </section>
        )}

        {page === "google" && (
          <section>
            <h2>Google / Apps Script</h2>
            <form className="form" onSubmit={saveGoogleConfig}>
              <input
                placeholder="URL Apps Script terminado em /exec"
                value={googleForm.scriptUrl}
                onChange={e => setGoogleForm({ ...googleForm, scriptUrl: e.target.value })}
              />
              <button>Guardar ligação</button>
            </form>

            <div className="grid">
              <div className="card">
                <h3>Ligação</h3>
                <p>Usa Apps Script para ligar a app ao Google Sheets, Drive e Calendar sem OAuth direto na APK.</p>
                <button onClick={testAppsScript}>Testar ligação</button>
              </div>

              <div className="card">
                <h3>Google Drive</h3>
                <p>Ao adicionar vários documentos, a app envia-os para a pasta da disciplina no Drive.</p>
                <button onClick={() => openAppsScript("setup")}>Preparar Drive/Sheets</button>
              </div>

              <div className="card">
                <h3>Sincronização Cloud</h3>
                <p>Usa a mesma base Google Sheets/Drive na APK e na WebApp.</p>
                <button onClick={saveCloudData}>Guardar tudo na Cloud</button>
                <button onClick={loadCloudData}>Carregar da Cloud</button>
              </div>

              <div className="card">
                <h3>Calendário IPL</h3>
                <p>Importa AE, MSF II e RM II para o calendário interno da app.</p>
                <button onClick={importExamesIPLLocal}>Importar exames IPL</button>
              </div>

              <div className="card">
                <h3>Google Calendar</h3>
                <p>Cria os exames no Google Calendar através do Apps Script.</p>
                <button onClick={exportExamesToGoogleCalendar}>Exportar para Google Calendar</button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
