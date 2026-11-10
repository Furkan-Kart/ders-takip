'use strict';
/* Ders Takip — çalışma programı ve aralıklı tekrar algoritması.
   Arayüzden bağımsızdır: tüm fonksiyonlar durumu (S) ve bugünün tarihini parametre alır. */
(function (kok) {
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const tarih = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const gunEkle = (s, n) => { const d = tarih(s); d.setDate(d.getDate() + n); return iso(d); };
  const gunFark = (a, b) => Math.round((tarih(b) - tarih(a)) / 864e5); // b - a
  const haftaGunu = s => (tarih(s).getDay() + 6) % 7; // 0 = Pazartesi
  const yuvarla5 = n => Math.max(5, Math.round(n / 5) * 5);
  const dersBul = (S, id) => S.dersler.find(d => d.id === id);

  const bazTahmin = (S, k) => k.tahmin || 20 + ((dersBul(S, k.dersId) || {}).zorluk || 3) * 10;

  // Kişisel çarpan: bu derste bitirilen konulara gerçekte harcanan süre / tahmin edilen süre.
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

  // Bir puan verilirse sonraki tekrarın kaç gün sonra olacağı (durumu değiştirmez).
  function sonrakiAralik(S, k, puan) {
    const ar = S.ayar.araliklar, ilk = k.durum !== 'calisildi';
    const adim = ilk ? 0 : puan === 'kolay' ? (k.adim || 0) + 1 : puan === 'zor' ? 0 : (k.adim || 0);
    return adim < ar.length ? ar[adim] : ar[ar.length - 1] * 2;
  }

  // Konuyu çalışıldı/tekrar edildi olarak işler; sonraki tekrara kalan gün sayısını döndürür.
  function puanla(S, k, puan, bugun) {
    const gun = sonrakiAralik(S, k, puan);
    if (k.durum !== 'calisildi') {
      k.durum = 'calisildi'; k.calisildiTarih = bugun; k.adim = 0; k.tekrarlar = [];
    } else {
      k.tekrarlar.push({ tarih: bugun, puan });
      if (puan === 'kolay') k.adim = (k.adim || 0) + 1;
      else if (puan === 'zor') k.adim = 0;
    }
    k.sonPuan = puan;
    k.sonrakiTekrar = gunEkle(bugun, gun);
    return gun;
  }

  // Konunun verilen tarihte hatırlanma olasılığı tahmini (0..1). Çalışılmamışsa 0.
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

  // Yeni konuların sırası: zor ve iş yükü fazla dersler öne alınır, dersler dönüşümlü dağıtılır.
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
    const eksik = kuyruk.reduce((a, k) => a + tahminDk(S, k), 0);
    const kalanDk = konular.filter(k => k.durum !== 'calisildi').reduce((a, k) => a + tahminDk(S, k), 0);
    const hedefT = sinav ? sinav.tarih : gunEkle(t, n);
    const hazirlik = konular.length
      ? Math.round(konular.reduce((a, k) => a + hatirlama(S, k, hedefT), 0) / konular.length * 100) : 0;
    return {
      gunler, sinav, yetismeyen: kuyruk, ekGunluk: yuvarla5(eksik / Math.max(1, n)),
      ozet: {
        toplamKalanDk: kalanDk, gunSayisi: n,
        yetisme: kuyruk.length ? 'yetismiyor' : 'rahat',
        gerekenGunlukDk: yuvarla5(kalanDk / Math.max(1, n)),
        tahminiBitis: null, hazirlik
      },
      oneriler: []
    };
  }

  function dersOzet(S, dersId, t) {
    const ks = S.konular.filter(k => k.dersId === dersId);
    const hazirlik = ks.length ? Math.round(ks.reduce((a, k) => a + hatirlama(S, k, t), 0) / ks.length * 100) : 0;
    return { hazirlik, carpan: kisiselCarpan(S, dersId) };
  }

  const Algo = { tahminDk, tekrarDk, kisiselCarpan, sonrakiAralik, puanla, hatirlama, planla, dersOzet };
  if (typeof module !== 'undefined' && module.exports) module.exports = Algo;
  else kok.Algo = Algo;
})(typeof self !== 'undefined' ? self : this);
