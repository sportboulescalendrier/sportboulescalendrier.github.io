/* Fonctions partagées entre la page publique et la page d'administration */
const CATS = {
  pmo:         { label: "Promotion",     color: "#1f5fa8" },
  loisir:      { label: "Loisir",        color: "#2a8a5f" },
  m3:          { label: "M3",            color: "#c99a00" },
  feminin:     { label: "Féminines",     color: "#d6479a" },
  championnat: { label: "Championnats",  color: "#e0702e" },
  national:    { label: "National",      color: "#5b4b9a" },
};
const STATUTS = ["", "A confirmer", "A vérifier", "Annulé"];
const DEPTS = ["75","77","78","91","92","93","94","95"];
const FORMULES = {
  "Doub": "Doublettes", "Trip": "Triples", "Quad": "Quadrettes", "Simp": "Simples",
  "Doub Mixte": "Doublettes mixtes", "Trip Mixte": "Triples mixtes", "Doub Fem.": "Doublettes féminines",
};
const TYPES = { "Pmo": "Promotion", "Loisir": "Loisir" };
const MOIS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const JOURS = ["lun","mar","mer","jeu","ven","sam","dim"];

const pad = n => String(n).padStart(2, "0");
const dkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseD = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const catOf = c => CATS[c.cat] || CATS.pmo;

function titre(c) { return c.nom || c.club || "Concours"; }
function lieu(c) {
  const parts = [];
  if (c.nom && c.club) parts.push(c.club);
  if (c.dept) parts.push(`(${c.dept})`);
  return parts.join(" ");
}
function format(c) {
  const f = [];
  if (c.nb || c.formule) f.push([c.nb, FORMULES[c.formule] || c.formule].filter(Boolean).join(" "));
  if (c.division) f.push(c.division === "TD" ? "Toutes divisions" : c.division);
  return f.join(" · ");
}
function joursDe(c) {
  const out = [c.date];
  if (c.fin && c.fin > c.date) {
    const d = parseD(c.date), end = parseD(c.fin);
    while (true) { d.setDate(d.getDate() + 1); if (d > end) break; out.push(dkey(d)); }
  }
  return out;
}
function dateLongue(s) {
  return parseD(s).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function dateTexte(c) {
  if (c.fin && c.fin > c.date) {
    const a = parseD(c.date), b = parseD(c.fin);
    return `du ${a.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} au ${dateLongue(c.fin)}`;
  }
  return dateLongue(c.date);
}
function trier(list) {
  return list.slice().sort((a, b) => a.date.localeCompare(b.date) || titre(a).localeCompare(titre(b)));
}

/* ---------- Connexion Supabase ---------- */
const COLS = ["date","fin","nom","cat","dept","club","type","nb","formule","division","systeme","challenge","heure","tel","adresse","info","statut"];
function supabaseConfigured(){
  return typeof SUPABASE_URL === "string" && /^https:\/\//.test(SUPABASE_URL) && !SUPABASE_URL.includes("VOTRE-PROJET")
      && typeof SUPABASE_KEY === "string" && SUPABASE_KEY && !SUPABASE_KEY.includes("VOTRE-CLE");
}
let _sb = null;
function sbClient(){
  if (!_sb && supabaseConfigured() && window.supabase) _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return _sb;
}
function normalize(row){
  const o = { id: row.id, updated_at: row.updated_at || "", updated_by: row.updated_by || "" };
  COLS.forEach(k => o[k] = row[k] == null ? "" : String(row[k]));
  if (!o.cat) o.cat = "pmo";
  return o;
}
function toDb(v){
  const o = {};
  COLS.forEach(k => { const x = (v[k] ?? "").toString().trim(); o[k] = (k === "fin" && !x) ? null : x; });
  if (!o.cat) o.cat = "pmo";
  return o;
}
async function fetchConcours(){
  const sb = sbClient();
  if (!sb) throw new Error("Supabase non configuré");
  const { data, error } = await sb.from("concours").select("*").order("date").limit(5000);
  if (error) throw error;
  return data.map(normalize);
}
