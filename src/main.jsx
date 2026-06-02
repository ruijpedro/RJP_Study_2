import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

const STORAGE_KEY = "RJP_STUDY_V31";
const DISCLAIMER_KEY = "RJP_STUDY_DISCLAIMER_ACCEPTED";

const emptyData = {
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
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : emptyData;
  } catch {
    return emptyData;
  }
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
    notes: ""
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

  const stats = useMemo(() => {
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
      notes: ""
    });
  }

  function deleteDocument(id) {
    setData(d => ({
      ...d,
      documents: d.documents.filter(x => x.id !== id),
      exercises: d.exercises.filter(x => x.documentId !== id)
    }));
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
      exercises: d.exercises.map(x => x.id === id ? { ...x, status } : x)
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

  function generatePlan(subject) {
    const exercises = data.exercises.filter(e => e.subjectId === subject.id);
    const pending = exercises.filter(e => e.status !== "Resolvido").length;
    const difficulty = Number(subject.difficulty || 3);
    const baseHours = Number(subject.weeklyHours || 2);
    const recommended = Math.max(
      1,
      Math.round((baseHours + pending * 0.25 + difficulty * 0.3) * 10) / 10
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
          <h1>RJP_Study</h1>
          <h2>Aviso Legal / Disclaimer</h2>
          <p>
            O RJP_Study é uma ferramenta de apoio ao estudo, organização académica
            e planeamento pessoal.
          </p>
          <p>
            Não substitui professores, explicadores ou instituições de ensino, nem
            garante resultados académicos.
          </p>
          <p>
            O utilizador é responsável pela validação das datas, documentos,
            matérias, matrizes, exercícios e planos introduzidos.
          </p>
          <button onClick={acceptDisclaimer}>Li e aceito</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <aside>
        <div className="brand">
          <img src="/icon-512.png" alt="RJP Study" />
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
              <div className="card clickable" onClick={() => setPage("subjects")}>
                <h3>Disciplinas</h3>
                <strong>{data.subjects.length}</strong>
                <p>Abrir disciplinas</p>
              </div>

              <div className="card clickable" onClick={() => setPage("documents")}>
                <h3>Documentos</h3>
                <strong>{data.documents.length}</strong>
                <p>Abrir documentos</p>
              </div>

              <div className="card clickable" onClick={() => setPage("exercises")}>
                <h3>Exercícios resolvidos</h3>
                <strong>{stats.done}/{stats.total}</strong>
                <p>Abrir exercícios</p>
              </div>

              <div className="card clickable" onClick={() => setPage("stats")}>
                <h3>Preparação global</h3>
                <strong>{stats.progress}%</strong>
                <p>Ver estatísticas</p>
              </div>
            </div>

            {data.subjects.length === 0 && (
              <div className="empty">
                <h3>Ainda não existem disciplinas</h3>
                <p>Começa por criar a tua primeira disciplina.</p>
                <button onClick={() => setPage("subjects")}>
                  + Adicionar disciplina
                </button>
              </div>
            )}

            {data.subjects.map(s => {
              const plan = generatePlan(s);
              return (
                <div
                  className="item clickable"
                  key={s.id}
                  style={{ borderLeftColor: s.color }}
                  onClick={() => {
                    setSelectedSubjectId(s.id);
                    setPage("subjectFolder");
                  }}
                >
                  <h3>{s.name}</h3>
                  <p>{plan.text}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      shareWhatsApp(`RJP_Study\nPlano de estudo\n${plan.text}`);
                    }}
                  >
                    Partilhar WhatsApp
                  </button>
                </div>
              );
            })}
          </section>
        )}

        {page === "subjects" && (
          <section>
            <h2>Disciplinas</h2>

            <form className="form" onSubmit={addSubject}>
              <input
                placeholder="Nome da disciplina"
                value={subjectForm.name}
                onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })}
              />
              <input
                placeholder="Ano"
                value={subjectForm.year}
                onChange={e => setSubjectForm({ ...subjectForm, year: e.target.value })}
              />
              <input
                placeholder="Curso"
                value={subjectForm.course}
                onChange={e => setSubjectForm({ ...subjectForm, course: e.target.value })}
              />
              <input
                type="color"
                value={subjectForm.color}
                onChange={e => setSubjectForm({ ...subjectForm, color: e.target.value })}
              />
              <input
                type="number"
                min="1"
                max="5"
                placeholder="Dificuldade 1-5"
                value={subjectForm.difficulty}
                onChange={e => setSubjectForm({ ...subjectForm, difficulty: e.target.value })}
              />
              <input
                type="number"
                placeholder="Horas semanais"
                value={subjectForm.weeklyHours}
                onChange={e => setSubjectForm({ ...subjectForm, weeklyHours: e.target.value })}
              />
              <input
                placeholder="Professor"
                value={subjectForm.teacher}
                onChange={e => setSubjectForm({ ...subjectForm, teacher: e.target.value })}
              />
              <input
                placeholder="Observações"
                value={subjectForm.notes}
                onChange={e => setSubjectForm({ ...subjectForm, notes: e.target.value })}
              />
              <button>+ Adicionar disciplina</button>
            </form>

            {data.subjects.length === 0 && (
              <div className="empty">Ainda não existem disciplinas.</div>
            )}

            {data.subjects.map(s => (
              <div
                className="item clickable"
                key={s.id}
                style={{ borderLeftColor: s.color }}
                onClick={() => {
                  setSelectedSubjectId(s.id);
                  setPage("subjectFolder");
                }}
              >
                <h3>{s.name}</h3>
                <p>{s.year} {s.course && `• ${s.course}`}</p>
                <p>Dificuldade: {s.difficulty}/5 • {s.weeklyHours}h/semana</p>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSubject(s.id);
                  }}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </section>
        )}

        {page === "subjectFolder" && selectedSubjectId && (
          <section>
            {(() => {
              const subject = getSubject(selectedSubjectId);
              if (!subject) return <p>Disciplina não encontrada.</p>;

              const subjectDocuments = data.documents.filter(d => d.subjectId === selectedSubjectId);
              const subjectExercises = data.exercises.filter(e => e.subjectId === selectedSubjectId);
              const subjectEvents = data.events.filter(e => e.subjectId === selectedSubjectId);
              const plan = generatePlan(subject);

              return (
                <>
                  <button onClick={() => setPage("subjects")}>
                    ← Voltar às disciplinas
                  </button>

                  <h2>{subject.name}</h2>
                  <p>{subject.year} {subject.course && `• ${subject.course}`}</p>
                  <p>Dificuldade: {subject.difficulty}/5 • {subject.weeklyHours}h/semana</p>

                  <div className="grid">
                    <div className="card clickable" onClick={() => setPage("documents")}>
                      <h3>Documentos</h3>
                      <strong>{subjectDocuments.length}</strong>
                    </div>

                    <div className="card clickable" onClick={() => setPage("exercises")}>
                      <h3>Exercícios</h3>
                      <strong>{subjectExercises.length}</strong>
                    </div>

                    <div className="card clickable" onClick={() => setPage("calendar")}>
                      <h3>Avaliações / Calendário</h3>
                      <strong>{subjectEvents.length}</strong>
                    </div>
                  </div>

                  <div className="item">
                    <h3>Plano sugerido</h3>
                    <p>{plan.text}</p>
                    <button
                      onClick={() =>
                        shareWhatsApp(`RJP_Study\n${subject.name}\n${plan.text}`)
                      }
                    >
                      Partilhar plano no WhatsApp
                    </button>
                  </div>

                  <div className="item">
                    <h3>Documentos da disciplina</h3>
                    {subjectDocuments.length === 0 && <p>Sem documentos associados.</p>}
                    {subjectDocuments.map(d => (
                      <p key={d.id}>
                        <strong>{d.type}</strong> — {d.name}
                      </p>
                    ))}
                  </div>

                  <div className="item">
                    <h3>Exercícios da disciplina</h3>
                    {subjectExercises.length === 0 && <p>Sem exercícios registados.</p>}
                    {subjectExercises.map(e => (
                      <p key={e.id}>
                        {e.title} — <strong>{e.status}</strong>
                      </p>
                    ))}
                  </div>
                </>
              );
            })()}
          </section>
        )}

        {page === "documents" && (
          <section>
            <h2>Documentos</h2>

            <form className="form" onSubmit={addDocument}>
              <select
                value={docForm.subjectId}
                onChange={e => setDocForm({ ...docForm, subjectId: e.target.value })}
              >
                <option value="">Disciplina</option>
                {data.subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select
                value={docForm.type}
                onChange={e => setDocForm({ ...docForm, type: e.target.value })}
              >
                <option>PDF</option>
                <option>Excel</option>
                <option>Resumo</option>
                <option>Matriz</option>
                <option>Exame</option>
                <option>Ficha</option>
                <option>Apontamentos</option>
              </select>

              <input
                placeholder="Nome do documento"
                value={docForm.name}
                onChange={e => setDocForm({ ...docForm, name: e.target.value })}
              />
              <input
                placeholder="Link do documento"
                value={docForm.link}
                onChange={e => setDocForm({ ...docForm, link: e.target.value })}
              />
              <input
                placeholder="Notas"
                value={docForm.notes}
                onChange={e => setDocForm({ ...docForm, notes: e.target.value })}
              />
              <button>Adicionar documento</button>
            </form>

            {data.documents.map(d => {
              const s = getSubject(d.subjectId);
              return (
                <div className="item" key={d.id}>
                  <h3>{d.name}</h3>
                  <p>{s?.name} • {d.type}</p>
                  {d.link && <a href={d.link} target="_blank">Abrir</a>}
                  <button
                    onClick={() =>
                      shareWhatsApp(
                        `RJP_Study\nDocumento: ${d.name}\nDisciplina: ${s?.name || ""}\nTipo: ${d.type}\n${d.link || ""}`
                      )
                    }
                  >
                    WhatsApp
                  </button>
                  <button onClick={() => deleteDocument(d.id)}>Eliminar</button>
                </div>
              );
            })}
          </section>
        )}

        {page === "exercises" && (
          <section>
            <h2>Exercícios</h2>

            <form className="form" onSubmit={addExercise}>
              <select
                value={exerciseForm.subjectId}
                onChange={e => setExerciseForm({ ...exerciseForm, subjectId: e.target.value })}
              >
                <option value="">Disciplina</option>
                {data.subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select
                value={exerciseForm.documentId}
                onChange={e => setExerciseForm({ ...exerciseForm, documentId: e.target.value })}
              >
                <option value="">Documento associado</option>
                {data.documents.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <input
                placeholder="Exercício / questão"
                value={exerciseForm.title}
                onChange={e => setExerciseForm({ ...exerciseForm, title: e.target.value })}
              />

              <select
                value={exerciseForm.status}
                onChange={e => setExerciseForm({ ...exerciseForm, status: e.target.value })}
              >
                <option>Por fazer</option>
                <option>Resolvido</option>
                <option>Rever</option>
                <option>Não percebi</option>
              </select>

              <input
                placeholder="Notas"
                value={exerciseForm.notes}
                onChange={e => setExerciseForm({ ...exerciseForm, notes: e.target.value })}
              />
              <button>Adicionar exercício</button>
            </form>

            {data.exercises.map(ex => {
              const s = getSubject(ex.subjectId);
              return (
                <div className="item" key={ex.id}>
                  <h3>{ex.title}</h3>
                  <p>{s?.name} • {ex.status}</p>
                  <select
                    value={ex.status}
                    onChange={e => updateExerciseStatus(ex.id, e.target.value)}
                  >
                    <option>Por fazer</option>
                    <option>Resolvido</option>
                    <option>Rever</option>
                    <option>Não percebi</option>
                  </select>
                  <button onClick={() => deleteExercise(ex.id)}>Eliminar</button>
                </div>
              );
            })}
          </section>
        )}

        {page === "calendar" && (
          <section>
            <h2>Calendário</h2>

            <form className="form" onSubmit={addEvent}>
              <select
                value={eventForm.subjectId}
                onChange={e => setEventForm({ ...eventForm, subjectId: e.target.value })}
              >
                <option value="">Disciplina</option>
                {data.subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select
                value={eventForm.type}
                onChange={e => setEventForm({ ...eventForm, type: e.target.value })}
              >
                <option>Teste</option>
                <option>Exame</option>
                <option>Questão-aula</option>
                <option>Sessão de estudo</option>
              </select>

              <input
                placeholder="Título"
                value={eventForm.title}
                onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
              />
              <input
                type="date"
                value={eventForm.date}
                onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
              />
              <input
                placeholder="Matéria"
                value={eventForm.topics}
                onChange={e => setEventForm({ ...eventForm, topics: e.target.value })}
              />
              <button>Adicionar evento</button>
            </form>

            {data.events.map(ev => {
              const s = getSubject(ev.subjectId);
              return (
                <div className="item" key={ev.id}>
                  <h3>{ev.type}: {ev.title}</h3>
                  <p>{s?.name} • {ev.date}</p>
                  <p>{ev.topics}</p>
                  <button onClick={() => deleteEvent(ev.id)}>Eliminar</button>
                </div>
              );
            })}
          </section>
        )}

        {page === "stats" && (
          <section>
            <h2>Estatísticas</h2>

            <div className="grid">
              <div className="card">
                <h3>Exercícios</h3>
                <strong>{stats.total}</strong>
              </div>
              <div className="card">
                <h3>Resolvidos</h3>
                <strong>{stats.done}</strong>
              </div>
              <div className="card">
                <h3>Rever</h3>
                <strong>{stats.review}</strong>
              </div>
              <div className="card">
                <h3>Não percebi</h3>
                <strong>{stats.stuck}</strong>
              </div>
              <div className="card">
                <h3>Preparação</h3>
                <strong>{stats.progress}%</strong>
              </div>
            </div>
          </section>
        )}

        {page === "google" && (
          <section>
            <h2>Google</h2>

            <div className="item">
              <h3>Preparado para fase seguinte</h3>
              <p>Login Google, Drive por utilizador, Sheets e Calendar serão ligados na próxima fase.</p>
              <button disabled>Entrar com Google</button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
