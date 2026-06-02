import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen, CalendarDays, FileText, GraduationCap, LayoutDashboard, ListChecks, Plus, Settings, Target, Trash2, Pencil, Download, Upload, CheckCircle2, AlertTriangle, Clock, BarChart3, FolderOpen, ShieldCheck } from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'RJP_STUDY_V3_DATA';

const disclaimerText = `RJP_Study é uma ferramenta de apoio ao estudo, organização académica e planeamento de atividades educativas. A aplicação não substitui o ensino ministrado por professores, explicadores ou instituições de ensino, nem garante resultados académicos específicos. Os planos de estudo, alertas, calendários, estatísticas e recomendações apresentados têm carácter meramente informativo. O utilizador é responsável pela validação das datas, conteúdos, matrizes, documentos e demais informações introduzidas na aplicação.`;

const demo = {
  acceptedDisclaimer: false,
  profile: { name: 'Aluno', email: '', mode: 'Local / Offline' },
  subjects: [],
  evaluations: [],
  documents: [],
  exercises: [],
  sessions: [],
  google: { login: false, drive: false, sheets: false, calendar: false }
};

function nextDate(days) {
  const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0,10);
}

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || demo; } catch { return demo; }
}
function saveData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function fmtDate(d) { if (!d) return 'Sem data'; return new Date(d + 'T12:00:00').toLocaleDateString('pt-PT'); }
function daysUntil(date) { if (!date) return null; const t = new Date(date+'T12:00:00') - new Date(); return Math.ceil(t/86400000); }

function App(){
  const [data,setData] = useState(loadData);
  const [page,setPage] = useState('dashboard');
  const [selectedSubject,setSelectedSubject] = useState(data.subjects?.[0]?.id || '');
  const [editing,setEditing] = useState(null);

  useEffect(()=>saveData(data),[data]);

  const subjectMap = useMemo(()=>Object.fromEntries(data.subjects.map(s=>[s.id,s])),[data.subjects]);
  const stats = useMemo(()=>calcStats(data),[data]);
  const studyPlan = useMemo(()=>generatePlan(data),[data]);

  const update = (patch)=>setData(prev=>({...prev,...patch}));
  const add = (key,item)=>setData(prev=>({...prev,[key]:[{...item,id:crypto.randomUUID()},...prev[key]]}));
  const del = (key,id)=>setData(prev=>({...prev,[key]:prev[key].filter(x=>x.id!==id)}));
  const updItem = (key,id,patch)=>setData(prev=>({...prev,[key]:prev[key].map(x=>x.id===id?{...x,...patch}:x)}));

  if(!data.acceptedDisclaimer){
    return <div className="accept-screen">
      <div className="accept-card">
        <img src="/logo.png" className="big-logo" />
        <h1>RJP_Study</h1>
        <h2>Aviso Legal / Disclaimer</h2>
        <p>{disclaimerText}</p>
        <button className="primary" onClick={()=>update({acceptedDisclaimer:true})}>Li e aceito</button>
      </div>
    </div>
  }

  const menu = [
    ['dashboard','Dashboard',LayoutDashboard],['subjects','Disciplinas',BookOpen],['evals','Avaliações',GraduationCap],['docs','Documentos',FolderOpen],['exercises','Exercícios',ListChecks],['plan','Plano',Target],['calendar','Calendário',CalendarDays],['stats','Estatísticas',BarChart3],['settings','Definições',Settings]
  ];

  return <div className="app">
    <aside>
      <div className="brand"><img src="/logo.png"/><div><b>RJP Study</b><span>Organiza • Planeia • Alcança</span></div></div>
      <nav>{menu.map(([id,label,Icon])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><Icon size={18}/>{label}</button>)}</nav>
      <div className="side-note"><ShieldCheck size={16}/>Modo local com preparação Google.</div>
    </aside>
    <main>
      <header><div><h1>{titleFor(page)}</h1><p>Versão v2 — estudo, PDFs, exercícios, calendário e plano automático.</p></div><button className="ghost" onClick={()=>{localStorage.removeItem(STORAGE_KEY); location.reload()}}>Repor demo</button></header>

      {page==='dashboard' && <Dashboard data={data} stats={stats} plan={studyPlan} subjectMap={subjectMap} setPage={setPage}/>} 
      {page==='subjects' && <Subjects data={data} add={add} del={del} updItem={updItem} editing={editing} setEditing={setEditing}/>} 
      {page==='evals' && <Evaluations data={data} add={add} del={del} updItem={updItem} subjectMap={subjectMap}/>} 
      {page==='docs' && <Documents data={data} add={add} del={del} updItem={updItem} subjectMap={subjectMap}/>} 
      {page==='exercises' && <Exercises data={data} add={add} del={del} updItem={updItem} subjectMap={subjectMap}/>} 
      {page==='plan' && <Plan data={data} plan={studyPlan} subjectMap={subjectMap}/>} 
      {page==='calendar' && <CalendarView data={data} plan={studyPlan} subjectMap={subjectMap}/>} 
      {page==='stats' && <Stats data={data} stats={stats} subjectMap={subjectMap}/>} 
      {page==='settings' && <SettingsPage data={data} update={update}/>} 
    </main>
  </div>
}

function titleFor(p){return {dashboard:'Dashboard',subjects:'Disciplinas',evals:'Avaliações',docs:'Documentos',exercises:'Exercícios',plan:'Plano de Estudo',calendar:'Calendário',stats:'Estatísticas',settings:'Definições'}[p]}

function Dashboard({data,stats,plan,subjectMap,setPage}){
  const nextEval=[...data.evaluations].sort((a,b)=>(a.date||'').localeCompare(b.date||''))[0];
  return <div className="grid">
    <Card className="hero"><h2>Preparação global</h2><div className="percent">{stats.global}%</div><p>Baseado nos exercícios resolvidos, por rever e pendentes.</p></Card>
    <Card><h3>Próxima avaliação</h3>{nextEval?<><b>{nextEval.title}</b><p>{subjectMap[nextEval.subjectId]?.name} • {fmtDate(nextEval.date)}</p><span className="pill red">faltam {daysUntil(nextEval.date)} dias</span></>:<p>Sem avaliações.</p>}</Card>
    <Card><h3>Plano de hoje</h3>{plan.slice(0,3).map(s=><div className="mini" key={s.id}><Clock size={16}/>{s.subject} — {s.minutes} min</div>)}<button onClick={()=>setPage('plan')} className="linkbtn">Ver plano</button></Card>
    <Card><h3>Atalhos</h3><div className="quick"><button onClick={()=>setPage('subjects')}>+ Disciplina</button><button onClick={()=>setPage('docs')}>+ PDF</button><button onClick={()=>setPage('exercises')}>+ Exercício</button></div></Card>
  </div>
}
function Card({children,className=''}){return <section className={'card '+className}>{children}</section>}

function Subjects({data,add,del,updItem}){
 const [f,setF]=useState({name:'',level:'',difficulty:3,weeklyHours:2,color:'#0f3b66',notes:''});
 const submit=e=>{e.preventDefault(); add('subjects',f); setF({name:'',level:'',difficulty:3,weeklyHours:2,color:'#0f3b66',notes:''})};
 return <><Form title="Adicionar disciplina" onSubmit={submit}><input placeholder="Nome" value={f.name} onChange={e=>setF({...f,name:e.target.value})} required/><input placeholder="Nível/ano" value={f.level} onChange={e=>setF({...f,level:e.target.value})}/><input type="number" min="1" max="5" value={f.difficulty} onChange={e=>setF({...f,difficulty:+e.target.value})}/><input type="number" min="0" step="0.5" value={f.weeklyHours} onChange={e=>setF({...f,weeklyHours:+e.target.value})}/><input type="color" value={f.color} onChange={e=>setF({...f,color:e.target.value})}/><input placeholder="Notas" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/><button className="primary"><Plus size={16}/>Adicionar</button></Form>{!data.subjects.length && <Card><h3>Ainda não existem disciplinas</h3><p>Adiciona a primeira disciplina para começares a guardar avaliações, documentos, exercícios e planos de estudo.</p></Card>}<div className="grid">{data.subjects.map(s=><Card key={s.id}><div className="colorbar" style={{background:s.color}}/><h3>{s.name}</h3><p>{s.level}</p><span className="pill">Dificuldade {s.difficulty}/5</span><span className="pill">{s.weeklyHours}h/semana</span><textarea value={s.notes} onChange={e=>updItem('subjects',s.id,{notes:e.target.value})}/><button className="danger" onClick={()=>del('subjects',s.id)}><Trash2 size={15}/>Remover</button></Card>)}</div></>
}
function Form({title,children,onSubmit}){return <form className="form card" onSubmit={onSubmit}><h3>{title}</h3><div className="formgrid">{children}</div></form>}

function Evaluations({data,add,del,updItem,subjectMap}){
 if(!data.subjects.length){
  return <Card><h3>Avaliações</h3><p>Ainda não existem disciplinas. Cria primeiro uma disciplina para poderes adicionar testes, exames ou questões-aula.</p></Card>
 }
 const [f,setF]=useState({subjectId:data.subjects[0]?.id||'',type:'Teste',title:'',date:'',matrix:'',weight:'Média',grade:''});
 return <><Form title="Adicionar avaliação" onSubmit={e=>{e.preventDefault();add('evaluations',f);setF({...f,title:'',date:'',matrix:'',grade:''})}}><SelectSubject data={data} val={f.subjectId} set={v=>setF({...f,subjectId:v})}/><select value={f.type} onChange={e=>setF({...f,type:e.target.value})}><option>Teste</option><option>Questão-aula</option><option>Exame</option><option>Trabalho</option></select><input placeholder="Título" value={f.title} onChange={e=>setF({...f,title:e.target.value})} required/><input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/><input placeholder="Matriz/matéria" value={f.matrix} onChange={e=>setF({...f,matrix:e.target.value})}/><select value={f.weight} onChange={e=>setF({...f,weight:e.target.value})}><option>Baixa</option><option>Média</option><option>Alta</option></select><input placeholder="Nota" value={f.grade} onChange={e=>setF({...f,grade:e.target.value})}/><button className="primary"><Plus size={16}/>Adicionar</button></Form><List items={data.evaluations} render={a=><><h3>{a.title}</h3><p>{subjectMap[a.subjectId]?.name} • {a.type} • {fmtDate(a.date)}</p><p>{a.matrix}</p><span className="pill red">{a.weight}</span><button className="danger" onClick={()=>del('evaluations',a.id)}><Trash2 size={15}/>Remover</button></>}/></>
}
function SelectSubject({data,val,set}){return <select value={val} onChange={e=>set(e.target.value)}>{data.subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>}

function Documents({data,add,del,subjectMap}){
 if(!data.subjects.length){
  return <Card><h3>Documentos</h3><p>Ainda não existem disciplinas. Cria uma disciplina para começares a guardar PDFs, matrizes, exames, resumos ou folhas Excel.</p></Card>
 }
 const [f,setF]=useState({subjectId:data.subjects[0]?.id||'',type:'PDF',name:'',link:'',fileName:'',createdAt:''});
 const submit=e=>{e.preventDefault();add('documents',{...f,createdAt:new Date().toISOString()});setF({...f,name:'',link:'',fileName:''})};
 return <><Form title="Adicionar documento/PDF" onSubmit={submit}><SelectSubject data={data} val={f.subjectId} set={v=>setF({...f,subjectId:v})}/><select value={f.type} onChange={e=>setF({...f,type:e.target.value})}><option>PDF</option><option>Matriz</option><option>Exercícios Resolvidos</option><option>Exame</option><option>Resumo</option><option>Excel</option></select><input placeholder="Nome" value={f.name} onChange={e=>setF({...f,name:e.target.value})} required/><input placeholder="Link Google Drive ou ficheiro" value={f.link} onChange={e=>setF({...f,link:e.target.value})}/><button className="primary"><Plus size={16}/>Adicionar</button></Form><List items={data.documents} render={d=><><h3><FileText size={18}/>{d.name}</h3><p>{subjectMap[d.subjectId]?.name} • {d.type}</p>{d.link && <a href={d.link} target="_blank">Abrir documento</a>}<button className="danger" onClick={()=>del('documents',d.id)}><Trash2 size={15}/>Remover</button></>}/></>
}
function Exercises({data,add,del,updItem,subjectMap}){
 if(!data.subjects.length){
  return <Card><h3>Exercícios</h3><p>Ainda não existem disciplinas. Cria uma disciplina para poderes adicionar exercícios e acompanhar o estado: pendente, resolvido, rever ou não percebi.</p></Card>
 }
 const [f,setF]=useState({subjectId:data.subjects[0]?.id||'',documentId:'',title:'',status:'Pendente',minutes:45,notes:''});
 const docs=data.documents.filter(d=>!f.subjectId||d.subjectId===f.subjectId);
 return <><Form title="Adicionar exercício" onSubmit={e=>{e.preventDefault();add('exercises',f);setF({...f,title:'',notes:''})}}><SelectSubject data={data} val={f.subjectId} set={v=>setF({...f,subjectId:v,documentId:''})}/><select value={f.documentId} onChange={e=>setF({...f,documentId:e.target.value})}><option value="">Sem documento</option>{docs.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><input placeholder="Exercício / Questão" value={f.title} onChange={e=>setF({...f,title:e.target.value})} required/><StatusSelect val={f.status} set={v=>setF({...f,status:v})}/><input type="number" value={f.minutes} onChange={e=>setF({...f,minutes:+e.target.value})}/><input placeholder="Notas" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/><button className="primary"><Plus size={16}/>Adicionar</button></Form><List items={data.exercises} render={ex=><><h3>{ex.title}</h3><p>{subjectMap[ex.subjectId]?.name} • {ex.minutes} min</p><StatusSelect val={ex.status} set={v=>updItem('exercises',ex.id,{status:v})}/><p>{ex.notes}</p><button className="danger" onClick={()=>del('exercises',ex.id)}><Trash2 size={15}/>Remover</button></>}/></>
}
function StatusSelect({val,set}){return <select className="status" value={val} onChange={e=>set(e.target.value)}><option>Pendente</option><option>Resolvido</option><option>Rever</option><option>Não percebi</option></select>}
function List({items,render}){return <div className="list">{items.length?items.map(i=><div className="item" key={i.id}>{render(i)}</div>):<Card><p>Sem registos.</p></Card>}</div>}

function Plan({plan}){if(!plan.length)return <Card><h3>Plano de Estudo</h3><p>Sem plano gerado. Cria disciplinas, avaliações ou exercícios para a app sugerir sessões de estudo.</p></Card>;return <div className="list">{plan.map(p=><div className="item plan" key={p.id}><h3>{p.subject}</h3><p>{p.day} • {p.minutes} min</p><p>{p.task}</p><span className="pill">{p.reason}</span></div>)}</div>}
function CalendarView({data,plan,subjectMap}){return <div className="grid"><Card><h3>Avaliações</h3>{data.evaluations.map(e=><div className="mini" key={e.id}><CalendarDays size={16}/>{fmtDate(e.date)} — {e.title}</div>)}</Card><Card><h3>Sessões sugeridas</h3>{plan.map(p=><div className="mini" key={p.id}><Clock size={16}/>{p.day} — {p.subject} — {p.minutes} min</div>)}</Card></div>}
function Stats({stats,data,subjectMap}){if(!data.subjects.length)return <Card><h3>Estatísticas</h3><p>Ainda não há dados. As estatísticas aparecem depois de criares disciplinas e exercícios.</p></Card>;return <div className="grid">{Object.entries(stats.bySubject).map(([sid,s])=><Card key={sid}><h3>{subjectMap[sid]?.name}</h3><div className="percent small">{s.percent}%</div><p>Resolvidos: {s.done} / {s.total}</p><p>Rever: {s.review} • Não percebi: {s.bad}</p></Card>)}</div>}
function SettingsPage({data,update}){return <div className="grid"><Card><h3>Perfil local</h3><input value={data.profile.name} onChange={e=>update({profile:{...data.profile,name:e.target.value}})}/><input placeholder="Email Google futuro" value={data.profile.email} onChange={e=>update({profile:{...data.profile,email:e.target.value}})}/><span className="pill">{data.profile.mode}</span></Card><Card><h3>Google — preparado</h3><p>Na próxima fase: Login Google, Drive, Sheets e Calendar.</p><div className="toggles"><span>Drive</span><span>Sheets</span><span>Calendar</span></div></Card><Card><h3>Disclaimer</h3><p>{disclaimerText}</p></Card></div>}

function calcStats(data){
 const bySubject={};
 for(const s of data.subjects) bySubject[s.id]={total:0,done:0,review:0,bad:0,percent:0};
 for(const e of data.exercises){ const st=bySubject[e.subjectId]||{total:0,done:0,review:0,bad:0}; st.total++; if(e.status==='Resolvido')st.done++; if(e.status==='Rever')st.review++; if(e.status==='Não percebi')st.bad++; bySubject[e.subjectId]=st; }
 let total=0, score=0;
 for(const st of Object.values(bySubject)){ st.percent=st.total?Math.round(((st.done + st.review*0.35)/st.total)*100):0; total+=st.total; score+=st.done + st.review*0.35; }
 return {global: total?Math.round(score/total*100):0, bySubject};
}
function generatePlan(data){
 const tasks=[]; const days=['Hoje','Amanhã','Depois de amanhã','Próxima sessão'];
 for(const ev of data.evaluations){
  const subj=data.subjects.find(s=>s.id===ev.subjectId); if(!subj) continue;
  const left=daysUntil(ev.date) ?? 7; const urgent=left<=7;
  const exs=data.exercises.filter(e=>e.subjectId===subj.id && e.status!=='Resolvido').slice(0,4);
  const topics=(ev.matrix||'Revisão geral').split(';').map(x=>x.trim()).filter(Boolean);
  let i=0;
  for(const ex of exs){tasks.push({id:ev.id+ex.id,subject:subj.name,day:days[i%days.length],minutes:ex.minutes||45,task:ex.title,reason:urgent?'Avaliação próxima':'Plano de consolidação'});i++}
  for(const t of topics.slice(0,3)){tasks.push({id:ev.id+t,subject:subj.name,day:days[i%days.length],minutes:urgent?45:30,task:'Rever matéria: '+t,reason:`Teste em ${left} dias`});i++}
 }
 if(!tasks.length){ for(const s of data.subjects){tasks.push({id:s.id,subject:s.name,day:'Esta semana',minutes:Math.round((s.weeklyHours||1)*60),task:'Revisão geral e organização dos documentos',reason:'Horas base semanais'});} }
 return tasks.slice(0,12);
}

createRoot(document.getElementById('root')).render(<App/>);
