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
    return saved ? { ...initialData, ...JSON.parse(saved) } : initialData;
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
    clientId: data.google?.clientId || "",
    apiKey: data.google?.apiKey || ""
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDocForm(f => ({ ...f, name: f.name || file.name, fileName: file.name, fileData: reader.result }));
    reader.readAsDataURL(file);
  }

  function addDocument(e) {
    e.preventDefault();
    if (!docForm.subjectId || !docForm.name.trim()) return;
    setData(d => ({ ...d, documents: [...d.documents, { id: uid(), ...docForm }] }));
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
    if (doc.link) window.open(doc.link, "_blank");
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
    setData(d => ({ ...d, google: { ...d.google, clientId: googleForm.clientId.trim(), apiKey: googleForm.apiKey.trim() } }));
    alert("Configuração Google guardada.");
  }

  function googleLogin() {
    const clientId = googleForm.clientId || data.google?.clientId;
    if (!clientId || !clientId.includes(".apps.googleusercontent.com")) {
      alert("Coloca primeiro o OAuth Client ID correto no campo Google Client ID.");
      return;
    }
    if (!window.google?.accounts?.oauth2) {
      alert("A biblioteca Google ainda não carregou. Atualiza a página e tenta novamente.");
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/spreadsheets",
      callback: async tokenResponse => {
        if (tokenResponse.error) {
          alert("Erro no login Google: " + tokenResponse.error);
          return;
        }
        try {
          const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
          });
          const profile = await profileResponse.json();
          setData(d => ({
            ...d,
            google: {
              ...d.google,
              clientId,
              apiKey: googleForm.apiKey || d.google.apiKey,
              signedIn: true,
              userEmail: profile.email || "",
              userName: profile.name || "Utilizador Google",
              userPhoto: profile.picture || "",
              accessToken: tokenResponse.access_token
            }
          }));
          alert("Login Google efetuado com sucesso.");
        } catch {
          alert("Login Google feito, mas não foi possível ler o perfil.");
        }
      }
    });
    tokenClient.requestAccessToken({ prompt: "consent" });
  }

  function googleLogout() {
    const token = data.google?.accessToken;
    if (window.google?.accounts?.oauth2 && token) {
      window.google.accounts.oauth2.revoke(token, () => {});
    }
    setData(d => ({
      ...d,
      google: {
        ...d.google,
        signedIn: false,
        userEmail: "",
        userName: "",
        userPhoto: "",
        accessToken: "",
        driveFolderId: "",
        driveFolderLink: ""
      }
    }));
  }

  async function createDriveFolder() {
    if (!data.google?.accessToken) {
      alert("Faz primeiro Entrar com Google.");
      return;
    }
    try {
      const response = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.google.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: "RJP_Study",
          mimeType: "application/vnd.google-apps.folder"
        })
      });
      const folder = await response.json();
      if (!folder.id) {
        alert("Não foi possível criar a pasta no Google Drive.");
        return;
      }
      const link = `https://drive.google.com/drive/folders/${folder.id}`;
      setData(d => ({ ...d, google: { ...d.google, driveFolderId: folder.id, driveFolderLink: link } }));
      alert("Pasta RJP_Study criada no Google Drive.");
    } catch {
      alert("Erro ao criar pasta no Google Drive.");
    }
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
              <input type="file" accept=".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg" onChange={handleFile} />
              <input placeholder="Notas" value={docForm.notes} onChange={e => setDocForm({ ...docForm, notes: e.target.value })} />
              <button>Adicionar documento</button>
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
            <h2>Google</h2>
            <form className="form" onSubmit={saveGoogleConfig}>
              <input placeholder="Google OAuth Client ID" value={googleForm.clientId} onChange={e => setGoogleForm({ ...googleForm, clientId: e.target.value })} />
              <input placeholder="Google API Key" value={googleForm.apiKey} onChange={e => setGoogleForm({ ...googleForm, apiKey: e.target.value })} />
              <button>Guardar configuração Google</button>
            </form>
            <div className="grid">
              <div className="card">
                <h3>Login Google</h3>
                {data.google?.signedIn ? (
                  <>
                    {data.google.userPhoto && <img src={data.google.userPhoto} alt="Perfil Google" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} />}
                    <p>{data.google.userName}<br />{data.google.userEmail}</p>
                    <button onClick={googleLogout}>Terminar sessão</button>
                  </>
                ) : (
                  <><p>Estado: não ligado</p><button onClick={googleLogin}>Entrar com Google</button></>
                )}
              </div>
              <div className="card">
                <h3>Google Drive</h3>
                {data.google?.driveFolderId ? (
                  <><p>Pasta RJP_Study criada.</p><a href={data.google.driveFolderLink} target="_blank" rel="noreferrer">Abrir pasta no Drive</a></>
                ) : (
                  <><p>Cria a pasta principal RJP_Study no teu Google Drive.</p><button onClick={createDriveFolder}>Criar pasta RJP_Study</button></>
                )}
              </div>
              <div className="card"><h3>Google Sheets</h3><p>Preparado para guardar disciplinas, exercícios e notas.</p></div>
              <div className="card"><h3>Google Calendar</h3><p>Já podes criar eventos através do link Google Calendar.</p></div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
