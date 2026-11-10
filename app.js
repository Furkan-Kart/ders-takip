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
  uc: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  geri: '<path d="M15 5l-7 7 7 7"/>',
  ileri: '<path d="M9 5l7 7-7 7"/>',
  carpi: '<path d="M6 6l12 12M18 6L6 18"/>'
};
const ik = (ad, dolgu) => `<svg class="ik${dolgu ? ' dolgu' : ''}" viewBox="0 0 24 24" aria-hidden="true">${IK[ad]}</svg>`;
function halka(oran, boy, kalinlik, renk, ic = '', id = '') {
  const r = (boy - kalinlik) / 2, c = 2 * Math.PI * r, o = Math.min(1, Math.max(0, oran || 0));
  return `<div class="halka" style="width:${boy}px;height:${boy}px"><svg viewBox="0 0 ${boy} ${boy}">
    <circle class="iz" cx="${boy / 2}" cy="${boy / 2}" r="${r}" stroke-width="${kalinlik}"/>
    <circle class="dolu" ${id ? `id="${id}" data-c="${c}"` : ''} cx="${boy / 2}" cy="${boy / 2}" r="${r}" stroke-width="${kalinlik}" stroke="${renk}"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - o)}" transform="rotate(-90 ${boy / 2} ${boy / 2})"/></svg>
    <div class="ic">${ic}</div></div>`;
}

/* ---------- veri ---------- */
function varsayilan() {
  const kid = uid();
  return {
    v: 1,
    komiteler: [{ id: kid, ad: '2. Komite' }],
    aktifKomite: kid,
    dersler: [], konular: [], sinavlar: [], oturumlar: [],
    ayar: { gunluk: [120, 120, 120, 120, 120, 180, 180], araliklar: [1, 7, 30], tekrarGunu: 1, tema: '' },
    sayac: null
  };
}
function duzelt(s) {
  const v = varsayilan();
  if (!s || typeof s !== 'object' || !Array.isArray(s.komiteler)) return v;
  for (const k of ['dersler', 'konular', 'sinavlar', 'oturumlar']) if (!Array.isArray(s[k])) s[k] = [];
  for (const k of s.konular) if (!Array.isArray(k.tekrarlar)) k.tekrarlar = [];
  s.ayar = Object.assign(v.ayar, s.ayar || {});
  if (!Array.isArray(s.ayar.gunluk) || s.ayar.gunluk.length !== 7) s.ayar.gunluk = [120, 120, 120, 120, 120, 180, 180];
  if (!Array.isArray(s.ayar.araliklar) || !s.ayar.araliklar.length) s.ayar.araliklar = [1, 7, 30];
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
const UI = { sekme: 'bugun', dersId: null, hafta: 0, sDers: '', sKonu: '', sHedef: 0, gun: 1, filtre: 'tum' };

const dersBul = id => S.dersler.find(d => d.id === id);
const konuBul = id => S.konular.find(k => k.id === id);
const aktifKomite = () => S.komiteler.find(k => k.id === S.aktifKomite);
const aktifDersler = () => S.dersler.filter(d => d.komiteId === S.aktifKomite);
const dersKonulari = id => S.konular.filter(k => k.dersId === id);
const temaUygula = () => { if (S.ayar.tema) document.documentElement.dataset.tema = S.ayar.tema; else delete document.documentElement.dataset.tema; };

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
function isKarti(is, bugunMu) {
  const k = is.konu, d = dersBul(k.dersId) || {};
  const et = is.tip === 'yeni' ? '' :
    is.gecikme ? `<span class="etiket gecikti">${is.gecikme} gün gecikti</span>` :
    `<span class="etiket">${is.tip === 'genel' ? 'Genel tekrar' : 'Tekrar'}</span>`;
  const dugme = !bugunMu ? '' : `<button class="yuv" data-a="calis" data-id="${k.id}" aria-label="Sayaçla çalış" title="Sayaçla çalış">${ik('oynat', 1)}</button>
    <button class="yuv dolu" data-a="${is.tip === 'yeni' ? 'calistim' : 'tekrarEt'}" data-id="${k.id}"
      aria-label="${is.tip === 'yeni' ? 'Çalıştım' : 'Tekrar ettim'}" title="${is.tip === 'yeni' ? 'Çalıştım' : 'Tekrar ettim'}">${ik('tik')}</button>`;
  return `<li class="is ${bugunMu ? '' : 'kompakt'}" style="--renk:${esc(d.renk)}"><div class="orta"><div class="ad">${esc(k.ad)}</div>
    <div class="meta"><span>${esc(d.ad)} · ${is.dk} dk</span>${et}</div>
    ${is.neden ? `<div class="neden">${esc(is.neden)}</div>` : ''}</div>${dugme}</li>`;
}

function durumKarti(p) {
  const o = p.ozet || {};
  if (p.hata) return `<div class="kart kucuk soluk">Program şu an hesaplanamadı. Verilerin güvende; sayfayı yenilemeyi dene.</div>`;
  let sinif = 'rahat', baslik = 'Program yolunda', aciklama = '';
  if (!p.sinav) { baslik = 'Sınav tarihi yok'; sinif = 'sinirda'; aciklama = 'Program şimdilik 14 günlük hazırlanıyor. Sınavı Dersler sekmesinden eklersen ona göre ayarlanır.'; }
  else if (p.yetismeyen.length || o.yetisme === 'yetismiyor') {
    sinif = 'yetismiyor'; baslik = `${p.yetismeyen.length} konu sınava yetişmiyor`;
    aciklama = `Yetişmesi için günde yaklaşık ${p.ekGunluk} dk daha çalışman gerekiyor.`;
  } else if (o.yetisme === 'sinirda') { sinif = 'sinirda'; baslik = 'Program sınırda'; aciklama = 'Her şey yetişiyor ama boşluk kalmıyor; bir günü kaçırırsan sıkışır.'; }
  else if (o.tahminiBitis) aciklama = `Yeni konular bu tempoyla ${tarihYaz(o.tahminiBitis, 'gun')} günü bitiyor.`;
  else if (o.toplamKalanDk === 0) aciklama = 'Tüm konular çalışıldı, geriye tekrarlar kaldı.';
  else aciklama = 'Tüm konular sınavdan önce bitiyor.';
  const oneri = (p.oneriler || []).slice(0, 3);
  return `<div class="kart"><div class="durumk ${sinif}"><span class="isaret"></span><div><b>${esc(baslik)}</b>
    <div class="soluk kucuk">${esc(aciklama)}</div></div></div>
    ${oneri.length ? `<ul class="oneri">${oneri.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>`;
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
  let h = `<section class="hero"><div><p class="ust">${tarihYaz(t, 'uzun')}</p><h1>${selam}</h1>
    <p class="alt">${esc(kom.ad)}</p>
    ${p.sinav ? `<span class="rozet ${sinavG <= 7 ? 'sari' : ''}">${esc(p.sinav.ad)}: ${sinavG} gün</span>` : ''}</div>
    ${halka(hedef ? calisilan / hedef : 0, 104, 10, '#fff', `<b class="sayi">${calisilan}</b><span>/ ${hedef} dk</span>`)}</section>`;
  if (!konuVar) {
    return h + `<div class="kart bos"><p><b>Henüz ders veya konu yok</b></p>
      <p>Derslerini ve konularını ekleyince günlük çalışma programın burada otomatik oluşur.</p>
      <p><button class="btn" data-a="sekme" data-s="dersler">${ik('arti')} Ders ekle</button></p></div>`;
  }
  const g0 = p.gunler[0] || { isler: [] };
  const kalanDk = g0.isler.reduce((a, i) => a + i.dk, 0);
  h += `<div class="kutular"><div class="kutu"><b>${sr}</b><span>günlük seri</span></div>
    <div class="kutu"><b>%${p.ozet.hazirlik ?? 0}</b><span>sınava hazırlık</span></div>
    <div class="kutu"><b>${sureYaz(kalanDk)}</b><span>bugün kalan iş</span></div></div>`;
  let sol = `<h2>Bugünün programı</h2>`;
  sol += g0.isler.length ? `<ul class="isler">${g0.isler.map(i => isKarti(i, true)).join('')}</ul>`
    : `<div class="kart bos"><b>Bugünlük bu kadar</b><br>Planlanan işlerin hepsi tamam.</div>`;
  let sag = `<h2>Program durumu</h2>${durumKarti(p)}`;
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
    <div class="kart"><div class="bas"><b>${tarihYaz(g.tarih, 'uzun')}</b>
      <span class="soluk kucuk">${g.isler.length ? `${g.isler.length} iş · ${sureYaz(dk)}` : 'boş'}</span></div>
      ${g.rezerv ? `<p class="soluk kucuk">Sınav öncesi genel tekrar günü.</p>` : ''}
      ${g.isler.length ? `<ul class="isler" style="margin-top:12px">${g.isler.map(i => isKarti(i, false)).join('')}</ul>`
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
    return `<li><div class="gunkutu ${g >= 0 && g <= 7 ? 'yakin' : ''}"><b>${g < 0 ? '–' : g}</b><span>${g < 0 ? 'geçti' : g === 0 ? 'bugün' : 'gün'}</span></div>
      <div class="orta"><div class="ad">${esc(s.ad)}</div><div class="soluk kucuk">${duzenle ? '' : esc(kom ? kom.ad : '') + ' · '}${tarihYaz(s.tarih)}</div></div>
      ${duzenle ? `<button class="ikon" data-a="sinavDuzenle" data-id="${s.id}" aria-label="Sınavı düzenle">${ik('uc', 1)}</button>` : ''}</li>`;
  }).join('')}</ul>`;
}

const zorlukYaz = z => `<span class="zorluk" aria-label="Zorluk ${z}/5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= z ? 'd' : ''}"></i>`).join('')}</span>`;

function gorDersler() {
  if (UI.dersId && dersBul(UI.dersId)) return gorDers(dersBul(UI.dersId));
  UI.dersId = null;
  const kid = S.aktifKomite, t = bugun();
  let h = `<div class="bas"><h1>Dersler</h1><button class="btn kucuk ghost" data-a="komiteDuzenle">Komiteyi düzenle</button></div>
    <div class="cipler">${S.komiteler.map(k =>
    `<button class="cip ${k.id === kid ? 'secili' : ''}" data-a="komiteSec" data-id="${k.id}">${esc(k.ad)}</button>`).join('')}
    <button class="cip cizgili" data-a="komiteEkle">+ Komite</button></div>`;
  const dersler = aktifDersler();
  h += `<div class="bas"><h2>Dersler</h2><button class="btn kucuk" data-a="dersEkle">${ik('arti')} Ders</button></div>`;
  if (!dersler.length) h += `<div class="kart bos"><b>Bu komitede henüz ders yok</b><br>Örneğin Anatomi, Fizyoloji, Biyokimya ekleyebilirsin.</div>`;
  h += `<div class="izgara">`;
  for (const d of dersler) {
    const ks = dersKonulari(d.id), biten = ks.filter(k => k.durum === 'calisildi').length;
    const vadeli = ks.filter(k => k.durum === 'calisildi' && k.sonrakiTekrar && k.sonrakiTekrar <= t).length;
    const oran = ks.length ? biten / ks.length : 0;
    h += `<button class="kart derskart" data-a="dersAc" data-id="${d.id}">
      ${halka(oran, 62, 7, esc(d.renk), `<span class="sayi">%${Math.round(oran * 100)}</span>`)}
      <div class="orta"><div class="ad">${esc(d.ad)}</div>
      <div class="soluk kucuk">${biten} / ${ks.length} konu · ${zorlukYaz(d.zorluk)}</div>
      ${vadeli ? `<div style="margin-top:4px"><span class="etiket gecikti">${vadeli} tekrar bekliyor</span></div>` : ''}</div>
      <span class="soluk">${ik('ileri')}</span></button>`;
  }
  h += `</div>`;
  const sinavlar = S.sinavlar.filter(s => s.komiteId === kid).sort((a, b) => a.tarih < b.tarih ? -1 : 1);
  h += `<div class="bas"><h2>Sınavlar</h2><button class="btn kucuk" data-a="sinavEkle">${ik('arti')} Sınav</button></div><div class="kart">`;
  h += sinavlar.length ? sinavListe(sinavlar, true) : `<div class="bos">Sınav tarihini ekle; geri sayım ve program buna göre hazırlanır.</div>`;
  return h + `</div>`;
}

function gorDers(d) {
  const tum = dersKonulari(d.id), t = bugun();
  const biten = tum.filter(k => k.durum === 'calisildi').length;
  const oz = Algo.dersOzet(S, d.id, t), carpan = oz.carpan || 1;
  const vadeli = k => k.durum === 'calisildi' && k.sonrakiTekrar && k.sonrakiTekrar <= t;
  const FILTRE = { tum: ['Tümü', () => true], yeni: ['Çalışılmadı', k => k.durum !== 'calisildi'], tekrar: ['Tekrar bekleyen', vadeli], zor: ['Zorlandıklarım', k => k.sonPuan === 'zor'] };
  if (!FILTRE[UI.filtre]) UI.filtre = 'tum';
  const ks = tum.filter(FILTRE[UI.filtre][1]);
  let h = `<div class="bas"><button class="btn kucuk ghost" data-a="dersKapat">${ik('geri')} Dersler</button>
    <button class="btn kucuk ghost" data-a="dersDuzenle" data-id="${d.id}">Düzenle</button></div>
    <div class="dersbas">${halka(tum.length ? biten / tum.length : 0, 84, 9, esc(d.renk), `<b class="sayi">${biten}/${tum.length}</b><span>konu</span>`)}
    <div><h1>${esc(d.ad)}</h1><div class="soluk kucuk">Zorluk ${zorlukYaz(d.zorluk)} · hazırlık %${oz.hazirlik ?? 0}</div></div></div>`;
  if (Math.abs(carpan - 1) >= 0.08) h += `<p class="soluk kucuk">Bu derste konular tahmin edilenden ${carpan > 1 ? 'uzun' : 'kısa'} sürüyor;
    program sürelerini ×${carpan.toFixed(1).replace('.', ',')} ile hesaplıyor.</p>`;
  h += `<div class="bas"><h2>Konular</h2><button class="btn kucuk" data-a="konuEkle" data-id="${d.id}">${ik('arti')} Konu</button></div>`;
  if (!tum.length) return h + `<div class="kart bos"><b>Henüz konu yok</b><br>Konuları her satıra bir tane yazarak toplu ekleyebilirsin.</div>`;
  h += `<div class="cipler">${Object.entries(FILTRE).map(([a, [ad, f]]) =>
    `<button class="cip ${a === UI.filtre ? 'secili' : ''}" data-a="filtre" data-f="${a}">${ad} <span class="sayi" style="opacity:.7">${tum.filter(f).length}</span></button>`).join('')}</div>`;
  if (tum.length > 8) h += `<input type="search" id="ara" placeholder="Konu ara" aria-label="Konu ara" autocomplete="off">`;
  h += `<div class="kart">`;
  if (!ks.length) h += `<div class="bos">Bu filtrede konu yok.</div>`;
  else h += `<ul class="liste" id="konular">${ks.map(k => {
    const tamam = k.durum === 'calisildi';
    let alt = `<span class="soluk">Yaklaşık ${tahminDk(k)} dk</span>`;
    if (tamam) {
      const g = gunFark(t, k.sonrakiTekrar || t), hy = Math.round(hatirlama(k) * 100);
      alt = `<span class="hbar ${hy < 60 ? 'z' : hy < 80 ? 'o' : ''}" title="Tahmini hatırlama"><u style="width:${hy}%"></u></span><span class="soluk sayi">%${hy} · </span>` +
        (g <= 0 ? `<span class="etiket gecikti">Tekrar zamanı</span>` : `<span class="soluk">Tekrar ${tarihYaz(k.sonrakiTekrar, 'gun')}</span>`);
    }
    return `<li data-ad="${esc(k.ad.toLocaleLowerCase('tr'))}"><button class="durum ${tamam ? 'tamam' : ''}" data-a="${tamam ? 'tekrarEt' : 'calistim'}" data-id="${k.id}"
      aria-label="${tamam ? 'Tekrar ettim' : 'Çalıştım'}">${tamam ? ik('tik') : ''}</button>
      <div class="orta"><div class="ad">${esc(k.ad)}</div><div class="kucuk">${alt}</div></div>
      <button class="ikon" data-a="konuDuzenle" data-id="${k.id}" aria-label="Konuyu düzenle">${ik('uc', 1)}</button></li>`;
  }).join('')}</ul>`;
  return h + `</div>`;
}

function sayacSn() { return S.sayac ? Math.max(0, Math.floor((Date.now() - S.sayac.basla) / 1000)) : 0; }
function sayacYazi() {
  const sn = sayacSn();
  return `${sn >= 3600 ? pad(Math.floor(sn / 3600)) + ':' : ''}${pad(Math.floor(sn / 60) % 60)}:${pad(sn % 60)}`;
}
const sayacOran = () => !S.sayac ? 0 : S.sayac.hedef ? sayacSn() / (S.sayac.hedef * 60) : (sayacSn() % 3600) / 3600;
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
  let h = `<h1>Çalışma süresi</h1>`;
  if (!S.dersler.length) return h + `<div class="kart bos"><b>Önce bir ders ekle</b><br>Süre kayıtları derslere bağlı tutulur.
    <p><button class="btn" data-a="sekme" data-s="dersler">${ik('arti')} Ders ekle</button></p></div>`;
  const c = S.sayac;
  if (!dersBul(UI.sDers)) { UI.sDers = (aktifDersler()[0] || S.dersler[0]).id; UI.sKonu = ''; }
  if (c) {
    const d = dersBul(c.dersId), k = konuBul(c.konuId);
    h += `<div class="kart sayac">${halka(sayacOran(), 240, 14, esc(d ? d.renk : 'var(--ana)'),
      `<div class="zaman" id="zaman">${sayacYazi()}</div><small>${c.hedef ? `hedef ${c.hedef} dk` : 'serbest'}</small>`, 'zhalka')}
      <div style="text-align:center"><b>${esc(d ? d.ad : 'Silinmiş ders')}</b>${k ? `<div class="soluk kucuk">${esc(k.ad)}</div>` : ''}</div>
      <div class="sira" style="justify-content:center"><button class="btn" data-a="sayacDur">Bitir ve kaydet</button>
      <button class="btn ghost" data-a="sayacIptal">Vazgeç</button></div>
      <p class="soluk kucuk" style="text-align:center">Uygulamayı kapatsan da sayaç çalışmaya devam eder.</p></div>`;
  } else {
    h += `<div class="kart sayac">${halka(0, 200, 14, 'var(--ana)', `<div class="zaman">${UI.sHedef ? pad(UI.sHedef) + ':00' : '00:00'}</div><small>${UI.sHedef ? 'hedef süre' : 'serbest'}</small>`)}
      <div class="alan"><div class="bolme" role="group" aria-label="Hedef süre">${[[0, 'Serbest'], [25, '25 dk'], [50, '50 dk'], [90, '90 dk']].map(([v, ad]) =>
        `<button class="${UI.sHedef === v ? 'secili' : ''}" data-a="hedefSec" data-v="${v}">${ad}</button>`).join('')}</div>
      <label for="sDers">Ders</label><select id="sDers" data-d="sDers">${dersSecenek(UI.sDers)}</select>
      <label for="sKonu">Konu</label><select id="sKonu" data-d="sKonu">${konuSecenek(UI.sDers, UI.sKonu)}</select></div>
      <div class="sira" style="justify-content:center;margin-top:6px"><button class="btn" data-a="sayacBasla">${ik('oynat', 1)} Başlat</button>
      <button class="btn ghost" data-a="elleEkle">Elle süre ekle</button></div></div>`;
  }
  const son = [...S.oturumlar].sort((a, b) => a.tarih < b.tarih ? 1 : a.tarih > b.tarih ? -1 : b.id < a.id ? -1 : 1).slice(0, 40);
  h += `<h2>Son kayıtlar</h2><div class="kart">`;
  if (!son.length) h += `<div class="bos">Henüz kayıt yok.</div>`;
  else {
    let gun = '';
    h += `<ul class="liste">`;
    for (const o of son) {
      if (o.tarih !== gun) {
        gun = o.tarih;
        const top = S.oturumlar.reduce((a, x) => a + (x.tarih === gun ? x.dk : 0), 0);
        h += `<li class="gunbas" style="padding-bottom:0"><span>${gun === bugun() ? 'Bugün' : tarihYaz(gun)}</span><span>${sureYaz(top)}</span></li>`;
      }
      const d = dersBul(o.dersId) || { ad: 'Silinmiş ders', renk: '#888' }, k = konuBul(o.konuId);
      h += `<li style="border-top:0"><span class="nokta" style="background:${esc(d.renk)}"></span><div class="orta"><div class="ad">${esc(d.ad)}</div>
        ${k ? `<div class="soluk kucuk">${esc(k.ad)}</div>` : ''}</div><span class="sayi">${sureYaz(o.dk)}</span>
        <button class="ikon" data-a="oturumSil" data-id="${o.id}" aria-label="Kaydı sil">${ik('carpi')}</button></li>`;
    }
    h += `</ul>`;
  }
  return h + `</div>`;
}

function gorOzet() {
  const t = bugun(), bas = gunEkle(haftaBasi(t), UI.hafta * 7), son = gunEkle(bas, 6);
  const gunDk = new Map();
  for (const o of S.oturumlar) gunDk.set(o.tarih, (gunDk.get(o.tarih) || 0) + o.dk);
  const gunluk = Array.from({ length: 7 }, (_, i) => gunDk.get(gunEkle(bas, i)) || 0), dersDk = new Map();
  for (const o of S.oturumlar) if (o.tarih >= bas && o.tarih <= son) dersDk.set(o.dersId, (dersDk.get(o.dersId) || 0) + o.dk);
  const toplam = gunluk.reduce((a, b) => a + b, 0), mx = Math.max(...gunluk, 1);
  let yeni = 0, tekrar = 0;
  for (const k of S.konular) {
    if (k.calisildiTarih >= bas && k.calisildiTarih <= son) yeni++;
    for (const r of k.tekrarlar || []) if (r.tarih >= bas && r.tarih <= son) tekrar++;
  }
  const hedef = S.ayar.gunluk.reduce((a, b) => a + b, 0);
  let h = `<h1>Özet</h1><div class="bas" style="margin-top:10px"><button class="btn kucuk ghost" data-a="hafta" data-n="-1" aria-label="Önceki hafta">${ik('geri')}</button>
    <b>${tarihYaz(bas, 'gun')} – ${tarihYaz(son, 'gun')}${UI.hafta === 0 ? ' · bu hafta' : ''}</b>
    <button class="btn kucuk ghost" data-a="hafta" data-n="1" ${UI.hafta >= 0 ? 'disabled' : ''} aria-label="Sonraki hafta">${ik('ileri')}</button></div>
    <div class="kutular dort" style="margin-top:12px"><div class="kutu"><b>${sureYaz(toplam)}</b><span>toplam çalışma</span></div>
    <div class="kutu"><b>%${hedef ? Math.round(toplam / hedef * 100) : 0}</b><span>haftalık hedef</span></div>
    <div class="kutu"><b>${yeni}</b><span>yeni konu</span></div><div class="kutu"><b>${tekrar}</b><span>tekrar</span></div></div>
    <div class="iki"><div><div class="kart"><b>Günlere göre</b>
    <div class="grafik">${gunluk.map((dk, i) => `<div class="s ${gunEkle(bas, i) === t ? 'bugun' : ''}">
      <span class="d">${dk ? (dk >= 60 ? (dk / 60).toFixed(1).replace('.', ',') + ' sa' : dk + ' dk') : ''}</span>
      <div class="b ${dk ? '' : 'sifir'}" style="height:${dk / mx * 100}%"></div><span class="g">${GUN_KISA[i]}</span></div>`).join('')}</div></div>`;
  h += `<div class="kart"><b>Derslere göre</b>`;
  const sirali = [...dersDk.entries()].sort((a, b) => b[1] - a[1]);
  if (!sirali.length) h += `<div class="bos">Bu hafta kayıtlı çalışma yok.</div>`;
  for (const [id, dk] of sirali) {
    const d = dersBul(id) || { ad: 'Silinmiş ders', renk: '#888' };
    h += `<div class="yatay"><span class="ad">${esc(d.ad)}</span><div class="cubuk"><i style="width:${dk / sirali[0][1] * 100}%;background:${esc(d.renk)}"></i></div>
      <span class="soluk sayi">${sureYaz(dk)}</span></div>`;
  }
  h += `</div></div><div>`;
  // Son 16 haftanın ısı haritası
  const HAFTA = 16, ilk = gunEkle(haftaBasi(t), -(HAFTA - 1) * 7), ort = Math.max(30, hedef / 7);
  let hucre = '';
  for (let i = 0; i < HAFTA * 7; i++) {
    const g = gunEkle(ilk, i);
    if (g > t) { hucre += `<i style="visibility:hidden"></i>`; continue; }
    const dk = gunDk.get(g) || 0, s = !dk ? 0 : dk < ort * .34 ? 1 : dk < ort * .67 ? 2 : dk < ort ? 3 : 4;
    hucre += `<i class="s${s} ${g === t ? 'bg' : ''}" title="${tarihYaz(g)}: ${sureYaz(dk)}"></i>`;
  }
  const aktif = [...gunDk.keys()].filter(g => g >= ilk).length;
  h += `<div class="kart"><div class="bas"><b>Son ${HAFTA} hafta</b><span class="soluk kucuk">${seri()} günlük seri · ${aktif} aktif gün</span></div>
    <div class="isi" role="img" aria-label="Son ${HAFTA} haftada ${aktif} gün çalışma kaydı var">${hucre}</div>
    <div class="lejant">az <i></i><i class="s1"></i><i class="s2"></i><i class="s3"></i><i class="s4"></i> çok</div></div>`;
  const dersler = aktifDersler();
  const tum = dersler.flatMap(d => dersKonulari(d.id)), bit = tum.filter(k => k.durum === 'calisildi').length;
  h += `<div class="kart"><div class="bas"><b>${esc(aktifKomite().ad)}</b><span class="sayi">${bit} / ${tum.length} konu</span></div>
    <div class="cubuk"><i style="width:${tum.length ? bit / tum.length * 100 : 0}%"></i></div>`;
  for (const d of dersler) {
    const ks = dersKonulari(d.id), b = ks.filter(k => k.durum === 'calisildi').length;
    h += `<div class="yatay"><span class="ad">${esc(d.ad)}</span><div class="cubuk"><i style="width:${ks.length ? b / ks.length * 100 : 0}%;background:${esc(d.renk)}"></i></div>
      <span class="soluk sayi">${b}/${ks.length}</span></div>`;
  }
  return h + `</div></div></div>`;
}

function gorAyarlar() {
  const a = S.ayar;
  return `<h1>Ayarlar</h1><div class="iki"><div>
  <div class="kart"><b>Görünüm</b>
    <div class="bolme" style="margin-top:10px" role="group" aria-label="Tema">${[['', 'Sistem'], ['acik', 'Açık'], ['koyu', 'Koyu']].map(([v, ad]) =>
      `<button class="${(a.tema || '') === v ? 'secili' : ''}" data-a="tema" data-v="${v}">${ad}</button>`).join('')}</div></div>
  <div class="kart"><b>Günlük çalışma hedefi (dakika)</b>
    <p class="soluk kucuk">Program her güne en fazla bu kadar iş yazar. Çalışmayacağın güne 0 yaz.</p>
    <div class="gunler">${GUN_KISA.map((g, i) => `<div><label for="g${i}">${g}</label>
      <input id="g${i}" type="number" inputmode="numeric" min="0" max="900" step="5" value="${a.gunluk[i]}" data-d="gunluk" data-i="${i}"></div>`).join('')}</div></div>
  <div class="kart"><b>Tekrar ve sınav</b>
    <label for="ar">Temel tekrar aralıkları (gün, virgülle ayır)</label>
    <input id="ar" type="text" inputmode="numeric" value="${a.araliklar.join(', ')}" data-d="araliklar">
    <label for="tg">Sınavdan önce genel tekrara ayrılacak gün sayısı</label>
    <input id="tg" type="number" inputmode="numeric" min="0" max="14" value="${a.tekrarGunu}" data-d="tekrarGunu"></div>
  </div><div>
  <div class="kart"><b>Yedekleme</b>
    <p class="soluk kucuk">Verilerin yalnızca bu cihazda durur. Ara sıra yedek dosyası indirmeni öneririm; başka cihaza taşımak için de aynı dosyayı geri yüklersin.</p>
    <div class="sira"><button class="btn" data-a="disaAktar">Yedeği indir</button>
    <button class="btn ghost" data-a="iceAktar">Yedekten geri yükle</button></div>
    <input type="file" id="dosya" accept="application/json,.json" hidden></div>
  <div class="kart"><b>Telefona kurulum</b>
    <p class="soluk kucuk">Android (Chrome): menü › "Ana ekrana ekle" ya da "Uygulamayı yükle". iPhone ve iPad (Safari): Paylaş › "Ana Ekrana Ekle".
    Kurulduktan sonra internet olmadan da açılır.</p></div>
  <div class="kart"><button class="btn tehlike" data-a="sifirla">Tüm verileri sil</button></div>
  <p class="soluk kucuk" style="text-align:center">Ders Takip · sürüm 1.1</p></div></div>`;
}

const GORUNUM = { bugun: gorBugun, dersler: gorDersler, sure: gorSure, ozet: gorOzet, ayarlar: gorAyarlar };
function ciz() {
  $('#app').innerHTML = GORUNUM[UI.sekme]();
  for (const b of document.querySelectorAll('#nav button')) b.classList.toggle('secili', b.dataset.s === UI.sekme);
  const sec = $('.gunp.secili');
  if (sec) sec.scrollIntoView({ inline: 'center', block: 'nearest' });
  tik();
}

// Saniyede bir: çalışan sayacın ekrandaki yazısını ve halkasını günceller.
function tik() {
  const mini = $('#mini'), c = S.sayac;
  if (!c) { mini.hidden = true; return; }
  const yazi = sayacYazi(), d = dersBul(c.dersId);
  mini.hidden = UI.sekme === 'sure';
  mini.textContent = `${yazi} · ${d ? d.ad : ''}`;
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
  kutu(baslik, `<p class="soluk">${esc(k.ad)}</p><div class="puanbuyuk">
    ${['zor', 'orta', 'kolay'].map(p => `<button type="button" class="${p}R" data-a="puan" data-id="${k.id}" data-p="${p}">
    ${PUAN_AD[p]}<small>${Algo.sonrakiAralik(S, k, p, bugun())} gün sonra tekrar</small></button>`).join('')}</div>`,
    null, '', sayactan ? 'Henüz bitmedi' : 'Vazgeç');
}

/* ---------- eylemler ---------- */
const A = {
  sekme(el) {
    UI.sekme = el.dataset.s; if (UI.sekme !== 'dersler') UI.dersId = null; ciz(); scrollTo(0, 0);
    const app = $('#app'); app.classList.remove('gir'); void app.offsetWidth; app.classList.add('gir');
  },
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
  dersAc(el) { UI.dersId = el.dataset.id; UI.filtre = 'tum'; ciz(); scrollTo(0, 0); },
  dersKapat() { UI.dersId = null; ciz(); },

  konuEkle(el) {
    kutu('Konu ekle', `<label for="fk">Her satıra bir konu yaz</label>
      <textarea id="fk" name="konular" required placeholder="Hücre zarı&#10;Membran potansiyeli&#10;Aksiyon potansiyeli"></textarea>`, v => {
      const adlar = v.konular.split('\n').map(s => s.trim()).filter(Boolean);
      if (!adlar.length) return false;
      for (const ad of adlar) S.konular.push({ id: uid(), dersId: el.dataset.id, ad, durum: 'yeni', tekrarlar: [] });
      toast(`${adlar.length} konu eklendi`);
    }, 'Ekle');
  },
  konuDuzenle(el) {
    const k = konuBul(el.dataset.id);
    kutu('Konuyu düzenle', `<label for="fa">Konu adı</label><input id="fa" name="ad" required value="${esc(k.ad)}">
      <label for="ft">Tahmini süre (dk) · boş bırakırsan otomatik hesaplanır</label>
      <input id="ft" name="tahmin" type="number" inputmode="numeric" min="5" max="600" step="5" value="${k.tahmin || ''}">
      <div class="sira" style="margin-top:14px">${k.durum === 'calisildi' ? `<button type="button" class="btn ghost kucuk" data-a="konuSifirla" data-id="${k.id}">Çalışılmadı yap</button>` : ''}
      <button type="button" class="btn tehlike kucuk" data-a="konuSil" data-id="${k.id}">Konuyu sil</button></div>`, v => {
      if (!v.ad.trim()) return false;
      k.ad = v.ad.trim(); k.tahmin = v.tahmin ? sayi(v.tahmin, 0, 5, 600) : undefined;
    });
  },
  konuSifirla(el) {
    const k = konuBul(el.dataset.id), yeni = { id: k.id, dersId: k.dersId, ad: k.ad, durum: 'yeni', tekrarlar: [] };
    if (k.tahmin) yeni.tahmin = k.tahmin;
    S.konular[S.konular.indexOf(k)] = yeni; // algoritmanın eklediği tüm alanlar da temizlenir
    $('#dlg').close(); kaydet(); ciz();
  },
  konuSil(el) {
    if (!confirm('Bu konu silinsin mi?')) return;
    S.konular = S.konular.filter(k => k.id !== el.dataset.id);
    $('#dlg').close(); kaydet(); ciz();
  },
  calistim(el) { puanKutusu(konuBul(el.dataset.id)); },
  tekrarEt(el) { puanKutusu(konuBul(el.dataset.id)); },
  puan(el) {
    const k = konuBul(el.dataset.id), gun = Algo.puanla(S, k, el.dataset.p, bugun());
    $('#dlg').close(); kaydet(); ciz();
    toast(`Kaydedildi. Sonraki tekrar ${gun} gün sonra.`);
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
      <p><button type="button" class="btn tehlike kucuk" data-a="sinavSil" data-id="${s.id}">Sınavı sil</button></p>`, v => {
      if (!v.ad.trim() || !v.tarih) return false; s.ad = v.ad.trim(); s.tarih = v.tarih;
    });
  },
  sinavSil(el) { S.sinavlar = S.sinavlar.filter(s => s.id !== el.dataset.id); $('#dlg').close(); kaydet(); ciz(); },

  hedefSec(el) { UI.sHedef = Number(el.dataset.v); ciz(); },
  sayacBasla() {
    S.sayac = { basla: Date.now(), dersId: UI.sDers, konuId: UI.sKonu || null, hedef: UI.sHedef };
    kaydet(); ciz();
  },
  sayacDur() {
    const c = S.sayac, dk = Math.round((Date.now() - c.basla) / 60000);
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

  hafta(el) { UI.hafta = Math.min(0, UI.hafta + Number(el.dataset.n)); ciz(); },

  disaAktar() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }));
    a.download = `ders-takip-yedek-${bugun()}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
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
