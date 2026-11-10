'use strict';
/* Çalıştırma: node test/algoritma.test.js */
const assert = require('node:assert');
const path = require('node:path');
const Algo = require(path.join(__dirname, '..', 'algoritma.js'));
const Y = require('./yardimci.js');
const { rastgele, gunEkle, gunFark, haftaGunu, bosDurum, dersEkle } = Y;

let gecen = 0;
const hatalar = [];
function test(ad, fn) {
  try { fn(); gecen++; console.log('  ok   ' + ad); }
  catch (e) { hatalar.push(ad); console.log('  HATA ' + ad + '\n       ' + (e && e.stack || e).toString().split('\n').slice(0, 6).join('\n       ')); }
}
const BUGUN = '2026-11-10';
const kopya = x => JSON.parse(JSON.stringify(x));
function ornek(sinavGun, ayar) {
  const S = bosDurum(ayar);
  dersEkle(S, 'a', 'Anatomi', 5, 12); dersEkle(S, 'f', 'Fizyoloji', 3, 10); dersEkle(S, 'b', 'Biyokimya', 2, 6);
  if (sinavGun != null) S.sinavlar.push({ id: 's1', komiteId: 'k1', ad: 'Komite sınavı', tarih: gunEkle(BUGUN, sinavGun) });
  return S;
}

/* ---------- plan değişmezleri ---------- */
function planKontrol(S, t, etiket) {
  const once = JSON.stringify(S);
  const p = Algo.planla(S, t);
  assert.strictEqual(JSON.stringify(S), once, etiket + ': planla durumu değiştirdi');
  assert.deepStrictEqual(kopya(Algo.planla(S, t)), kopya(p), etiket + ': aynı girdi farklı çıktı');
  const m = etiket + ' ';
  assert.ok(Array.isArray(p.gunler) && Array.isArray(p.yetismeyen) && Array.isArray(p.oneriler) && Array.isArray(p.ufukDisi), m + 'şekil');
  assert.ok(p.oneriler.length <= 3, m + 'en çok 3 öneri');
  for (const o of p.oneriler) assert.ok(typeof o === 'string' && o.length > 5 && o.length < 170 && !/[—–]/.test(o), m + 'öneri metni: ' + o);
  const oz = p.ozet;
  for (const a of ['toplamKalanDk', 'gunSayisi', 'gerekenGunlukDk', 'hazirlik', 'hazirlikSimdi']) assert.ok(Number.isFinite(oz[a]) && oz[a] >= 0, m + 'ozet.' + a);
  assert.ok(oz.hazirlik <= 100 && oz.hazirlikSimdi <= 100, m + 'hazırlık 0-100');
  assert.ok(['rahat', 'sinirda', 'yetismiyor'].includes(oz.yetisme), m + 'yetisme');
  assert.ok(oz.tahminiBitis === null || /^\d{4}-\d\d-\d\d$/.test(oz.tahminiBitis), m + 'tahminiBitis');
  assert.ok(Number.isFinite(p.ekGunluk) && p.ekGunluk >= 0 && p.ekGunluk % 5 === 0, m + 'ekGunluk');
  assert.strictEqual(p.ekGunluk > 0, p.yetismeyen.length > 0, m + 'ekGunluk ancak yetişmeyen varsa');
  assert.strictEqual(oz.yetisme === 'yetismiyor', p.yetismeyen.length > 0, m + 'yetisme tutarlı');
  assert.strictEqual(p.gunler.length, oz.gunSayisi, m + 'gün sayısı');
  if (p.sinav) assert.ok(p.sinav.tarih > t && p.sinav.komiteId === S.aktifKomite, m + 'sınav');
  else { assert.strictEqual(p.gunler.length, 14, m + 'sınavsız 14 gün'); assert.strictEqual(p.yetismeyen.length, 0, m + 'sınavsız yetişmeyen olmaz'); }

  const aktif = new Set(S.dersler.filter(d => d.komiteId === S.aktifKomite).map(d => d.id));
  const yeniGorulen = new Set(), calisilmis = new Set();
  const sonSira = new Map(), sira = new Map();
  S.konular.forEach((k, i) => sira.set(k, i));
  let enBuyukDk = 0;
  const kullanilan = (p.gunler[0] && p.gunler[0].kullanilan) || 0;
  p.gunler.forEach((g, gi) => {
    assert.strictEqual(g.tarih, gunEkle(t, gi), m + 'gün tarihi');
    assert.strictEqual(g.hedef, S.ayar.gunluk[haftaGunu(g.tarih)], m + 'hedef');
    if (p.sinav) assert.ok(g.tarih < p.sinav.tarih, m + 'sınav günü ve sonrası planlanmaz');
    assert.ok(g.kalan >= 0 && typeof g.rezerv === 'boolean' && g.kapasite <= Math.max(g.hedef, 5), m + 'gün alanları');
    let top = 0;
    const gunIci = new Set();
    for (const is of g.isler) {
      top += is.dk;
      if (is.dk > enBuyukDk) enBuyukDk = is.dk;
      assert.ok(['yeni', 'tekrar', 'genel'].includes(is.tip), m + 'tip');
      assert.ok(is.dk >= 5 && is.dk % 5 === 0, m + 'dk 5 in katı: ' + is.dk);
      assert.ok(typeof is.neden === 'string' && is.neden.length > 3 && is.neden.length <= 60 && !/[—–]/.test(is.neden), m + 'neden: ' + is.neden);
      assert.ok(S.konular.includes(is.konu) && aktif.has(is.konu.dersId), m + 'konu nesnesi aktif komiteden');
      assert.ok(!gunIci.has(is.konu), m + 'aynı konu aynı gün iki kez'); gunIci.add(is.konu);
      if (is.tip === 'yeni') {
        assert.ok(is.konu.durum !== 'calisildi', m + 'çalışılmış konu yeni olamaz');
        assert.ok(!yeniGorulen.has(is.konu), m + 'konu iki kez yeni planlandı'); yeniGorulen.add(is.konu);
        const onceki = sonSira.get(is.konu.dersId);
        assert.ok(onceki === undefined || onceki < sira.get(is.konu), m + 'müfredat sırası bozuldu');
        sonSira.set(is.konu.dersId, sira.get(is.konu));
      } else {
        assert.ok(is.konu.durum === 'calisildi' || calisilmis.has(is.konu), m + 'çalışılmamış konu tekrar edilemez');
        assert.ok(is.hatirlama >= 0 && is.hatirlama <= 100, m + 'iş hatırlama');
        if (is.tip === 'genel') assert.ok(g.rezerv, m + 'genel yalnız rezerv günde');
        else assert.ok(is.gecikme >= 0 && is.erteleme >= 0, m + 'gecikme');
      }
    }
    for (const is of g.isler) if (is.tip === 'yeni') calisilmis.add(is.konu);
    assert.strictEqual(top, g.yuk, m + 'yuk = iş toplamı');
    if (g.hedef === 0) assert.strictEqual(g.isler.length, 0, m + 'hedefi sıfır gün boş kalmalı');
  });
  // yük kapasiteyi en çok bir iş kadar aşabilir (konular bölünmez)
  p.gunler.forEach((g, gi) => assert.ok(g.yuk <= Math.max(0, g.kapasite - (gi ? 0 : kullanilan)) + enBuyukDk + 2, m + `yük aşırı: ${g.yuk} / ${g.kapasite}`));
  // müfredat: planlanan yeni konular her derste kalanların baştan kesintisiz bir dilimi
  const dis = new Set(p.sinav ? p.yetismeyen : p.ufukDisi);
  const acik = new Set();
  for (const k of S.konular) {
    if (!aktif.has(k.dersId) || k.durum === 'calisildi') continue;
    assert.ok(yeniGorulen.has(k) !== dis.has(k), m + 'her yeni konu ya planda ya yetişmeyen/ufuk dışı listesinde: ' + k.id);
    if (dis.has(k)) acik.add(k.dersId);
    else assert.ok(!acik.has(k.dersId), m + 'atlanan konunun ardından gelen konu planlanmış');
  }
  assert.strictEqual(dis.size, (p.sinav ? p.yetismeyen : p.ufukDisi).length, m + 'liste tekrarsız');
  if (oz.tahminiBitis) assert.ok(dis.size === 0 && yeniGorulen.size > 0, m + 'bitiş tarihi ancak hepsi sığarsa');
  return p;
}

/* ---------- rastgele durum üreteci ---------- */
function uret(tohum) {
  const r = rastgele(tohum);
  const S = bosDurum({
    gunluk: Array.from({ length: 7 }, () => r() < 0.12 ? 0 : r.tam(3, 48) * 5),
    araliklar: r.sec([[1, 7, 30], [1, 3, 7], [2, 14, 60], [1], [3, 10]]), tekrarGunu: r.tam(0, 4)
  });
  if (r() < 0.05) S.ayar.gunluk = [0, 0, 0, 0, 0, 0, 0];
  S.komiteler.push({ id: 'k0', ad: '1. Komite' });
  const t = gunEkle('2026-01-01', r.tam(0, 700));
  const nd = r.tam(0, 6);
  for (let c = 0; c < nd; c++) dersEkle(S, 'd' + c, 'Ders ' + c, r.tam(1, 5), r.tam(0, 30));
  dersEkle(S, 'x0', 'Eski ders', 3, 5, 'k0');
  const sg = r.sec([null, null, -5, 0, 1, 2, 3, 7, 14, 35, 60, 150]);
  if (sg !== null) S.sinavlar.push({ id: 's', komiteId: 'k1', ad: 'Sınav', tarih: gunEkle(t, sg) });
  if (r() < 0.3) S.sinavlar.push({ id: 's2', komiteId: 'k1', ad: 'Pratik', tarih: gunEkle(t, r.tam(1, 50)) });
  S.sinavlar.push({ id: 's0', komiteId: 'k0', ad: 'Eski', tarih: gunEkle(t, 3) });
  const ilerleme = r(), puan = () => r.sec(['zor', 'orta', 'orta', 'kolay']);
  let oid = 0;
  for (const k of S.konular) {
    if (r() < 0.15) k.tahmin = r.tam(1, 40) * 5;
    if (r() < 0.05) delete k.tekrarlar;
    if (r() > ilerleme) { if (r() < 0.1) S.oturumlar.push({ id: 'o' + oid++, tarih: gunEkle(t, -r.tam(0, 5)), dersId: k.dersId, konuId: k.id, dk: r.tam(5, 60) }); continue; }
    let g = -r.tam(0, 40);
    if (r() < 0.3) { // eski biçim (v1) kayıt
      k.durum = 'calisildi'; k.calisildiTarih = gunEkle(t, g); k.adim = 0; k.tekrarlar = []; k.sonPuan = puan();
      let ar = 1;
      while (g + ar <= 0 && r() < 0.7) { g += ar; const p = puan(); k.tekrarlar.push({ tarih: gunEkle(t, g), puan: p }); k.sonPuan = p; if (p === 'kolay') { k.adim++; ar = [1, 7, 30][Math.min(2, k.adim)]; } else if (p === 'zor') { k.adim = 0; ar = 1; } }
      k.sonrakiTekrar = gunEkle(t, g + ar);
    } else {
      let ar = Algo.puanla(S, k, puan(), gunEkle(t, g));
      while (g + ar + 2 <= 0 && r() < 0.75) { g += ar + r.tam(-1, 2); if (g > 0) break; ar = Algo.puanla(S, k, puan(), gunEkle(t, g)); }
    }
    if (r() < 0.7) S.oturumlar.push({ id: 'o' + oid++, tarih: k.calisildiTarih, dersId: k.dersId, konuId: k.id, dk: r.tam(10, 150) });
  }
  const no = r.tam(0, 60);
  for (let i = 0; i < no; i++) S.oturumlar.push({ id: 'o' + oid++, tarih: gunEkle(t, -r.tam(0, 35)), dersId: r.sec(['d0', 'd1', 'silinmis', 'x0']), konuId: r() < 0.3 ? 'yok' : null, dk: r.tam(1, 200) });
  return { S, t };
}

console.log('Bellek modeli');
test('unutma eğrisi tekdüze azalır, R(kararlılık) = 0.9', () => {
  assert.ok(Math.abs(Algo.egri(10, 10) - 0.9) < 1e-9);
  assert.strictEqual(Algo.egri(0, 5), 1);
  let o = 1;
  for (let g = 1; g < 200; g++) { const r = Algo.egri(g, 7); assert.ok(r < o && r > 0); o = r; }
  assert.ok(Algo.egri(5, 20) > Algo.egri(5, 5));
});
test('hatirlama: çalışılmamış 0, zamanla azalır, tekrarla artar', () => {
  const S = ornek(null), k = S.konular[0];
  assert.strictEqual(Algo.hatirlama(S, k, BUGUN), 0);
  Algo.puanla(S, k, 'orta', BUGUN);
  let o = 1.0001;
  for (let g = 0; g < 60; g++) { const r = Algo.hatirlama(S, k, gunEkle(BUGUN, g)); assert.ok(r < o && r > 0 && r <= 1); o = r; }
  const once = Algo.hatirlama(S, k, gunEkle(BUGUN, 30));
  Algo.puanla(S, k, 'orta', gunEkle(BUGUN, 2));
  assert.ok(Algo.hatirlama(S, k, gunEkle(BUGUN, 30)) > once + 0.1);
});
test('zor < orta < kolay aralıkları (ilk çalışma ve tekrar, her zorlukta)', () => {
  for (const z of [1, 2, 3, 4, 5]) {
    const S = bosDurum(); dersEkle(S, 'a', 'A', z, 2);
    const k = S.konular[0];
    const [a, b, c] = ['zor', 'orta', 'kolay'].map(p => Algo.sonrakiAralik(S, k, p, BUGUN));
    assert.ok(a >= 1 && a < b && b < c, `ilk z=${z}: ${a},${b},${c}`);
    const kk = kopya(k);
    assert.strictEqual(Algo.puanla(S, k, 'orta', BUGUN), b, 'sonrakiAralik ile puanla aynı');
    assert.deepStrictEqual(kk, kopya(S.konular[1].id === 'a-1' ? Object.assign(kopya(S.konular[1]), { id: 'a-0', ad: kk.ad }) : kk), 'sonrakiAralik konuyu değiştirmemeli');
    const t2 = gunEkle(BUGUN, b);
    const [a2, b2, c2] = ['zor', 'orta', 'kolay'].map(p => Algo.sonrakiAralik(S, k, p, t2));
    assert.ok(a2 < b2 && b2 < c2 && a2 <= b && b2 > b, `tekrar z=${z}: ${a2},${b2},${c2}`);
  }
});
test('orta puanlarla aralıklar büyür; zor ders daha sık tekrar edilir', () => {
  const dizi = z => {
    const S = bosDurum(); dersEkle(S, 'a', 'A', z, 1);
    const k = S.konular[0], l = []; let t = BUGUN;
    for (let i = 0; i < 5; i++) { const g = Algo.puanla(S, k, 'orta', t); l.push(g); t = gunEkle(t, g); }
    return l;
  };
  const kolayDers = dizi(1), zorDers = dizi(5), ortaDers = dizi(3);
  for (const l of [kolayDers, zorDers, ortaDers]) for (let i = 1; i < l.length; i++) assert.ok(l[i] > l[i - 1], l.join());
  assert.ok(zorDers[4] < ortaDers[4] && ortaDers[4] < kolayDers[4]);
  assert.ok(ortaDers[0] <= 3 && ortaDers[1] >= 4 && ortaDers[1] <= 10 && ortaDers[2] >= 12 && ortaDers[2] <= 35, 'varsayılan merdivene yakın: ' + ortaDers.join());
});
test('geç ve erken tekrar: geçen süre hesaba katılır', () => {
  const kur = () => { const S = ornek(null), k = S.konular[0]; Algo.puanla(S, k, 'orta', BUGUN); Algo.puanla(S, k, 'orta', gunEkle(BUGUN, 2)); return [S, k]; };
  const [S, k] = kur(), vade = gunFark(BUGUN, k.sonrakiTekrar);
  const zamaninda = Algo.sonrakiAralik(S, k, 'orta', gunEkle(BUGUN, vade));
  const gec = Algo.sonrakiAralik(S, k, 'orta', gunEkle(BUGUN, vade + 20));
  const erken = Algo.sonrakiAralik(S, k, 'orta', gunEkle(BUGUN, 3));
  const ayniGun = Algo.sonrakiAralik(S, k, 'orta', gunEkle(BUGUN, 2));
  assert.ok(gec > zamaninda, 'geç ama başarılı tekrar daha uzun aralık kazandırır');
  assert.ok(erken < zamaninda && erken >= vade - 2, 'erken tekrar az kazandırır ama geriletmez');
  assert.strictEqual(ayniGun, vade - 2, 'aynı gün ikinci tekrar kararlılığı şişirmez');
  assert.ok(Algo.sonrakiAralik(S, k, 'zor', gunEkle(BUGUN, vade + 20)) <= vade - 2, 'zor aralığı uzatmaz');
  assert.ok(Algo.hatirlama(S, k, gunEkle(BUGUN, vade + 20)) < Algo.hatirlama(S, k, gunEkle(BUGUN, vade)));
  const [S2, k2] = kur(); Algo.puanla(S2, k2, 'zor', gunEkle(BUGUN, vade));
  const [S3, k3] = kur(); Algo.puanla(S3, k3, 'kolay', gunEkle(BUGUN, vade));
  assert.ok(k2.kararlilik < k.kararlilik && k3.kararlilik > k.kararlilik && k2.gucluk > k3.gucluk);
});
test('puanla alanları yazar', () => {
  const S = ornek(null), k = S.konular[0];
  const g = Algo.puanla(S, k, 'kolay', BUGUN);
  assert.strictEqual(k.durum, 'calisildi'); assert.strictEqual(k.calisildiTarih, BUGUN); assert.strictEqual(k.sonPuan, 'kolay');
  assert.strictEqual(k.sonrakiTekrar, gunEkle(BUGUN, g)); assert.deepStrictEqual(k.tekrarlar, []);
  assert.ok(k.kararlilik > 0 && k.gucluk >= 1 && k.gucluk <= 10);
  const g2 = Algo.puanla(S, k, 'zor', gunEkle(BUGUN, g));
  assert.strictEqual(k.tekrarlar.length, 1);
  assert.strictEqual(k.tekrarlar[0].tarih, gunEkle(BUGUN, g)); assert.strictEqual(k.tekrarlar[0].puan, 'zor');
  assert.ok(k.tekrarlar[0].hatirlama > 0.5 && k.tekrarlar[0].kararlilik === k.kararlilik);
  assert.strictEqual(k.sonrakiTekrar, gunEkle(BUGUN, g + g2)); assert.strictEqual(k.sonPuan, 'zor');
  assert.strictEqual(Algo.puanla(S, S.konular[1], 'bilinmeyen', BUGUN), Algo.sonrakiAralik(S, S.konular[2], 'orta', BUGUN), 'geçersiz puan orta sayılır');
  // "Çalışılmadı yap" eski bellek alanlarını silmez; yeniden çalışınca baştan başlamalı
  Object.assign(k, { durum: 'yeni', tekrarlar: [], adim: 0, sonPuan: undefined, sonrakiTekrar: undefined, calisildiTarih: undefined });
  assert.strictEqual(Algo.hatirlama(S, k, BUGUN), 0);
  assert.strictEqual(Algo.sonrakiAralik(S, k, 'orta', BUGUN), Algo.sonrakiAralik(S, S.konular[3], 'orta', BUGUN));
});
test('sınav farkındalığı: aralık gerekirse sınav öncesine çekilir', () => {
  let cekilen = 0, serbestKalan = 0;
  for (const ilkPuan of ['zor', 'orta', 'kolay']) for (const once of [2, 5, 8, 12]) for (const p of ['orta', 'kolay']) {
    const S = ornek(12, { tekrarGunu: 2 }), k = S.konular[0];
    Algo.puanla(S, k, ilkPuan, gunEkle(BUGUN, -once));
    const S0 = ornek(null); Object.assign(S0.konular[0], kopya(k));
    const serbest = Algo.sonrakiAralik(S0, S0.konular[0], p, BUGUN);
    const g = Algo.sonrakiAralik(S, k, p, BUGUN);
    Algo.puanla(S0, S0.konular[0], p, BUGUN);
    const sinavda = Algo.hatirlama(S0, S0.konular[0], gunEkle(BUGUN, 12));
    if (serbest < 12) assert.strictEqual(g, serbest, 'sınavdan önceye düşen aralık değişmez');
    else if (sinavda < 0.93) { assert.strictEqual(g, 10, 'genel tekrar penceresinin başına çekilir'); cekilen++; }
    else { assert.strictEqual(g, serbest, 'sınavda zaten sağlam kalacak konu zorlanmaz'); serbestKalan++; }
  }
  assert.ok(cekilen >= 2 && serbestKalan >= 1, `${cekilen} ${serbestKalan}`);
  for (const p of ['zor', 'orta', 'kolay']) for (const sg of [1, 2, 3, 5, 9]) {
    const S2 = ornek(sg), k2 = S2.konular[0]; Algo.puanla(S2, k2, 'orta', gunEkle(BUGUN, -6));
    const a = Algo.sonrakiAralik(S2, k2, p, BUGUN);
    assert.ok(a >= 1 && (sg === 1 || a < sg || Algo.egri(sg, Algo.bellek(Object.assign(S2, {}), (Algo.puanla(S2, k2, p, BUGUN), k2)).kararlilik) >= 0.92), `sınava ${sg} gün, ${p}: ${a}`);
  }
  // çok sağlam konu sınav öncesine zorlanmaz
  const S3 = ornek(3), k3 = S3.konular[0];
  Object.assign(k3, { durum: 'calisildi', calisildiTarih: gunEkle(BUGUN, -60), kararlilik: 80, gucluk: 3, tekrarlar: [{ tarih: gunEkle(BUGUN, -30), puan: 'kolay' }], sonrakiTekrar: BUGUN });
  assert.ok(Algo.sonrakiAralik(S3, k3, 'kolay', BUGUN) > 3);
});
test('ayar.araliklar aralıkları ölçekler', () => {
  const ar = a => { const S = ornek(null, { araliklar: a }), k = S.konular[0]; Algo.puanla(S, k, 'orta', BUGUN); Algo.puanla(S, k, 'orta', gunEkle(BUGUN, 3)); return Algo.sonrakiAralik(S, k, 'orta', gunEkle(BUGUN, 10)); };
  assert.strictEqual(Algo.aralikCarpani(ornek(null)), 1);
  assert.ok(ar([1, 3, 10]) < ar([1, 7, 30]) && ar([1, 7, 30]) < ar([2, 14, 60]));
  assert.ok(ar([]) === ar([1, 7, 30]) && ar(['x', -1]) === ar([1, 7, 30]));
});
test('kişisel bellek ayarı: sık zorlanınca aralıklar kısalır', () => {
  const kur = p => { const S = ornek(null); S.konular.slice(0, 12).forEach(k => { Algo.puanla(S, k, 'orta', gunEkle(BUGUN, -10)); Algo.puanla(S, k, p, gunEkle(BUGUN, -7)); }); return S; };
  const zorlu = kur('zor'), iyi = kur('kolay');
  assert.ok(Algo.bellekAyari(zorlu) < 0.9 && Algo.bellekAyari(iyi) > 1 && Algo.bellekAyari(ornek(null)) === 1);
  assert.ok(Algo.planla(zorlu, BUGUN).oneriDetay.some(o => o.tur === 'bellek'));
});

console.log('Eski veri');
test('eski alanlarla (adim, sonrakiTekrar, tekrarlar) çalışır ve deterministik çözülür', () => {
  const S = ornek(20), k = S.konular[0];
  Object.assign(k, { durum: 'calisildi', calisildiTarih: gunEkle(BUGUN, -9), adim: 1, sonPuan: 'kolay', sonrakiTekrar: gunEkle(BUGUN, -1), tekrarlar: [{ tarih: gunEkle(BUGUN, -8), puan: 'kolay' }] });
  const once = JSON.stringify(k);
  const b1 = Algo.bellek(S, k), b2 = Algo.bellek(S, k);
  assert.deepStrictEqual(b1, b2); assert.strictEqual(JSON.stringify(k), once, 'okuma konuyu değiştirmez');
  assert.ok(b1.kararlilik > 2 && b1.kararlilik < 40 && b1.sonTarih === gunEkle(BUGUN, -8));
  const r = Algo.hatirlama(S, k, BUGUN);
  assert.ok(r > 0.5 && r < 1);
  const p = planKontrol(S, BUGUN, 'eski');
  const is = p.gunler[0].isler.find(i => i.konu === k);
  assert.ok(is && is.tip === 'tekrar' && is.gecikme === 1, 'gecikmiş tekrar bugüne gelir');
  Algo.puanla(S, k, 'orta', BUGUN);
  assert.ok(k.kararlilik > b1.kararlilik && k.tekrarlar.length === 2 && k.sonrakiTekrar > BUGUN);
  // tekrar geçmişi daha uzun olan daha kararlı çözülür
  const k2 = S.konular[1], k3 = S.konular[2];
  Object.assign(k2, { durum: 'calisildi', calisildiTarih: gunEkle(BUGUN, -20), sonPuan: 'orta', sonrakiTekrar: BUGUN, tekrarlar: [] });
  Object.assign(k3, kopya(k2), { id: k3.id, tekrarlar: [{ tarih: gunEkle(BUGUN, -19), puan: 'kolay' }, { tarih: gunEkle(BUGUN, -12), puan: 'orta' }] });
  assert.ok(Algo.bellek(S, k3).kararlilik > Algo.bellek(S, k2).kararlilik * 2);
});
test('bozuk/eksik alanlar hata fırlatmaz', () => {
  const S = ornek(10);
  Object.assign(S.konular[0], { durum: 'calisildi' }); delete S.konular[0].tekrarlar;
  Object.assign(S.konular[1], { durum: 'calisildi', calisildiTarih: 'bozuk', sonrakiTekrar: 42, tekrarlar: [null, { puan: 'x' }, { tarih: 'yok', puan: 'zor' }] });
  Object.assign(S.konular[2], { durum: 'calisildi', sonrakiTekrar: gunEkle(BUGUN, 2), kararlilik: 'abc', gucluk: null, tekrarlar: 'x' });
  Object.assign(S.konular[3], { tahmin: 'kırk', durum: undefined });
  S.konular.push({ id: 'yetim', dersId: 'yok', ad: 'Yetim', durum: 'yeni' });
  S.oturumlar.push(null, { tarih: null, dk: 'a' }, { id: 'x', tarih: BUGUN, dersId: 'silinmis', konuId: 'yok', dk: 30 }, { tarih: BUGUN, dersId: 'a', dk: -5 });
  S.dersler[1].zorluk = undefined; S.dersler[2].zorluk = 99;
  S.sinavlar.push({ id: 'q', komiteId: 'k1' }, null);
  for (const k of S.konular) {
    for (const f of ['tahminDk', 'tekrarDk']) assert.ok(Algo[f](S, k) >= 5, f);
    assert.ok(Algo.kalanDk(S, k) >= 0);
    const r = Algo.hatirlama(S, k, BUGUN); assert.ok(r >= 0 && r <= 1);
    for (const p of ['zor', 'orta', 'kolay']) assert.ok(Algo.sonrakiAralik(S, k, p, BUGUN) >= 1);
  }
  planKontrol(S, BUGUN, 'bozuk');
  for (const d of S.dersler) assert.ok(Algo.dersOzet(S, d.id, BUGUN).hazirlik >= 0);
  for (const k of S.konular.slice(0, 5)) assert.ok(Algo.puanla(S, k, 'orta', BUGUN) >= 1);
  planKontrol(S, BUGUN, 'bozuk2');
  for (const B of [{}, { ayar: null, konular: 5 }, { komiteler: [], dersler: [null], konular: [null], sinavlar: [null], oturumlar: [null], ayar: { gunluk: 'x' } }]) {
    const p = Algo.planla(B, BUGUN);
    assert.ok(p.gunler.length === 14 && p.oneriler.length === 0 && p.ozet.hazirlik === 0);
    assert.strictEqual(Algo.kisiselCarpan(B, 'a'), 1);
  }
  assert.ok(Algo.sonrakiAralik(S, S.konular[6], 'orta') >= 1, 'bugun verilmeden de çalışır');
});

console.log('Süre tahmini ve kapasite');
test('süre: varsayılan, elle tahmin, kişisel çarpan büzülmesi, aykırı değer', () => {
  const S = ornek(null), a = S.konular.filter(k => k.dersId === 'a'), f = S.konular.filter(k => k.dersId === 'f');
  assert.strictEqual(Algo.tahminDk(S, a[0]), 70); assert.strictEqual(Algo.tahminDk(S, f[0]), 50);
  assert.strictEqual(Algo.kisiselCarpan(S, 'a'), 1); assert.strictEqual(Algo.kisiselCarpan(S, 'yok'), 1);
  a[9].tahmin = 33; assert.strictEqual(Algo.tahminDk(S, a[9]), 33);
  const bitir = (k, dk, gun) => { Algo.puanla(S, k, 'orta', gunEkle(BUGUN, gun)); S.oturumlar.push({ id: 'o' + S.oturumlar.length, tarih: gunEkle(BUGUN, gun), dersId: k.dersId, konuId: k.id, dk }); };
  bitir(a[0], 140, -6);
  const tek = Algo.kisiselCarpan(S, 'a');
  assert.ok(tek > 1.05 && tek < 1.4, 'tek örnek az etkiler: ' + tek);
  bitir(a[1], 140, -5); bitir(a[2], 140, -4); bitir(a[3], 140, -3); bitir(a[4], 140, -2);
  const bes = Algo.kisiselCarpan(S, 'a');
  assert.ok(bes > 1.55 && bes < 2, 'beş örnek belirgin: ' + bes);
  assert.strictEqual(Algo.tahminDk(S, a[5]), Math.round(70 * bes / 5) * 5);
  assert.strictEqual(Algo.tahminDk(S, a[9]), 33, 'elle girilen tahmin çarpılmaz');
  const digeri = Algo.kisiselCarpan(S, 'f');
  assert.ok(digeri > 1 && digeri < bes, 'verisi olmayan ders genel eğilimi zayıfça alır: ' + digeri);
  assert.strictEqual(Algo.dersOzet(S, 'a', BUGUN).carpan, bes);
  bitir(a[5], 5000, -1); // unutulmuş sayaç
  assert.ok(Algo.kisiselCarpan(S, 'a') < bes * 1.12, 'aykırı tek kayıt çarpanı bozmaz');
  assert.ok(Algo.planla(S, BUGUN).oneriDetay.some(o => o.tur === 'sure' && /Anatomi tahminden %\d+ uzun/.test(o.metin)));
});
test('süre: konusuz oturumlar ders düzeyinde zayıf kanıt, tekrar süreleri öğrenilir', () => {
  const S = ornek(null), f = S.konular.filter(k => k.dersId === 'f');
  f.slice(0, 4).forEach((k, i) => Algo.puanla(S, k, 'orta', gunEkle(BUGUN, -8 + i)));
  assert.strictEqual(Algo.kisiselCarpan(S, 'f'), 1);
  for (let i = 0; i < 4; i++) S.oturumlar.push({ id: 'k' + i, tarih: gunEkle(BUGUN, -8 + i), dersId: 'f', konuId: null, dk: 100 });
  const c = Algo.kisiselCarpan(S, 'f');
  assert.ok(c > 1.05 && c < 1.35, 'konusuz: ' + c);
  const t0 = Algo.tekrarDk(S, f[0]);
  assert.strictEqual(Algo.tekrarCarpani(S), 1);
  f.slice(0, 4).forEach((k, i) => { const t = gunEkle(BUGUN, -3 + i % 2); Algo.puanla(S, k, 'orta', t); S.oturumlar.push({ id: 't' + i, tarih: t, dersId: 'f', konuId: k.id, dk: 45 }); });
  assert.ok(Algo.tekrarCarpani(S) > 1.2, 'tekrar çarpanı: ' + Algo.tekrarCarpani(S));
  assert.ok(Algo.tekrarDk(S, f[0]) > t0);
  assert.ok(Algo.tekrarDk(S, f[0]) % 5 === 0 && Algo.tekrarDk(S, f[5]) >= 10);
});
test('yarım kalmış konu: kalan süre düşülür ve işaretlenir', () => {
  const S = ornek(20), k = S.konular[0];
  S.oturumlar.push({ id: 'o', tarih: gunEkle(BUGUN, -1), dersId: 'a', konuId: k.id, dk: 40 });
  assert.strictEqual(Algo.tahminDk(S, k), 70); assert.strictEqual(Algo.kalanDk(S, k), 30);
  const is = Algo.planla(S, BUGUN).gunler[0].isler.find(i => i.konu === k);
  assert.ok(is && is.dk === 30 && is.baslanmis === true);
});
test('kapasite: geçmişten öğrenilir, hedef ayrıca gösterilir, bugün kullanılan düşülür', () => {
  const S = ornek(30);
  assert.strictEqual(Algo.kapasite(S, BUGUN).uyum, 1);
  for (let g = 1; g <= 21; g++) S.oturumlar.push({ id: 'o' + g, tarih: gunEkle(BUGUN, -g), dersId: 'silinmis', konuId: null, dk: Math.round(S.ayar.gunluk[haftaGunu(gunEkle(BUGUN, -g))] * 0.6) });
  const kp = Algo.kapasite(S, BUGUN);
  assert.ok(kp.uyum > 0.58 && kp.uyum < 0.75 && kp.gun === 21, JSON.stringify(kp));
  const p = planKontrol(S, BUGUN, 'kapasite');
  assert.strictEqual(p.gunler[0].kapasite, p.gunler[0].hedef, 'bugün hedefe göre');
  for (const g of p.gunler.slice(1)) assert.ok(g.kapasite < g.hedef * 0.8 && g.kapasite >= g.hedef * 0.5 && g.yuk <= g.hedef);
  assert.ok(p.oneriDetay.some(o => o.tur === 'uyum' && /%60/.test(o.metin)), p.oneriler.join(' | '));
  // tam çalışan öğrenci: kapasite = hedef
  const S2 = ornek(30);
  for (let g = 1; g <= 21; g++) S2.oturumlar.push({ id: 'o' + g, tarih: gunEkle(BUGUN, -g), dersId: 'a', konuId: null, dk: 400 });
  assert.strictEqual(Algo.kapasite(S2, BUGUN).uyum, 1);
  // hafta sonu hiç çalışmayan öğrenci: hafta sonu kapasitesi hafta içinden düşük oranda
  const S3 = ornek(30);
  for (let g = 1; g <= 28; g++) { const t = gunEkle(BUGUN, -g); if (haftaGunu(t) < 5) S3.oturumlar.push({ id: 'o' + g, tarih: t, dersId: 'a', konuId: null, dk: 120 }); }
  const k3 = Algo.kapasite(S3, BUGUN);
  assert.ok(k3.haftalik[5] < k3.haftalik[0] && k3.haftalik[0] > 0.8 && k3.haftalik[6] <= 0.6, JSON.stringify(k3.haftalik));
  // süre tutmayan ama konu işaretleyen öğrenci tembel sayılmaz
  const S4 = ornek(30);
  for (let g = 1; g <= 10; g++) { Algo.puanla(S4, S4.konular[g], 'orta', gunEkle(BUGUN, -g)); Algo.puanla(S4, S4.konular[g + 11], 'orta', gunEkle(BUGUN, -g)); }
  assert.ok(Algo.kapasite(S4, BUGUN).uyumHam > 0.7);
  // bugün kullanılan süre
  const S5 = ornek(30), bos = Algo.planla(S5, BUGUN).gunler[0];
  S5.oturumlar.push({ id: 'b', tarih: BUGUN, dersId: 'a', konuId: null, dk: 90 });
  const dolu = Algo.planla(S5, BUGUN).gunler[0];
  assert.ok(dolu.kullanilan === 90 && dolu.yuk < bos.yuk && dolu.yuk <= 80, `${bos.yuk} -> ${dolu.yuk}`);
  S5.oturumlar.push({ id: 'c', tarih: BUGUN, dersId: 'a', konuId: null, dk: 60 });
  assert.strictEqual(Algo.planla(S5, BUGUN).gunler[0].isler.length, 0, 'hedef dolunca bugün boş');
});

console.log('Planlama');
test('şekil: temel senaryo ve alanlar', () => {
  const S = ornek(35, { tekrarGunu: 2 });
  const p = planKontrol(S, BUGUN, 'temel');
  assert.strictEqual(p.gunler.length, 35); assert.strictEqual(p.sinav, S.sinavlar[0]);
  assert.strictEqual(p.gunler.filter(g => g.rezerv).length, 2); assert.ok(p.gunler[34].rezerv && p.gunler[33].rezerv);
  assert.strictEqual(p.yetismeyen.length, 0); assert.strictEqual(p.ekGunluk, 0);
  assert.strictEqual(p.ozet.toplamKalanDk, 12 * 70 + 10 * 50 + 6 * 40);
  assert.ok(p.ozet.tahminiBitis && p.ozet.tahminiBitis < gunEkle(BUGUN, 33));
  assert.ok(p.ozet.hazirlik > 60 && p.ozet.hazirlikSimdi === 0);
  assert.strictEqual(p.dersler.length, 3);
  assert.ok(p.gunler[0].isler.length > 0 && p.gunler[0].isler[0].konu.dersId === 'a', 'zor ve yükü büyük ders önce başlar');
  assert.ok(p.gunler.some(g => g.rezerv && g.isler.some(i => i.tip === 'genel')), 'genel tekrar günleri kullanılır');
  const d = Algo.dersOzet(S, 'a', BUGUN);
  assert.deepStrictEqual([d.hazirlik, d.carpan, d.toplam, d.calisilan], [0, 1, 12, 0]);
});
test('dengeli yük: iş azken ilk günlere yığılmaz, boş gün bırakılmaz', () => {
  const S = ornek(35, { gunluk: [240, 240, 240, 240, 240, 240, 240], tekrarGunu: 2 });
  const p = planKontrol(S, BUGUN, 'dengeli');
  const yeniGun = p.gunler.filter(g => g.isler.some(i => i.tip === 'yeni'));
  assert.ok(p.ozet.yetisme === 'rahat');
  assert.ok(yeniGun.length >= 9, 'yeni konular en az 9 güne yayılır: ' + yeniGun.length);
  assert.ok(Math.max(...p.gunler.map(g => g.yuk)) <= 240 + 35, 'en çok yarım konu taşar');
  const bitis = gunFark(BUGUN, p.ozet.tahminiBitis);
  for (let i = 0; i < bitis; i++) assert.ok(p.gunler[i].yuk > 0, 'arada boş gün: ' + i);
  assert.ok(p.oneriDetay.some(o => o.tur === 'rahat'));
});
test('gün içinde dersler dönüşümlü, tekrarlar önce', () => {
  const S = ornek(10, { gunluk: [300, 300, 300, 300, 300, 300, 300] });
  S.konular.filter((k, i) => i % 3 === 0).forEach(k => Algo.puanla(S, k, 'orta', gunEkle(BUGUN, -2)));
  const p = planKontrol(S, BUGUN, 'donusumlu'), is = p.gunler[0].isler;
  const ilkYeni = is.findIndex(i => i.tip === 'yeni');
  assert.ok(ilkYeni > 0 && is.slice(ilkYeni).every(i => i.tip === 'yeni'), 'önce tekrarlar');
  const yeni = is.slice(ilkYeni);
  assert.ok(new Set(yeni.map(i => i.dersId)).size >= 2);
  let ardisik = 0; for (let i = 1; i < yeni.length; i++) if (yeni[i].dersId === yeni[i - 1].dersId) ardisik++;
  assert.ok(ardisik <= 1, 'aynı ders art arda: ' + yeni.map(i => i.dersId).join());
});
test('birikmiş tekrarlar: gün tamamen tekrara boğulmaz, zayıflar önce, öneri çıkar', () => {
  const S = ornek(25);
  dersEkle(S, 'h', 'Histoloji', 3, 40);
  const hk = S.konular.filter(k => k.dersId === 'h');
  hk.forEach((k, i) => Algo.puanla(S, k, i % 2 ? 'zor' : 'kolay', gunEkle(BUGUN, -12 - (i % 5))));
  const p = planKontrol(S, BUGUN, 'birikme'), g0 = p.gunler[0];
  const tk = g0.isler.filter(i => i.tip === 'tekrar'), tdk = tk.reduce((a, i) => a + i.dk, 0);
  assert.ok(p.ozet.tekrarBekleyen === 40 && p.ozet.enEskiGecikme >= 5);
  assert.ok(tk.length >= 2 && tdk <= g0.hedef * 0.6 + 5, 'tekrar payı sınırlı: ' + tdk);
  assert.ok(g0.isler.some(i => i.tip === 'yeni'), 'yeni konuya da yer kalır');
  assert.ok(tk.every(i => i.gecikme > 0 && /gecikti/.test(i.neden)));
  const enZayif = Math.min(...hk.map(k => Algo.hatirlama(S, k, BUGUN)));
  assert.ok(tk[0].hatirlama <= Math.round(enZayif * 100) + 3, 'en zayıf önce');
  assert.ok(p.gunler[1].isler.some(i => i.tip === 'tekrar' && i.erteleme > 0), 'kalanı sonraki günlere yayılır');
  assert.ok(/tekrar birikti/.test(p.oneriler.join(' ')), p.oneriler.join(' | '));
  // yalnızca tekrar varken (yeni konu yok) tekrarlar günün tamamını kullanabilir
  S.konular = hk;
  const p2 = planKontrol(S, BUGUN, 'birikme2');
  assert.ok(p2.gunler[0].yuk >= p2.gunler[0].hedef * 0.8);
});
test('sığmayınca ayıklama: ders sonları elenir, öneri ve ek süre verilir', () => {
  const S = ornek(8, { gunluk: [60, 60, 60, 60, 60, 60, 60], tekrarGunu: 1 });
  const p = planKontrol(S, BUGUN, 'triage');
  assert.strictEqual(p.ozet.yetisme, 'yetismiyor'); assert.strictEqual(p.ozet.tahminiBitis, null);
  assert.ok(p.yetismeyen.length >= 15 && p.yetismeyen.length < 28 && p.ekGunluk >= 60, `${p.yetismeyen.length} ${p.ekGunluk}`);
  assert.ok(/konu sınava yetişmiyor/.test(p.oneriler[0]) && p.oneriler[0].includes(String(p.ekGunluk)), p.oneriler[0]);
  for (const d of ['a', 'f', 'b']) assert.ok(p.gunler.some(g => g.isler.some(i => i.tip === 'yeni' && i.dersId === d)), 'her dersten bir şey kalır: ' + d);
  // hedef önerilen kadar artırılınca belirgin biçimde iyileşir
  const S2 = kopya(S); S2.ayar.gunluk = S2.ayar.gunluk.map(x => x + p.ekGunluk);
  assert.ok(Algo.planla(S2, BUGUN).yetismeyen.length <= p.yetismeyen.length * 0.35);
});
test('genel tekrar günleri: sınav günü en çok kazandıran konular seçilir', () => {
  const S = ornek(6, { tekrarGunu: 2, gunluk: [60, 60, 60, 60, 60, 60, 60] });
  S.konular = S.konular.filter(k => k.dersId !== 'b');
  S.konular.forEach((k, i) => {
    Algo.puanla(S, k, i % 3 === 0 ? 'zor' : 'kolay', gunEkle(BUGUN, -14));
    k.sonrakiTekrar = gunEkle(BUGUN, 40); // vadesi sınavdan sonra: yalnızca tazeleme mantığı seçebilir
  });
  const p = planKontrol(S, BUGUN, 'genel');
  const genel = p.gunler.flatMap(g => g.isler.filter(i => i.sinavOncesi));
  assert.ok(p.gunler.filter(g => g.rezerv).every(g => g.isler.length && g.isler.every(i => i.tip === 'genel')), 'rezerv günler genel tekrarla dolar');
  assert.ok(p.gunler.slice(0, 4).every(g => g.isler.length && g.isler.every(i => i.tip === 'tekrar')), 'son haftanın boş günleri de zayıf konulara kullanılır');
  assert.ok(genel.length >= 4 && genel.every(i => i.kazanc >= 2 && i.sinavOncesi && /Sınav günü hatırlama/.test(i.neden)));
  const secilenOrt = genel.reduce((a, i) => a + Algo.hatirlama(S, i.konu, p.sinav.tarih), 0) / genel.length;
  const hepsiOrt = S.konular.reduce((a, k) => a + Algo.hatirlama(S, k, p.sinav.tarih), 0) / S.konular.length;
  assert.ok(secilenOrt < hepsiOrt, 'zayıf konular seçilir');
  assert.ok(p.ozet.hazirlik > p.ozet.hazirlikSimdi + 3, `${p.ozet.hazirlikSimdi} -> ${p.ozet.hazirlik}`);
});
test('uzun konu günü aşabilir ama iki kez planlanmaz, ertesi gün hafifler', () => {
  const S = ornek(20, { gunluk: [100, 100, 100, 100, 100, 100, 100] });
  S.konular = S.konular.filter(k => k.dersId === 'f');
  S.konular[0].tahmin = 300;
  const p = planKontrol(S, BUGUN, 'uzun');
  assert.ok(p.gunler[0].isler[0].konu === S.konular[0] && p.gunler[0].isler[0].dk === 300 && /Uzun konu/.test(p.gunler[0].isler[0].neden));
  assert.strictEqual(p.gunler[0].isler.filter(i => i.tip === 'yeni').length, 1);
  assert.strictEqual(p.gunler[1].isler.filter(i => i.tip === 'yeni').length, 0, 'taşan süre ertesi günden düşer');
});
test('kenar durumlar', () => {
  // sınav yok
  let p = planKontrol(ornek(null), BUGUN, 'sinavsiz');
  assert.ok(p.sinav === undefined && p.gunler.length === 14 && p.ufukDisi.length > 0 && p.ozet.yetisme === 'rahat' && !p.gunler.some(g => g.rezerv));
  assert.ok(p.oneriDetay.some(o => o.tur === 'sinavYok'));
  // sınav yarın
  let S = ornek(1); S.konular.slice(0, 6).forEach(k => Algo.puanla(S, k, 'orta', gunEkle(BUGUN, -9)));
  p = planKontrol(S, BUGUN, 'yarin');
  assert.ok(p.gunler.length === 1 && !p.gunler[0].rezerv && p.gunler[0].isler.length > 0 && p.yetismeyen.length > 0);
  assert.ok(p.oneriDetay.some(o => o.tur === 'sinavYarin'));
  // sınav bugün / geçmiş
  p = planKontrol(ornek(0), BUGUN, 'bugun');
  assert.ok(p.sinav === undefined && p.sinavBugun && p.gunler.length === 14 && p.oneriDetay.some(o => o.tur === 'sinavBugun'));
  p = planKontrol(ornek(-3), BUGUN, 'gecmis');
  assert.ok(p.sinav === undefined && !p.sinavBugun && p.gunler.length === 14);
  // konu yok / ders yok
  S = bosDurum(); S.sinavlar.push({ id: 's', komiteId: 'k1', ad: 'S', tarih: gunEkle(BUGUN, 5) });
  p = planKontrol(S, BUGUN, 'bos');
  assert.ok(p.gunler.length === 5 && p.gunler.every(g => !g.isler.length) && p.ozet.hazirlik === 0 && p.ozet.yetisme === 'rahat' && p.oneriler.length === 0);
  // hepsi çalışılmış
  S = ornek(10); S.konular.forEach((k, i) => Algo.puanla(S, k, 'orta', gunEkle(BUGUN, -1 - i % 4)));
  p = planKontrol(S, BUGUN, 'hepsi');
  assert.ok(p.ozet.toplamKalanDk === 0 && p.ozet.tahminiBitis === null && p.ozet.yetisme === 'rahat' && p.ozet.hazirlik >= p.ozet.hazirlikSimdi);
  assert.ok(p.gunler.every(g => g.isler.every(i => i.tip !== 'yeni')) && p.gunler.some(g => g.isler.length));
  // tüm hedefler sıfır
  S = ornek(10, { gunluk: [0, 0, 0, 0, 0, 0, 0] });
  p = planKontrol(S, BUGUN, 'sifir');
  assert.ok(p.gunler.every(g => !g.isler.length) && p.yetismeyen.length === 28 && p.ekGunluk > 0 && /sıfır/.test(p.oneriler[0]));
  // başka komitenin sınavı ve konuları karışmaz
  S = ornek(null); S.komiteler.push({ id: 'k2', ad: '3' }); dersEkle(S, 'z', 'Z', 3, 4, 'k2'); S.sinavlar.push({ id: 'q', komiteId: 'k2', ad: 'Q', tarih: gunEkle(BUGUN, 4) });
  p = planKontrol(S, BUGUN, 'komite');
  assert.ok(p.sinav === undefined && !p.gunler.some(g => g.isler.some(i => i.dersId === 'z')));
  // en yakın sınav seçilir, 120 gün tavanı
  S = ornek(300); S.sinavlar.push({ id: 'y', komiteId: 'k1', ad: 'Yakın', tarih: gunEkle(BUGUN, 200) });
  p = planKontrol(S, BUGUN, 'uzak');
  assert.ok(p.sinav.id === 'y' && p.gunler.length === 120);
});
test('çok günlü ilerleme: plana uyan öğrenci hepsini bitirir, hazırlık yüksek kalır', () => {
  const S = ornek(35, { tekrarGunu: 2 });
  let ilkTahmin = null;
  for (let g = 0; g < 35; g++) {
    const t = gunEkle(BUGUN, g), p = planKontrol(S, t, 'ilerleme' + g);
    if (g === 0) ilkTahmin = p.ozet.hazirlik;
    for (const is of p.gunler[0].isler) Algo.puanla(S, is.konu, 'orta', t);
  }
  const sinav = S.sinavlar[0].tarih;
  assert.ok(S.konular.every(k => k.durum === 'calisildi'));
  const ort = S.konular.reduce((a, k) => a + Algo.hatirlama(S, k, sinav), 0) / S.konular.length * 100;
  assert.ok(ort > 85, 'sınav günü ortalama: ' + ort.toFixed(1));
  assert.ok(Math.abs(ort - ilkTahmin) < 8, `ilk günkü hazırlık tahmini tutarlı: ${ilkTahmin} / ${ort.toFixed(1)}`);
});

console.log('Rastgele senaryolarda değişmezler');
test('400 üretilmiş durumda tüm değişmezler', () => {
  let sinavli = 0, yetismeyenli = 0, tekrarli = 0;
  for (let i = 1; i <= 400; i++) {
    const { S, t } = uret(i);
    const p = planKontrol(S, t, 'tohum ' + i);
    if (p.sinav) sinavli++; if (p.yetismeyen.length) yetismeyenli++; if (p.ozet.planlananTekrar) tekrarli++;
    for (const d of S.dersler) { const o = Algo.dersOzet(S, d.id, t); assert.ok(o.hazirlik >= 0 && o.hazirlik <= 100 && o.carpan >= 0.5 && o.carpan <= 2.5); }
    for (const k of S.konular) { const r = Algo.hatirlama(S, k, t); assert.ok(r >= 0 && r <= 1 && (r > 0) === (k.durum === 'calisildi')); }
  }
  assert.ok(sinavli > 150 && yetismeyenli > 40 && tekrarli > 200, `kapsam: ${sinavli} ${yetismeyenli} ${tekrarli}`);
});
test('rastgele günlük kullanım: puanla + planla birlikte tutarlı kalır', () => {
  for (let i = 1; i <= 25; i++) {
    const { S, t } = uret(1000 + i), r = rastgele(i);
    for (let g = 0; g < 12; g++) {
      const gun = gunEkle(t, g), p = planKontrol(S, gun, `kullanım ${i}/${g}`);
      for (const is of (p.gunler[0] || { isler: [] }).isler) {
        if (r() < 0.25) continue;
        const once = Algo.sonrakiAralik(S, is.konu, 'orta', gun);
        const puan = r.sec(['zor', 'orta', 'kolay']), ar = Algo.puanla(S, is.konu, puan, gun);
        assert.ok(ar >= 1 && ar <= 365 && is.konu.sonrakiTekrar === gunEkle(gun, ar));
        if (puan === 'orta') assert.strictEqual(ar, once);
        if (r() < 0.6) S.oturumlar.push({ id: 'n' + g + is.konu.id, tarih: gun, dersId: is.konu.dersId, konuId: is.konu.id, dk: Math.round(is.dk * (0.5 + r())) });
      }
    }
  }
});

test('tarayıcıda klasik betik olarak global Algo tanımlar', () => {
  const vm = require('node:vm'), fs = require('node:fs');
  const ortam = { self: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'algoritma.js'), 'utf8'), ortam);
  for (const f of ['tahminDk', 'tekrarDk', 'kisiselCarpan', 'sonrakiAralik', 'puanla', 'hatirlama', 'planla', 'dersOzet']) assert.strictEqual(typeof ortam.self.Algo[f], 'function', f);
  assert.strictEqual(ortam.self.Algo.planla(ornek(20), BUGUN).gunler.length, 20);
});

console.log('Başarım');
let olcumMs = 0;
test('planla: 12 ders / 600 konu / 3000 oturum / 60 gün, 30 ms altında', () => {
  const r = rastgele(7), S = bosDurum({ gunluk: [240, 240, 240, 240, 240, 300, 300], tekrarGunu: 3 });
  for (let c = 0; c < 12; c++) dersEkle(S, 'd' + c, 'Ders ' + c, 1 + c % 5, 50);
  S.sinavlar.push({ id: 's', komiteId: 'k1', ad: 'S', tarih: gunEkle(BUGUN, 60) });
  S.konular.forEach((k, i) => {
    if (i % 50 >= 30) return;
    let g = -r.tam(1, 30), ar = Algo.puanla(S, k, r.sec(['zor', 'orta', 'kolay']), gunEkle(BUGUN, g));
    while (g + ar < 0) { g += ar; ar = Algo.puanla(S, k, r.sec(['zor', 'orta', 'kolay']), gunEkle(BUGUN, g)); }
    if (i % 4 === 0) { delete k.kararlilik; delete k.gucluk; } // eski veri yolu da ölçülsün
  });
  for (let i = 0; i < 3000; i++) { const k = S.konular[r.tam(0, 599)]; S.oturumlar.push({ id: 'o' + i, tarih: gunEkle(BUGUN, -r.tam(0, 40)), dersId: k.dersId, konuId: r() < 0.8 ? k.id : null, dk: r.tam(10, 90) }); }
  assert.strictEqual(S.konular.length, 600);
  const p = planKontrol(S, BUGUN, 'başarım');
  assert.ok(p.gunler.length === 60 && p.ozet.planlananTekrar > 100 && p.ozet.planlananYeni > 50);
  for (let i = 0; i < 30; i++) Algo.planla(S, BUGUN); // ısınma
  const sureler = [];
  for (let i = 0; i < 60; i++) { const b = process.hrtime.bigint(); Algo.planla(S, BUGUN); sureler.push(Number(process.hrtime.bigint() - b) / 1e6); }
  sureler.sort((a, b) => a - b);
  olcumMs = sureler[30];
  console.log(`       planla ortanca ${olcumMs.toFixed(2)} ms, en kötü ${sureler[59].toFixed(2)} ms (${p.ozet.planlananYeni} yeni, ${p.ozet.planlananTekrar} tekrar işi, ${p.yetismeyen.length} yetişmeyen)`);
  assert.ok(olcumMs < 30, 'ortanca ' + olcumMs.toFixed(2) + ' ms');
  const b = process.hrtime.bigint();
  for (const k of S.konular) { Algo.tahminDk(S, k); }
  console.log(`       600 konu için tahminDk: ${(Number(process.hrtime.bigint() - b) / 1e6).toFixed(1)} ms`);
});

console.log('Simülasyon (5 haftalık komite, plana gürültülü uyum, bağımsız gerçek unutma modeli)');
test('yeni algoritma sınav günü hatırlama ve kapsamda eski algoritmayı açık farkla geçer', () => {
  const senaryolar = [
    ['sıkışık (hedef 2 sa)', {}],
    ['rahat (hedef 3 sa)', { hedef: [180, 180, 180, 180, 180, 240, 240] }],
    ['çok sıkışık (1.5 sa)', { hedef: [90, 90, 90, 90, 90, 120, 120] }],
    ['düzenli öğrenci', { uyum: [0.9, 1.05], bosGun: 0.03 }],
    ['yavaş unutan', { h0: 15 }]
  ];
  const N = 10, f = x => (x * 100).toFixed(1).padStart(5);
  console.log('       senaryo                 | yeni: hatırlama kapsam | v1: hatırlama kapsam | v1 merdiven: hatırlama kapsam');
  for (const [ad, sec] of senaryolar) {
    const ort = algo => { let h = 0, k = 0; for (let t = 1; t <= N; t++) { const x = Y.simulasyon(algo, t, sec); h += x.hatirlama / N; k += x.kapsam / N; } return [h, k]; };
    const y = ort(Algo), e = ort(Y.Eski), m = ort(Y.EskiMerdiven);
    console.log(`       ${ad.padEnd(23)} |       %${f(y[0])}  %${f(y[1])} |      %${f(e[0])} %${f(e[1])} |              %${f(m[0])} %${f(m[1])}`);
    for (const [b, x] of [['v1', e], ['v1 merdiven', m]]) {
      assert.ok(y[0] > x[0] * 1.3 && y[0] > x[0] + 0.08, `${ad}: hatırlama ${b}'i açık farkla geçmeli (${f(y[0])} / ${f(x[0])})`);
      assert.ok(y[1] > x[1] + 0.1, `${ad}: kapsam ${b}'den iyi olmalı (${f(y[1])} / ${f(x[1])})`);
    }
  }
});

console.log(`\n${gecen} test geçti, ${hatalar.length} hata.`);
if (hatalar.length) { console.log('Hatalı: ' + hatalar.join(' | ')); process.exit(1); }
