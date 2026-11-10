'use strict';
/* Ders Takip — tüm veri yalnızca bu cihazda (localStorage) tutulur. */

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
const tarihYaz = (s, uzun) => tarih(s).toLocaleDateString('tr-TR', uzun
  ? { day: 'numeric', month: 'long', weekday: 'long' }
  : { day: 'numeric', month: 'short', weekday: 'short' });
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
  clearTimeout(toast.z); toast.z = setTimeout(() => t.classList.remove('goster'), 2600);
}

/* ---------- veri ---------- */
function varsayilan() {
  const kid = uid();
  return {
    v: 1,
    komiteler: [{ id: kid, ad: '2. Komite' }],
    aktifKomite: kid,
    dersler: [], konular: [], sinavlar: [], oturumlar: [],
    ayar: { gunluk: [120, 120, 120, 120, 120, 180, 180], araliklar: [1, 7, 30], tekrarGunu: 1 },
    sayac: null
  };
}
function duzelt(s) {
  const v = varsayilan();
  if (!s || typeof s !== 'object' || !Array.isArray(s.komiteler)) return v;
  for (const k of ['dersler', 'konular', 'sinavlar', 'oturumlar']) if (!Array.isArray(s[k])) s[k] = [];
  s.ayar = Object.assign(v.ayar, s.ayar || {});
  if (!Array.isArray(s.ayar.gunluk) || s.ayar.gunluk.length !== 7) s.ayar.gunluk = v.ayar.gunluk;
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
const UI = { sekme: 'bugun', dersId: null, hafta: 0, sDers: '', sKonu: '' };

const dersBul = id => S.dersler.find(d => d.id === id);
const konuBul = id => S.konular.find(k => k.id === id);
const aktifDersler = () => S.dersler.filter(d => d.komiteId === S.aktifKomite);
const dersKonulari = id => S.konular.filter(k => k.dersId === id);

/* ---------- algoritma köprüsü (asıl mantık algoritma.js içinde) ---------- */
const tahminDk = k => Algo.tahminDk(S, k);
const kisiselCarpan = id => Algo.kisiselCarpan(S, id);
const planla = () => Algo.planla(S, bugun());

/* ---------- görünümler ---------- */
function isSatiri(is, bugunMu) {
  const k = is.konu, d = dersBul(k.dersId) || {};
  const et = is.tip === 'yeni' ? '' :
    is.gecikme ? `<span class="etiket gecikti">${is.gecikme} gün gecikti</span>` :
    `<span class="etiket tekrar">${is.tip === 'genel' ? 'Genel tekrar' : 'Tekrar'}</span>`;
  let sag = `<span class="soluk kucuk">${is.dk} dk</span>`;
  if (bugunMu) sag = is.tip === 'yeni'
    ? `<button class="btn kucuk" data-a="calistim" data-id="${k.id}">Çalıştım</button>`
    : `<button class="btn kucuk ghost" data-a="tekrarEt" data-id="${k.id}">Tekrar ettim</button>`;
  return `<li><span class="nokta" style="background:${esc(d.renk)}"></span>
    <div class="orta"><div class="ad">${esc(k.ad)}</div>
    <div class="soluk kucuk">${esc(d.ad)}${bugunMu ? ` · ${is.dk} dk` : ''} ${et}</div></div>${sag}</li>`;
}

function sinavKartlari() {
  const t = bugun();
  const liste = S.sinavlar.filter(s => s.tarih >= t).sort((a, b) => a.tarih < b.tarih ? -1 : 1).slice(0, 4);
  if (!liste.length) return '';
  return `<div class="sinavlar">${liste.map(s => {
    const g = gunFark(t, s.tarih), kom = S.komiteler.find(k => k.id === s.komiteId);
    return `<div class="sinav ${g <= 7 ? 'yakin' : ''}"><div class="gun">${g === 0 ? 'Bugün' : g + ' gün'}</div>
      <div><b>${esc(s.ad)}</b></div><div class="soluk kucuk">${esc(kom ? kom.ad : '')} · ${tarihYaz(s.tarih)}</div></div>`;
  }).join('')}</div>`;
}

function gorBugun() {
  const t = bugun(), kom = S.komiteler.find(k => k.id === S.aktifKomite);
  const dersler = aktifDersler();
  let h = `<p class="soluk kucuk">${tarihYaz(t, true)}</p><h1>Bugün</h1><p class="soluk">${esc(kom.ad)}</p>${sinavKartlari()}`;
  const konuVar = dersler.some(d => dersKonulari(d.id).length);
  if (!konuVar) {
    return h + `<div class="kart bos"><p><b>Henüz ders veya konu yok.</b></p>
      <p>Derslerini ve konularını ekleyince günlük çalışma programın burada otomatik oluşur.</p>
      <p><button class="btn" data-a="sekme" data-s="dersler">Ders ekle</button></p></div>`;
  }
  const p = planla(), g0 = p.gunler[0];
  const hedef = S.ayar.gunluk[haftaGunu(t)];
  const calisilan = S.oturumlar.reduce((a, o) => a + (o.tarih === t ? o.dk : 0), 0);
  h += `<div class="kart"><div class="bas"><b>Bugünkü çalışma</b><span>${sureYaz(calisilan)} / ${sureYaz(hedef)}</span></div>
    <div class="cubuk"><i style="width:${hedef ? Math.min(100, calisilan / hedef * 100) : 0}%"></i></div></div>`;
  if (!p.sinav) h += `<div class="kart kucuk soluk">Bu komite için ileri tarihli bir sınav girilmemiş. Program şimdilik 14 günlük hazırlanıyor;
    sınav tarihini Dersler sekmesinden eklersen ona göre ayarlanır.</div>`;
  if (p.yetismeyen.length) h += `<div class="kart uyari kucuk"><b>Bu tempoyla ${p.yetismeyen.length} konu sınava yetişmiyor.</b>
    Yetişmesi için günlük hedefi yaklaşık ${p.ekGunluk} dk artırman gerekiyor (Ayarlar).</div>`;
  h += `<h2>Bugünün programı</h2><div class="kart">`;
  if (g0 && g0.isler.length) {
    const sirali = [...g0.isler].sort((a, b) => (a.tip === 'yeni') - (b.tip === 'yeni'));
    h += `<ul class="liste">${sirali.map(i => isSatiri(i, true)).join('')}</ul>`;
  } else h += `<div class="bos">Bugün için planlanmış iş kalmadı.</div>`;
  h += `</div>`;
  const sonra = p.gunler.slice(1, 8);
  if (sonra.length) {
    h += `<h2>Önümüzdeki günler</h2><div class="kart">${sonra.map(g => {
      const dk = g.isler.reduce((a, i) => a + i.dk, 0);
      return `<details class="gun"><summary><span>${tarihYaz(g.tarih)}${g.rezerv ? ' · <span class="soluk">genel tekrar</span>' : ''}</span>
        <span class="soluk kucuk">${g.isler.length ? `${g.isler.length} iş · ${sureYaz(dk)}` : 'boş'}</span></summary>
        ${g.isler.length ? `<ul class="liste">${g.isler.map(i => isSatiri(i, false)).join('')}</ul>` : ''}</details>`;
    }).join('')}</div>`;
  }
  return h;
}

function zorlukYaz(z) { return `<span class="zorluk"><b>${'●'.repeat(z)}</b>${'●'.repeat(5 - z)}</span>`; }

function gorDersler() {
  if (UI.dersId && dersBul(UI.dersId)) return gorDers(dersBul(UI.dersId));
  UI.dersId = null;
  const kid = S.aktifKomite, t = bugun();
  let h = `<h1>Dersler</h1><div class="cipler">${S.komiteler.map(k =>
    `<button class="cip ${k.id === kid ? 'secili' : ''}" data-a="komiteSec" data-id="${k.id}">${esc(k.ad)}</button>`).join('')}
    <button class="cip" data-a="komiteEkle">+ Komite</button></div>`;
  const dersler = aktifDersler();
  h += `<div class="bas"><h2>Dersler</h2><div class="sira"><button class="btn kucuk ghost" data-a="komiteDuzenle">Komiteyi düzenle</button>
    <button class="btn kucuk" data-a="dersEkle">+ Ders</button></div></div>`;
  if (!dersler.length) h += `<div class="kart bos">Bu komitede henüz ders yok. Örneğin Anatomi, Fizyoloji, Biyokimya ekleyebilirsin.</div>`;
  for (const d of dersler) {
    const ks = dersKonulari(d.id), biten = ks.filter(k => k.durum === 'calisildi').length;
    const vadeli = ks.filter(k => k.durum === 'calisildi' && k.sonrakiTekrar && k.sonrakiTekrar <= t).length;
    h += `<button class="kart derskart" style="border-left-color:${esc(d.renk)}" data-a="dersAc" data-id="${d.id}">
      <div class="bas"><b>${esc(d.ad)}</b>${zorlukYaz(d.zorluk)}</div>
      <div class="soluk kucuk">${biten} / ${ks.length} konu çalışıldı${vadeli ? ` · ${vadeli} tekrar bekliyor` : ''}</div>
      <div class="cubuk"><i style="width:${ks.length ? biten / ks.length * 100 : 0}%;background:${esc(d.renk)}"></i></div></button>`;
  }
  const sinavlar = S.sinavlar.filter(s => s.komiteId === kid).sort((a, b) => a.tarih < b.tarih ? -1 : 1);
  h += `<div class="bas"><h2>Sınavlar</h2><button class="btn kucuk" data-a="sinavEkle">+ Sınav</button></div><div class="kart">`;
  h += sinavlar.length ? `<ul class="liste">${sinavlar.map(s => {
    const g = gunFark(t, s.tarih);
    return `<li><div class="orta"><div class="ad">${esc(s.ad)}</div><div class="soluk kucuk">${tarihYaz(s.tarih)} ·
      ${g > 0 ? g + ' gün kaldı' : g === 0 ? 'bugün' : 'geçti'}</div></div>
      <button class="ikon" data-a="sinavDuzenle" data-id="${s.id}" aria-label="Sınavı düzenle">⋯</button></li>`;
  }).join('')}</ul>` : `<div class="bos">Sınav tarihini ekle; geri sayım ve program buna göre hazırlanır.</div>`;
  return h + `</div>`;
}

function gorDers(d) {
  const ks = dersKonulari(d.id), t = bugun();
  const biten = ks.filter(k => k.durum === 'calisildi').length;
  const carpan = kisiselCarpan(d.id);
  let h = `<div class="bas"><button class="btn kucuk ghost" data-a="dersKapat">‹ Dersler</button>
    <button class="btn kucuk ghost" data-a="dersDuzenle" data-id="${d.id}">Dersi düzenle</button></div>
    <h1>${esc(d.ad)}</h1><p class="soluk">Zorluk ${zorlukYaz(d.zorluk)} · ${biten} / ${ks.length} konu</p>
    <div class="cubuk"><i style="width:${ks.length ? biten / ks.length * 100 : 0}%;background:${esc(d.renk)}"></i></div>`;
  if (carpan !== 1) h += `<p class="soluk kucuk">Bu derste konular tahmin edilenin ${carpan > 1 ? 'üzerinde' : 'altında'} süre alıyor;
    program süreleri ×${carpan.toFixed(1)} ile hesaplanıyor.</p>`;
  h += `<div class="bas"><h2>Konular</h2><button class="btn kucuk" data-a="konuEkle" data-id="${d.id}">+ Konu</button></div><div class="kart">`;
  if (!ks.length) h += `<div class="bos">Konuları tek tek ya da her satıra bir konu yazarak toplu ekleyebilirsin.</div>`;
  else h += `<ul class="liste">${ks.map(k => {
    const tamam = k.durum === 'calisildi';
    let alt = `<span class="soluk">Çalışılmadı · yaklaşık ${tahminDk(k)} dk</span>`;
    if (tamam) {
      const g = gunFark(t, k.sonrakiTekrar);
      alt = `<span class="${k.sonPuan}R">${PUAN_AD[k.sonPuan] || ''}</span> · ` + (g <= 0
        ? `<span class="etiket gecikti">Tekrar zamanı</span>`
        : `<span class="soluk">Tekrar: ${tarihYaz(k.sonrakiTekrar)}</span>`) +
        ` <span class="soluk">· ${(k.tekrarlar || []).length} tekrar</span>`;
    }
    return `<li><button class="durum ${tamam ? 'tamam' : ''}" data-a="${tamam ? 'tekrarEt' : 'calistim'}" data-id="${k.id}"
      aria-label="${tamam ? 'Tekrar ettim' : 'Çalıştım'}">${tamam ? '✓' : ''}</button>
      <div class="orta"><div class="ad">${esc(k.ad)}</div><div class="kucuk">${alt}</div></div>
      <button class="ikon" data-a="konuDuzenle" data-id="${k.id}" aria-label="Konuyu düzenle">⋯</button></li>`;
  }).join('')}</ul>`;
  return h + `</div>`;
}

function sayacYazi() {
  if (!S.sayac) return '00:00:00';
  const sn = Math.max(0, Math.floor((Date.now() - S.sayac.basla) / 1000));
  return `${pad(Math.floor(sn / 3600))}:${pad(Math.floor(sn / 60) % 60)}:${pad(sn % 60)}`;
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
  let h = `<h1>Çalışma süresi</h1>`;
  if (!S.dersler.length) return h + `<div class="kart bos">Süre kaydetmek için önce Dersler sekmesinden bir ders ekle.</div>`;
  const c = S.sayac;
  if (!dersBul(UI.sDers)) { UI.sDers = (aktifDersler()[0] || S.dersler[0]).id; UI.sKonu = ''; }
  if (c) {
    const d = dersBul(c.dersId), k = konuBul(c.konuId);
    h += `<div class="kart sayac"><div class="soluk">${esc(d ? d.ad : 'Silinmiş ders')}${k ? ' · ' + esc(k.ad) : ''}</div>
      <div class="zaman" id="zaman">${sayacYazi()}</div>
      <div class="sira" style="justify-content:center"><button class="btn" data-a="sayacDur">Bitir ve kaydet</button>
      <button class="btn ghost" data-a="sayacIptal">Vazgeç</button></div>
      <p class="soluk kucuk">Uygulamayı kapatsan da sayaç çalışmaya devam eder.</p></div>`;
  } else {
    h += `<div class="kart sayac"><div class="zaman">00:00:00</div>
      <label for="sDers" style="text-align:left">Ders</label><select id="sDers" data-d="sDers">${dersSecenek(UI.sDers)}</select>
      <label for="sKonu" style="text-align:left">Konu</label><select id="sKonu" data-d="sKonu">${konuSecenek(UI.sDers, UI.sKonu)}</select>
      <div class="sira" style="justify-content:center;margin-top:14px"><button class="btn" data-a="sayacBasla">Başlat</button>
      <button class="btn ghost" data-a="elleEkle">Elle süre ekle</button></div></div>`;
  }
  const son = [...S.oturumlar].sort((a, b) => a.tarih < b.tarih ? 1 : a.tarih > b.tarih ? -1 : b.id < a.id ? -1 : 1).slice(0, 30);
  h += `<h2>Son kayıtlar</h2><div class="kart">`;
  h += son.length ? `<ul class="liste">${son.map(o => {
    const d = dersBul(o.dersId) || { ad: 'Silinmiş ders', renk: '#888' }, k = konuBul(o.konuId);
    return `<li><span class="nokta" style="background:${esc(d.renk)}"></span><div class="orta"><div class="ad">${esc(d.ad)} · ${sureYaz(o.dk)}</div>
      <div class="soluk kucuk">${tarihYaz(o.tarih)}${k ? ' · ' + esc(k.ad) : ''}</div></div>
      <button class="ikon" data-a="oturumSil" data-id="${o.id}" aria-label="Kaydı sil">✕</button></li>`;
  }).join('')}</ul>` : `<div class="bos">Henüz kayıt yok.</div>`;
  return h + `</div>`;
}

function gorOzet() {
  const t = bugun(), bas = gunEkle(haftaBasi(t), UI.hafta * 7), son = gunEkle(bas, 6);
  const ot = S.oturumlar.filter(o => o.tarih >= bas && o.tarih <= son);
  const gunluk = Array(7).fill(0), dersDk = new Map();
  for (const o of ot) {
    gunluk[gunFark(bas, o.tarih)] += o.dk;
    dersDk.set(o.dersId, (dersDk.get(o.dersId) || 0) + o.dk);
  }
  const toplam = gunluk.reduce((a, b) => a + b, 0), mx = Math.max(...gunluk, 1);
  let yeni = 0, tekrar = 0;
  for (const k of S.konular) {
    if (k.calisildiTarih >= bas && k.calisildiTarih <= son) yeni++;
    for (const r of k.tekrarlar || []) if (r.tarih >= bas && r.tarih <= son) tekrar++;
  }
  const hedef = S.ayar.gunluk.reduce((a, b) => a + b, 0);
  let h = `<h1>Haftalık özet</h1><div class="bas"><button class="btn kucuk ghost" data-a="hafta" data-n="-1" aria-label="Önceki hafta">‹</button>
    <b>${tarihYaz(bas).replace(/ \S+$/, '')} – ${tarihYaz(son).replace(/ \S+$/, '')}${UI.hafta === 0 ? ' (bu hafta)' : ''}</b>
    <button class="btn kucuk ghost" data-a="hafta" data-n="1" ${UI.hafta >= 0 ? 'disabled style="opacity:.3"' : ''} aria-label="Sonraki hafta">›</button></div>
    <div class="kart sayilar"><div><b>${sureYaz(toplam)}</b><span>toplam çalışma</span></div>
    <div><b>${yeni}</b><span>yeni konu</span></div><div><b>${tekrar}</b><span>tekrar</span></div></div>
    <div class="kart"><div class="bas"><b>Günlere göre</b><span class="soluk kucuk">hedefin %${hedef ? Math.round(toplam / hedef * 100) : 0}'i</span></div>
    <div class="grafik">${gunluk.map((dk, i) => `<div class="s ${gunEkle(bas, i) === t ? 'bugun' : ''}">
      <span class="d">${dk ? (dk >= 60 ? (dk / 60).toFixed(1).replace('.', ',') + ' sa' : dk + ' dk') : ''}</span>
      <div class="b ${dk ? '' : 'sifir'}" style="height:${dk / mx * 100}%"></div><span class="g">${GUN_KISA[i]}</span></div>`).join('')}</div></div>`;
  h += `<div class="kart"><b>Derslere göre</b>`;
  const sirali = [...dersDk.entries()].sort((a, b) => b[1] - a[1]);
  if (!sirali.length) h += `<div class="bos">Bu hafta kayıtlı çalışma yok.</div>`;
  for (const [id, dk] of sirali) {
    const d = dersBul(id) || { ad: 'Silinmiş ders', renk: '#888' };
    h += `<div class="yatay"><span class="ad">${esc(d.ad)}</span><div class="cubuk"><i style="width:${dk / sirali[0][1] * 100}%;background:${esc(d.renk)}"></i></div>
      <span class="soluk">${sureYaz(dk)}</span></div>`;
  }
  h += `</div>`;
  const dersler = aktifDersler();
  const tum = dersler.flatMap(d => dersKonulari(d.id)), bit = tum.filter(k => k.durum === 'calisildi').length;
  const kom = S.komiteler.find(k => k.id === S.aktifKomite);
  h += `<div class="kart"><div class="bas"><b>${esc(kom.ad)} ilerlemesi</b><span>${bit} / ${tum.length} konu</span></div>
    <div class="cubuk"><i style="width:${tum.length ? bit / tum.length * 100 : 0}%"></i></div>`;
  for (const d of dersler) {
    const ks = dersKonulari(d.id), b = ks.filter(k => k.durum === 'calisildi').length;
    h += `<div class="yatay"><span class="ad">${esc(d.ad)}</span><div class="cubuk"><i style="width:${ks.length ? b / ks.length * 100 : 0}%;background:${esc(d.renk)}"></i></div>
      <span class="soluk">${b}/${ks.length}</span></div>`;
  }
  return h + `</div>`;
}

function gorAyarlar() {
  const a = S.ayar;
  return `<h1>Ayarlar</h1>
  <div class="kart"><b>Günlük çalışma hedefi (dakika)</b>
    <p class="soluk kucuk">Program her güne en fazla bu kadar iş yazar. Çalışmayacağın güne 0 yaz.</p>
    <div class="gunler">${GUN_KISA.map((g, i) => `<div><label for="g${i}">${g}</label>
      <input id="g${i}" type="number" inputmode="numeric" min="0" max="900" step="5" value="${a.gunluk[i]}" data-d="gunluk" data-i="${i}"></div>`).join('')}</div></div>
  <div class="kart"><b>Tekrar aralıkları</b>
    <p class="soluk kucuk">Bir konuyu çalıştıktan sonra kaç gün arayla tekrar hatırlatılacağı. Virgülle ayır.</p>
    <input type="text" inputmode="numeric" value="${a.araliklar.join(', ')}" data-d="araliklar" aria-label="Tekrar aralıkları">
    <label for="tg">Sınavdan önce genel tekrara ayrılacak gün sayısı</label>
    <input id="tg" type="number" inputmode="numeric" min="0" max="14" value="${a.tekrarGunu}" data-d="tekrarGunu"></div>
  <div class="kart"><b>Yedekleme</b>
    <p class="soluk kucuk">Verilerin yalnızca bu cihazda durur. Ara sıra yedek dosyası indirmeni öneririm; başka cihaza taşımak için de aynı dosyayı içe aktarırsın.</p>
    <div class="sira"><button class="btn" data-a="disaAktar">Yedeği indir</button>
    <button class="btn ghost" data-a="iceAktar">Yedekten geri yükle</button></div>
    <input type="file" id="dosya" accept="application/json,.json" hidden></div>
  <div class="kart"><b>Telefona kurulum</b>
    <p class="soluk kucuk">Android (Chrome): menü › "Ana ekrana ekle" ya da "Uygulamayı yükle". iPhone ve iPad (Safari): Paylaş › "Ana Ekrana Ekle".
    Kurulduktan sonra internet olmadan da açılır.</p></div>
  <div class="kart"><button class="btn tehlike" data-a="sifirla">Tüm verileri sil</button></div>
  <p class="soluk kucuk" style="text-align:center">Ders Takip · sürüm 1.0</p>`;
}

const GORUNUM = { bugun: gorBugun, dersler: gorDersler, sure: gorSure, ozet: gorOzet, ayarlar: gorAyarlar };
let zamanlayici = null;
function ciz() {
  $('#app').innerHTML = GORUNUM[UI.sekme]();
  for (const b of document.querySelectorAll('#nav button')) b.classList.toggle('secili', b.dataset.s === UI.sekme);
  clearInterval(zamanlayici);
  if (UI.sekme === 'sure' && S.sayac) zamanlayici = setInterval(() => { const z = $('#zaman'); if (z) z.textContent = sayacYazi(); }, 1000);
}

/* ---------- iletişim kutusu ---------- */
function kutu(baslik, govde, onay, onayYazi = 'Kaydet') {
  const d = $('#dlg');
  d.innerHTML = `<form><h3>${esc(baslik)}</h3>${govde}<div class="dbtn">
    <button type="button" class="btn ghost" data-a="kapat">Vazgeç</button>
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

function puanKutusu(k, ilk) {
  const sonra = p => Algo.sonrakiAralik(S, k, p);
  kutu(ilk ? 'Nasıl geçti?' : 'Tekrar nasıl geçti?', `<p class="soluk">${esc(k.ad)}</p><div class="puanbuyuk">
    ${['zor', 'orta', 'kolay'].map(p => `<button type="button" class="${p}R" data-a="puan" data-id="${k.id}" data-p="${p}">
    ${PUAN_AD[p]}<small>${ilk && p === 'zor' ? 'Tekrarı daha uzun planlanır · ' : ''}${sonra(p)} gün sonra tekrar</small></button>`).join('')}</div>`);
}

/* ---------- eylemler ---------- */
const A = {
  sekme(el) { UI.sekme = el.dataset.s; if (UI.sekme !== 'dersler') UI.dersId = null; ciz(); scrollTo(0, 0); },
  kapat() { $('#dlg').close(); },

  komiteSec(el) { S.aktifKomite = el.dataset.id; kaydet(); ciz(); },
  komiteEkle() {
    kutu('Yeni komite', `<label for="fa">Ad</label><input id="fa" name="ad" required placeholder="Örn. 3. Komite" value="${S.komiteler.length + 1}. Komite">`, v => {
      if (!v.ad.trim()) return false;
      const k = { id: uid(), ad: v.ad.trim() }; S.komiteler.push(k); S.aktifKomite = k.id;
    });
  },
  komiteDuzenle() {
    const k = S.komiteler.find(x => x.id === S.aktifKomite);
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
  dersAc(el) { UI.dersId = el.dataset.id; ciz(); scrollTo(0, 0); },
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
      <label for="ft">Tahmini süre (dk) · boş bırakırsan zorluğa göre hesaplanır</label>
      <input id="ft" name="tahmin" type="number" inputmode="numeric" min="5" max="600" step="5" value="${k.tahmin || ''}">
      <div class="sira" style="margin-top:14px">${k.durum === 'calisildi' ? `<button type="button" class="btn ghost kucuk" data-a="konuSifirla" data-id="${k.id}">Çalışılmadı yap</button>` : ''}
      <button type="button" class="btn tehlike kucuk" data-a="konuSil" data-id="${k.id}">Konuyu sil</button></div>`, v => {
      if (!v.ad.trim()) return false;
      k.ad = v.ad.trim(); k.tahmin = v.tahmin ? sayi(v.tahmin, 0, 5, 600) : undefined;
    });
  },
  konuSifirla(el) {
    const k = konuBul(el.dataset.id);
    Object.assign(k, { durum: 'yeni', tekrarlar: [], adim: 0, sonPuan: undefined, sonrakiTekrar: undefined, calisildiTarih: undefined });
    $('#dlg').close(); kaydet(); ciz();
  },
  konuSil(el) {
    if (!confirm('Bu konu silinsin mi?')) return;
    S.konular = S.konular.filter(k => k.id !== el.dataset.id);
    $('#dlg').close(); kaydet(); ciz();
  },
  calistim(el) { puanKutusu(konuBul(el.dataset.id), true); },
  tekrarEt(el) { puanKutusu(konuBul(el.dataset.id), false); },
  puan(el) {
    const k = konuBul(el.dataset.id), gun = Algo.puanla(S, k, el.dataset.p, bugun());
    $('#dlg').close(); kaydet(); ciz();
    toast(`Kaydedildi. Sonraki tekrar ${gun} gün sonra.`);
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

  sayacBasla() {
    S.sayac = { basla: Date.now(), dersId: UI.sDers, konuId: UI.sKonu || null };
    kaydet(); ciz();
  },
  sayacDur() {
    const c = S.sayac, dk = Math.round((Date.now() - c.basla) / 60000);
    S.sayac = null;
    if (dk < 1) toast('1 dakikadan kısa olduğu için kaydedilmedi.');
    else { S.oturumlar.push({ id: uid(), tarih: bugun(), dersId: c.dersId, konuId: c.konuId, dk }); toast(`${sureYaz(dk)} kaydedildi.`); }
    kaydet(); ciz();
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
    S = varsayilan(); kaydet(); ciz(); toast('Tüm veriler silindi.');
  }
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (el && A[el.dataset.a]) A[el.dataset.a](el);
});

document.addEventListener('change', e => {
  const el = e.target, d = el.dataset.d;
  if (el.id === 'dosya') {
    const f = el.files[0]; if (!f) return;
    f.text().then(m => {
      const veri = JSON.parse(m);
      if (!veri || !Array.isArray(veri.komiteler)) throw new Error('biçim');
      if (!confirm('Bu cihazdaki mevcut veriler yedekteki verilerle değiştirilecek. Devam edilsin mi?')) return;
      S = duzelt(veri); kaydet(); ciz(); toast('Yedek geri yüklendi.');
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
  if (!document.hidden && !$('#dlg').open && (bugun() !== sonGun || UI.sekme === 'sure')) { sonGun = bugun(); ciz(); }
});

ciz();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
