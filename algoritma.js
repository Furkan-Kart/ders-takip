'use strict';
/* Ders Takip — çalışma programı ve aralıklı tekrar algoritması (sürüm 2).
   Arayüzden bağımsızdır: tüm fonksiyonlar durumu (S) ve bugünün tarihini ('YYYY-AA-GG') parametre alır.
   Aynı S + aynı tarih her zaman aynı sonucu verir (rastgelelik ve saat okuması yoktur; tek istisna:
   sonrakiAralik/puanla çağrısında `bugun` hiç verilmezse cihaz tarihi kullanılır).

   ÖZET
   1) Bellek modeli (FSRS benzeri, 3 puanlı): her konu için `kararlilik` (gün; hatırlamanın %90'a düştüğü süre)
      ve `gucluk` (1..10) tutulur. Unutma eğrisi: R(t) = (1 + 19/81 · t/kararlilik)^-0.5.
      Tekrar anındaki R (yani gerçekten geçen süre) kararlılığın ne kadar büyüyeceğini belirler:
      geç ama başarılı tekrar daha çok, erken tekrar daha az kazandırır; 'zor' kararlılığı düşürür.
   2) S.ayar.araliklar artık sabit merdiven değil, kullanıcının "aralık tercihi" ayarıdır:
      varsayılan [1,7,30] = model olduğu gibi. Daha kısa/uzun değerler tüm aralıkları aynı oranda
      kısaltır/uzatır (geometrik ortalama, 0.5..2.5 arası). Bkz. aralikCarpani.
   3) Sınav farkındalığı: bir sonraki tekrar sınavdan sonraya düşüyorsa ve sınav günü hatırlama
      %93'ün altında kalacaksa tekrar sınav öncesine (genel tekrar penceresine) çekilir.
   4) Süre tahmini: ders bazında kişisel çarpan (log oranların ortancası, genel çarpana doğru büzülür),
      tekrar süreleri için ayrı çarpan. Konusuz oturumlar ders düzeyinde zayıf bir kanıt olarak kullanılır.
   5) Gerçekçi kapasite: son 28 günde hedefin ne kadarının yapıldığı (hafta gününe göre) öğrenilir,
      plan `kapasite` üzerinden kurulur, `hedef` ayrıca gösterilir.
   6) Planlama: tekrarlar önce ama günün belli payıyla sınırlı (birikenler önceliğe göre yayılır),
      yeni konular kalan güne orantılı dengeli tempoyla, dersler dönüşümlü ve müfredat sırasıyla,
      sığmayanlar için ayıklama (triage), son günlerde sınav günü hatırlamayı en çok artıran tazelemeler.

   ---------------------------------------------------------------------------------------------
   ARAYÜZ İÇİN ALANLAR
   planla(S, bugun) ->
     gunler[i]: { tarih, hedef (ayardaki dk), kapasite (gerçekçi dk; plan buna göre; bugün için = hedef), kullanilan (yalnız
                  bugün: bugün yapılmış dk), kalan (planlanmamış boş dk, >= 0), yuk (planlanan toplam dk),
                  rezerv (genel tekrar günü mü), isler[] }      // gunler[0] = bugün
     isler[j]:  { tip: 'yeni'|'tekrar'|'genel', konu, dk, neden,
                  dersId,
                  gecikme (tekrar: bugüne göre kaç gün gecikmiş, yoksa 0; yeni/genel: undefined),
                  erteleme (tekrar: plan gereği vadesinden kaç gün sonraya kaydı, yoksa 0),
                  hatirlama (tekrar/genel: o gün çalışmadan önceki tahmini hatırlama, 0-100),
                  kazanc (genel ve sinavOncesi: sınav günü hatırlamaya katkısı, yüzde puanı),
                  sinavOncesi (true: vadesi gelmediği halde sınav için öne çekilmiş tazeleme),
                  baslanmis (yeni: konuya daha önce süre kaydedilmiş, dk kalan süredir) }
                isler dizisi o gün için önerilen yapılış sırasındadır (önce tekrarlar, dersler dönüşümlü).
     sinav:      aktif komitenin bugünden sonraki ilk sınavı | undefined
     sinavBugun: bugün tarihli sınav | undefined
     yetismeyen: sınava kadar sığmayan konular (sınav yoksa her zaman boş)
     ufukDisi:   sınav yokken 14 günlük ufka sığmayan konular (bilgi amaçlı)
     ekGunluk:   hepsinin sığması için günlük hedefe eklenmesi gereken dk (sığıyorsa 0)
     ozet: { toplamKalanDk, gunSayisi, yetisme: 'rahat'|'sinirda'|'yetismiyor', gerekenGunlukDk,
             tahminiBitis ('YYYY-AA-GG'|null),
             hazirlik (0-100): plan 'orta' puanlarla aynen uygulanırsa sınav günü (sınav yoksa ufkun sonu)
                       komitenin TÜM konuları için ortalama tahmini hatırlama; plana girmeyen konu 0 sayılır,
             hazirlikSimdi (0-100): bugünden sonra hiç çalışılmazsa aynı gün için ortalama hatırlama,
             uyum (0.5..1: plan kapasitesi / hedef), uyumHam (son günlerde gerçekleşen / hedef, sınırsız),
             uyumGun (uyum hesabına giren gün sayısı; 5'ten azsa öğrenme yapılmaz),
             doluluk (0..1: sınav öncesi normal günlerde planlanan / kapasite),
             tekrarBekleyen (bugün ve öncesi vadeli tekrar sayısı), enEskiGecikme (gün),
             yeniKonu (kalan yeni konu sayısı), planlananYeni, planlananTekrar (iş sayıları),
             bellekAyari (0.75..1.15: tekrar puanlarından öğrenilen kişisel bellek düzeltmesi) }
     dersler: [{ dersId, ad, konu (toplam), calisilan, kalanDk, hazirlik, hazirlikSimdi, bitis (tarih|null),
                 yetismeyen (adet), carpan }]
     oneriler: en çok 3 kısa Türkçe öneri (önem sırasıyla)
     oneriDetay: [{ tur, metin, onem }] (tüm öneriler; tur: 'hedefSifir'|'yetismiyor'|'sinavYarin'|'sinavBugun'|
                 'birikme'|'uyum'|'sinirda'|'sure'|'bellek'|'zayifDers'|'rahat'|'sinavYok')
   Konu nesnesine eklenen alanlar (puanla yazar; eski veride yoktur, yoksa geçmişten türetilir):
     kararlilik (gün, sayı), gucluk (1..10)
     tekrarlar[] kayıtlarına: hatirlama (tekrar anındaki tahmin, 0..1), kararlilik (tekrar sonrası)
   Yeni fonksiyonlar:
     Algo.bellek(S, konu)            -> { kararlilik, gucluk, sonTarih } | null   (eski veriyi de çözer)
     Algo.kalanDk(S, konu)           -> yeni konu için kalan çalışma dk (kayıtlı süre düşülmüş)
     Algo.tekrarCarpani(S)           -> tekrar sürelerinin kişisel çarpanı
     Algo.aralikCarpani(S)           -> ayar.araliklar'dan gelen aralık ölçeği
     Algo.bellekAyari(S)             -> kişisel bellek düzeltmesi
     Algo.kapasite(S, bugun)         -> { uyum, uyumHam, gun, haftalik[7] (çarpan), gunluk[7] (dk) }
     Algo.egri(gun, kararlilik)      -> unutma eğrisi (0..1)
     Algo.PARAM                      -> planlama ayar sabitleri (yalnız deney/test için; arayüz değiştirmemeli)
     Algo.SURUM                      -> 2
   dersOzet ek alanlar: { toplam, calisilan, bekleyenTekrar, kalanDk, ortKararlilik, ornek }
*/
(function (kok) {
  /* ---------- tarih yardımcıları (saat dilimi/yaz saati etkilenmesin diye UTC gün numarası) ---------- */
  const GUN_MS = 864e5;
  const gunOnbellek = new Map();
  function gunNo(s) {
    if (typeof s !== 'string') return NaN;
    let v = gunOnbellek.get(s);
    if (v === undefined) {
      const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
      v = m ? Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / GUN_MS) : NaN;
      if (gunOnbellek.size > 4000) gunOnbellek.clear();
      gunOnbellek.set(s, v);
    }
    return v;
  }
  const gunStr = n => new Date(n * GUN_MS).toISOString().slice(0, 10);
  const haftaGunuNo = n => (((n + 3) % 7) + 7) % 7; // 0 = Pazartesi (1970-01-01 Perşembe)
  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const tarihYaz = n => { const d = new Date(n * GUN_MS); return `${d.getUTCDate()} ${AYLAR[d.getUTCMonth()]}`; };
  function cihazBugun() { // yalnızca `bugun` verilmeyen eski çağrılar için
    const d = new Date(), p = x => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  /* ---------- genel yardımcılar ---------- */
  const sinirla = (x, a, b) => x < a ? a : x > b ? b : x;
  const sayi = (x, vars) => { const n = Number(x); return Number.isFinite(n) ? n : vars; };
  const dizi = x => Array.isArray(x) ? x : [];
  const yuvarla5 = n => Math.max(5, Math.round(n / 5) * 5);
  const yuvarla2 = n => Math.round(n * 100) / 100;
  const yuzde = r => Math.round(sinirla(r, 0, 1) * 100);
  const PUANLAR = { zor: 1, orta: 1, kolay: 1 };
  const puanDuzelt = p => PUANLAR[p] ? p : 'orta';
  function ortanca(a) {
    if (!a.length) return 0;
    const b = a.slice().sort((x, y) => x - y), m = b.length >> 1;
    return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
  }
  function ayarOku(S) {
    const a = (S && S.ayar) || {};
    const gunluk = [];
    for (let i = 0; i < 7; i++) gunluk.push(Math.max(0, sayi(dizi(a.gunluk)[i], 120)));
    let araliklar = dizi(a.araliklar).map(Number).filter(x => x > 0);
    if (!araliklar.length) araliklar = [1, 7, 30];
    return { gunluk, araliklar, tekrarGunu: sinirla(Math.round(sayi(a.tekrarGunu, 1)), 0, 30) };
  }
  const dersZorluk = d => sinirla(sayi(d && d.zorluk, 3), 1, 5);

  /* =====================================================================================
     BELLEK MODELİ
     ===================================================================================== */
  // Güç yasası unutma eğrisi (FSRS-4.5): üstel eğriye göre uzun kuyruğu gerçeğe daha yakındır.
  const EGRI_US = -0.5, EGRI_F = 19 / 81; // R(kararlilik) = 0.9 olacak şekilde
  const egri = (t, s) => t <= 0 ? 1 : Math.pow(1 + EGRI_F * t / s, EGRI_US);

  // İlk çalışmadan sonraki kararlılık (gün). Zor derslerde daha kısa tutulur.
  const ILK_KARARLILIK = { zor: 0.9, orta: 2.2, kolay: 5.5 };
  const ILK_GUCLUK = { zor: 2, orta: 0, kolay: -1.5 };
  const GUCLUK_DEGISIM = { zor: 1.2, orta: -0.15, kolay: -0.9 };
  const BUYUME_KATSAYI = 4.4, BUYUME_USTEL = 0.8, BUYUME_TAVAN = 6, KOLAY_PRIM = 1.7;
  const KARARLILIK_MIN = 0.5, KARARLILIK_MAX = 3650, ARALIK_MAX = 365;
  const YETERLI_HATIRLAMA = 0.93; // sınav günü bunun üstünde kalacak konuya sınav öncesi tekrar gerekmez

  const guclukBaz = z => 5 + 0.8 * (z - 3);
  function ilkDurum(z, puan) {
    return [ILK_KARARLILIK[puan] * (1.3 - 0.1 * z), sinirla(guclukBaz(z) + ILK_GUCLUK[puan], 1, 10)];
  }
  // Tekrar sonrası [kararlilik, gucluk]. r: tekrar anındaki hatırlama (geçen süreden), kal: kişisel düzeltme.
  function guncelle(s, d, r, puan, z, kal) {
    // güçlük puana göre kayar ve dersin taban güçlüğüne doğru yavaşça geri döner
    const d2 = sinirla(0.92 * (d + GUCLUK_DEGISIM[puan]) + 0.08 * guclukBaz(z), 1, 10);
    // büyüme: kolay konu (düşük güçlük), genç bellek (küçük s) ve düşük r (unutmaya yakın tekrar) daha çok kazandırır;
    // r ~ 1 iken (aynı gün ikinci tekrar) kazanç sıfıra iner.
    const taban = BUYUME_KATSAYI * (11 - d2) * Math.pow(s, -0.14) * (Math.exp(BUYUME_USTEL * (1 - r)) - 1);
    let s2;
    if (puan === 'zor') {
      // "Zorlandım" tam unutma ile zor hatırlama arasıdır: ikisinin geometrik ortalaması, asla artmaz.
      const basari = s * (1 + taban * 0.25);
      const unutma = 1.6 * Math.pow(d2, -0.2) * (Math.pow(s + 1, 0.3) - 1) * Math.exp(1.2 * (1 - r));
      s2 = Math.min(s, Math.sqrt(basari * Math.max(unutma, 0.1)));
    } else {
      s2 = s * (1 + Math.min(BUYUME_TAVAN, taban * (puan === 'kolay' ? KOLAY_PRIM : 1) * kal));
    }
    return [sinirla(s2, KARARLILIK_MIN, KARARLILIK_MAX), d2];
  }

  // ayar.araliklar -> aralık ölçeği. [1,7,30] = 1. Kullanıcı daha sık/seyrek tekrar istiyorsa tüm aralıklar ölçeklenir.
  function aralikCarpani(S) {
    const ar = ayarOku(S).araliklar, ref = [1, 7, 30];
    let t = 0, n = 0;
    for (let i = 0; i < ar.length && i < 3; i++) { t += Math.log(ar[i] / ref[i]); n++; }
    return n ? yuvarla2(sinirla(Math.exp(t / n), 0.5, 2.5)) : 1;
  }

  // Kişisel bellek düzeltmesi: tekrarların beklenenden (%20) fazlası 'zor' ise büyüme kısılır, azsa biraz artırılır.
  // Az veride (8'den az tekrar) etkisizdir; 10 sanal gözlemle büzülür.
  function bellekAyari(S) {
    let n = 0, zor = 0;
    for (const k of dizi(S && S.konular)) {
      if (!k || k.durum !== 'calisildi') continue;
      for (const r of dizi(k.tekrarlar)) { if (!r) continue; n++; if (r.puan === 'zor') zor++; }
    }
    if (n < 8) return 1;
    return yuvarla2(sinirla(1 - 1.5 * ((zor + 2) / (n + 10) - 0.2), 0.75, 1.15));
  }

  // Sonraki tekrara kaç gün: kararlılık × ölçek; sınavı aşıyorsa ve gerekiyorsa sınav öncesi pencereye çekilir.
  function aralikSec(s, carpan, sinavaKalan, rez) {
    let g = sinirla(Math.round(s * carpan), 1, ARALIK_MAX);
    if (sinavaKalan > 1 && g >= sinavaKalan && egri(sinavaKalan, s) < YETERLI_HATIRLAMA) {
      g = sinirla(sinavaKalan - Math.max(1, rez), 1, sinavaKalan - 1);
    }
    return g;
  }

  // Konunun bellek durumu {s, d, son (gün no)}. Yeni alanlar yoksa (eski veri) geçmiş, modelden
  // geçirilerek deterministik biçimde yeniden üretilir: ilk çalışma + her tekrar gerçek aralığıyla.
  function bellekCoz(k, z) {
    if (!k || k.durum !== 'calisildi') return null;
    const tk = dizi(k.tekrarlar), ilk = gunNo(k.calisildiTarih);
    let s = sayi(k.kararlilik, 0), d, son;
    if (s > 0) {
      d = sinirla(sayi(k.gucluk, guclukBaz(z)), 1, 10);
      son = ilk;
      for (const r of tk) { const g = r ? gunNo(r.tarih) : NaN; if (g === g && !(g < son)) son = g; }
    } else {
      // İlk puan bilinmiyorsa (tekrar varsa sonPuan sonuncuya aittir) 'orta' varsayılır.
      const p0 = tk.length ? 'orta' : puanDuzelt(k.sonPuan);
      [s, d] = ilkDurum(z, p0);
      son = ilk;
      for (const r of tk) {
        const g = r ? gunNo(r.tarih) : NaN;
        if (g !== g) continue;
        if (son !== son) { son = g; continue; } // ilk tarih yoksa ilk geçerli tekrar başlangıç sayılır
        const gecen = Math.max(0, g - son);
        [s, d] = guncelle(s, d, egri(gecen, s), puanDuzelt(r.puan), z, 1);
        if (g > son) son = g;
      }
    }
    if (son !== son) { // hiç tarih yok: planlanan tekrardan geriye doğru tahmin
      const v = gunNo(k.sonrakiTekrar);
      if (v === v) son = v - Math.max(1, Math.round(s));
    }
    return { s, d, son };
  }
  const dersBul = (S, id) => dizi(S && S.dersler).find(d => d && d.id === id);

  function bellek(S, k) {
    const m = bellekCoz(k, dersZorluk(dersBul(S, k && k.dersId)));
    return m ? { kararlilik: yuvarla2(m.s), gucluk: yuvarla2(m.d), sonTarih: m.son === m.son ? gunStr(m.son) : null } : null;
  }

  // Konunun verilen tarihte hatırlanma olasılığı tahmini (0..1). Çalışılmamışsa 0.
  function hatirlama(S, k, t) {
    const m = bellekCoz(k, dersZorluk(dersBul(S, k && k.dersId)));
    if (!m) return 0;
    const g = gunNo(t);
    if (g !== g || m.son !== m.son) return 0.9; // tarih bilinmiyor: vadesinde olduğu varsayılır
    return egri(g - m.son, m.s);
  }

  function sinavBul(S, komiteId, bg) {
    let en = null, eg = Infinity;
    for (const x of dizi(S && S.sinavlar)) {
      if (!x || x.komiteId !== komiteId) continue;
      const g = gunNo(x.tarih);
      if (g > bg && g < eg) { en = x; eg = g; }
    }
    return en;
  }

  // Puan verilirse ne olur: { gun, s, d, r } (durumu değiştirmez).
  function sonrakiHesap(S, k, puan, bugun) {
    puan = puanDuzelt(puan);
    let bg = gunNo(bugun);
    if (bg !== bg) bg = gunNo(cihazBugun());
    const ders = dersBul(S, k && k.dersId), z = dersZorluk(ders);
    const m = bellekCoz(k, z);
    let s, d, r = 0;
    if (!m) [s, d] = ilkDurum(z, puan);
    else {
      const gecen = m.son === m.son ? Math.max(0, bg - m.son) : Math.round(m.s);
      r = egri(gecen, m.s);
      [s, d] = guncelle(m.s, m.d, r, puan, z, bellekAyari(S));
    }
    const sinav = ders ? sinavBul(S, ders.komiteId, bg) : null;
    const gun = aralikSec(s, aralikCarpani(S), sinav ? gunNo(sinav.tarih) - bg : 0, ayarOku(S).tekrarGunu);
    return { gun, s, d, r, bg };
  }

  // Bir puan verilirse sonraki tekrarın kaç gün sonra olacağı (durumu değiştirmez).
  function sonrakiAralik(S, k, puan, bugun) { return sonrakiHesap(S, k, puan, bugun).gun; }

  // Konuyu çalışıldı/tekrar edildi olarak işler; sonraki tekrara kalan gün sayısını döndürür.
  function puanla(S, k, puan, bugun) {
    puan = puanDuzelt(puan);
    const h = sonrakiHesap(S, k, puan, bugun), t = gunStr(h.bg);
    if (k.durum !== 'calisildi') {
      k.durum = 'calisildi'; k.calisildiTarih = t; k.adim = 0; k.tekrarlar = [];
    } else {
      if (!Array.isArray(k.tekrarlar)) k.tekrarlar = [];
      k.tekrarlar.push({ tarih: t, puan, hatirlama: yuvarla2(h.r), kararlilik: yuvarla2(h.s) });
      // adim: eski sürümle uyum için tutulur (art arda başarı sayacı)
      if (puan === 'kolay') k.adim = (k.adim || 0) + 1;
      else if (puan === 'zor') k.adim = 0;
    }
    k.sonPuan = puan;
    k.kararlilik = yuvarla2(h.s);
    k.gucluk = yuvarla2(h.d);
    k.sonrakiTekrar = gunStr(h.bg + h.gun);
    return h.gun;
  }

  /* =====================================================================================
     SÜRE TAHMİNİ
     ===================================================================================== */
  const ORAN_MIN = 0.25, ORAN_MAX = 4;     // tek bir konunun oranı bu aralığa kırpılır (aykırı değer koruması)
  const CARPAN_MIN = 0.5, CARPAN_MAX = 2.5;
  const BUZULME = 4;                        // ders çarpanı bu kadar sanal gözlemle genel çarpana çekilir
  const TEKRAR_ORANI = 0.3;                 // tekrar, ilk çalışmanın yaklaşık %30'u kadar sürer (öğrenilir)
  const bazDk = (k, z) => sayi(k.tahmin, 0) > 0 ? sayi(k.tahmin, 0) : 20 + z * 10;

  // Ölçüm önbelleği: arayüz tahminDk'yı konu başına çağırır; her seferinde tüm oturumları taramamak için
  // son sonuç saklanır. Geçerlilik, süre tahminini etkileyen tüm alanların ucuz bir parmak izinden anlaşılır
  // (durum yerinde değiştirildiği için nesne kimliği tek başına yetmez).
  const olcumOnbellek = new WeakMap();
  const karma = (h, x) => {
    if (typeof x === 'string') { for (let i = 0; i < x.length; i++) h = (Math.imul(h, 31) + x.charCodeAt(i)) | 0; return (Math.imul(h, 31) + 7) | 0; }
    if (typeof x === 'number') return (Math.imul(h, 31) + Math.round(x * 100)) | 0;
    return (Math.imul(h, 31) + (x == null ? 3 : 5)) | 0;
  };
  function parmakIzi(S) {
    let h = 17;
    for (const d of dizi(S.dersler)) { if (!d) { h = karma(h, null); continue; } h = karma(karma(h, d.id), d.zorluk); }
    for (const k of dizi(S.konular)) {
      if (!k) { h = karma(h, null); continue; }
      h = karma(karma(karma(karma(karma(h, k.id), k.dersId), k.durum), k.tahmin), k.calisildiTarih);
      h = karma(karma(karma(h, k.gucluk), k.sonPuan), Array.isArray(k.tekrarlar) ? k.tekrarlar.length : -1);
    }
    for (const o of dizi(S.oturumlar)) {
      if (!o) { h = karma(h, null); continue; }
      h = karma(karma(karma(karma(h, o.dk), o.tarih), o.konuId), o.dersId);
    }
    return h;
  }
  function olcumYap(S) {
    if (!S || typeof S !== 'object') return olcumHesap(S);
    const iz = parmakIzi(S), e = olcumOnbellek.get(S);
    if (e && e.iz === iz) return e.B;
    const B = olcumHesap(S);
    olcumOnbellek.set(S, { iz, B });
    return B;
  }
  // Durumu bir kez tarayıp tüm ölçümleri çıkarır: O(konu + oturum).
  function olcumHesap(S) {
    const dersMap = new Map(), konuMap = new Map();
    for (const d of dizi(S && S.dersler)) if (d) dersMap.set(d.id, d);
    const konular = dizi(S && S.konular);
    for (const k of konular) if (k) konuMap.set(k.id, k);
    const zOf = id => dersZorluk(dersMap.get(id));

    // oturumlar: konu başına [ilk çalışma dk, tekrar dk], ders toplamı, konusuz toplam, gün toplamı
    const konuDk = new Map(), dersTop = new Map(), dersKonusuz = new Map(), gunDk = new Map();
    for (const o of dizi(S && S.oturumlar)) {
      if (!o) continue;
      const dk = sayi(o.dk, 0);
      if (!(dk > 0)) continue;
      const g = gunNo(o.tarih);
      if (g === g) gunDk.set(g, (gunDk.get(g) || 0) + dk);
      const k = o.konuId != null ? konuMap.get(o.konuId) : undefined;
      if (k) {
        let e = konuDk.get(k.id);
        if (!e) konuDk.set(k.id, e = [0, 0]);
        // ilk çalışma gününden sonraki oturumlar tekrar süresidir
        const tekrarMi = k.durum === 'calisildi' && typeof k.calisildiTarih === 'string' && o.tarih > k.calisildiTarih;
        e[tekrarMi ? 1 : 0] += dk;
        dersTop.set(k.dersId, (dersTop.get(k.dersId) || 0) + dk);
      } else {
        dersTop.set(o.dersId, (dersTop.get(o.dersId) || 0) + dk);
        dersKonusuz.set(o.dersId, (dersKonusuz.get(o.dersId) || 0) + dk);
      }
    }

    // ders başına log(gerçek/tahmin) örnekleri. Elle süre girilmiş konular örnek sayılmaz
    // (onlar formülün değil kullanıcının tahminini ölçer ve zaten çarpılmaz).
    const ist = new Map(), tumLog = [], tekAday = [];
    for (const k of konular) {
      if (!k) continue;
      let ds = ist.get(k.dersId);
      if (!ds) ist.set(k.dersId, ds = { log: [], bek: 0, adet: 0, yarim: 0 });
      const baz = bazDk(k, zOf(k.dersId)), e = konuDk.get(k.id);
      if (k.durum === 'calisildi') {
        const nT = dizi(k.tekrarlar).length;
        ds.bek += baz + nT * Math.max(10, baz * TEKRAR_ORANI); ds.adet++;
        if (e) {
          if (e[0] > 0 && !(sayi(k.tahmin, 0) > 0)) {
            const l = Math.log(sinirla(e[0] / baz, ORAN_MIN, ORAN_MAX));
            ds.log.push(l); tumLog.push(l);
          }
          if (e[1] > 0 && nT > 0) tekAday.push([k, e[1] / nT]);
        }
      } else if (e) ds.yarim += e[0] + e[1];
    }
    // genel çarpan: tüm örneklerin ortancası, 1'e doğru büzülmüş
    const genelLog = tumLog.length * ortanca(tumLog) / (tumLog.length + BUZULME);
    const carpanlar = new Map(), ornekler = new Map();
    for (const [id, ds] of ist) {
      const n = ds.log.length;
      const m = n >= 3 ? ortanca(ds.log) : n ? ds.log.reduce((a, b) => a + b, 0) / n : 0;
      // konusuz oturum varsa: dersin toplam süresi / bitenlerin beklenen süresi tek bir zayıf örnek sayılır
      let w = 0, mt = 0;
      const konusuz = dersKonusuz.get(id) || 0;
      if (konusuz > 0 && ds.adet >= 2 && ds.bek > 0) {
        const gercek = (dersTop.get(id) || 0) - ds.yarim;
        if (gercek > 0) { w = 1; mt = Math.log(sinirla(gercek / ds.bek, ORAN_MIN, ORAN_MAX)); }
      }
      const l = (n * m + w * mt + BUZULME * genelLog) / (n + w + BUZULME);
      carpanlar.set(id, yuvarla2(sinirla(Math.exp(l), CARPAN_MIN, CARPAN_MAX)));
      ornekler.set(id, n);
    }
    const genelCarpan = yuvarla2(sinirla(Math.exp(genelLog), CARPAN_MIN, CARPAN_MAX));
    const carpanOf = id => carpanlar.has(id) ? carpanlar.get(id) : genelCarpan;
    const ilkDk = k => sayi(k.tahmin, 0) > 0 ? sayi(k.tahmin, 0) : yuvarla5(bazDk(k, zOf(k.dersId)) * carpanOf(k.dersId));

    // tekrar çarpanı: (tekrar başına gerçek dk) / (ilk tahminin %30'u), aynı büzülmeyle
    const tekLog = tekAday.map(([k, dk]) => Math.log(sinirla(dk / Math.max(10, ilkDk(k) * TEKRAR_ORANI), ORAN_MIN, ORAN_MAX)));
    const tekrarCarpani = yuvarla2(sinirla(Math.exp(tekLog.length * ortanca(tekLog) / (tekLog.length + BUZULME)), CARPAN_MIN, CARPAN_MAX));
    // zor (güçlüğü yüksek) ve son seferde zorlanılan konunun tekrarı daha uzun sürer
    const tekrarDk = k => {
      const d = sinirla(sayi(k.gucluk, guclukBaz(zOf(k.dersId))), 1, 10);
      const f = (0.7 + 0.06 * d) * (k.sonPuan === 'zor' ? 1.25 : k.sonPuan === 'kolay' ? 0.85 : 1);
      return yuvarla5(Math.max(10, ilkDk(k) * TEKRAR_ORANI * f * tekrarCarpani));
    };
    // yarım kalmış yeni konu: kayıtlı süre düşülür, en az tahminin dörtte biri kalır
    const kalanDk = k => {
      const t = ilkDk(k), e = konuDk.get(k.id);
      if (k.durum === 'calisildi') return 0;
      return e && e[0] > 0 ? yuvarla5(Math.max(t - e[0], t * 0.25, 10)) : yuvarla5(t);
    };
    return { dersMap, konuMap, konuDk, gunDk, carpanOf, ornekler, genelCarpan, tekrarCarpani, zOf, ilkDk, tekrarDk, kalanDk };
  }

  const tahminDk = (S, k) => olcumYap(S).ilkDk(k);
  const tekrarDk = (S, k) => olcumYap(S).tekrarDk(k);
  const kalanDk = (S, k) => olcumYap(S).kalanDk(k);
  const kisiselCarpan = (S, dersId) => olcumYap(S).carpanOf(dersId);
  const tekrarCarpani = S => olcumYap(S).tekrarCarpani;

  /* =====================================================================================
     GERÇEKÇİ KAPASİTE
     ===================================================================================== */
  const UYUM_PENCERE = 28, UYUM_YARI_OMUR = 14, UYUM_ON_AGIRLIK = 3, UYUM_MIN_GUN = 5;
  const UYUM_MIN = 0.5; // plan hedefin yarısının altına düşürülmez (aşağı sarmal olmasın), üstüne de çıkarılmaz

  // Gün başına yapılan iş: kayıtlı süre ile o gün bitirilen konu/tekrarların tahmini süresinden büyüğü
  // (süre tutmayı unutan öğrenci tembel sayılmasın).
  function gunIsleri(S, B) {
    const tamam = new Map();
    for (const k of dizi(S && S.konular)) {
      if (!k || k.durum !== 'calisildi') continue;
      const g = gunNo(k.calisildiTarih);
      if (g === g) tamam.set(g, (tamam.get(g) || 0) + B.ilkDk(k));
      const tk = dizi(k.tekrarlar);
      if (tk.length) {
        const dk = B.tekrarDk(k);
        for (const r of tk) { const gr = r ? gunNo(r.tarih) : NaN; if (gr === gr) tamam.set(gr, (tamam.get(gr) || 0) + dk); }
      }
    }
    return tamam;
  }
  function kapasiteHesap(S, bg, B, tamam) {
    const A = ayarOku(S), gercek = g => Math.max(B.gunDk.get(g) || 0, tamam.get(g) || 0);
    let ilk = Infinity;
    for (const g of B.gunDk.keys()) if (g < ilk) ilk = g;
    for (const g of tamam.keys()) if (g < ilk) ilk = g;
    const bas = Math.max(bg - UYUM_PENCERE, ilk); // uygulamayı kullanmaya başlamadan önceki günler sayılmaz
    let tw = 0, tr = 0, n = 0;
    const hw = Array(7).fill(0), hr = Array(7).fill(0), hn = Array(7).fill(0);
    for (let g = bas; g < bg; g++) {
      const hg = haftaGunuNo(g), hedef = A.gunluk[hg];
      if (!(hedef > 0)) continue;
      const w = Math.pow(0.5, (bg - g) / UYUM_YARI_OMUR), r = Math.min(gercek(g) / hedef, 1.5);
      tw += w; tr += w * r; n++;
      hw[hg] += w; hr[hg] += w * r; hn[hg]++;
    }
    const haftalik = Array(7).fill(1);
    let uyumHam = 1;
    if (n >= UYUM_MIN_GUN) {
      uyumHam = tr / tw;
      const genel = (tr + UYUM_ON_AGIRLIK) / (tw + UYUM_ON_AGIRLIK); // 1'e doğru büzülmüş
      for (let i = 0; i < 7; i++) {
        // hafta günü için en az 3 gözlem varsa o günün oranı genel orana karıştırılır
        const v = hn[i] >= 3 ? (hr[i] + 2 * genel) / (hw[i] + 2) : genel;
        haftalik[i] = yuvarla2(sinirla(v, UYUM_MIN, 1));
      }
    }
    const gunluk = A.gunluk.map((h, i) => h > 0 ? Math.max(5, Math.round(h * haftalik[i] / 5) * 5) : 0);
    const th = A.gunluk.reduce((a, b) => a + b, 0), tk = gunluk.reduce((a, b) => a + b, 0);
    return { uyum: th > 0 ? yuvarla2(Math.min(1, tk / th)) : 1, uyumHam: yuvarla2(uyumHam), gun: n, haftalik, gunluk };
  }
  function kapasite(S, bugun) {
    const B = olcumYap(S);
    return kapasiteHesap(S, gunNo(bugun), B, gunIsleri(S, B));
  }

  /* =====================================================================================
     PLANLAMA
     ===================================================================================== */
  const UFUK_SINAVSIZ = 14, UFUK_MAX = 120;
  // Planlama ayarları (Algo.PARAM olarak dışarı açılır; yalnızca deney/test içindir, arayüz dokunmamalı)
  const P = {
    tekrarPayMin: 0.3, tekrarPayMax: 0.6, // yeni konu varken tekrarların günden alabileceği pay
    hiz: 1.25,           // yeni konular dönemin ~%80'inde bitecek tempoda dağıtılır (aksama payı + tekrar zamanı)
    tabanDoluluk: 0.5,   // iş azsa bile gün kapasitesinin en az yarısı kullanılır (erken biten daha çok tekrarlanır)
    rezervYeniPay: 0.5,  // sığmayan yeni konular genel tekrar günlerinin en çok yarısını alabilir
    tazelemeEsik: 0.02,  // sınav günü hatırlamaya en az 2 puan katmayan tazeleme planlanmaz
    tazelemeGun: 2,      // genel tekrar günü ayrılmamışsa bile son bu kadar günün boşluğu tazelemeye kullanılır
    sonHafta: 7,         // sınavdan önceki bu kadar günde boş kalan süre zayıf konulara verilir
    erkenTazelemeEsik: 0.05 // ...ama sınav günü en az 5 puan kazandırıyorsa
  };
  const dersAgirlik = z => 1 + 0.1 * (z - 3); // zor dersin konusu önceliklendirmede biraz daha ağır

  function planla(S, bugun) {
    let bg = gunNo(bugun);
    if (bg !== bg) bg = gunNo(cihazBugun());
    const A = ayarOku(S), B = olcumYap(S), tamam = gunIsleri(S, B);
    const kap = kapasiteHesap(S, bg, B, tamam);
    const kid = S && S.aktifKomite;
    const ds = dizi(S && S.dersler).filter(d => d && d.komiteId === kid);
    const dersI = new Map(ds.map((d, i) => [d.id, i]));
    const ks = dizi(S && S.konular).filter(k => k && dersI.has(k.dersId));
    const N = ks.length, C = ds.length;
    const sinav = sinavBul(S, kid, bg) || undefined;
    const sinavBugun = dizi(S && S.sinavlar).find(x => x && x.komiteId === kid && gunNo(x.tarih) === bg);
    const sinavVar = !!sinav;
    const n = Math.min(sinavVar ? gunNo(sinav.tarih) - bg : UFUK_SINAVSIZ, UFUK_MAX);
    const rez = sinavVar ? Math.min(A.tekrarGunu, Math.max(0, n - 1)) : 0;
    const nNormal = n - rez;
    const carpan = aralikCarpani(S), kal = bellekAyari(S);

    /* --- günler ve kapasite --- */
    // Bugün yapılanlar günün yüküne önceden yazılır: böylece gün içinde plan yeniden hesaplandıkça
    // tekrar payı ve yeni konu payı baştan verilmez (yoksa her yenilemede "bir tekrar daha" eklenirdi).
    const kullanilan = Math.max(B.gunDk.get(bg) || 0, tamam.get(bg) || 0);
    let tekBugun = 0;
    for (const k of ks) for (const r of dizi(k.tekrarlar)) if (r && gunNo(r.tarih) === bg) tekBugun += B.tekrarDk(k);
    tekBugun = Math.min(tekBugun, kullanilan);
    const yeniBugun = kullanilan - tekBugun;
    const K = new Float64Array(n), tamK = new Float64Array(n), gunler = [];
    for (let i = 0; i < n; i++) {
      const hg = haftaGunuNo(bg + i);
      tamK[i] = kap.gunluk[hg];
      // Bugün için hedefin tamamı esas alınır (iyi bir günde liste erken bitip öğrenci boşta kalmasın);
      // ileriki günler öğrenilen gerçekçi kapasiteyle planlanır.
      if (!i) tamK[i] = A.gunluk[hg];
      K[i] = tamK[i];
      gunler.push({ tarih: gunStr(bg + i), hedef: A.gunluk[hg], kapasite: tamK[i], kalan: K[i], yuk: 0, rezerv: i >= nNormal, isler: [] });
    }
    if (n > 0) gunler[0].kullanilan = Math.round(kullanilan);
    const sonEk = new Float64Array(n + 1); // i. günden itibaren normal günlerin toplam kapasitesi
    for (let i = n - 1; i >= 0; i--) sonEk[i] = sonEk[i + 1] + (i < nNormal ? K[i] : 0);

    /* --- konuların başlangıç durumu --- */
    const zD = ds.map(dersZorluk), wD = zD.map(dersAgirlik);
    const cI = new Int32Array(N), s0 = new Float64Array(N), d0 = new Float64Array(N), son0 = new Float64Array(N);
    const vade0 = new Float64Array(N), dkY = new Float64Array(N), dkT = new Float64Array(N), tekSay = new Int32Array(N);
    const kuyruk = ds.map(() => []);
    let toplamKalanDk = 0, tekrarBekleyen = 0, enEskiGecikme = 0;
    for (let i = 0; i < N; i++) {
      const k = ks[i], c = dersI.get(k.dersId), m = bellekCoz(k, zD[c]);
      cI[i] = c; dkT[i] = B.tekrarDk(k);
      if (m) {
        s0[i] = m.s; d0[i] = m.d;
        son0[i] = m.son === m.son ? m.son - bg : -Math.max(1, Math.round(m.s));
        const v = gunNo(k.sonrakiTekrar);
        vade0[i] = v === v ? v - bg : son0[i] + aralikSec(m.s, carpan, 0, 0);
        tekSay[i] = dizi(k.tekrarlar).length;
        if (vade0[i] <= 0) { tekrarBekleyen++; if (-vade0[i] > enEskiGecikme) enEskiGecikme = -vade0[i]; }
      } else {
        dkY[i] = B.kalanDk(k); toplamKalanDk += dkY[i];
        kuyruk[c].push(i);
      }
    }

    /* --- bir plan denemesi. tut[i] = 0 ise o yeni konu baştan elenmiştir (ayıklama) --- */
    function simule(tut) {
      const s = s0.slice(), d = d0.slice(), son = son0.slice(), vade = vade0.slice();
      const tekSim = tekSay.slice(), gorulen = new Uint8Array(N); // plan içi tekrar sayacı, ilk yerleşim işareti
      const gs = [];
      for (let i = 0; i < n; i++) gs.push({ isler: [], yuk: 0, tek: 0, yeniSay: 0 });
      if (n > 0) { gs[0].yuk = kullanilan; gs[0].tek = tekBugun; }
      const kova = [];
      for (let i = 0; i < n; i++) kova.push([]);
      for (let i = 0; i < N; i++) if (s[i] > 0 && vade[i] < n) kova[Math.max(0, vade[i])].push(i);
      // ders kuyrukları (müfredat sırası korunur)
      const q = kuyruk.map(l => tut ? l.filter(i => tut[i]) : l), bas = new Int32Array(C);
      const top = q.map(l => l.reduce((a, i) => a + dkY[i], 0)), planli = new Float64Array(C);
      let kalanYeni = top.reduce((a, b) => a + b, 0), yerlesen = 0, birikim = 0, tasinan = [];
      const ilkMi = q.map((l, c) => l.length > 0 && kuyruk[c].length === l.length && !ks.some(k => dersI.get(k.dersId) === c && k.durum === 'calisildi'));

      const sonraki = (i, gun) => { // gun'de çalışılan/tekrarlanan konunun sıradaki vadesi
        vade[i] = gun + aralikSec(s[i], carpan, sinavVar ? n - gun : 0, rez);
        if (vade[i] < n) kova[vade[i]].push(i);
      };

      for (let g = 0; g < n; g++) {
        const G = gs[g], Kg = K[g], normal = g < nNormal;
        /* 1) vadesi gelen tekrarlar: en çok unutulmuş (ağırlıklı) önce, günün payı kadar; kalanı ertesi güne */
        if (normal) {
          const havuz = tasinan.length ? tasinan.concat(kova[g]) : kova[g];
          tasinan = [];
          if (havuz.length && Kg > 0) {
            const onc = havuz.map(i => [(1 - egri(g - son[i], s[i])) * wD[cI[i]], i]);
            onc.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
            const ihtiyac = kalanYeni > 0 ? kalanYeni / Math.max(1, sonEk[g]) : 0;
            const pay = kalanYeni > 0 ? (sinavVar ? sinirla(1 - ihtiyac, P.tekrarPayMin, P.tekrarPayMax) : 0.5) : 1;
            const tavan = Kg * pay;
            for (const [, i] of onc) {
              const dk = dkT[i];
              if (Kg - G.yuk < 5 || (G.tek > 0 && G.tek + dk > tavan + 2)) { tasinan.push(i); continue; }
              const r = egri(g - son[i], s[i]);
              // gecikme yalnızca bugün itibarıyla gerçekten gecikmiş (plan öncesi) tekrarlar içindir
              const ilkTur = !gorulen[i] && s0[i] > 0;
              G.isler.push({ tip: 'tekrar', i, dk, r, gecikme: ilkTur ? Math.max(0, -vade0[i]) : 0,
                erteleme: Math.max(0, g - Math.max(0, vade[i])), ilkTekrar: tekSim[i] === 0 });
              gorulen[i] = 1; tekSim[i]++;
              G.tek += dk; G.yuk += dk;
              [s[i], d[i]] = guncelle(s[i], d[i], r, 'orta', zD[cI[i]], kal);
              son[i] = g; sonraki(i, g);
            }
          } else tasinan = havuz;
        }
        /* 2) yeni konular */
        if (kalanYeni > 0 && Kg > 0) {
          const bos = Kg - G.yuk, yapilan = g ? 0 : yeniBugun; // bugün zaten çalışılmış yeni konu süresi
          let hedefYeni;
          if (!sinavVar) hedefYeni = bos; // son tarih yok: günlük hedef kadar ilerle
          else if (normal) {
            // kalan yeni işin bu güne düşen payı (kapasiteyle orantılı, hiz kadar öne çekilmiş)
            const payDk = (kalanYeni + yapilan) * Kg / Math.max(Kg, sonEk[g]) * P.hiz;
            hedefYeni = Math.min(bos, Math.max(payDk, P.tabanDoluluk * Kg - G.tek) - yapilan);
          } else hedefYeni = Math.min(bos, Kg * P.rezervYeniPay - yapilan);
          // birikim: günlük payların toplamı eksi yerleşenler. Konu bölünmediği için taşan kısım
          // ertesi günün payından düşer (hata yayma); böylece yük günlere dengeli dağılır.
          birikim = Math.min(birikim + Math.max(0, hedefYeni), 3 * Math.max(tamK[g], 60));
          let sonDers = -1;
          for (;;) {
            // sıradaki ders: ilerleme oranı en düşük olan; zor dersler ~%7/kademe daha hızlı ilerletilir
            let sec = -1, enIyi = Infinity;
            for (let c = 0; c < C; c++) {
              if (bas[c] >= q[c].length) continue;
              const i = q[c][bas[c]], dk = dkY[i], esik = 0.5 * Math.min(dk, tamK[g]);
              if (Kg - G.yuk < esik || birikim < esik) continue;
              let gecis = (planli[c] + dk / 2) / top[c] * (1 - 0.07 * (zD[c] - 3)) + (c === sonDers ? 0.03 : 0);
              gecis -= zD[c] * 1e-6 + top[c] * 1e-10; // eşitlikte zor ve yükü büyük ders önce
              if (gecis < enIyi) { enIyi = gecis; sec = c; }
            }
            if (sec < 0) break;
            const i = q[sec][bas[sec]], dk = dkY[i];
            G.isler.push({ tip: 'yeni', i, dk, ilkKonu: ilkMi[sec] && bas[sec] === 0, uzun: dk > tamK[g] });
            bas[sec]++; planli[sec] += dk; G.yuk += dk; G.yeniSay++;
            birikim -= dk; kalanYeni -= dk; yerlesen += dk; sonDers = sec;
            [s[i], d[i]] = [ILK_ORTA[sec], d0y[sec]]; son[i] = g; sonraki(i, g);
          }
        }
      }

      /* 3) sınav öncesi tazeleme: son günlerde, sınav günü hatırlamayı dakika başına en çok artıranlar */
      if (sinavVar && n > 0) {
        const pen = Math.max(rez, Math.min(P.tazelemeGun, n)), p0 = n - pen, orta = Math.min(n - 1, p0 + (pen >> 1));
        let bosTop = 0;
        const bos = new Float64Array(n);
        for (let g = p0; g < n; g++) { bos[g] = Math.max(0, K[g] - gs[g].yuk); bosTop += bos[g]; }
        const aday = [];
        for (let i = 0; i < N; i++) {
          if (!(s[i] > 0) || son[i] >= n - 1) continue;
          const g = Math.max(orta, son[i] + 1);
          const once = egri(n - son[i], s[i]);
          const s2 = guncelle(s[i], d[i], egri(g - son[i], s[i]), 'orta', zD[cI[i]], kal)[0];
          const kazanc = egri(n - g, s2) - once;
          if (kazanc >= P.tazelemeEsik) aday.push([kazanc * wD[cI[i]] / dkT[i], i]);
        }
        aday.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
        const secilen = [];
        let harcanan = 0;
        for (const [, i] of aday) {
          if (harcanan + dkT[i] > bosTop + 2) continue;
          harcanan += dkT[i]; secilen.push(i);
        }
        // kararlılığı yüksek olan yavaş unutur: o erken güne, çabuk unutulan sınava en yakın güne
        secilen.sort((a, b) => s[b] - s[a] || a - b);
        let isaret = p0;
        for (const i of secilen) {
          const dk = dkT[i];
          while (isaret < n && bos[isaret] < dk * 0.5) isaret++;
          let g = Math.max(isaret, son[i] + 1);
          while (g < n && bos[g] < dk * 0.5) g++;
          if (g >= n) continue;
          const once = egri(n - son[i], s[i]), r = egri(g - son[i], s[i]);
          [s[i], d[i]] = guncelle(s[i], d[i], r, 'orta', zD[cI[i]], kal);
          son[i] = g; tekSim[i]++;
          const sonra = egri(n - g, s[i]);
          gs[g].isler.push({ tip: g >= nNormal ? 'genel' : 'tekrar', i, dk, r, gecikme: 0, erteleme: 0, sinavOncesi: true, once, sonra });
          gs[g].yuk += dk; bos[g] -= dk; gorulen[i] = 2;
        }
        // Pencereye sığmayan zayıf konular: sınavdan önceki son haftanın boş kalan sürelerine,
        // sınava en yakın günden geriye doğru yerleştirilir (boş gün varken zayıf konu bekletilmez).
        for (let g = p0 - 1; g >= Math.max(0, n - P.sonHafta); g--) {
          let bosG = K[g] - gs[g].yuk;
          if (bosG < 10) continue;
          for (const [, i] of aday) {
            const dk = dkT[i];
            if (gorulen[i] === 2 || son[i] >= g || dk > bosG) continue;
            const once = egri(n - son[i], s[i]), r = egri(g - son[i], s[i]);
            const [s2, d2] = guncelle(s[i], d[i], r, 'orta', zD[cI[i]], kal);
            const sonra = egri(n - g, s2);
            if (sonra - once < P.erkenTazelemeEsik) continue;
            s[i] = s2; d[i] = d2; son[i] = g; tekSim[i]++; gorulen[i] = 2;
            gs[g].isler.push({ tip: 'tekrar', i, dk, r, gecikme: 0, erteleme: 0, sinavOncesi: true, once, sonra });
            gs[g].yuk += dk; bosG -= dk;
            if (bosG < 10) break;
          }
        }
      }
      const artan = [];
      for (let c = 0; c < C; c++) for (let j = bas[c]; j < q[c].length; j++) artan.push(q[c][j]);
      return { gs, s, son, artan, yerlesen };
    }
    // yeni konunun 'orta' ile başlayacağı varsayılan bellek durumu (ders bazında)
    const ILK_ORTA = zD.map(z => ilkDurum(z, 'orta')[0]), d0y = zD.map(z => ilkDurum(z, 'orta')[1]);

    /* --- 1. deneme; sığmıyorsa ayıklama ve 2. deneme --- */
    let sim = simule(null), elenen = [];
    if (sinavVar && sim.artan.length) {
      // Sığan dakika kadar konu tutulur. Müfredat sırası bozulmasın diye yalnızca ders sonlarından elenir:
      // dakika başına değeri (ders ağırlığı / süre) en düşük son konu önce gider; çok kırpılan ders korunur.
      const tut = new Uint8Array(N).fill(1), son = kuyruk.map(l => l.length), top = kuyruk.map(l => l.reduce((a, i) => a + dkY[i], 0));
      const giden = new Float64Array(C);
      let toplam = top.reduce((a, b) => a + b, 0);
      while (toplam > sim.yerlesen) {
        let sec = -1, enDusuk = Infinity;
        for (let c = 0; c < C; c++) {
          if (!son[c]) continue;
          const i = kuyruk[c][son[c] - 1];
          const deger = wD[c] / dkY[i] * (1 + 2 * giden[c] / top[c]);
          if (deger < enDusuk) { enDusuk = deger; sec = c; }
        }
        if (sec < 0) break;
        const i = kuyruk[sec][--son[sec]];
        tut[i] = 0; giden[sec] += dkY[i]; toplam -= dkY[i]; elenen.push(i);
      }
      sim = simule(tut);
    }
    const disarida = elenen.concat(sim.artan).sort((a, b) => a - b); // konu listesi sırası
    const disKume = new Set(disarida);

    /* --- çıktı: işler, sıralama, gerekçeler --- */
    let planlananYeni = 0, planlananTekrar = 0, sonYeniGun = -1, yukNormal = 0, kapNormal = 0, yukTop = 0, rezerveYeni = false;
    const dersBitis = new Int32Array(C).fill(-1);
    const sikisik = sinavVar && toplamKalanDk > 0 && toplamKalanDk > 0.7 * sonEk[0];
    for (let g = 0; g < n; g++) {
      const G = sim.gs[g], gun = gunler[g];
      const tek = [], yeni = [];
      for (const x of G.isler) {
        const k = ks[x.i], c = cI[x.i];
        if (x.tip === 'yeni') {
          planlananYeni++; sonYeniGun = g; dersBitis[c] = g;
          if (g >= nNormal) rezerveYeni = true;
          const e = B.konuDk.get(k.id), baslanmis = !!(e && e[0] > 0);
          const neden = baslanmis ? 'Yarım kalmış, önce bunu bitir'
            : g >= nNormal ? 'Yetişmesi için tekrar gününe alındı'
            : x.uzun ? 'Uzun konu, o günün çoğunu alır'
            : x.ilkKonu ? (zD[c] >= 4 ? 'Zor ders, erken başlamak iyi' : 'Bu dersin ilk konusu')
            : sikisik ? 'Sınava yetişmesi için sırada' : 'Müfredat sırasındaki konu';
          const is = { tip: 'yeni', konu: k, dk: x.dk, neden, dersId: k.dersId };
          if (baslanmis) is.baslanmis = true;
          yeni.push(is);
        } else {
          planlananTekrar++;
          const h = yuzde(x.r);
          let neden;
          if (x.sinavOncesi) neden = `Sınav günü hatırlama %${yuzde(x.once)} yerine %${yuzde(x.sonra)}`;
          else if (x.gecikme > 0) neden = `${x.gecikme} gün gecikti, hatırlama %${h} civarı`;
          else if (x.erteleme > 0) neden = 'Yoğunluk yüzünden bu güne kaydırıldı';
          else if (x.ilkTekrar) neden = 'İlk tekrar, bilgiyi kalıcı yapar';
          else neden = `Unutmadan tam zamanı (hatırlama %${h})`;
          const is = { tip: x.tip, konu: k, dk: x.dk, neden, dersId: k.dersId, hatirlama: h };
          if (x.tip === 'tekrar') { is.gecikme = x.gecikme; is.erteleme = x.erteleme; }
          if (x.sinavOncesi) { is.sinavOncesi = true; is.kazanc = yuzde(x.sonra) - yuzde(x.once); }
          tek.push(is);
        }
      }
      // genel tekrar gününde en zayıf önce; her grupta aynı ders art arda gelmesin (dönüşümlü çalışma)
      if (gun.rezerv) tek.sort((a, b) => a.hatirlama - b.hatirlama);
      gun.isler = donusumlu(tek).concat(donusumlu(yeni));
      gun.yuk = g ? G.yuk : G.yuk - kullanilan; gun.kalan = Math.max(0, K[g] - G.yuk);
      yukTop += gun.yuk;
      if (g < nNormal) { yukNormal += G.yuk; kapNormal += K[g]; }
    }

    /* --- özet --- */
    let hz = 0, hzSimdi = 0;
    const dH = new Float64Array(C), dHS = new Float64Array(C), dN = new Int32Array(C), dCal = new Int32Array(C), dKalan = new Float64Array(C), dYet = new Int32Array(C);
    for (let i = 0; i < N; i++) {
      const c = cI[i];
      const a = sim.s[i] > 0 && !disKume.has(i) ? egri(n - sim.son[i], sim.s[i]) : 0;
      const b = s0[i] > 0 ? egri(n - son0[i], s0[i]) : 0;
      hz += a; hzSimdi += b; dH[c] += a; dHS[c] += b; dN[c]++;
      if (s0[i] > 0) dCal[c]++; else dKalan[c] += dkY[i];
      if (disKume.has(i)) dYet[c]++;
    }
    const yetismeyen = sinavVar ? disarida.map(i => ks[i]) : [];
    const ufukDisi = sinavVar ? [] : disarida.map(i => ks[i]);
    const eksikDk = sinavVar ? disarida.reduce((a, i) => a + dkY[i], 0) : 0;
    let aktifGun = 0;
    for (let g = 0; g < n; g++) if (gunler[g].hedef > 0) aktifGun++;
    const bolen = aktifGun || Math.max(1, n);
    const doluluk = kapNormal > 0 ? Math.min(1, yukNormal / kapNormal) : (toplamKalanDk > 0 ? 1 : 0);
    const yeniKonu = kuyruk.reduce((a, l) => a + l.length, 0);
    let yetisme = 'rahat';
    if (yetismeyen.length) yetisme = 'yetismiyor';
    else if (sinavVar && yeniKonu > 0 && (rezerveYeni || doluluk > 0.88)) yetisme = 'sinirda';
    const ekGunluk = eksikDk > 0 ? Math.ceil(eksikDk / bolen / Math.max(UYUM_MIN, kap.uyum) / 5) * 5 : 0;
    const tumYeniPlanda = yeniKonu > 0 && !disarida.length;
    const ozet = {
      toplamKalanDk, gunSayisi: n, yetisme,
      gerekenGunlukDk: yukTop + eksikDk > 0 ? yuvarla5((yukTop + eksikDk) / bolen) : 0,
      tahminiBitis: tumYeniPlanda && sonYeniGun >= 0 ? gunStr(bg + sonYeniGun) : null,
      hazirlik: N ? Math.round(hz / N * 100) : 0,
      hazirlikSimdi: N ? Math.round(hzSimdi / N * 100) : 0,
      uyum: kap.uyum, uyumHam: kap.uyumHam, uyumGun: kap.gun, doluluk: yuvarla2(doluluk),
      tekrarBekleyen, enEskiGecikme, yeniKonu, planlananYeni, planlananTekrar, bellekAyari: kal
    };
    const dersler = ds.map((d, c) => ({
      dersId: d.id, ad: d.ad, konu: dN[c], calisilan: dCal[c], kalanDk: dKalan[c],
      hazirlik: dN[c] ? Math.round(dH[c] / dN[c] * 100) : 0, hazirlikSimdi: dN[c] ? Math.round(dHS[c] / dN[c] * 100) : 0,
      bitis: dersBitis[c] >= 0 && !dYet[c] ? gunStr(bg + dersBitis[c]) : null, yetismeyen: dYet[c], carpan: B.carpanOf(d.id)
    }));

    /* --- öneriler --- */
    const on = [];
    const ekle = (onem, tur, metin) => on.push({ tur, metin, onem });
    const hedefTop = A.gunluk.reduce((a, b) => a + b, 0);
    if (hedefTop === 0 && (toplamKalanDk > 0 || tekrarBekleyen > 0))
      ekle(110, 'hedefSifir', 'Günlük hedeflerin sıfır görünüyor. Ayarlardan çalışma süresi gir.');
    if (yetismeyen.length) {
      let enC = 0;
      for (let c = 1; c < C; c++) if (dYet[c] > dYet[enC]) enC = c;
      ekle(100, 'yetismiyor', `${yetismeyen.length} konu sınava yetişmiyor. Günlük hedefi ${ekGunluk} dk artır ya da ${ds[enC].ad} dersinin son konularına sadece göz at.`);
    }
    if (sinavVar && n === 1) ekle(95, 'sinavYarin', 'Sınav yarın. Yeni konuya girmeden önce zayıf konuları tazele.');
    if (sinavBugun) ekle(96, 'sinavBugun', 'Bugün sınav var. Yeni konu çalışma, zayıf konulara kısaca göz at.');
    if (tekrarBekleyen >= 3 && enEskiGecikme >= 2) {
      const bugunTek = n > 0 ? gunler[0].isler.filter(x => x.tip !== 'yeni').length : 0;
      ekle(90, 'birikme', bugunTek < tekrarBekleyen
        ? `${tekrarBekleyen} tekrar birikti. En zayıfları bugüne alındı, kalanı sonraki günlere yayıldı.`
        : `${tekrarBekleyen} tekrar birikti, en eskisi ${enEskiGecikme} gün gecikti. Bugün önce tekrarları bitir.`);
    }
    if (kap.gun >= UYUM_MIN_GUN && kap.uyumHam < 0.8)
      ekle(yetismeyen.length ? 85 : 70, 'uyum', `Son ${kap.gun} günde hedefinin %${Math.round(kap.uyumHam * 100)} kadarını çalıştın. Program bu tempoya göre kuruldu.`);
    if (yetisme === 'sinirda') ekle(65, 'sinirda', 'Program sınıra dayandı. Bir günü kaçırırsan bazı konular yetişmeyebilir.');
    {
      let enC = -1, enFark = 0;
      for (let c = 0; c < C; c++) {
        const cp = B.carpanOf(ds[c].id), fark = Math.abs(Math.log(cp));
        if ((B.ornekler.get(ds[c].id) || 0) >= 2 && dKalan[c] > 0 && (cp >= 1.25 || cp <= 0.8) && fark > enFark) { enFark = fark; enC = c; }
      }
      if (enC >= 0) {
        const cp = B.carpanOf(ds[enC].id);
        ekle(60, 'sure', cp > 1
          ? `${ds[enC].ad} tahminden %${Math.round((cp - 1) * 100)} uzun sürüyor. Program süreleri buna göre uzatıldı.`
          : `${ds[enC].ad} tahminden %${Math.round((1 - cp) * 100)} kısa sürüyor. Program süreleri buna göre kısaltıldı.`);
      }
    }
    if (kal <= 0.9) ekle(55, 'bellek', 'Tekrarlarda sık zorlanıyorsun. Tekrar aralıkları kısaltıldı.');
    if (sinavVar && C > 1 && N) {
      let enC = -1;
      for (let c = 0; c < C; c++) if (dN[c] && (enC < 0 || dH[c] / dN[c] < dH[enC] / dN[enC])) enC = c;
      if (enC >= 0) {
        const h = Math.round(dH[enC] / dN[enC] * 100);
        if (h < 65 && h <= ozet.hazirlik - 8) ekle(50, 'zayifDers', `En zayıf ders ${ds[enC].ad}. Sınav günü tahmini hatırlama %${h}.`);
      }
    }
    if (sinavVar && yetisme === 'rahat' && ozet.tahminiBitis) {
      const pay = n - 1 - sonYeniGun;
      if (pay >= 2) ekle(30, 'rahat', `Bu tempoyla konular ${tarihYaz(bg + sonYeniGun)} günü bitiyor, sınava ${pay} gün tekrar payı kalıyor.`);
    }
    if (!sinavVar && !sinavBugun && N) ekle(20, 'sinavYok', 'Sınav tarihini eklersen program sınava göre ayarlanır.');
    on.sort((a, b) => b.onem - a.onem);

    return { gunler, sinav, sinavBugun, yetismeyen, ufukDisi, ekGunluk, ozet, dersler, oneriler: on.slice(0, 3).map(x => x.metin), oneriDetay: on };
  }

  // Sırayı olabildiğince koruyarak aynı dersin art arda gelmesini önler (aynı dersin kendi içindeki sırası bozulmaz).
  function donusumlu(liste) {
    if (liste.length < 3) return liste;
    const kalan = liste.slice(), sonuc = [];
    let son = null;
    while (kalan.length) {
      let j = 0;
      for (let i = 0; i < kalan.length; i++) if (kalan[i].dersId !== son) { j = i; break; }
      const x = kalan.splice(j, 1)[0];
      sonuc.push(x); son = x.dersId;
    }
    return sonuc;
  }

  // Ders özeti. hazirlik: verilen tarihte dersin tüm konuları için ortalama tahmini hatırlama (0-100).
  function dersOzet(S, dersId, t) {
    const B = olcumYap(S), z = B.zOf(dersId), g = gunNo(t);
    let n = 0, top = 0, cal = 0, bek = 0, kalan = 0, st = 0;
    for (const k of dizi(S && S.konular)) {
      if (!k || k.dersId !== dersId) continue;
      n++;
      const m = bellekCoz(k, z);
      if (!m) { kalan += B.kalanDk(k); continue; }
      cal++; st += m.s;
      top += g !== g || m.son !== m.son ? 0.9 : egri(g - m.son, m.s);
      const v = gunNo(k.sonrakiTekrar);
      if (v <= g) bek++;
    }
    return {
      hazirlik: n ? Math.round(top / n * 100) : 0, carpan: B.carpanOf(dersId),
      toplam: n, calisilan: cal, bekleyenTekrar: bek, kalanDk: kalan,
      ortKararlilik: cal ? yuvarla2(st / cal) : 0, ornek: B.ornekler.get(dersId) || 0
    };
  }

  const Algo = {
    tahminDk, tekrarDk, kisiselCarpan, sonrakiAralik, puanla, hatirlama, planla, dersOzet,
    bellek, kalanDk, tekrarCarpani, aralikCarpani, bellekAyari, kapasite, egri, PARAM: P, SURUM: 2
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Algo;
  else kok.Algo = Algo;
})(typeof self !== 'undefined' ? self : this);
