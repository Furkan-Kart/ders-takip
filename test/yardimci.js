'use strict';
/* Testler için yardımcılar: tohumlu rastgele sayı üreteci, durum üreteci, eski (v1) algoritmanın kopyası
   ve "gerçek" bir öğrenciyi taklit eden simülasyon. */

function rastgele(tohum) { // mulberry32
  let a = tohum >>> 0;
  const r = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.tam = (a1, b1) => a1 + Math.floor(r() * (b1 - a1 + 1));
  r.sec = l => l[Math.floor(r() * l.length)];
  r.normal = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  return r;
}

const GUN = 864e5;
const gunNo = s => { const [y, m, d] = s.split('-').map(Number); return Math.floor(Date.UTC(y, m - 1, d) / GUN); };
const gunStr = n => new Date(n * GUN).toISOString().slice(0, 10);
const gunEkle = (s, n) => gunStr(gunNo(s) + n);
const gunFark = (a, b) => gunNo(b) - gunNo(a);
const haftaGunu = s => (((gunNo(s) + 3) % 7) + 7) % 7;

function bosDurum(ayar) {
  return {
    komiteler: [{ id: 'k1', ad: '2. Komite' }], aktifKomite: 'k1',
    dersler: [], konular: [], sinavlar: [], oturumlar: [],
    ayar: Object.assign({ gunluk: [120, 120, 120, 120, 120, 180, 180], araliklar: [1, 7, 30], tekrarGunu: 1 }, ayar || {})
  };
}
function dersEkle(S, id, ad, zorluk, konuSayisi, komiteId) {
  S.dersler.push({ id, komiteId: komiteId || S.aktifKomite, ad, zorluk, renk: '#0d9488' });
  for (let i = 0; i < konuSayisi; i++) S.konular.push({ id: `${id}-${i}`, dersId: id, ad: `${ad} ${i + 1}`, durum: 'yeni', tekrarlar: [] });
}

/* ---------- eski algoritma (v1) — karşılaştırma için birebir kopya ----------
   ortaIlerler = true verilirse 'orta' puanı da merdivende bir basamak ilerletir (klasik sabit aralık
   merdiveni 1-7-30); asıl v1'de 'orta' basamağı değiştirmez, yani tekrar ertesi güne tekrar düşer. */
function eskiYap(ortaIlerler) {
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const tarih = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const gunEkle = (s, n) => { const d = tarih(s); d.setDate(d.getDate() + n); return iso(d); };
  const gunFark = (a, b) => Math.round((tarih(b) - tarih(a)) / 864e5);
  const haftaGunu = s => (tarih(s).getDay() + 6) % 7;
  const yuvarla5 = n => Math.max(5, Math.round(n / 5) * 5);
  const dersBul = (S, id) => S.dersler.find(d => d.id === id);
  const bazTahmin = (S, k) => k.tahmin || 20 + ((dersBul(S, k.dersId) || {}).zorluk || 3) * 10;
  function kisiselCarpan(S, dersId) {
    let gercek = 0, tah = 0, adet = 0;
    for (const k of S.konular) {
      if (k.dersId !== dersId || k.durum !== 'calisildi') continue;
      const dk = S.oturumlar.reduce((t, o) => t + (o.konuId === k.id ? o.dk : 0), 0);
      if (dk > 0) { gercek += dk; tah += bazTahmin(S, k); adet++; }
    }
    if (adet < 2) return 1;
    return Math.min(2, Math.max(0.6, gercek / tah));
  }
  const tahminDk = (S, k) => k.tahmin ? k.tahmin : yuvarla5(bazTahmin(S, k) * kisiselCarpan(S, k.dersId));
  const tekrarDk = (S, k) => yuvarla5(Math.max(10, tahminDk(S, k) * 0.3 * (k.sonPuan === 'zor' ? 1.5 : 1)));
  function sonrakiAralik(S, k, puan) {
    const ar = S.ayar.araliklar, ilk = k.durum !== 'calisildi';
    const adim = ilk ? 0 : puan === 'kolay' || (ortaIlerler && puan === 'orta') ? (k.adim || 0) + 1 : puan === 'zor' ? 0 : (k.adim || 0);
    return adim < ar.length ? ar[adim] : ar[ar.length - 1] * 2;
  }
  function puanla(S, k, puan, bugun) {
    const gun = sonrakiAralik(S, k, puan);
    if (k.durum !== 'calisildi') {
      k.durum = 'calisildi'; k.calisildiTarih = bugun; k.adim = 0; k.tekrarlar = [];
    } else {
      k.tekrarlar.push({ tarih: bugun, puan });
      if (puan === 'kolay' || (ortaIlerler && puan === 'orta')) k.adim = (k.adim || 0) + 1;
      else if (puan === 'zor') k.adim = 0;
    }
    k.sonPuan = puan;
    k.sonrakiTekrar = gunEkle(bugun, gun);
    return gun;
  }
  function hatirlama(S, k, t) {
    if (k.durum !== 'calisildi') return 0;
    const son = (k.tekrarlar && k.tekrarlar.length) ? k.tekrarlar[k.tekrarlar.length - 1].tarih : k.calisildiTarih;
    const aralik = Math.max(1, gunFark(son, k.sonrakiTekrar || son));
    const gecen = Math.max(0, gunFark(son, t));
    return Math.pow(0.9, gecen / aralik);
  }
  function bugunKullanilan(S, t) {
    const kayitli = S.oturumlar.reduce((a, o) => a + (o.tarih === t ? o.dk : 0), 0);
    let biten = 0;
    for (const k of S.konular) {
      if (k.calisildiTarih === t) biten += tahminDk(S, k);
      for (const r of k.tekrarlar || []) if (r.tarih === t) biten += tekrarDk(S, k);
    }
    return Math.max(kayitli, biten);
  }
  function yeniSira(S, konular, dm) {
    const kuyruk = new Map();
    for (const k of konular) {
      if (k.durum === 'calisildi') continue;
      if (!kuyruk.has(k.dersId)) kuyruk.set(k.dersId, []);
      kuyruk.get(k.dersId).push(k);
    }
    const dersler = [...kuyruk.keys()].map(id => {
      const liste = kuyruk.get(id), zorluk = dm.get(id).zorluk || 3;
      const yuk = liste.reduce((a, k) => a + tahminDk(S, k), 0);
      return { id, liste, zorluk, agirlik: yuk * (0.5 + 0.25 * zorluk), gecis: 0 };
    });
    const sira = [];
    for (;;) {
      const acik = dersler.filter(d => d.liste.length);
      if (!acik.length) break;
      acik.sort((a, b) => a.gecis - b.gecis || b.zorluk - a.zorluk);
      const d = acik[0], k = d.liste.shift();
      d.gecis += tahminDk(S, k) / d.agirlik;
      sira.push(k);
    }
    return sira;
  }
  function planla(S, t) {
    const kid = S.aktifKomite;
    const dm = new Map(S.dersler.filter(d => d.komiteId === kid).map(d => [d.id, d]));
    const konular = S.konular.filter(k => dm.has(k.dersId));
    const sinav = S.sinavlar.filter(s => s.komiteId === kid && s.tarih > t).sort((a, b) => a.tarih < b.tarih ? -1 : 1)[0];
    const n = Math.min(sinav ? gunFark(t, sinav.tarih) : 14, 120);
    const rez = sinav ? Math.min(S.ayar.tekrarGunu, Math.max(0, n - 1)) : 0;
    const gunler = [];
    for (let i = 0; i < n; i++) {
      const g = gunEkle(t, i), hedef = S.ayar.gunluk[haftaGunu(g)];
      gunler.push({ tarih: g, hedef, kalan: i ? hedef : Math.max(0, hedef - bugunKullanilan(S, t)), isler: [], rezerv: i >= n - rez });
    }
    for (const k of konular) {
      if (k.durum !== 'calisildi' || !k.sonrakiTekrar) continue;
      const i = Math.max(0, gunFark(t, k.sonrakiTekrar));
      if (i >= n) continue;
      const dk = tekrarDk(S, k);
      gunler[i].isler.push({ tip: 'tekrar', konu: k, dk, gecikme: Math.max(0, gunFark(k.sonrakiTekrar, t)), neden: '' });
      gunler[i].kalan -= dk;
    }
    let kuyruk = yeniSira(S, konular, dm);
    for (const [bas, bit] of [[0, n - rez], [n - rez, n]]) {
      let gi = bas; const artan = [];
      for (const k of kuyruk) {
        const dk = tahminDk(S, k);
        while (gi < bit && !(gunler[gi].kalan > 0 && gunler[gi].kalan >= Math.min(dk, gunler[gi].hedef) * 0.5)) gi++;
        if (gi >= bit) { artan.push(k); continue; }
        gunler[gi].isler.push({ tip: 'yeni', konu: k, dk, neden: '' });
        gunler[gi].kalan -= dk;
      }
      kuyruk = artan;
    }
    if (rez) {
      const planli = new Set(gunler.flatMap(g => g.isler.map(i => i.konu.id)));
      const derece = { zor: 0, orta: 1, kolay: 2 };
      const zayif = konular.filter(k => k.durum === 'calisildi' && !planli.has(k.id))
        .sort((a, b) => (derece[a.sonPuan] ?? 1) - (derece[b.sonPuan] ?? 1));
      for (const g of gunler.filter(g => g.rezerv)) {
        while (zayif.length && g.kalan >= tekrarDk(S, zayif[0])) {
          const k = zayif.shift(), dk = tekrarDk(S, k);
          g.isler.push({ tip: 'genel', konu: k, dk, neden: '' }); g.kalan -= dk;
        }
      }
    }
    return { gunler, sinav, yetismeyen: kuyruk };
  }
  return { eski: true, tahminDk, tekrarDk, kisiselCarpan, sonrakiAralik, puanla, hatirlama, planla };
}
const Eski = eskiYap(false), EskiMerdiven = eskiYap(true);

/* ---------- öğrenci simülasyonu ----------
   Gerçek bellek modeli bilerek algoritmanınkinden FARKLIDIR (hiperbolik unutma, başka büyüme kuralı),
   böylece algoritma kendi varsayımlarıyla ödüllendirilmez.
     R(t) = 1 / (1 + t/h),  h0 ~ sec.h0 gün (varsayılan 5; zor derste daha kısa, konudan konuya değişken)
     hatırlanan tekrar: h *= 1 + 1.2·min(1, 2t/h) + 2·(1-R)     (aynı gün tekrar neredeyse kazandırmaz)
     unutulmuş tekrar:  h = max(1.5, h/2)
   Öğrenci her gün hedefin bir kısmı kadar çalışır (bazı günler hiç); her işten sonra program yeniden
   hesaplanır ve öğrenci bugünkü listenin ilk işini yapar, süresi bitince bırakır. */
function simulasyon(algo, tohum, sec) {
  sec = Object.assign({ gun: 35, hedef: [120, 120, 120, 120, 120, 180, 180], tekrarGunu: 2, uyum: [0.55, 1.0], bosGun: 0.12, h0: 5,
    dersler: [['a', 'Anatomi', 5, 22, 1.25], ['f', 'Fizyoloji', 4, 18, 1.0], ['b', 'Biyokimya', 3, 14, 0.9], ['h', 'Histoloji', 2, 10, 0.8]] }, sec || {});
  const r = rastgele(tohum);
  const bas = '2026-09-07';
  const S = bosDurum({ gunluk: sec.hedef.slice(), tekrarGunu: sec.tekrarGunu });
  S.sinavlar.push({ id: 's1', komiteId: 'k1', ad: 'Komite sınavı', tarih: gunEkle(bas, sec.gun) });
  const gercek = new Map();
  for (const [id, ad, z, adet, sureKat] of sec.dersler) {
    dersEkle(S, id, ad, z, adet);
    for (let i = 0; i < adet; i++) {
      const dk = (20 + z * 10) * sureKat * Math.exp(0.25 * r.normal());
      gercek.set(`${id}-${i}`, { kalan: dk, dk, h0: sec.h0 * (1.3 - 0.1 * z) * Math.exp(0.5 * r.normal()), h: 0, son: -1, z });
    }
  }
  let oid = 0, calisilanDk = 0;
  for (let g = 0; g < sec.gun; g++) {
    const t = gunEkle(bas, g);
    let butce = r() < sec.bosGun ? 0 : S.ayar.gunluk[haftaGunu(t)] * (sec.uyum[0] + r() * (sec.uyum[1] - sec.uyum[0]));
    if (butce <= 0) continue;
    // Uygulama her işten sonra programı yeniden çizer: öğrenci hep güncel listenin ilk işini yapar.
    for (let tur = 0; tur < 40; tur++) {
      const plan = algo.planla(S, t);
      const isler = plan.gunler[0] ? plan.gunler[0].isler.slice() : [];
      if (algo.eski) isler.sort((a, b) => (a.tip === 'yeni') - (b.tip === 'yeni')); // eski arayüz böyle sıralıyordu
      const is = isler[0];
      if (!is) break;
      const k = is.konu, G = gercek.get(k.id);
      if (is.tip === 'yeni') {
        if (butce < Math.min(10, G.kalan)) break;
        const dk = Math.min(butce, G.kalan);
        butce -= dk; G.kalan -= dk; calisilanDk += dk;
        S.oturumlar.push({ id: 'o' + (oid++), tarih: t, dersId: k.dersId, konuId: k.id, dk: Math.round(dk) });
        if (G.kalan > 0.5) break; // süre bitti, konu yarım kaldı
        G.h = G.h0; G.son = g;
        const x = G.h0 / (sec.h0 * (1.3 - 0.1 * G.z)) * Math.exp(0.3 * r.normal()); // öğrencinin hissi: gürültülü
        algo.puanla(S, k, x < 0.6 ? 'zor' : x > 1.5 ? 'kolay' : 'orta', t);
      } else {
        const dk = Math.max(8, G.dk * 0.3 * Math.exp(0.2 * r.normal()));
        if (butce < dk * 0.7) break;
        butce -= dk; calisilanDk += dk;
        S.oturumlar.push({ id: 'o' + (oid++), tarih: t, dersId: k.dersId, konuId: k.id, dk: Math.round(dk) });
        const gecen = g - G.son, R = 1 / (1 + gecen / G.h), hatirladi = r() < R;
        if (hatirladi) G.h *= 1 + 1.2 * Math.min(1, 2 * gecen / G.h) + 2 * (1 - R);
        else G.h = Math.max(1.5, G.h / 2);
        G.son = g;
        algo.puanla(S, k, !hatirladi ? 'zor' : R > 0.85 ? 'kolay' : 'orta', t);
      }
    }
  }
  let top = 0, kapsam = 0;
  for (const G of gercek.values()) {
    if (G.son < 0) continue;
    kapsam++; top += 1 / (1 + (sec.gun - G.son) / G.h);
  }
  return { hatirlama: top / gercek.size, kapsam: kapsam / gercek.size, calisilanDk, S };
}

module.exports = { rastgele, gunNo, gunStr, gunEkle, gunFark, haftaGunu, bosDurum, dersEkle, Eski, EskiMerdiven, simulasyon };
