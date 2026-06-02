import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

const STORAGE_KEY = "RJP_STUDY_V41";
const DISCLAIMER_KEY = "RJP_STUDY_DISCLAIMER_ACCEPTED";

const initialData = {
  subjects: [],
  documents: [],
  exercises: [],
  events: []
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || initialData;
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

function App() {
  const [data, setData] = useState(loadData);
  const [page, setPage] = useState("dashboard");
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [accepted, setAccepted] = useState(
    localStorage.getItem(DISCLAIMER_KEY) === "yes"
  );

  const [subjectForm, setSubjectForm] = useState({
    name: "",
    year: "",
    course: "",
    color: "#0f2742",
    difficulty: "3",
    weeklyHours: "2",
    teacher: "",
    notes: ""
  });

  const [docForm, setDocForm] = useState({
    subjectId: "",
    name: "",
    type: "PDF",
    link: "",
    notes: "",
    fileName: "",
    fileData: ""
  });

  const [exerciseForm, setExerciseForm] = useState({
    subjectId: "",
    documentId: "",
    title: "",
    status: "Por fazer",
    notes: ""
  });

  const [eventForm, setEventForm] = useState({
    subjectId: "",
    title: "",
    type: "Teste",
    date: "",
    topics: ""
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

  function getSubject(id) {
    return data.subjects.find(s => s.id === id);
  }

  function getDocument(id) {
    return data.documents.find(d => d.id === id);
  }

  function getSubjectStats(subjectId) {
    const exercises = data.exercises.filter(e => e.subjectId === subjectId);
    const documents = data.documents.filter(d => d.subjectId === subjectId);
    const events = data.events.filter(e => e.subjectId === subjectId);
    const done = exercises.filter(e => e.status === "Resolvido").length;
    const review = exercises.filter(e => e.status === "Rever").length;
    const stuck = exercises.filter(e => e.status === "Não percebi").length;
    const progress = exercises.length ? Math.round((done / exercises.length) * 100) : 0;

    const futureEvents = events
      .map(e => ({ ...e, days: daysUntil(e.date) }))
      .filter(e => e.days !== null && e.days >= 0)
      .sort((a, b) => a.days - b.days);

    return {
      exercises,
      documents,
      events,
      done,
      review,
      stuck,
      progress,
      nextEvent: futureEvents[0] || null
    };
  }

  function openSubject(id) {
    setSelectedSubjectId(id);
    setPage("subjectFolder");
  }

  function acceptDisclaimer() {
    localStorage.setItem(DISCLAIMER_KEY, "yes");
    setAccepted(true);
  }

  function addSubject(e) {
    e.preventDefault();
    if (!subjectForm.name.trim()) return;

    setData(d => ({
      ...d,
      subjects: [...d.subjects, { id: uid(), ...subjectForm }]
    }));

    setSubjectForm({
      name: "",
      year: "",
      course: "",
      color: "#0f2742",
      difficulty: "3",
      weeklyHours: "2",
      teacher: "",
      notes: ""
    });
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
    reader.onload = () => {
      setDocForm(f => ({
        ...f,
        name: f.name || file.name,
        fileName: file.name,
        fileData: reader.result
      }));
    };
    reader.readAsDataURL(file);
  }

  function addDocument(e) {
    e.preventDefault();
    if (!docForm.subjectId || !docForm.name.trim()) return;

    setData(d => ({
      ...d,
      documents: [...d.documents, { id: uid(), ...docForm }]
    }));

    setDocForm({
      subjectId: "",
      name: "",
      type: "PDF",
      link: "",
      notes: "",
      fileName: "",
      fileData: ""
    });
  }

  function deleteDocument(id) {
    setData(d => ({
      ...d,
      documents: d.documents.filter(x => x.id !== id),
      exercises: d.exercises.filter(x => x.documentId !== id)
    }));
  }

  function openDocument(doc) {
    if (doc.fileData) {
      const win = window.open();
      win.document.write(
        `<iframe src="${doc.fileData}" style="width:100%;height:100vh;border:0"></iframe>`
      );
      return;
    }

    if (doc.link) {
      window.open(doc.link, "_blank");
    }
  }

  function addExercise(e) {
    e.preventDefault();
    if (!exerciseForm.subjectId || !exerciseForm.title.trim()) return;

    setData(d => ({
      ...d,
      exercises: [...d.exercises, { id: uid(), ...exerciseForm }]
    }));

    setExerciseForm({
      subjectId: "",
      documentId: "",
      title: "",
      status: "Por fazer",
      notes: ""
    });
  }

  function updateExerciseStatus(id, status) {
    setData(d => ({
      ...d,
      exercises: d.exercises.map(ex =>
        ex.id === id ? { ...ex, status } : ex
      )
    }));
  }

  function deleteExercise(id) {
    setData(d => ({
      ...d,
      exercises: d.exercises.filter(x => x.id !== id)
    }));
  }

  function addEvent(e) {
    e.preventDefault();
    if (!eventForm.subjectId || !eventForm.title.trim() || !eventForm.date) return;

    setData(d => ({
      ...d,
      events: [...d.events, { id: uid(), ...eventForm }]
    }));

    setEventForm({
      subjectId: "",
      title: "",
      type: "Teste",
      date: "",
      topics: ""
    });
  }

  function deleteEvent(id) {
    setData(d => ({
      ...d,
      events: d.events.filter(x => x.id !== id)
    }));
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
    const pending = stats.exercises.filter(e => e.status !== "Resolvido").length;
    const difficulty = Number(subject.difficulty || 3);
    const baseHours = Number(subject.weeklyHours || 2);
    const urgentBonus = stats.nextEvent && stats.nextEvent.days <= 7 ? 1.5 : 0;
    const recommended = Math.max(
      1,
      Math.round((baseHours + pending * 0.25 + difficulty * 0.3 + urgentBonus) * 10) / 10
    );

    return {
      pending,
      recommended,
      text: `${subject.name}: ${recommended}h recomendadas esta semana. Exercícios pendentes/rever: ${pending}.`
    };
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
    return (
    <div className="app">
      <aside>
        <div className="brand">
          <img src="/logo.png" alt="RJP Study" />
          <div>
            <h1>RJP_Study</h1>
            <span>Organiza • Planeia • Alcança</span>
          </div>
        </div>

        <button onClick={() => setPage("dashboard")}>Dashboard</button>
        <button onClick={() => setPage("subjects")}>Disciplinas</button>
        <button onClick={() => setPage("documents")}>Documentos</button>
        <button onClick={() => setPage("exercises")}>Exercícios</button>
        <button onClick={() => setPage("calendar")}>Calendário</button>
        <button onClick={() => setPage("stats")}>Estatísticas</button>
        <button onClick={() => setPage("google")}>Google</button>
      </aside>

      <main>

        {page === "dashboard" && (
          <section>
            <h2>Dashboard</h2>

            <div className="grid">
              <div className="card">
                <h3>Disciplinas</h3>
                <strong>{data.subjects.length}</strong>
              </div>

              <div className="card">
                <h3>Documentos</h3>
                <strong>{data.documents.length}</strong>
              </div>

              <div className="card">
                <h3>Exercícios</h3>
                <strong>{globalStats.total}</strong>
              </div>

              <div className="card">
                <h3>Preparação</h3>
                <strong>{globalStats.progress}%</strong>
              </div>
            </div>

            {data.subjects.map(subject => {
              const stats = getSubjectStats(subject.id);

              return (
                <div
                  key={subject.id}
                  className="item clickable"
                  style={{ borderLeftColor: subject.color }}
                  onClick={() => openSubject(subject.id)}
                >
                  <h3>{subject.name}</h3>

                  <p>
                    {stats.documents.length} documentos •{" "}
                    {stats.exercises.length} exercícios
                  </p>

                  <p>
                    Preparação: <strong>{stats.progress}%</strong>
                  </p>

                  {stats.nextEvent && (
                    <p>
                      Próximo: {stats.nextEvent.type} em{" "}
                      {stats.nextEvent.days} dias
                    </p>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {page === "subjectFolder" && selectedSubjectId && (
          <section>
            {(() => {
              const subject = getSubject(selectedSubjectId);

              if (!subject) {
                return <p>Disciplina não encontrada.</p>;
              }

              const stats = getSubjectStats(subject.id);
              const plan = generatePlan(subject);

              return (
                <>
                  <button onClick={() => setPage("subjects")}>
                    ← Voltar
                  </button>

                  <h2>{subject.name}</h2>

                  <div className="grid">
                    <div className="card">
                      <h3>Documentos</h3>
                      <strong>{stats.documents.length}</strong>
                    </div>

                    <div className="card">
                      <h3>Exercícios</h3>
                      <strong>{stats.exercises.length}</strong>
                    </div>

                    <div className="card">
                      <h3>Preparação</h3>
                      <strong>{stats.progress}%</strong>
                    </div>
                  </div>

                  <div className="item">
                    <h3>Plano automático</h3>
                    <p>{plan.text}</p>
                  </div>

                  <div className="item">
                    <h3>Documentos</h3>

                    {stats.documents.length === 0 && (
                      <p>Sem documentos.</p>
                    )}

                    {stats.documents.map(doc => (
                      <div key={doc.id} className="mini">
                        <strong>{doc.name}</strong>
                        <br />
                        {doc.type}

                        <br /><br />

                        <button onClick={() => openDocument(doc)}>
                          Abrir
                        </button>

                        <button
                          onClick={() =>
                            shareWhatsApp(
                              `Documento: ${doc.name}`
                            )
                          }
                        >
                          WhatsApp
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="item">
                    <h3>Avaliações</h3>

                    {stats.events.length === 0 && (
                      <p>Sem avaliações.</p>
                    )}

                    {stats.events.map(ev => (
                      <div key={ev.id} className="mini">
                        <strong>{ev.type}</strong>
                        <br />
                        {ev.title}
                        <br />
                        {ev.date}

                        <br /><br />

                        <a
                          href={googleCalendarLink(ev)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Google Calendar
                        </a>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </section>
        )}

        {page === "google" && (
          <section>
            <h2>Google</h2>

            <div className="grid">

              <div className="card">
                <h3>Google Login</h3>
                <p>Preparado para integração</p>
                <button disabled>
                  Entrar com Google
                </button>
              </div>

              <div className="card">
                <h3>Google Drive</h3>
                <p>
                  Futuro armazenamento:
                </p>

                <pre>
RJP_Study
 ├─ RMII
 ├─ Estruturas
 └─ Solos II
                </pre>
              </div>

              <div className="card">
                <h3>Google Sheets</h3>
                <p>
                  Base de dados online dos utilizadores
                </p>
              </div>

              <div className="card">
                <h3>Google Calendar</h3>
                <p>
                  Testes, exames e sessões de estudo
                </p>
              </div>

            </div>
          </section>
        )}

      </main>
    </div>
  );
}

ReactDOM.createRoot(
  document.getElementById("root")
).render(<App />);
