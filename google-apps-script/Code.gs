
/****************************************************
 * RJP Study Backend
 * Google Sheets + Google Drive + Google Calendar
 ****************************************************/

const APP_NAME = "RJP Study";
const DRIVE_ROOT_FOLDER = "RJP_Study";
const DEFAULT_CATEGORIES = ["Exames", "Apontamentos", "Aulas", "Fichas", "Resumos", "Trabalhos", "Testes", "Imagens", "Vídeos", "Outros"];

const SHEET_DISCIPLINAS = "Disciplinas";
const SHEET_DOCUMENTOS = "Documentos";
const SHEET_EXERCICIOS = "Exercicios";
const SHEET_EVENTOS = "Eventos";
const SHEET_EXAMES = "Exames";

function doGet(e) {
  try {
    const p = e && e.parameter ? e.parameter : {};
    const action = p.action || "status";
    let result;
    if (action === "setup") result = setupObject();
    else if (action === "getAll") result = getAllObject();
    else if (action === "listDriveStructure") result = listDriveStructureObject();
    else if (action === "seedExamesIPL") result = seedExamesIPLObject();
    else if (action === "exportExamesToCalendar") result = exportExamesToCalendarObject();
    else result = { ok: true, app: APP_NAME, message: APP_NAME + " Backend OK" };
    return outputWithCallback(result, p.callback);
  } catch (err) {
    return outputWithCallback({ ok: false, error: err.message }, e && e.parameter && e.parameter.callback);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const action = body.action;
    let result;
    if (action === "setup") result = setupObject();
    else if (action === "syncAll") result = syncAllObject(body.data || {});
    else if (action === "uploadMultipleFiles") result = uploadMultipleFilesObject(body.data || {});
    else if (action === "addDisciplina") result = addDisciplinaObject(body.data || {});
    else if (action === "addDocumento") result = addDocumentoObject(body.data || {});
    else if (action === "addExercicio") result = addExercicioObject(body.data || {});
    else if (action === "addEvento") result = addEventoObject(body.data || {});
    else result = { ok: false, error: "Ação desconhecida: " + action };
    return output(result);
  } catch (err) { return output({ ok: false, error: err.message }); }
}

function output(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function outputWithCallback(obj, callback) {
  if (callback) return ContentService.createTextOutput(String(callback) + "(" + JSON.stringify(obj) + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
  return output(obj);
}

function setup() { return output(setupObject()); }
function setupObject() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  createSheetIfMissing(ss, SHEET_DISCIPLINAS, ["id","perfil","nome","ano","curso","cor","dificuldade","horasSemana","professor","notas","driveFolderId","driveFolderUrl","createdAt"]);
  createSheetIfMissing(ss, SHEET_DOCUMENTOS, ["id","perfil","disciplinaId","disciplinaNome","nome","tipo","categoria","link","fileId","fileUrl","mimeType","tamanho","notas","createdAt"]);
  createSheetIfMissing(ss, SHEET_EXERCICIOS, ["id","perfil","disciplinaId","documentoId","titulo","estado","notas","createdAt","updatedAt"]);
  createSheetIfMissing(ss, SHEET_EVENTOS, ["id","perfil","disciplinaId","titulo","tipo","data","materia","createdAt"]);
  createSheetIfMissing(ss, SHEET_EXAMES, ["id","perfil","disciplina","epoca","data","hora","titulo","origem","calendarEventId","createdAt"]);
  const root = getOrCreateRootFolder();
  DEFAULT_CATEGORIES.forEach(c => getOrCreateSubfolder(root, c));
  return { ok: true, message: "Setup concluído", root: { id: root.getId(), name: root.getName(), url: root.getUrl() } };
}

function createSheetIfMissing(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
}

function getAll() { return output(getAllObject()); }
function getAllObject() {
  return { ok: true, data: { disciplinas: readSheet(SHEET_DISCIPLINAS), documentos: readSheet(SHEET_DOCUMENTOS), exercicios: readSheet(SHEET_EXERCICIOS), eventos: readSheet(SHEET_EVENTOS), exames: readSheet(SHEET_EXAMES) } };
}
function readSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values.map(row => { const obj = {}; headers.forEach((h,i) => obj[h] = row[i]); return obj; });
}

function syncAllObject(data) {
  setupObject();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  replaceRows(ss.getSheetByName(SHEET_DISCIPLINAS), ["id","perfil","nome","ano","curso","cor","dificuldade","horasSemana","professor","notas","driveFolderId","driveFolderUrl","createdAt"], (data.subjects || []).map(s => [s.id || makeId(), data.perfil || "", s.name || s.nome || "", s.year || "", s.course || "", s.color || "#0f2742", s.difficulty || "", s.weeklyHours || "", s.teacher || "", s.notes || "", s.driveFolderId || "", s.driveFolderUrl || "", new Date()]));
  replaceRows(ss.getSheetByName(SHEET_DOCUMENTOS), ["id","perfil","disciplinaId","disciplinaNome","nome","tipo","categoria","link","fileId","fileUrl","mimeType","tamanho","notas","createdAt"], (data.documents || []).map(d => [d.id || makeId(), data.perfil || "", d.subjectId || d.disciplinaId || "", d.disciplinaNome || "", d.name || d.nome || "", d.type || d.tipo || "", d.category || d.categoria || "", d.link || "", d.fileId || "", d.fileUrl || d.link || "", d.mimeType || "", d.size || d.tamanho || "", d.notes || "", new Date()]));
  replaceRows(ss.getSheetByName(SHEET_EXERCICIOS), ["id","perfil","disciplinaId","documentoId","titulo","estado","notas","createdAt","updatedAt"], (data.exercises || []).map(x => [x.id || makeId(), data.perfil || "", x.subjectId || "", x.documentId || "", x.title || "", x.status || "Por fazer", x.notes || "", new Date(), new Date()]));
  replaceRows(ss.getSheetByName(SHEET_EVENTOS), ["id","perfil","disciplinaId","titulo","tipo","data","materia","createdAt"], (data.events || []).map(x => [x.id || makeId(), data.perfil || "", x.subjectId || "", x.title || "", x.type || "", x.date || "", x.topics || "", new Date()]));
  return { ok: true, message: "Cloud sincronizada" };
}
function replaceRows(sheet, headers, rows) { sheet.clear(); sheet.appendRow(headers); if (rows.length) sheet.getRange(2,1,rows.length,headers.length).setValues(rows); }

function getOrCreateRootFolder() {
  const folders = DriveApp.getFoldersByName(DRIVE_ROOT_FOLDER);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(DRIVE_ROOT_FOLDER);
}
function getOrCreateSubfolder(parent, name) { const existing = parent.getFoldersByName(name); if (existing.hasNext()) return existing.next(); return parent.createFolder(name); }
function createSubjectFolderRaw(name) {
  const root = getOrCreateRootFolder();
  const cleanName = String(name || "Sem Disciplina").trim();
  const folder = getOrCreateSubfolder(root, cleanName);
  DEFAULT_CATEGORIES.forEach(c => getOrCreateSubfolder(folder, c));
  return { id: folder.getId(), name: folder.getName(), url: folder.getUrl() };
}

function listDriveStructure() { return output(listDriveStructureObject()); }
function listDriveStructureObject() {
  const root = getOrCreateRootFolder();
  const subjects = [];
  const folders = root.getFolders();
  while (folders.hasNext()) {
    const subjectFolder = folders.next();
    if (DEFAULT_CATEGORIES.indexOf(subjectFolder.getName()) >= 0) continue;
    const subject = { id: subjectFolder.getId(), name: subjectFolder.getName(), url: subjectFolder.getUrl(), categories: [] };
    const categories = subjectFolder.getFolders();
    while (categories.hasNext()) {
      const catFolder = categories.next();
      const cat = { id: catFolder.getId(), name: catFolder.getName(), url: catFolder.getUrl(), files: [] };
      const files = catFolder.getFiles();
      while (files.hasNext()) {
        const file = files.next();
        cat.files.push({ id: file.getId(), name: file.getName(), url: file.getUrl(), mimeType: file.getMimeType(), size: file.getSize(), updated: file.getLastUpdated() });
      }
      subject.categories.push(cat);
    }
    subjects.push(subject);
  }
  return { ok: true, data: { root: { id: root.getId(), name: root.getName(), url: root.getUrl() }, subjects } };
}

function uploadMultipleFilesObject(data) {
  setupObject();
  if (!data || !Array.isArray(data.files)) return { ok: false, error: "Lista de ficheiros inválida" };
  const filesSaved = [];
  const docs = [];
  data.files.forEach(f => {
    const merged = { ...f, disciplinaNome: data.disciplinaNome || "Sem Disciplina", categoria: data.categoria || inferCategory(f.fileName, f.mimeType) };
    const saved = saveFileToDrive(merged);
    filesSaved.push(saved);
    docs.push({ perfil: data.perfil || "", disciplinaId: data.disciplinaId || "", disciplinaNome: data.disciplinaNome || "", nome: saved.name, tipo: inferDocType(saved.name, saved.mimeType), categoria: saved.categoria, link: saved.url, fileId: saved.id, fileUrl: saved.url, mimeType: saved.mimeType, tamanho: saved.size, notas: data.notas || "" });
  });
  saveDocumentsRows(docs);
  return { ok: true, count: filesSaved.length, files: filesSaved };
}
function saveFileToDrive(data) {
  const fileName = data.fileName || "documento";
  const mimeType = data.mimeType || getMimeFromDataUrl(data.fileData);
  const categoria = data.categoria || inferCategory(fileName, mimeType);
  const subject = createSubjectFolderRaw(data.disciplinaNome || "Sem Disciplina");
  const subjectFolder = DriveApp.getFolderById(subject.id);
  const targetFolder = getOrCreateSubfolder(subjectFolder, categoria);
  const base64 = String(data.fileData || "").split(",")[1];
  if (!base64) throw new Error("Ficheiro sem conteúdo base64: " + fileName);
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, fileName);
  const file = targetFolder.createFile(blob);
  return { id: file.getId(), name: file.getName(), url: file.getUrl(), mimeType, size: file.getSize(), categoria };
}
function saveDocumentsRows(lista) { const ss = SpreadsheetApp.getActiveSpreadsheet(); const sheet = ss.getSheetByName(SHEET_DOCUMENTOS); lista.forEach(d => sheet.appendRow([makeId(), d.perfil || "", d.disciplinaId || "", d.disciplinaNome || "", d.nome || "", d.tipo || "", d.categoria || "", d.link || "", d.fileId || "", d.fileUrl || "", d.mimeType || "", d.tamanho || "", d.notas || "", new Date()])); }

function addDisciplinaObject(data) { const folder = createSubjectFolderRaw(data.nome || data.name || "Disciplina"); return { ok: true, folder }; }
function addDocumentoObject(data) { saveDocumentsRows([data]); return { ok: true }; }
function addExercicioObject(data) { return { ok: true }; }
function addEventoObject(data) { return { ok: true }; }

function seedExamesIPL() { return output(seedExamesIPLObject()); }
function seedExamesIPLObject() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_EXAMES) || ss.insertSheet(SHEET_EXAMES);
  if (sheet.getLastRow() === 0) sheet.appendRow(["id","perfil","disciplina","epoca","data","hora","titulo","origem","calendarEventId","createdAt"]);
  const exames = [["AE","Normal","2026-06-12","14:30"],["AE","Recurso","2026-07-15","09:30"],["AE","Especial","2026-07-23","09:30"],["MSF II","Normal","2026-06-16","14:30"],["MSF II","Recurso","2026-07-06","14:30"],["MSF II","Especial","2026-07-20","14:30"],["RM II","Normal","2026-06-25","14:30"],["RM II","Recurso","2026-07-17","14:30"],["RM II","Especial","2026-07-23","14:30"]];
  exames.forEach(e => sheet.appendRow([makeId(), "", e[0], e[1], e[2], e[3], `${e[0]} — ${e[1]}`, "Calendário escolar", "", new Date()]));
  return { ok: true, message: "Exames carregados" };
}
function exportExamesToCalendar() { return output(exportExamesToCalendarObject()); }
function exportExamesToCalendarObject() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_EXAMES);
  if (!sheet || sheet.getLastRow() < 2) return { ok:false, error:"Não existem exames" };
  const calendar = CalendarApp.getDefaultCalendar();
  const values = sheet.getDataRange().getValues(); const h = values[0];
  const cDisc = h.indexOf("disciplina"), cEp = h.indexOf("epoca"), cData = h.indexOf("data"), cHora = h.indexOf("hora"), cTit = h.indexOf("titulo"), cCal = h.indexOf("calendarEventId");
  let criados = 0;
  for (let i=1;i<values.length;i++) { const row = values[i]; if (row[cCal]) continue; const start = buildDateTime(row[cData], row[cHora]); if (!start) continue; const end = new Date(start.getTime()+2*60*60*1000); const titulo = row[cTit] || `${row[cDisc]} — ${row[cEp]}`; const ev = calendar.createEvent(`${APP_NAME} — ${titulo}`, start, end, { description:`Disciplina: ${row[cDisc]}\nÉpoca: ${row[cEp]}\nOrigem: ${APP_NAME}` }); ev.addPopupReminder(7*24*60); ev.addPopupReminder(24*60); ev.addPopupReminder(2*60); sheet.getRange(i+1, cCal+1).setValue(ev.getId()); criados++; }
  return { ok:true, message:`${criados} eventos exportados` };
}
function buildDateTime(data, hora) { if (!data || !hora) return null; const d=String(data).slice(0,10).split("-"); const h=String(hora).slice(0,5).split(":"); return new Date(Number(d[0]), Number(d[1])-1, Number(d[2]), Number(h[0]), Number(h[1])); }
function inferDocType(name, mime) { name=String(name||"").toLowerCase(); mime=String(mime||"").toLowerCase(); if (mime.includes("pdf") || name.endsWith(".pdf")) return "PDF"; if (/\.(xlsx|xls)$/.test(name)) return "Excel"; if (/\.(doc|docx)$/.test(name)) return "Word"; if (mime.includes("image")) return "Imagem"; return "Documento"; }
function inferCategory(name, mime) { name=String(name||"").toLowerCase(); mime=String(mime||"").toLowerCase(); if (name.includes("exame")) return "Exames"; if (name.includes("apont")) return "Apontamentos"; if (name.includes("aula")) return "Aulas"; if (name.includes("ficha")) return "Fichas"; if (name.includes("resumo")) return "Resumos"; if (mime.includes("image")) return "Imagens"; return "Outros"; }
function getMimeFromDataUrl(dataUrl) { const m = String(dataUrl).match(/^data:(.*?);base64,/); return m && m[1] ? m[1] : "application/octet-stream"; }
function makeId() { return Utilities.getUuid(); }
