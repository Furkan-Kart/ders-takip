'use strict';
/* Ders Takip — arayüz. Tüm veri yalnızca bu cihazda (localStorage) tutulur.
   Program ve tekrar mantığı algoritma.js içindedir (Algo). */

const ANAHTAR = 'dersTakip.v1';
const RENKLER = ['#0d9488', '#2563eb', '#9333ea', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#64748b'];
const GUN_KISA = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const PUAN_AD = { zor: 'Zorlandım', orta: 'Orta', kolay: 'Kolaydı' };

/* ---------- yardımcılar ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const bugun = () => iso(new Date());
const tarih = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const gunEkle = (s, n) => { const d = tarih(s); d.setDate(d.getDate() + n); return iso(d); };
const gunFark = (a, b) => Math.round((tarih(b) - tarih(a)) / 864e5); // b - a
const haftaGunu = s => (tarih(s).getDay() + 6) % 7; // 0 = Pazartesi
const haftaBasi = s => gunEkle(s, -haftaGunu(s));
const tarihYaz = (s, bicim) => tarih(s).toLocaleDateString('tr-TR',
  bicim === 'uzun' ? { day: 'numeric', month: 'long', weekday: 'long' } :
  bicim === 'gun' ? { day: 'numeric', month: 'short' } :
  { day: 'numeric', month: 'short', weekday: 'short' });
const sureYaz = dk => {
  dk = Math.round(dk);
  if (dk < 60) return `${dk} dk`;
  const s = Math.floor(dk / 60), k = dk % 60;
  return k ? `${s} sa ${k} dk` : `${s} sa`;
};
const sayi = (v, vars, min, max) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : vars;
};
function toast(m) {
  const t = $('#toast'); t.textContent = m; t.classList.add('goster');
  clearTimeout(toast.z); toast.z = setTimeout(() => t.classList.remove('goster'), 2800);
}
const IK = {
  oynat: '<path d="M8 5.5v13l11-6.5z"/>',
  tik: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  arti: '<path d="M12 5v14M5 12h14"/>',
  uc: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  geri: '<path d="M15 5l-7 7 7 7"/>',
  ileri: '<path d="M9 5l7 7-7 7"/>',
  carpi: '<path d="M6 6l12 12M18 6L6 18"/>',
  alev: '<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-2 1-4 2-5 0 2 1 3 2 3 0-4 0-7 2-10z"/>',
  ampul: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  unlem: '<path d="M12 7v6M12 17h.01"/><circle cx="12" cy="12" r="9"/>',
  takvim: '<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/>',
  saat: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  hedef: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/>',
  kitap: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11"/>',
  yenile: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  gunes: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
  indir: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  telefon: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
  yukari: '<path d="M6 15l6-6 6 6"/>',
  asagi: '<path d="M6 9l6 6 6-6"/>',
  not: '<path d="M6 4h9l4 4v12H6zM14 4v5h5M9 13h6M9 17h4"/>',
  bag: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  yuzZor: '<circle cx="12" cy="12" r="9"/><path d="M8.5 16c1-1.6 6-1.6 7 0M9 10h.01M15 10h.01"/>',
  yuzOrta: '<circle cx="12" cy="12" r="9"/><path d="M8.5 15.5h7M9 10h.01M15 10h.01"/>',
  yuzKolay: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5c1 2 6 2 7 0M9 10h.01M15 10h.01"/>'
};
const ik = (ad, dolgu) => `<svg class="ik${dolgu ? ' dolgu' : ''}" viewBox="0 0 24 24" aria-hidden="true">${IK[ad]}</svg>`;
let halkaNo = 0;
function halka(oran, boy, kalinlik, renk, ic = '', id = '', renk2 = '') {
  const r = (boy - kalinlik) / 2, c = 2 * Math.PI * r, o = Math.min(1, Math.max(0, oran || 0)), son = c * (1 - o), g = 'hg' + (++halkaNo);
  return `<div class="halka" style="width:${boy}px;height:${boy}px"><svg viewBox="0 0 ${boy} ${boy}">
    ${renk2 ? `<defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:${renk2}"/><stop offset="1" style="stop-color:${renk}"/></linearGradient></defs>` : ''}
    <circle class="iz" cx="${boy / 2}" cy="${boy / 2}" r="${r}" stroke-width="${kalinlik}"/>
    <circle class="dolu" ${id ? `id="${id}" data-c="${c}"` : ''} data-h="${son}" cx="${boy / 2}" cy="${boy / 2}" r="${r}" stroke-width="${kalinlik}"
      stroke="${renk2 ? `url(#${g})` : renk}" stroke-dasharray="${c}" stroke-dashoffset="${UI.anim ? c : son}" transform="rotate(-90 ${boy / 2} ${boy / 2})"/></svg>
    <div class="ic">${ic}</div></div>`;
}

// Sayıların sıfırdan hedefe doğru sayarak belirmesi (yalnızca ekran geçişlerinde).
const bicimle = (n, b) => b === 'sure' ? sureYaz(n) : b === 'yuzde' ? '%' + Math.round(n) : String(Math.round(n));
const say = (n, b) => `<span data-n="${n}" data-b="${b}">${bicimle(UI.anim ? 0 : n, b)}</span>`;
const azHareket = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function saydir() {
  const liste = [...document.querySelectorAll('span[data-b]')];
  if (azHareket()) { for (const e of liste) e.textContent = bicimle(+e.dataset.n, e.dataset.b); return; }
  const t0 = performance.now(), sure = 850;
  const adim = an => {
    const p = Math.min(1, Math.max(0, (an - t0) / sure)), y = 1 - Math.pow(1 - p, 3);
    for (const e of liste) e.textContent = bicimle(+e.dataset.n * y, e.dataset.b);
    if (p < 1) requestAnimationFrame(adim);
  };
  requestAnimationFrame(adim);
}
const titre = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch {} };
// Küçük konfeti patlaması: iş tamamlanınca ve günün programı bitince.
function kutla(x, y, adet) {
  if (azHareket()) return;
  const k = document.createElement('div'); k.className = 'konfeti'; k.style.left = x + 'px'; k.style.top = y + 'px';
  const renk = ['#2dd4bf', '#818cf8', '#fbbf24', '#f472b6', '#34d399', '#60a5fa'];
  for (let i = 0; i < adet; i++) {
    const p = document.createElement('i'), aci = Math.random() * Math.PI * 2, hiz = 40 + Math.random() * (adet > 30 ? 190 : 80);
    p.style.cssText = `--dx:${Math.cos(aci) * hiz}px;--dy:${Math.sin(aci) * hiz - 30}px;--d:${Math.random() * 540 - 270}deg;background:${renk[i % renk.length]};animation-delay:${Math.random() * 90}ms`;
    if (i % 3 === 0) p.style.borderRadius = '50%';
    k.append(p);
  }
  document.body.append(k); setTimeout(() => k.remove(), 1500);
}

/* ---------- veri ---------- */
function varsayilan() {
  const kid = uid();
  return {
    v: 1,
    komiteler: [{ id: kid, ad: '2. Komite' }],
    aktifKomite: kid,
    dersler: [], konular: [], sinavlar: [], oturumlar: [], sorular: [],
    ayar: { gunluk: [120, 120, 120, 120, 120, 180, 180], araliklar: [1, 7, 30], tekrarGunu: 1, tema: '', pomo: { c: 25, m: 5 } },
    sayac: null
  };
}
function duzelt(s) {
  const v = varsayilan();
  if (!s || typeof s !== 'object' || !Array.isArray(s.komiteler)) return v;
  for (const k of ['dersler', 'konular', 'sinavlar', 'oturumlar', 'sorular']) if (!Array.isArray(s[k])) s[k] = [];
  for (const k of s.konular) if (!Array.isArray(k.tekrarlar)) k.tekrarlar = [];
  s.ayar = Object.assign(v.ayar, s.ayar || {});
  if (!Array.isArray(s.ayar.gunluk) || s.ayar.gunluk.length !== 7) s.ayar.gunluk = [120, 120, 120, 120, 120, 180, 180];
  if (!Array.isArray(s.ayar.araliklar) || !s.ayar.araliklar.length) s.ayar.araliklar = [1, 7, 30];
  const pm = s.ayar.pomo || {};
  s.ayar.pomo = { c: sayi(pm.c, 25, 5, 120), m: sayi(pm.m, 5, 1, 60) };
  if (!s.komiteler.length) s.komiteler = v.komiteler;
  if (!s.komiteler.some(k => k.id === s.aktifKomite)) s.aktifKomite = s.komiteler[0].id;
  if (s.sayac === undefined) s.sayac = null;
  s.v = 1;
  return s;
}
function yukle() {
  try { return duzelt(JSON.parse(localStorage.getItem(ANAHTAR))); } catch { return varsayilan(); }
}
let S = yukle();
function kaydet() {
  try { localStorage.setItem(ANAHTAR, JSON.stringify(S)); }
  catch { toast('Kaydedilemedi: cihazda depolama alanı dolu olabilir.'); }
}
const UI = { anim: true, sekme: 'bugun', dersId: null, hafta: 0, sDers: '', sKonu: '', sHedef: 0, gun: 1, filtre: 'tum' };

const dersBul = id => S.dersler.find(d => d.id === id);
const konuBul = id => S.konular.find(k => k.id === id);
const aktifKomite = () => S.komiteler.find(k => k.id === S.aktifKomite);
const aktifDersler = () => S.dersler.filter(d => d.komiteId === S.aktifKomite);
const dersKonulari = id => S.konular.filter(k => k.dersId === id);
function temaUygula() {
  const k = document.documentElement;
  if (S.ayar.tema) k.dataset.tema = S.ayar.tema; else delete k.dataset.tema;
  const koyu = S.ayar.tema ? S.ayar.tema === 'koyu' : matchMedia('(prefers-color-scheme: dark)').matches;
  $('meta[name=theme-color]').content = koyu ? '#080c11' : '#f5f4f0';
}

/* ---------- soru kayıtları ---------- */
function soruOzet(f) {
  let d = 0, y = 0, b = 0;
  for (const q of S.sorular) if (f(q)) { d += q.dogru; y += q.yanlis; b += q.bos || 0; }
  const top = d + y + b;
  return { d, y, b, top, oran: top ? Math.round(d / top * 100) : null };
}
const netYaz = (d, y) => (d - y / 4).toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
const dybCubuk = o => `<div class="dyb" role="img" aria-label="${o.d} doğru, ${o.y} yanlış, ${o.b} boş">
  <i style="flex:${o.d}"></i><i class="y" style="flex:${o.y}"></i><i class="b" style="flex:${o.b}"></i></div>`;
const guvenliUrl = u => /^https?:\/\/\S+$/i.test(u || '') ? u : '';
// Yapıştırılan listelerdeki madde işaretlerini ve numaraları temizler.
const satirTemiz = x => x.replace(/^\s*(?:[-•*·–]+|\d+\s*[.)-])\s*/, '').trim();
function indir(metin, ad, tur) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([metin], { type: tur }));
  a.download = ad;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
// Takvim dosyası (.ics): tüm gün süren etkinlikler. Aynı etkinlik yeniden aktarılırsa takvimde güncellenir.
function icsIndir(olaylar, ad) {
  const kacis = x => String(x).replace(/([\\;,])/g, '\\$1').replace(/\n/g, '\\n');
  const kat = x => x.match(/.{1,36}/gu).join('\r\n ');
  const gun = x => x.replace(/-/g, '');
  const dmg = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const st = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ders Takip//TR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const o of olaylar) {
    st.push('BEGIN:VEVENT', `UID:${o.uid}@ders-takip`, `DTSTAMP:${dmg}`, `DTSTART;VALUE=DATE:${gun(o.tarih)}`,
      `DTEND;VALUE=DATE:${gun(gunEkle(o.tarih, 1))}`, kat(`SUMMARY:${kacis(o.baslik)}`));
    if (o.aciklama) st.push(kat(`DESCRIPTION:${kacis(o.aciklama)}`));
    if (o.alarm) st.push('BEGIN:VALARM', 'ACTION:DISPLAY', kat(`DESCRIPTION:${kacis(o.baslik)}`), 'TRIGGER:-PT15H', 'END:VALARM');
    st.push('END:VEVENT');
  }
  st.push('END:VCALENDAR');
  indir(st.join('\r\n') + '\r\n', ad, 'text/calendar;charset=utf-8');
}
function bip() {
  try {
    const C = new (window.AudioContext || window.webkitAudioContext)(), o = C.createOscillator(), g = C.createGain();
    o.frequency.value = 880; g.gain.setValueAtTime(.15, C.currentTime); g.gain.exponentialRampToValueAtTime(.001, C.currentTime + .6);
    o.connect(g); g.connect(C.destination); o.start(); o.stop(C.currentTime + .6); setTimeout(() => C.close(), 900);
  } catch {}
}

/* ---------- algoritma köprüsü (asıl mantık algoritma.js içinde) ---------- */
const tahminDk = k => Algo.tahminDk(S, k);
const hatirlama = k => Algo.hatirlama(S, k, bugun());
function planla() {
  try { return Algo.planla(S, bugun()); }
  catch (e) { console.error(e); return { gunler: [], yetismeyen: [], ekGunluk: 0, ozet: {}, oneriler: [], hata: true }; }
}

// Art arda en az bir çalışma kaydı olan gün sayısı.
function etkinGunler() {
  const g = new Set(S.oturumlar.map(o => o.tarih));
  for (const k of S.konular) {
    if (k.calisildiTarih) g.add(k.calisildiTarih);
    for (const r of k.tekrarlar || []) g.add(r.tarih);
  }
  return g;
}
function seri() {
  const g = etkinGunler();
  let t = bugun(), n = 0;
  if (!g.has(t)) t = gunEkle(t, -1);
  while (g.has(t)) { n++; t = gunEkle(t, -1); }
  return n;
}

/* ---------- görünümler ---------- */
const kisalt = ad => String(ad || '?').trim().slice(0, 2).toLocaleUpperCase('tr');
const rozet = d => `<span class="rozet" style="--renk:${esc(d.renk)}" aria-hidden="true">${esc(kisalt(d.ad))}</span>`;
const resim = () => `<svg class="resim" viewBox="0 0 96 96" aria-hidden="true"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#2dd4bf"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs>
  <rect x="14" y="20" width="56" height="64" rx="14" fill="url(#rg)" opacity=".22" transform="rotate(-8 42 52)"/>
  <rect x="22" y="14" width="56" height="66" rx="14" fill="url(#rg)"/>
  <path d="M34 34h32M34 46h32M34 58h18" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".9"/>
  <circle cx="74" cy="72" r="14" fill="#fbbf24"/><path d="M68 72l4.5 4.5 8-9" fill="none" stroke="#3b2500" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const bosKart = (baslik, metin, dugme = '') => `<div class="kart bos">${resim()}<b>${baslik}</b><span>${metin}</span>${dugme}</div>`;

function isKarti(is, bugunMu) {
  const k = is.konu, d = dersBul(k.dersId) || { ad: '?', renk: '#888' };
  const et = is.tip === 'yeni' ? '' :
    is.gecikme ? `<span class="etiket gecikti">${is.gecikme} gün gecikti</span>` :
    `<span class="etiket">${is.tip === 'genel' || is.sinavOncesi ? 'Sınav öncesi tekrar' : 'Tekrar'}</span>`;
  const dugme = !bugunMu ? '' : `<button class="yuv" data-a="calis" data-id="${k.id}" aria-label="Sayaçla çalış" title="Sayaçla çalış">${ik('oynat', 1)}</button>
    <button class="yuv dolu" data-a="${is.tip === 'yeni' ? 'calistim' : 'tekrarEt'}" data-id="${k.id}"
      aria-label="${is.tip === 'yeni' ? 'Çalıştım' : 'Tekrar ettim'}" title="${is.tip === 'yeni' ? 'Çalıştım' : 'Tekrar ettim'}">${ik('tik')}</button>`;
  return `<li class="is ${bugunMu ? '' : 'kompakt'}">${rozet(d)}<div class="orta"><div class="ad">${esc(k.ad)}</div>
    <div class="meta"><span>${esc(d.ad)} · ${is.dk} dk</span>${et}</div>
    ${is.neden && bugunMu ? `<div class="neden">${esc(is.neden)}</div>` : ''}</div>${dugme}</li>`;
}

function durumKarti(p) {
  const o = p.ozet || {};
  if (p.hata) return `<div class="kart kucuk soluk">Program şu an hesaplanamadı. Verilerin güvende; sayfayı yenilemeyi dene.</div>`;
  const oneri = (p.oneriler || []).slice(0, 3);
  let sinif = 'rahat', simge = 'tik', baslik = 'Program yolunda', aciklama = '';
  if (!p.sinav) { baslik = 'Sınav tarihi yok'; sinif = 'sinirda'; simge = 'takvim'; aciklama = 'Program şimdilik 14 günlük hazırlanıyor. Sınavı Dersler sekmesinden ekle.'; }
  else if (p.yetismeyen.length || o.yetisme === 'yetismiyor') {
    sinif = 'yetismiyor'; simge = 'unlem'; baslik = `${p.yetismeyen.length} konu sınava yetişmiyor`;
    aciklama = `Yetişmesi için günde yaklaşık ${p.ekGunluk} dk daha gerekiyor.`;
  } else if (o.yetisme === 'sinirda') { sinif = 'sinirda'; simge = 'unlem'; baslik = 'Program sınırda'; aciklama = 'Her şey yetişiyor ama boşluk kalmıyor.'; }
  else if (o.tahminiBitis) aciklama = `Yeni konular ${tarihYaz(o.tahminiBitis, 'gun')} günü bitiyor.`;
  else if (o.toplamKalanDk === 0) aciklama = 'Tüm konular çalışıldı, geriye tekrarlar kaldı.';
  else aciklama = 'Tüm konular sınavdan önce bitiyor.';
  return `<div class="kart"><div class="durumk ${sinif}"><span class="sim">${ik(simge)}</span><div><b>${esc(baslik)}</b>
    <div class="soluk kucuk">${esc(aciklama)}</div></div></div>
    ${oneri.length ? `<ul class="oneri">${oneri.map(x => `<li>${ik('ampul')}<span>${esc(x)}</span></li>`).join('')}</ul>` : ''}</div>`;
}

function gorBugun() {
  const t = bugun(), kom = aktifKomite(), saat = new Date().getHours();
  const selam = saat < 5 ? 'İyi geceler' : saat < 12 ? 'Günaydın' : saat < 18 ? 'İyi günler' : 'İyi akşamlar';
  const hedef = S.ayar.gunluk[haftaGunu(t)];
  const calisilan = S.oturumlar.reduce((a, o) => a + (o.tarih === t ? o.dk : 0), 0);
  const konuVar = aktifDersler().some(d => dersKonulari(d.id).length);
  const p = konuVar ? planla() : { gunler: [], yetismeyen: [], ozet: {} };
  const sinavG = p.sinav ? gunFark(t, p.sinav.tarih) : null;
  const sr = seri();
  const g0 = p.gunler[0] || { isler: [] };
  const kalanDk = g0.isler.reduce((a, i) => a + i.dk, 0);
  let h = `<section class="hero"><div class="ust"><span>${tarihYaz(t, 'uzun')}</span>
    ${sr ? `<span class="hap sari">${ik('alev', 1)}${sr} gün seri</span>` : ''}</div>
    <div class="govde"><div><h1>${selam}</h1><p class="alt">${esc(kom.ad)}${p.sinav ? ' · ' + esc(p.sinav.ad) : ''}</p></div>
    ${halka(hedef ? calisilan / hedef : 0, 116, 11, '#ffffff', `<b class="sayi">${say(calisilan, 'sayi')}</b><span>/ ${hedef} dk</span>`, '', '#5eead4')}</div>
    ${konuVar ? `<div class="camlar"><div><b>${sinavG === null ? '–' : sinavG + ' gün'}</b><span>sınava kalan</span></div>
      <div><b>${say(p.ozet.hazirlik ?? 0, 'yuzde')}</b><span>hazırlık</span></div>
      <div><b>${sureYaz(kalanDk)}</b><span>bugün kalan iş</span></div></div>` : ''}</section>`;
  if (!konuVar) {
    return h + bosKart('Henüz ders veya konu yok', 'Derslerini ve konularını ekleyince günlük çalışma programın burada kendiliğinden oluşur.',
      `<button class="btn parlak" data-a="sekme" data-s="dersler">${ik('arti')} Ders ekle</button>`);
  }
  let sol = `<div class="bas bolum"><h2>Bugünün programı</h2>${g0.isler.length ? `<span class="soluk kucuk">${g0.isler.length} iş</span>` : ''}</div>`;
  sol += g0.isler.length ? `<ul class="isler">${g0.isler.map(i => isKarti(i, true)).join('')}</ul>`
    : bosKart('Bugünlük bu kadar', 'Planlanan işlerin hepsi tamam. İstersen yarının işlerinden birine başlayabilirsin.');
  let sag = `<h2>Program durumu</h2>${durumKarti(p)}`;
  const gecen = S.sinavlar.filter(x => x.tarih < t && gunFark(x.tarih, t) <= 21 && x.not == null).sort((a, b) => a.tarih < b.tarih ? 1 : -1)[0];
  if (gecen) sag += `<div class="kart"><div class="bas"><div><b>${esc(gecen.ad)} nasıl geçti?</b>
    <div class="soluk kucuk">Notunu gir, sonraki komitenin programı buna göre ayarlansın.</div></div>
    <button class="btn kucuk" data-a="sinavDuzenle" data-id="${gecen.id}">Not gir</button></div></div>`;
  const sonra = p.gunler.slice(1, 15);
  if (sonra.length) {
    if (UI.gun < 1 || UI.gun > sonra.length) UI.gun = 1;
    const g = p.gunler[UI.gun], dk = g.isler.reduce((a, i) => a + i.dk, 0);
    sag += `<h2>Önümüzdeki günler</h2><div class="serit">${sonra.map((x, i) => {
      const yuk = x.isler.reduce((a, j) => a + j.dk, 0);
      return `<button class="gunp ${i + 1 === UI.gun ? 'secili' : ''} ${x.rezerv ? 'rezerv' : ''}" data-a="gunSec" data-i="${i + 1}"
        aria-label="${tarihYaz(x.tarih, 'uzun')}"><small>${GUN_KISA[haftaGunu(x.tarih)]}</small><b>${tarih(x.tarih).getDate()}</b>
        <i><u style="width:${x.hedef ? Math.min(100, yuk / x.hedef * 100) : (yuk ? 100 : 0)}%"></u></i></button>`;
    }).join('')}</div>
    <div class="kart" style="margin-top:0"><div class="bas"><b>${tarihYaz(g.tarih, 'uzun')}</b>
      <span class="soluk kucuk">${g.isler.length ? `${g.isler.length} iş · ${sureYaz(dk)}` : 'boş'}</span></div>
      ${g.rezerv ? `<p class="soluk kucuk">Sınav öncesi genel tekrar günü.</p>` : ''}
      ${g.isler.length ? `<ul class="isler" style="margin-top:12px;gap:8px">${g.isler.map(i => isKarti(i, false)).join('')}</ul>`
        : `<p class="soluk kucuk">${g.hedef ? 'Bu güne iş düşmedi.' : 'Bu gün için hedef süre 0.'}</p>`}</div>`;
  }
  const diger = S.sinavlar.filter(s => s.tarih >= t).sort((a, b) => a.tarih < b.tarih ? -1 : 1).slice(0, 4);
  if (diger.length > 1) sag += `<h2>Sınavlar</h2><div class="kart">${sinavListe(diger, false)}</div>`;
  return h + `<div class="iki"><div>${sol}</div><div>${sag}</div></div>`;
}

function sinavListe(liste, duzenle) {
  const t = bugun();
  return `<ul class="liste">${liste.map(s => {
    const g = gunFark(t, s.tarih), kom = S.komiteler.find(k => k.id === s.komiteId);
    return `<li><div class="gunkutu ${g >= 0 && g <= 7 ? 'yakin' : ''}"><b>${g < 0 ? (s.not ?? '–') : g}</b><span>${g < 0 ? (s.not != null ? 'not' : 'geçti') : g === 0 ? 'bugün' : 'gün'}</span></div>
      <div class="orta"><div class="ad">${esc(s.ad)}</div><div class="soluk kucuk">${duzenle ? '' : esc(kom ? kom.ad : '') + ' · '}${tarihYaz(s.tarih)}</div></div>
      ${duzenle && g < 0 ? `<button class="btn kucuk ghost" data-a="sinavAnaliz" data-id="${s.id}">Analiz</button>` : ''}
      ${duzenle ? `<button class="ikon" data-a="sinavDuzenle" data-id="${s.id}" aria-label="Sınavı düzenle">${ik('uc', 1)}</button>` : ''}</li>`;
  }).join('')}</ul>`;
}

const zorlukYaz = z => `<span class="zorluk" aria-label="Zorluk ${z}/5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= z ? 'd' : ''}"></i>`).join('')}</span>`;

function gorDersler() {
  if (UI.dersId && dersBul(UI.dersId)) return gorDers(dersBul(UI.dersId));
  UI.dersId = null;
  const kid = S.aktifKomite, t = bugun();
  let h = `<div class="ustbar"><h1>Dersler</h1><button class="btn kucuk ghost" data-a="komiteDuzenle">Komiteyi düzenle</button></div>
    <div class="cipler">${S.komiteler.map(k =>
    `<button class="cip ${k.id === kid ? 'secili' : ''}" data-a="komiteSec" data-id="${k.id}">${esc(k.ad)}</button>`).join('')}
    <button class="cip cizgili" data-a="komiteEkle">+ Komite</button></div>`;
  const dersler = aktifDersler();
  h += `<div class="bas bolum"><h2>Dersler</h2><div class="sira"><button class="btn kucuk ghost" data-a="topluEkle">Toplu ekle</button>
    <button class="btn kucuk" data-a="dersEkle">${ik('arti')} Ders</button></div></div>`;
  if (!dersler.length) h += bosKart('Bu komitede henüz ders yok', 'Örneğin Anatomi, Fizyoloji, Biyokimya ekleyebilirsin.');
  h += `<div class="izgara">`;
  for (const d of dersler) {
    const ks = dersKonulari(d.id), biten = ks.filter(k => k.durum === 'calisildi').length;
    const vade = k => k.durum === 'calisildi' && k.sonrakiTekrar && k.sonrakiTekrar <= t;
    const vadeli = ks.filter(vade).length, oran = ks.length ? biten / ks.length : 0;
    h += `<button class="kart derskart" style="--renk:${esc(d.renk)}" data-a="dersAc" data-id="${d.id}">
      <div class="ustk">${halka(oran, 60, 7, esc(d.renk), `<span class="sayi">%${Math.round(oran * 100)}</span>`)}
      <div class="orta"><div class="ad">${esc(d.ad)}</div>
      <div class="soluk kucuk">${biten} / ${ks.length} konu · ${zorlukYaz(d.zorluk)}</div></div>
      ${vadeli ? `<span class="etiket gecikti">${vadeli} tekrar</span>` : ''}<span class="soluk">${ik('ileri')}</span></div>
      ${ks.length ? `<div class="noktalar" aria-hidden="true">${ks.slice(0, 60).map(k => `<i class="${vade(k) ? 'v' : k.durum === 'calisildi' ? 't' : ''}"></i>`).join('')}</div>` : ''}</button>`;
  }
  h += `</div>`;
  const sinavlar = S.sinavlar.filter(s => s.komiteId === kid).sort((a, b) => a.tarih < b.tarih ? -1 : 1);
  h += `<div class="bas bolum"><h2>Sınavlar</h2><button class="btn kucuk" data-a="sinavEkle">${ik('arti')} Sınav</button></div><div class="kart">`;
  h += sinavlar.length ? sinavListe(sinavlar, true) : `<div class="soluk" style="text-align:center;padding:10px">Sınav tarihini ekle; geri sayım ve program buna göre hazırlanır.</div>`;
  return h + `</div>`;
}

function gorDers(d) {
  const tum = dersKonulari(d.id), t = bugun();
  const biten = tum.filter(k => k.durum === 'calisildi').length;
  const oz = Algo.dersOzet(S, d.id, t), carpan = oz.carpan || 1;
  const vadeli = k => k.durum === 'calisildi' && k.sonrakiTekrar && k.sonrakiTekrar <= t;
  const sk = new Map();
  for (const q of S.sorular) if (q.dersId === d.id && q.konuId) {
    const x = sk.get(q.konuId) || { d: 0, top: 0 };
    x.d += q.dogru; x.top += q.dogru + q.yanlis + (q.bos || 0); sk.set(q.konuId, x);
  }
  const zayif = k => { const x = sk.get(k.id); return !!x && x.top >= 5 && x.d / x.top < .6; };
  const FILTRE = { tum: ['Tümü', () => true], yeni: ['Çalışılmadı', k => k.durum !== 'calisildi'], tekrar: ['Tekrar bekleyen', vadeli], zor: ['Zorlandıklarım', k => k.sonPuan === 'zor' || zayif(k)] };
  if (!FILTRE[UI.filtre]) UI.filtre = 'tum';
  const ks = tum.filter(FILTRE[UI.filtre][1]);
  let h = `<div class="ustbar"><button class="btn kucuk ghost" data-a="dersKapat">${ik('geri')} Dersler</button>
    <button class="btn kucuk ghost" data-a="dersDuzenle" data-id="${d.id}">Düzenle</button></div>
    <section class="dersust" style="--renk:${esc(d.renk)}"><div class="ustk">
    ${halka(tum.length ? biten / tum.length : 0, 88, 9, esc(d.renk), `<b class="sayi">${biten}/${tum.length}</b><span>konu</span>`)}
    <div><h1>${esc(d.ad)}</h1><div class="soluk kucuk" style="margin-top:6px">Zorluk ${zorlukYaz(d.zorluk)}</div></div></div>
    <div class="ucluk"><div><b>%${oz.hazirlik ?? 0}</b><span>hatırlama</span></div>
    <div><b>${tum.filter(vadeli).length}</b><span>tekrar bekliyor</span></div>
    <div><b>${sureYaz(oz.kalanDk ?? tum.filter(k => k.durum !== 'calisildi').reduce((a, k) => a + tahminDk(k), 0))}</b><span>kalan çalışma</span></div></div></section>`;
  if (Math.abs(carpan - 1) >= 0.08) h += `<p class="soluk kucuk" style="margin:10px 4px 0">Bu derste konular tahmin edilenden ${carpan > 1 ? 'uzun' : 'kısa'} sürüyor;
    program sürelerini ×${carpan.toFixed(1).replace('.', ',')} ile hesaplıyor.</p>`;
  const so = soruOzet(q => q.dersId === d.id);
  const sonSoru = S.sorular.filter(q => q.dersId === d.id).sort((a, b) => a.tarih < b.tarih ? 1 : a.tarih > b.tarih ? -1 : b.id < a.id ? -1 : 1).slice(0, 4);
  h += `<div class="kart"><div class="bas"><div><b>Soru çözümü</b><div class="soluk kucuk sayi">${so.top
    ? `${so.top} soru · %${so.oran} doğru · ${netYaz(so.d, so.y)} net` : 'Çözdüğün soruları kaydet; zayıf çıkan konuların tekrarı öne alınır.'}</div></div>
    <button class="btn kucuk ghost" data-a="soruEkle" data-id="${d.id}">${ik('arti')} Soru</button></div>${so.top ? dybCubuk(so) : ''}
    ${sonSoru.length ? `<ul class="liste sorul">${sonSoru.map(q => { const k = konuBul(q.konuId), tp = q.dogru + q.yanlis + (q.bos || 0);
      return `<li><div class="orta"><div class="ad">${esc(k ? k.ad : 'Genel')}</div><div class="soluk kucuk sayi">${tarihYaz(q.tarih, 'gun')} · ${q.dogru} doğru, ${q.yanlis} yanlış${q.bos ? `, ${q.bos} boş` : ''}</div></div>
        <b class="sayi">%${Math.round(q.dogru / tp * 100)}</b><button class="ikon" data-a="soruSil" data-id="${q.id}" aria-label="Soru kaydını sil">${ik('carpi')}</button></li>`; }).join('')}</ul>` : ''}</div>`;
  h += `<div class="bas bolum"><h2>Konular</h2><button class="btn kucuk" data-a="konuEkle" data-id="${d.id}">${ik('arti')} Konu</button></div>`;
  if (!tum.length) return h + bosKart('Henüz konu yok', 'Konuları her satıra bir tane yazarak toplu ekleyebilirsin.');
  h += `<div class="cipler">${Object.entries(FILTRE).map(([a, [ad, f]]) =>
    `<button class="cip ${a === UI.filtre ? 'secili' : ''}" data-a="filtre" data-f="${a}">${ad}<span class="sayi">${tum.filter(f).length}</span></button>`).join('')}</div>`;
  if (tum.length > 8) h += `<input type="search" id="ara" placeholder="Konu ara" aria-label="Konu ara" autocomplete="off" style="margin-top:4px">`;
  h += `<div class="kart">`;
  if (!ks.length) h += `<div class="soluk" style="text-align:center;padding:10px">Bu filtrede konu yok.</div>`;
  else h += `<ul class="liste" id="konular">${ks.map(k => {
    const tamam = k.durum === 'calisildi';
    let alt = `<span class="soluk">Yaklaşık ${tahminDk(k)} dk</span>`;
    if (tamam) {
      const g = gunFark(t, k.sonrakiTekrar || t), hy = Math.round(hatirlama(k) * 100);
      alt = `<span class="hbar ${hy < 60 ? 'z' : hy < 80 ? 'o' : ''}" title="Tahmini hatırlama"><u style="width:${hy}%"></u></span><span class="soluk sayi">%${hy} · </span>` +
        (g <= 0 ? `<span class="etiket gecikti">Tekrar zamanı</span>` : `<span class="soluk">Tekrar ${tarihYaz(k.sonrakiTekrar, 'gun')}</span>`);
    }
    const sq = sk.get(k.id), url = guvenliUrl(k.baglanti);
    if (sq) alt += `<div class="soluk sayi" style="margin-top:2px">${sq.top} soru · %${Math.round(sq.d / sq.top * 100)} doğru</div>`;
    if (k.not) alt += `<div class="knot">${esc(k.not)}</div>`;
    return `<li data-ad="${esc(k.ad.toLocaleLowerCase('tr'))}"><button class="durum ${tamam ? 'tamam' : ''}" data-a="${tamam ? 'tekrarEt' : 'calistim'}" data-id="${k.id}"
      aria-label="${tamam ? 'Tekrar ettim' : 'Çalıştım'}">${tamam ? ik('tik') : ''}</button>
      <div class="orta"><div class="ad">${esc(k.ad)}</div><div class="kucuk" style="margin-top:2px">${alt}</div></div>
      ${url ? `<a class="ikon" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="Bağlantıyı aç" title="Bağlantıyı aç">${ik('bag')}</a>` : ''}
      <button class="ikon" data-a="konuDuzenle" data-id="${k.id}" aria-label="Konuyu düzenle">${ik('uc', 1)}</button></li>`;
  }).join('')}</ul>`;
  return h + `</div>`;
}

function sayacSn() { return S.sayac ? Math.max(0, Math.floor((Date.now() - S.sayac.basla) / 1000)) : 0; }
// Pomodoro: evre, başlangıçtan beri geçen süreden hesaplanır; uygulama kapalıyken de doğru kalır.
function pomo() {
  const c = S.sayac, P = c && c.pomo;
  if (!P) return null;
  const sn = sayacSn(), cal = P.c * 60, mol = P.m * 60, dng = cal + mol, tur = Math.floor(sn / dng), r = sn % dng, mola = r >= cal;
  return { tur: tur + 1, mola, kalan: mola ? dng - r : cal - r, oran: mola ? (r - cal) / mol : r / cal, calisSn: tur * cal + Math.min(r, cal) };
}
const pomoAlt = p => p.mola ? 'mola · sonra ' + (p.tur + 1) + '. tur' : p.tur + '. tur · çalışma';
function sayacYazi() {
  const p = pomo(), sn = p ? p.kalan : sayacSn();
  return `${sn >= 3600 ? pad(Math.floor(sn / 3600)) + ':' : ''}${pad(Math.floor(sn / 60) % 60)}:${pad(sn % 60)}`;
}
const sayacOran = () => { const p = pomo(); return !S.sayac ? 0 : p ? p.oran : S.sayac.hedef ? sayacSn() / (S.sayac.hedef * 60) : (sayacSn() % 3600) / 3600; };
// Sayaç çemberi: dışta dakika çizgileri, içte ilerleme halkası.
function sayacHalka(oran, renk, ic) {
  const B = 252, r = 102, c = 2 * Math.PI * r, rc = 122, cc = 2 * Math.PI * rc, o = Math.min(1, Math.max(0, oran || 0));
  return `<div class="halka" style="width:${B}px;height:${B}px;max-width:74vw;max-height:74vw"><svg viewBox="0 0 ${B} ${B}">
    <circle class="cizik" cx="126" cy="126" r="${rc}" stroke-width="5" stroke-dasharray="1.6 ${cc / 60 - 1.6}"/>
    <circle class="iz" cx="126" cy="126" r="${r}" stroke-width="13"/>
    <circle class="dolu" id="zhalka" data-c="${c}" cx="126" cy="126" r="${r}" stroke-width="13" stroke="${renk}"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - o)}" transform="rotate(-90 126 126)"/></svg><div class="ic">${ic}</div></div>`;
}
function dersSecenek(secili) {
  return S.komiteler.map(k => {
    const ds = S.dersler.filter(d => d.komiteId === k.id);
    return ds.length ? `<optgroup label="${esc(k.ad)}">${ds.map(d =>
      `<option value="${d.id}" ${d.id === secili ? 'selected' : ''}>${esc(d.ad)}</option>`).join('')}</optgroup>` : '';
  }).join('');
}
function konuSecenek(dersId, secili) {
  return `<option value="">Konu belirtme</option>` + dersKonulari(dersId).map(k =>
    `<option value="${k.id}" ${k.id === secili ? 'selected' : ''}>${esc(k.ad)}</option>`).join('');
}

function gorSure() {
  let h = `<div class="ustbar"><h1>Odak</h1></div>`;
  if (!S.dersler.length) return h + bosKart('Önce bir ders ekle', 'Süre kayıtları derslere bağlı tutulur.',
    `<button class="btn parlak" data-a="sekme" data-s="dersler">${ik('arti')} Ders ekle</button>`);
  const c = S.sayac;
  if (!dersBul(UI.sDers)) { UI.sDers = (aktifDersler()[0] || S.dersler[0]).id; UI.sKonu = ''; }
  if (c) {
    const d = dersBul(c.dersId), k = konuBul(c.konuId), renk = d ? d.renk : '#2dd4bf', pm = pomo(), kurl = k && guvenliUrl(k.baglanti);
    h += `<section class="odak" style="--renk:${esc(renk)}">${sayacHalka(sayacOran(), esc(renk),
      `<div class="zaman" id="zaman">${sayacYazi()}</div><small id="zalt">${pm ? pomoAlt(pm) : c.hedef ? `hedef ${c.hedef} dk` : 'serbest çalışma'}</small>`)}
      <div class="konu"><b>${esc(d ? d.ad : 'Silinmiş ders')}</b>${k ? `<div>${esc(k.ad)}</div>` : ''}
      ${k && k.not ? `<div class="knot">${esc(k.not)}</div>` : ''}
      ${kurl ? `<a class="btn ghost kucuk" style="margin-top:10px" href="${esc(kurl)}" target="_blank" rel="noopener noreferrer">${ik('bag')} Kaynağı aç</a>` : ''}</div>
      <div class="sira" style="justify-content:center"><button class="btn" data-a="sayacDur">${ik('tik')} Bitir ve kaydet</button>
      <button class="btn ghost" data-a="sayacIptal">Vazgeç</button></div>
      <p class="not">Uygulamayı kapatsan da sayaç çalışmaya devam eder.</p></section>`;
  } else {
    const d = dersBul(UI.sDers), P = UI.sHedef === 'p', pa = S.ayar.pomo;
    h += `<section class="odak" style="--renk:${esc(d.renk)}">${sayacHalka(0, esc(d.renk),
      `<div class="zaman">${P ? pad(pa.c) + ':00' : UI.sHedef ? pad(UI.sHedef) + ':00' : '00:00'}</div><small>${P ? `${pa.c} dk çalışma · ${pa.m} dk mola` : UI.sHedef ? 'hedef süre (dk)' : 'serbest çalışma'}</small>`)}
      <div class="alan"><div class="bolme esnek" role="group" aria-label="Hedef süre">${[[0, 'Serbest'], [25, '25'], [50, '50'], [90, '90'], ['p', 'Pomodoro']].map(([v, ad]) =>
        `<button class="${UI.sHedef === v ? 'secili' : ''}" data-a="hedefSec" data-v="${v}">${ad}</button>`).join('')}</div>
      ${P ? `<div class="yanyana"><div><label for="pc">Çalışma (dk)</label><input id="pc" type="number" inputmode="numeric" min="5" max="120" value="${pa.c}" data-d="pomoC"></div>
        <div><label for="pmo">Mola (dk)</label><input id="pmo" type="number" inputmode="numeric" min="1" max="60" value="${pa.m}" data-d="pomoM"></div></div>` : ''}
      <label for="sDers">Ders</label><select id="sDers" data-d="sDers">${dersSecenek(UI.sDers)}</select>
      <label for="sKonu">Konu</label><select id="sKonu" data-d="sKonu">${konuSecenek(UI.sDers, UI.sKonu)}</select></div>
      <div class="sira" style="justify-content:center;margin-top:4px"><button class="btn" data-a="sayacBasla">${ik('oynat', 1)} Başlat</button>
      <button class="btn ghost" data-a="elleEkle">Elle süre ekle</button></div></section>`;
  }
  const son = [...S.oturumlar].sort((a, b) => a.tarih < b.tarih ? 1 : a.tarih > b.tarih ? -1 : b.id < a.id ? -1 : 1).slice(0, 40);
  h += `<h2>Son kayıtlar</h2>`;
  if (!son.length) return h + `<div class="kart soluk" style="text-align:center">Henüz kayıt yok.</div>`;
  let gun = '';
  h += `<div class="kart"><ul class="liste">`;
  for (const o of son) {
    if (o.tarih !== gun) {
      gun = o.tarih;
      const top = S.oturumlar.reduce((a, x) => a + (x.tarih === gun ? x.dk : 0), 0);
      h += `<li class="gunbas"><span>${gun === bugun() ? 'Bugün' : tarihYaz(gun)}</span><span>${sureYaz(top)}</span></li>`;
    }
    const d = dersBul(o.dersId) || { ad: 'Silinmiş ders', renk: '#888' }, k = konuBul(o.konuId);
    h += `<li>${rozet(d)}<div class="orta"><div class="ad">${esc(d.ad)}</div>
      ${k ? `<div class="soluk kucuk">${esc(k.ad)}</div>` : ''}</div><b class="sayi">${sureYaz(o.dk)}</b>
      <button class="ikon" data-a="oturumSil" data-id="${o.id}" aria-label="Kaydı sil">${ik('carpi')}</button></li>`;
  }
  return h + `</ul></div>`;
}

function gorOzet() {
  const t = bugun(), bas = gunEkle(haftaBasi(t), UI.hafta * 7), son = gunEkle(bas, 6);
  const gunDk = new Map();
  for (const o of S.oturumlar) gunDk.set(o.tarih, (gunDk.get(o.tarih) || 0) + o.dk);
  const gunluk = Array.from({ length: 7 }, (_, i) => gunDk.get(gunEkle(bas, i)) || 0), dersDk = new Map();
  for (const o of S.oturumlar) if (o.tarih >= bas && o.tarih <= son) dersDk.set(o.dersId, (dersDk.get(o.dersId) || 0) + o.dk);
  const toplam = gunluk.reduce((a, b) => a + b, 0);
  let onceki = 0;
  for (let i = 1; i <= 7; i++) onceki += gunDk.get(gunEkle(bas, -i)) || 0;
  let yeni = 0, tekrar = 0;
  for (const k of S.konular) {
    if (k.calisildiTarih >= bas && k.calisildiTarih <= son) yeni++;
    for (const r of k.tekrarlar || []) if (r.tarih >= bas && r.tarih <= son) tekrar++;
  }
  const hedef = S.ayar.gunluk.reduce((a, b) => a + b, 0);
  const gecenGun = UI.hafta === 0 ? haftaGunu(t) + 1 : 7;
  const fark = onceki ? Math.round((toplam - onceki) / onceki * 100) : null;
  const farkYazi = fark === null ? `<span class="degisim">Önceki hafta kayıt yok</span>`
    : `<span class="degisim ${fark >= 0 ? 'art' : 'az'}">${ik(fark >= 0 ? 'yukari' : 'asagi')}%${Math.abs(fark)} önceki haftaya göre</span>`;

  let h = `<div class="ustbar"><h1>Özet</h1><div class="haftasec">
    <button data-a="hafta" data-n="-1" aria-label="Önceki hafta">${ik('geri')}</button>
    <b>${UI.hafta === 0 ? 'Bu hafta' : `${tarihYaz(bas, 'gun')} – ${tarihYaz(son, 'gun')}`}</b>
    <button data-a="hafta" data-n="1" ${UI.hafta >= 0 ? 'disabled' : ''} aria-label="Sonraki hafta">${ik('ileri')}</button></div></div>
    <section class="kart ozh"><div class="ozh-ust"><div class="orta">
      <span class="soluk kucuk">${UI.hafta === 0 ? 'Bu hafta' : 'O hafta'} çalışma süresi</span>
      <div class="buyuk">${say(toplam, 'sure')}</div>${farkYazi}</div>
      ${halka(hedef ? toplam / hedef : 0, 96, 10, 'var(--ana)', `<b>${say(hedef ? toplam / hedef * 100 : 0, 'yuzde')}</b><span>hedef</span>`, '', 'var(--ana2)')}</div>
    <div class="ucluk"><div><b>${say(yeni, 'sayi')}</b><span>yeni konu</span></div><div><b>${say(tekrar, 'sayi')}</b><span>tekrar</span></div>
      <div><b>${say(toplam / gecenGun, 'sure')}</b><span>ortalama / gün</span></div></div></section>`;

  // Günlere göre: soluk sütun günlük hedefi, dolu sütun çalışılan süreyi gösterir.
  const mx = Math.max(...gunluk, ...S.ayar.gunluk, 30);
  const kisa = dk => dk >= 60 ? (dk / 60).toFixed(1).replace('.', ',').replace(',0', '') + ' sa' : dk + ' dk';
  h += `<div class="iki"><div><div class="kart"><div class="bas"><b>Günlere göre</b>
    <span class="lej"><i class="l1"></i>çalışılan<i class="l2"></i>hedef</span></div>
    <div class="grafik" role="img" aria-label="Günlere göre çalışma süresi ve günlük hedef">${gunluk.map((dk, i) => {
      const hd = S.ayar.gunluk[i], g = gunEkle(bas, i);
      return `<div class="s ${g === t ? 'bugun' : ''}"><div class="alan">
        ${dk ? `<span class="d" style="bottom:calc(${Math.max(dk, hd) / mx * 100}% + 6px)">${kisa(dk)}</span>` : ''}
        ${hd ? `<i class="hd" style="height:${hd / mx * 100}%"></i>` : ''}
        ${dk ? `<i class="b ${hd && dk >= hd ? 'tam' : ''}" style="height:${Math.max(dk / mx * 100, 4)}%;--i:${i}"></i>` : ''}</div>
        <span class="g">${GUN_KISA[i]}</span></div>`;
    }).join('')}</div></div>`;

  h += `<div class="kart"><b>Derslere göre</b>`;
  const sirali = [...dersDk.entries()].sort((a, b) => b[1] - a[1]);
  const dersi = id => dersBul(id) || { ad: 'Silinmiş ders', renk: '#888' };
  if (!sirali.length) h += `<div class="soluk" style="text-align:center;padding:18px 0 6px">Bu hafta kayıtlı çalışma yok.</div>`;
  else h += `<div class="yigin" role="img" aria-label="Derslere göre süre dağılımı">${sirali.map(([id, dk]) =>
    `<i style="width:${dk / toplam * 100}%;background:${esc(dersi(id).renk)}"></i>`).join('')}</div>`;
  for (const [id, dk] of sirali) {
    h += `<div class="yatay"><span class="nokta" style="background:${esc(dersi(id).renk)}"></span><span class="ad">${esc(dersi(id).ad)}</span>
      <span class="sayi"><b>${sureYaz(dk)}</b> <span class="soluk">%${Math.round(dk / toplam * 100)}</span></span></div>`;
  }
  const sw = soruOzet(q => q.tarih >= bas && q.tarih <= son);
  h += `</div><div class="kart"><div class="bas"><b>Sorular</b>${sw.top ? `<span class="soluk kucuk sayi">${sw.top} soru · ${netYaz(sw.d, sw.y)} net</span>` : ''}</div>`;
  if (!sw.top) h += `<div class="soluk" style="text-align:center;padding:18px 0 6px">Bu hafta soru kaydı yok.</div>`;
  else {
    h += dybCubuk(sw);
    for (const id of new Set(S.sorular.filter(q => q.tarih >= bas && q.tarih <= son).map(q => q.dersId))) {
      const o = soruOzet(q => q.dersId === id && q.tarih >= bas && q.tarih <= son);
      h += `<div class="yatay"><span class="nokta" style="background:${esc(dersi(id).renk)}"></span><span class="ad">${esc(dersi(id).ad)}</span>
        <span class="sayi"><b>%${o.oran}</b> <span class="soluk">${o.top} soru</span></span></div>`;
    }
  }
  h += `</div></div><div>`;

  // Son 16 haftanın ısı haritası (sütun = hafta, satır = gün)
  const HAFTA = 16, ilk = gunEkle(haftaBasi(t), -(HAFTA - 1) * 7), ort = Math.max(30, hedef / 7);
  let hucre = '', aylar = '', sonAy = -1;
  for (let w = 0; w < HAFTA; w++) {
    const ay = tarih(gunEkle(ilk, w * 7 + 6)).getMonth();
    aylar += `<span>${ay !== sonAy && w < HAFTA - 1 ? tarih(gunEkle(ilk, w * 7 + 6)).toLocaleDateString('tr-TR', { month: 'short' }) : ''}</span>`;
    sonAy = ay;
  }
  for (let i = 0; i < HAFTA * 7; i++) {
    const g = gunEkle(ilk, i);
    if (g > t) { hucre += `<i class="ileri"></i>`; continue; }
    const dk = gunDk.get(g) || 0, s = !dk ? 0 : dk < ort * .34 ? 1 : dk < ort * .67 ? 2 : dk < ort ? 3 : 4;
    hucre += `<i class="s${s} ${g === t ? 'bg' : ''}" style="--i:${Math.floor(i / 7)}" title="${tarihYaz(g)}: ${sureYaz(dk)}"></i>`;
  }
  const aktif = [...gunDk.keys()].filter(g => g >= ilk).length;
  h += `<div class="kart"><div class="bas"><b>Son ${HAFTA} hafta</b><span class="soluk kucuk">${aktif} aktif gün</span></div>
    <div class="isikap"><div class="isigun"><span>Pzt</span><span></span><span>Çar</span><span></span><span>Cum</span><span></span><span>Paz</span></div>
    <div class="orta"><div class="isiay">${aylar}</div>
    <div class="isi" role="img" aria-label="Son ${HAFTA} haftada ${aktif} gün çalışma kaydı var">${hucre}</div></div></div>
    <div class="lejant">az <i></i><i class="s1"></i><i class="s2"></i><i class="s3"></i><i class="s4"></i> çok</div></div>`;

  const dersler = aktifDersler();
  const tum = dersler.flatMap(d => dersKonulari(d.id)), bit = tum.filter(k => k.durum === 'calisildi').length;
  h += `<div class="kart"><div class="bas"><b>${esc(aktifKomite().ad)}</b><span class="sayi soluk kucuk">${bit} / ${tum.length} konu</span></div>
    <div class="cubuk"><i style="width:${tum.length ? bit / tum.length * 100 : 0}%"></i></div>
    <div class="dtablo">`;
  for (const d of dersler) {
    const ks = dersKonulari(d.id), b = ks.filter(k => k.durum === 'calisildi').length;
    h += `<span class="ad">${esc(d.ad)}</span><div class="cubuk"><i style="width:${ks.length ? b / ks.length * 100 : 0}%;background:${esc(d.renk)}"></i></div>
      <span class="sayi soluk">${b}/${ks.length}</span><span class="sayi hz">%${Algo.dersOzet(S, d.id, t).hazirlik ?? 0}</span>`;
  }
  return h + `</div>${dersler.length ? `<p class="soluk kucuk" style="margin:14px 0 0">Sağdaki yüzde, o dersin konularını bugün ne kadar hatırladığına dair tahmindir.</p>` : ''}</div></div></div>`;
}

function gorAyarlar() {
  const a = S.ayar;
  const bas = (simge, ad) => `<div class="ayar-bas"><span class="sim">${ik(simge)}</span><b>${ad}</b></div>`;
  return `<div class="ustbar"><h1>Ayarlar</h1></div><div class="iki"><div>
  <div class="kart" style="margin-top:0">${bas('gunes', 'Görünüm')}
    <div class="bolme" style="margin-top:12px" role="group" aria-label="Tema">${[['', 'Sistem'], ['acik', 'Açık'], ['koyu', 'Koyu']].map(([v, ad]) =>
      `<button class="${(a.tema || '') === v ? 'secili' : ''}" data-a="tema" data-v="${v}">${ad}</button>`).join('')}</div></div>
  <div class="kart">${bas('hedef', 'Günlük çalışma hedefi')}
    <p class="soluk kucuk">Dakika olarak. Program her güne en fazla bu kadar iş yazar; çalışmayacağın güne 0 yaz.</p>
    <div class="gunler">${GUN_KISA.map((g, i) => `<div><label for="g${i}">${g}</label>
      <input id="g${i}" type="number" inputmode="numeric" min="0" max="900" step="5" value="${a.gunluk[i]}" data-d="gunluk" data-i="${i}"></div>`).join('')}</div></div>
  <div class="kart">${bas('yenile', 'Tekrar ve sınav')}
    <label for="ar">Tekrar sıklığı tercihi (gün). 1, 7, 30 normal tempodur; daha küçük sayılar daha sık, daha büyükler daha seyrek tekrar demek.</label>
    <input id="ar" type="text" inputmode="numeric" value="${a.araliklar.join(', ')}" data-d="araliklar">
    <label for="tg">Sınavdan önce genel tekrara ayrılacak gün sayısı</label>
    <input id="tg" type="number" inputmode="numeric" min="0" max="14" value="${a.tekrarGunu}" data-d="tekrarGunu"></div>
  </div><div>
  <div class="kart" style="margin-top:0">${bas('indir', 'Yedekleme')}
    <p class="soluk kucuk">Verilerin yalnızca bu cihazda durur. Ara sıra yedek dosyası indirmeni öneririm; başka cihaza taşımak için de aynı dosyayı geri yüklersin.</p>
    <div class="sira" style="margin-top:12px"><button class="btn" data-a="disaAktar">Yedeği indir</button>
    <button class="btn ghost" data-a="iceAktar">Geri yükle</button></div>
    <input type="file" id="dosya" accept="application/json,.json" hidden></div>
  <div class="kart">${bas('takvim', 'Takvime aktar')}
    <p class="soluk kucuk">Sınavlarını ve önümüzdeki 14 günün programını telefonunun takvimine ekler. İnen dosyayı açman yeterli; yeniden aktarırsan eski kayıtlar güncellenir.</p>
    <div class="sira" style="margin-top:12px"><button class="btn" data-a="takvimSinav">Sınavlar</button>
    <button class="btn ghost" data-a="takvimPlan">14 günlük program</button></div></div>
  <div class="kart">${bas('telefon', 'Telefona kurulum')}
    <p class="soluk kucuk">Android (Chrome): menü › "Ana ekrana ekle" ya da "Uygulamayı yükle". iPhone ve iPad (Safari): Paylaş › "Ana Ekrana Ekle".
    Kurulduktan sonra internet olmadan da açılır.</p></div>
  <div class="kart"><button class="btn tehlike blok" data-a="sifirla">Tüm verileri sil</button></div>
  <p class="soluk kucuk" style="text-align:center">Ders Takip · sürüm 2.2</p></div></div>`;
}

const GORUNUM = { bugun: gorBugun, dersler: gorDersler, sure: gorSure, ozet: gorOzet, ayarlar: gorAyarlar };
function ciz() {
  $('#app').innerHTML = GORUNUM[UI.sekme]();
  for (const b of document.querySelectorAll('#nav button')) b.classList.toggle('secili', b.dataset.s === UI.sekme);
  const sec = $('.gunp.secili');
  if (sec) sec.scrollIntoView({ inline: 'center', block: 'nearest' });
  if (UI.anim) {
    UI.anim = false;
    const app = $('#app'); app.classList.remove('gir'); void app.offsetWidth; app.classList.add('gir');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      for (const e of document.querySelectorAll('.dolu[data-h]')) e.setAttribute('stroke-dashoffset', e.dataset.h);
    }));
    saydir();
  } else $('#app').classList.remove('gir');
  const acik = UI.sekme === 'dersler' && dersBul(UI.dersId);
  $('#ust b').textContent = acik ? acik.ad : { bugun: 'Bugün', dersler: 'Dersler', sure: 'Odak', ozet: 'Özet', ayarlar: 'Ayarlar' }[UI.sekme];
  tik();
}

// Saniyede bir: çalışan sayacın ekrandaki yazısını ve halkasını günceller.
function tik() {
  const mini = $('#mini'), c = S.sayac;
  if (!c) { mini.hidden = true; return; }
  const yazi = sayacYazi(), d = dersBul(c.dersId), pm = pomo();
  mini.hidden = UI.sekme === 'sure';
  mini.textContent = `${yazi} · ${pm && pm.mola ? 'Mola' : d ? d.ad : ''}`;
  if (pm) {
    const faz = c.basla + ':' + pm.tur + (pm.mola ? 'm' : 'c'), za = $('#zalt');
    if (za) za.textContent = pomoAlt(pm);
    if (tik.faz && tik.faz !== faz && tik.faz.startsWith(c.basla + ':')) {
      bip(); titre([200, 100, 200]);
      toast(pm.mola ? `Mola zamanı: ${c.pomo.m} dk dinlen.` : `Mola bitti. ${pm.tur}. tur başladı.`);
    }
    tik.faz = faz;
  }
  const z = $('#zaman'), hl = $('#zhalka');
  if (z) z.textContent = yazi;
  if (hl) hl.setAttribute('stroke-dashoffset', hl.dataset.c * (1 - Math.min(1, sayacOran())));
  if (c.hedef && !c.bildirildi && sayacSn() >= c.hedef * 60) {
    c.bildirildi = true; kaydet();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    toast(`${c.hedef} dakikalık hedef tamam. İstersen devam et.`);
  }
}
setInterval(tik, 1000);
addEventListener('scroll', () => $('#ust').classList.toggle('gor', scrollY > 64), { passive: true });

/* ---------- iletişim kutusu ---------- */
function kutu(baslik, govde, onay, onayYazi = 'Kaydet', vazgecYazi = 'Vazgeç') {
  const d = $('#dlg');
  d.innerHTML = `<form><h3>${esc(baslik)}</h3>${govde}<div class="dbtn">
    <button type="button" class="btn ghost" data-a="kapat">${esc(vazgecYazi)}</button>
    ${onay ? `<button class="btn">${esc(onayYazi)}</button>` : ''}</div></form>`;
  $('form', d).onsubmit = e => {
    e.preventDefault();
    if (!onay) return;
    if (onay(Object.fromEntries(new FormData(e.target))) !== false) { d.close(); kaydet(); ciz(); }
  };
  if (!d.open) d.showModal();
}
const renkSecici = secili => `<label>Renk</label><div class="renkler">${RENKLER.map(r =>
  `<label><input type="radio" name="renk" value="${r}" ${r === secili ? 'checked' : ''}><span style="background:${r}"></span></label>`).join('')}</div>`;
const zorlukSecici = z => `<label for="fz">Zorluk (program buna göre süre ve öncelik verir)</label><select id="fz" name="zorluk">
  ${[1, 2, 3, 4, 5].map(i => `<option value="${i}" ${i === z ? 'selected' : ''}>${i} · ${['Çok kolay', 'Kolay', 'Orta', 'Zor', 'Çok zor'][i - 1]}</option>`).join('')}</select>`;

function puanKutusu(k, sayactan) {
  const ilk = k.durum !== 'calisildi';
  const baslik = sayactan ? (ilk ? 'Konuyu bitirdin mi?' : 'Tekrarı tamamladın mı?') : (ilk ? 'Nasıl geçti?' : 'Tekrar nasıl geçti?');
  const yuz = { zor: 'yuzZor', orta: 'yuzOrta', kolay: 'yuzKolay' };
  kutu(baslik, `<p class="soluk" style="margin:-8px 0 16px">${esc(k.ad)}</p><div class="puanbuyuk">
    ${['zor', 'orta', 'kolay'].map(p => `<button type="button" class="${p}R" data-a="puan" data-id="${k.id}" data-p="${p}">
    <span class="yz">${ik(yuz[p])}</span><span>${PUAN_AD[p]}<small>${Algo.sonrakiAralik(S, k, p, bugun())} gün sonra tekrar</small></span></button>`).join('')}</div>`,
    null, '', sayactan ? 'Henüz bitmedi' : 'Vazgeç');
}

/* ---------- eylemler ---------- */
const A = {
  sekme(el) { UI.sekme = el.dataset.s; if (UI.sekme !== 'dersler') UI.dersId = null; UI.anim = true; ciz(); scrollTo(0, 0); },
  kapat() { $('#dlg').close(); },
  gunSec(el) { UI.gun = Number(el.dataset.i); const y = scrollY; ciz(); scrollTo(0, y); },
  filtre(el) { UI.filtre = el.dataset.f; const y = scrollY; ciz(); scrollTo(0, y); },
  tema(el) { S.ayar.tema = el.dataset.v; temaUygula(); kaydet(); ciz(); },

  komiteSec(el) { S.aktifKomite = el.dataset.id; UI.gun = 1; kaydet(); ciz(); },
  komiteEkle() {
    kutu('Yeni komite', `<label for="fa">Ad</label><input id="fa" name="ad" required placeholder="Örn. 3. Komite" value="${S.komiteler.length + 1}. Komite">`, v => {
      if (!v.ad.trim()) return false;
      const k = { id: uid(), ad: v.ad.trim() }; S.komiteler.push(k); S.aktifKomite = k.id;
    });
  },
  komiteDuzenle() {
    const k = aktifKomite();
    kutu('Komiteyi düzenle', `<label for="fa">Ad</label><input id="fa" name="ad" required value="${esc(k.ad)}">
      ${S.komiteler.length > 1 ? `<p><button type="button" class="btn tehlike kucuk" data-a="komiteSil">Komiteyi sil</button></p>` : ''}`, v => {
      if (!v.ad.trim()) return false; k.ad = v.ad.trim();
    });
  },
  komiteSil() {
    const id = S.aktifKomite;
    if (!confirm('Bu komite, içindeki dersler, konular ve sınavlarla birlikte silinsin mi? Süre kayıtları kalır.')) return;
    const ds = new Set(S.dersler.filter(d => d.komiteId === id).map(d => d.id));
    S.konular = S.konular.filter(k => !ds.has(k.dersId));
    S.dersler = S.dersler.filter(d => d.komiteId !== id);
    S.sinavlar = S.sinavlar.filter(s => s.komiteId !== id);
    S.komiteler = S.komiteler.filter(k => k.id !== id);
    S.aktifKomite = S.komiteler[0].id;
    $('#dlg').close(); kaydet(); ciz();
  },

  dersEkle() {
    const renk = RENKLER[aktifDersler().length % RENKLER.length];
    kutu('Yeni ders', `<label for="fa">Ders adı</label><input id="fa" name="ad" required placeholder="Örn. Anatomi">${zorlukSecici(3)}${renkSecici(renk)}`, v => {
      if (!v.ad.trim()) return false;
      S.dersler.push({ id: uid(), komiteId: S.aktifKomite, ad: v.ad.trim(), zorluk: sayi(v.zorluk, 3, 1, 5), renk: v.renk || renk });
    });
  },
  dersDuzenle(el) {
    const d = dersBul(el.dataset.id);
    kutu('Dersi düzenle', `<label for="fa">Ders adı</label><input id="fa" name="ad" required value="${esc(d.ad)}">${zorlukSecici(d.zorluk)}${renkSecici(d.renk)}
      <p><button type="button" class="btn tehlike kucuk" data-a="dersSil" data-id="${d.id}">Dersi sil</button></p>`, v => {
      if (!v.ad.trim()) return false;
      d.ad = v.ad.trim(); d.zorluk = sayi(v.zorluk, 3, 1, 5); d.renk = v.renk || d.renk;
    });
  },
  dersSil(el) {
    if (!confirm('Bu ders ve tüm konuları silinsin mi? Süre kayıtları kalır.')) return;
    S.konular = S.konular.filter(k => k.dersId !== el.dataset.id);
    S.dersler = S.dersler.filter(d => d.id !== el.dataset.id);
    UI.dersId = null; $('#dlg').close(); kaydet(); ciz();
  },
  dersAc(el) { UI.dersId = el.dataset.id; UI.filtre = 'tum'; UI.anim = true; ciz(); scrollTo(0, 0); },
  dersKapat() { UI.dersId = null; UI.anim = true; ciz(); },

  konuEkle(el) {
    kutu('Konu ekle', `<label for="fk">Her satıra bir konu yaz</label>
      <textarea id="fk" name="konular" required placeholder="Hücre zarı&#10;Membran potansiyeli&#10;Aksiyon potansiyeli"></textarea>`, v => {
      const var_ = new Set(dersKonulari(el.dataset.id).map(k => k.ad.toLocaleLowerCase('tr')));
      const adlar = [...new Set(v.konular.split('\n').map(satirTemiz).filter(Boolean))].filter(a => !var_.has(a.toLocaleLowerCase('tr')));
      if (!adlar.length) { toast('Eklenecek yeni konu yok.'); return false; }
      for (const ad of adlar) S.konular.push({ id: uid(), dersId: el.dataset.id, ad, durum: 'yeni', tekrarlar: [] });
      toast(`${adlar.length} konu eklendi`);
    }, 'Ekle');
  },
  konuDuzenle(el) {
    const k = konuBul(el.dataset.id);
    kutu('Konuyu düzenle', `<label for="fa">Konu adı</label><input id="fa" name="ad" required value="${esc(k.ad)}">
      <label for="ft">Tahmini süre (dk) · boş bırakırsan otomatik hesaplanır</label>
      <input id="ft" name="tahmin" type="number" inputmode="numeric" min="5" max="600" step="5" value="${k.tahmin || ''}">
      <label for="fn">Not</label><textarea id="fn" name="not" class="kisa" maxlength="600" placeholder="Örn. Slayt 12-30, hocanın vurguladığı yerler">${esc(k.not || '')}</textarea>
      <label for="fb">Bağlantı (slayt, video, kaynak)</label><input id="fb" name="baglanti" type="text" inputmode="url" autocapitalize="off" placeholder="https://" value="${esc(k.baglanti || '')}">
      <div class="sira" style="margin-top:14px">${k.durum === 'calisildi' ? `<button type="button" class="btn ghost kucuk" data-a="konuSifirla" data-id="${k.id}">Çalışılmadı yap</button>` : ''}
      <button type="button" class="btn tehlike kucuk" data-a="konuSil" data-id="${k.id}">Konuyu sil</button></div>`, v => {
      if (!v.ad.trim()) return false;
      k.ad = v.ad.trim(); k.tahmin = v.tahmin ? sayi(v.tahmin, 0, 5, 600) : undefined;
      let url = (v.baglanti || '').trim();
      if (url && !/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;
      if (url && !guvenliUrl(url)) { toast('Bağlantı http ya da https ile başlamalı.'); return false; }
      k.not = (v.not || '').trim() || undefined; k.baglanti = url || undefined;
    });
  },
  konuSifirla(el) {
    const k = konuBul(el.dataset.id), yeni = { id: k.id, dersId: k.dersId, ad: k.ad, durum: 'yeni', tekrarlar: [] };
    for (const a of ['tahmin', 'not', 'baglanti']) if (k[a]) yeni[a] = k[a];
    S.konular[S.konular.indexOf(k)] = yeni; // algoritmanın eklediği tüm alanlar da temizlenir
    $('#dlg').close(); kaydet(); ciz();
  },
  konuSil(el) {
    if (!confirm('Bu konu silinsin mi?')) return;
    S.konular = S.konular.filter(k => k.id !== el.dataset.id);
    $('#dlg').close(); kaydet(); ciz();
  },
  topluEkle() {
    kutu('Toplu ekle', `<label for="fk">Ders adının sonuna iki nokta koy, altına konularını yaz. Not uygulamasından ya da ders programından yapıştırabilirsin.</label>
      <textarea id="fk" name="metin" required placeholder="Anatomi:&#10;Omuz eklemi&#10;Brakiyal pleksus&#10;&#10;Fizyoloji:&#10;Membran potansiyeli"></textarea>`, v => {
      let ders = null, nd = 0, nk = 0;
      const plan = [];
      for (const ham of v.metin.split('\n')) {
        const x = ham.trim();
        if (!x) continue;
        if (/^#|[:：]$/.test(x)) { ders = satirTemiz(x.replace(/^#+\s*/, '').replace(/[:：]$/, '')); if (ders) plan.push([ders, []]); else ders = null; continue; }
        if (!ders) { toast('İlk satır bir ders adı olmalı, örneğin "Anatomi:".'); return false; }
        const ad = satirTemiz(x); if (ad) plan[plan.length - 1][1].push(ad);
      }
      if (!plan.length) return false;
      for (const [ad, konular] of plan) {
        let d = aktifDersler().find(z => z.ad.toLocaleLowerCase('tr') === ad.toLocaleLowerCase('tr'));
        if (!d) { d = { id: uid(), komiteId: S.aktifKomite, ad, zorluk: 3, renk: RENKLER[aktifDersler().length % RENKLER.length] }; S.dersler.push(d); nd++; }
        const var_ = new Set(dersKonulari(d.id).map(k => k.ad.toLocaleLowerCase('tr')));
        for (const k of konular) if (!var_.has(k.toLocaleLowerCase('tr'))) { var_.add(k.toLocaleLowerCase('tr')); S.konular.push({ id: uid(), dersId: d.id, ad: k, durum: 'yeni', tekrarlar: [] }); nk++; }
      }
      toast(`${nd ? nd + ' ders, ' : ''}${nk} konu eklendi`);
    }, 'Ekle');
  },
  soruEkle(el) {
    const dersId = el.dataset.id;
    kutu('Soru kaydı', `<label for="fk">Konu</label><select id="fk" name="konu">${konuSecenek(dersId, el.dataset.konu || '').replace('Konu belirtme', 'Genel (konu belirtme)')}</select>
      <div class="yanyana uc"><div><label for="fd1">Doğru</label><input id="fd1" name="dogru" type="number" inputmode="numeric" min="0" max="999" required></div>
      <div><label for="fy">Yanlış</label><input id="fy" name="yanlis" type="number" inputmode="numeric" min="0" max="999" value="0"></div>
      <div><label for="fbo">Boş</label><input id="fbo" name="bos" type="number" inputmode="numeric" min="0" max="999" value="0"></div></div>
      <label for="fd">Tarih</label><input id="fd" name="tarih" type="date" required value="${bugun()}" max="${bugun()}">`, v => {
      const dogru = sayi(v.dogru, 0, 0, 999), yanlis = sayi(v.yanlis, 0, 0, 999), bos = sayi(v.bos, 0, 0, 999), top = dogru + yanlis + bos;
      if (!top || !v.tarih) return false;
      S.sorular.push({ id: uid(), tarih: v.tarih, dersId, konuId: v.konu || null, dogru, yanlis, bos });
      // Doğruluk düşükse konunun tekrarı öne alınır.
      const k = konuBul(v.konu), yarin = gunEkle(bugun(), 1);
      if (k && k.durum === 'calisildi' && top >= 5 && dogru / top < .6 && (!k.sonrakiTekrar || k.sonrakiTekrar > yarin)) {
        k.sonrakiTekrar = yarin; toast('Doğruluk düşük çıktı: bu konunun tekrarı yarına alındı.');
      } else toast(`${top} soru kaydedildi.`);
    });
  },
  soruSil(el) {
    if (!confirm('Bu soru kaydı silinsin mi?')) return;
    S.sorular = S.sorular.filter(q => q.id !== el.dataset.id); kaydet(); ciz();
  },
  calistim(el) { puanKutusu(konuBul(el.dataset.id)); },
  tekrarEt(el) { puanKutusu(konuBul(el.dataset.id)); },
  puan(el) {
    const k = konuBul(el.dataset.id), gun = Algo.puanla(S, k, el.dataset.p, bugun());
    $('#dlg').close(); kaydet(); titre(12);
    const kart = UI.sekme === 'bugun' && [...document.querySelectorAll('.is:not(.kompakt)')].find(li => li.querySelector(`[data-id="${k.id}"]`));
    const bitir = () => { ciz(); toast(`Kaydedildi. Sonraki tekrar ${gun} gün sonra.`); };
    if (!kart) return bitir();
    const r = kart.getBoundingClientRect();
    kutla(r.right - 40, r.top + r.height / 2, 16);
    kart.classList.add('bitti');
    setTimeout(() => {
      bitir();
      if (!document.querySelector('.is:not(.kompakt)')) { kutla(innerWidth / 2, innerHeight * .32, 70); titre([20, 60, 20]); }
    }, azHareket() ? 0 : 430);
  },
  // Bugünün programındaki bir işi sayaçla başlatır.
  calis(el) {
    const k = konuBul(el.dataset.id);
    if (S.sayac) { toast('Zaten çalışan bir sayaç var.'); UI.sekme = 'sure'; ciz(); return; }
    S.sayac = { basla: Date.now(), dersId: k.dersId, konuId: k.id, hedef: 0 };
    UI.sekme = 'sure'; kaydet(); ciz(); scrollTo(0, 0);
  },

  sinavEkle() {
    kutu('Yeni sınav', `<label for="fa">Sınav adı</label><input id="fa" name="ad" required value="Komite sınavı">
      <label for="fd">Tarih</label><input id="fd" name="tarih" type="date" required min="${bugun()}">`, v => {
      if (!v.ad.trim() || !v.tarih) return false;
      S.sinavlar.push({ id: uid(), komiteId: S.aktifKomite, ad: v.ad.trim(), tarih: v.tarih });
    });
  },
  sinavDuzenle(el) {
    const s = S.sinavlar.find(x => x.id === el.dataset.id);
    kutu('Sınavı düzenle', `<label for="fa">Sınav adı</label><input id="fa" name="ad" required value="${esc(s.ad)}">
      <label for="fd">Tarih</label><input id="fd" name="tarih" type="date" required value="${s.tarih}">
      ${s.tarih <= bugun() ? `<label for="fno">Aldığın not (100 üzerinden)</label>
        <input id="fno" name="not" type="number" inputmode="numeric" min="0" max="100" value="${s.not ?? ''}" placeholder="Açıklanınca gir">` : ''}
      <p><button type="button" class="btn tehlike kucuk" data-a="sinavSil" data-id="${s.id}">Sınavı sil</button></p>`, v => {
      if (!v.ad.trim() || !v.tarih) return false; s.ad = v.ad.trim(); s.tarih = v.tarih;
      const once = s.not;
      s.not = v.not === undefined || v.not === '' ? undefined : sayi(v.not, 0, 0, 100);
      if (s.not != null && s.not !== once) { s.ayarlandi = false; setTimeout(() => A.sinavAnaliz({ dataset: { id: s.id } }), 0); }
    });
  },
  // Sınav sonrası analiz: o sınava kadar yapılanların dökümü ve nota göre tempo önerisi.
  sinavAnaliz(el) {
    const s = S.sinavlar.find(x => x.id === el.dataset.id);
    if (!s) return;
    const ds = S.dersler.filter(d => d.komiteId === s.komiteId), idler = new Set(ds.map(d => d.id));
    const ks = S.konular.filter(k => idler.has(k.dersId));
    const biten = ks.filter(k => k.calisildiTarih && k.calisildiTarih <= s.tarih).length;
    const tekrar = ks.reduce((a, k) => a + (k.tekrarlar || []).filter(r => r.tarih <= s.tarih).length, 0);
    const dk = S.oturumlar.reduce((a, o) => a + (idler.has(o.dersId) && o.tarih <= s.tarih ? o.dk : 0), 0);
    const so = soruOzet(q => idler.has(q.dersId) && q.tarih <= s.tarih);
    const oran = ks.length ? Math.round(biten / ks.length * 100) : 0, tk = biten ? tekrar / biten : 0;
    const bulgu = [];
    if (ks.length && oran < 90) bulgu.push(`Konuların %${100 - oran} kadarı sınava kadar çalışılmadı. Günlük hedefi biraz yükseltmek ya da komiteye daha erken başlamak en büyük farkı yaratır.`);
    if (biten && tk < 1) bulgu.push(`Çalıştığın konu başına ortalama ${tk.toFixed(1).replace('.', ',')} tekrar yaptın. Her konuyu sınavdan önce en az bir kez tekrar etmek hatırlamayı belirgin artırır.`);
    if (so.top >= 20 && so.oran < 65) bulgu.push(`Soru doğruluğun %${so.oran}. Zorlandığın konulara soru çözerek geri dönmek işe yarar.`);
    if (!so.top) bulgu.push('Bu komitede soru kaydı yok. Soru çözümünü kaydedersen zayıf konular daha erken ortaya çıkar.');
    let karar = 'Notunu girince tempo önerisi burada çıkar.', dugme = '';
    if (s.not != null) {
      if (s.not < 60) { karar = 'Bu tempo istediğin sonucu vermedi. Sonraki komitede tekrarları sıklaştırmanı öneririm.'; dugme = ['0.8', 'Tekrarları sıklaştır']; }
      else if (s.not < 85) { karar = 'Sonuç iyi. Biraz daha sık tekrar notu yukarı taşıyabilir; istersen aynı tempoda da kalabilirsin.'; dugme = ['0.9', 'Tekrarları biraz sıklaştır']; }
      else { karar = 'Tempon işe yarıyor. Tekrarları biraz seyreltip yeni konulara daha çok zaman ayırabilirsin.'; dugme = ['1.15', 'Tekrarları biraz seyrelt']; }
    }
    kutu(`${s.ad} analizi`, `<p class="soluk" style="margin:-8px 0 14px">${esc((S.komiteler.find(k => k.id === s.komiteId) || {}).ad || '')} · ${tarihYaz(s.tarih)}</p>
      <div class="ucluk" style="margin-top:0"><div><b>${s.not ?? '–'}</b><span>not</span></div><div><b>${sureYaz(dk)}</b><span>çalışma</span></div><div><b>%${oran}</b><span>konu bitti</span></div></div>
      <div class="ucluk" style="margin-top:8px"><div><b>${tekrar}</b><span>tekrar</span></div><div><b>${so.top}</b><span>soru</span></div><div><b>${so.oran === null ? '–' : '%' + so.oran}</b><span>doğruluk</span></div></div>
      <div class="dtablo" style="margin-top:16px">${ds.map(d => { const dk2 = dersKonulari(d.id), b = dk2.filter(k => k.calisildiTarih && k.calisildiTarih <= s.tarih).length;
        const sure = S.oturumlar.reduce((a, o) => a + (o.dersId === d.id && o.tarih <= s.tarih ? o.dk : 0), 0);
        return `<span class="ad">${esc(d.ad)}</span><div class="cubuk"><i style="width:${dk2.length ? b / dk2.length * 100 : 0}%;background:${esc(d.renk)}"></i></div>
          <span class="sayi soluk">${b}/${dk2.length}</span><span class="sayi soluk">${sureYaz(sure)}</span>`; }).join('')}</div>
      <ul class="oneri"><li>${ik('hedef')}<span><b>${esc(karar)}</b></span></li>${bulgu.map(x => `<li>${ik('ampul')}<span>${esc(x)}</span></li>`).join('')}</ul>
      ${dugme && !s.ayarlandi ? `<p style="margin:14px 0 0"><button type="button" class="btn blok" data-a="aralikOlcek" data-id="${s.id}" data-k="${dugme[0]}">${dugme[1]}</button></p>
        <p class="soluk kucuk">Şu anki tekrar aralığı tercihin: ${S.ayar.araliklar.join(', ')} gün.</p>` : ''}
      ${s.ayarlandi ? `<p class="soluk kucuk" style="margin-top:14px">Tekrar aralıkları bu sınava göre ayarlandı: ${S.ayar.araliklar.join(', ')} gün.</p>` : ''}`,
      null, '', 'Kapat');
  },
  aralikOlcek(el) {
    const s = S.sinavlar.find(x => x.id === el.dataset.id), k = Number(el.dataset.k);
    S.ayar.araliklar = [...new Set(S.ayar.araliklar.map(x => Math.max(1, Math.round(x * k))))];
    if (s) s.ayarlandi = true;
    $('#dlg').close(); kaydet(); ciz(); toast(`Tekrar aralıkları güncellendi: ${S.ayar.araliklar.join(', ')} gün.`);
  },
  takvimSinav() {
    const t = bugun(), liste = S.sinavlar.filter(x => x.tarih >= t);
    if (!liste.length) return toast('Yaklaşan sınav yok.');
    icsIndir(liste.map(x => ({ uid: 'sinav-' + x.id, tarih: x.tarih, alarm: 1,
      baslik: `${(S.komiteler.find(k => k.id === x.komiteId) || {}).ad || ''} ${x.ad}`.trim() })), 'ders-takip-sinavlar.ics');
  },
  takvimPlan() {
    const gunler = planla().gunler.slice(0, 14).filter(g => g.isler.length);
    if (!gunler.length) return toast('Aktarılacak program yok.');
    icsIndir(gunler.map(g => ({ uid: 'plan-' + g.tarih, tarih: g.tarih,
      baslik: `Ders çalışma: ${g.isler.length} iş · ${sureYaz(g.isler.reduce((a, i) => a + i.dk, 0))}`,
      aciklama: g.isler.map(i => `• ${(dersBul(i.konu.dersId) || {}).ad || ''}: ${i.konu.ad} (${i.dk} dk${i.tip === 'yeni' ? '' : ', tekrar'})`).join('\n') })), 'ders-takip-program.ics');
  },
  sinavSil(el) { S.sinavlar = S.sinavlar.filter(s => s.id !== el.dataset.id); $('#dlg').close(); kaydet(); ciz(); },

  hedefSec(el) { UI.sHedef = el.dataset.v === 'p' ? 'p' : Number(el.dataset.v); ciz(); },
  sayacBasla() {
    const P = UI.sHedef === 'p';
    S.sayac = { basla: Date.now(), dersId: UI.sDers, konuId: UI.sKonu || null, hedef: P ? 0 : UI.sHedef };
    if (P) S.sayac.pomo = { ...S.ayar.pomo };
    kaydet(); ciz();
  },
  sayacDur() {
    const c = S.sayac, pm = pomo(), dk = Math.round((pm ? pm.calisSn : sayacSn()) / 60);
    S.sayac = null;
    if (dk < 1) toast('1 dakikadan kısa olduğu için kaydedilmedi.');
    else { S.oturumlar.push({ id: uid(), tarih: bugun(), dersId: c.dersId, konuId: c.konuId, dk }); toast(`${sureYaz(dk)} kaydedildi.`); }
    kaydet(); ciz();
    const k = dk >= 1 && konuBul(c.konuId);
    if (k) puanKutusu(k, true);
  },
  sayacIptal() { if (confirm('Sayaç kaydedilmeden kapatılsın mı?')) { S.sayac = null; kaydet(); ciz(); } },
  elleEkle() {
    kutu('Elle süre ekle', `<label for="fd">Tarih</label><input id="fd" name="tarih" type="date" required value="${bugun()}" max="${bugun()}">
      <label for="fdk">Süre (dakika)</label><input id="fdk" name="dk" type="number" inputmode="numeric" min="1" max="900" required placeholder="45">
      <p class="soluk kucuk">Ders ve konu, ekranda seçili olanlar olarak kaydedilir.</p>`, v => {
      const dk = sayi(v.dk, 0, 0, 900);
      if (!dk || !v.tarih) return false;
      S.oturumlar.push({ id: uid(), tarih: v.tarih, dersId: UI.sDers, konuId: UI.sKonu || null, dk });
      toast(`${sureYaz(dk)} kaydedildi.`);
    }, 'Ekle');
  },
  oturumSil(el) {
    if (!confirm('Bu süre kaydı silinsin mi?')) return;
    S.oturumlar = S.oturumlar.filter(o => o.id !== el.dataset.id); kaydet(); ciz();
  },

  hafta(el) { UI.hafta = Math.min(0, UI.hafta + Number(el.dataset.n)); UI.anim = true; ciz(); },

  disaAktar() {
    indir(JSON.stringify(S, null, 1), `ders-takip-yedek-${bugun()}.json`, 'application/json');
  },
  iceAktar() { $('#dosya').click(); },
  sifirla() {
    if (!confirm('Tüm dersler, konular ve kayıtlar kalıcı olarak silinecek. Emin misin?')) return;
    S = varsayilan(); temaUygula(); kaydet(); ciz(); toast('Tüm veriler silindi.');
  }
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (el && A[el.dataset.a]) A[el.dataset.a](el);
});

// Konu arama: listeyi yeniden çizmeden süzer, böylece klavye kapanmaz.
document.addEventListener('input', e => {
  if (e.target.id !== 'ara') return;
  const q = e.target.value.trim().toLocaleLowerCase('tr');
  for (const li of document.querySelectorAll('#konular li')) li.hidden = !!q && !li.dataset.ad.includes(q);
});

document.addEventListener('change', e => {
  const el = e.target, d = el.dataset.d;
  if (el.id === 'dosya') {
    const f = el.files[0]; if (!f) return;
    f.text().then(m => {
      const veri = JSON.parse(m);
      if (!veri || !Array.isArray(veri.komiteler)) throw new Error('biçim');
      if (!confirm('Bu cihazdaki mevcut veriler yedekteki verilerle değiştirilecek. Devam edilsin mi?')) return;
      S = duzelt(veri); temaUygula(); kaydet(); ciz(); toast('Yedek geri yüklendi.');
    }).catch(() => toast('Bu dosya geçerli bir Ders Takip yedeği değil.'));
    el.value = '';
    return;
  }
  if (!d) return;
  if (d === 'sDers') { UI.sDers = el.value; UI.sKonu = ''; ciz(); return; }
  if (d === 'sKonu') { UI.sKonu = el.value; return; }
  if (d === 'pomoC' || d === 'pomoM') {
    if (d === 'pomoC') S.ayar.pomo.c = sayi(el.value, 25, 5, 120); else S.ayar.pomo.m = sayi(el.value, 5, 1, 60);
    kaydet(); ciz(); return;
  }
  if (d === 'gunluk') S.ayar.gunluk[Number(el.dataset.i)] = sayi(el.value, 0, 0, 900);
  if (d === 'tekrarGunu') S.ayar.tekrarGunu = sayi(el.value, 1, 0, 14);
  if (d === 'araliklar') {
    const ar = el.value.split(/[^0-9]+/).map(Number).filter(n => n > 0 && n < 400);
    if (!ar.length) { toast('En az bir aralık gir, örneğin 1, 7, 30.'); el.value = S.ayar.araliklar.join(', '); return; }
    S.ayar.araliklar = ar;
  }
  kaydet(); toast('Ayar kaydedildi.');
});

// Gün değişince ya da uygulamaya geri dönünce ekranı tazele.
let sonGun = bugun();
document.addEventListener('visibilitychange', () => {
  if (document.hidden || $('#dlg').open) return;
  if (bugun() !== sonGun) { sonGun = bugun(); ciz(); } else tik();
});

temaUygula();
ciz();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
