# Ders Takip

Tıp fakültesi komite sistemi için ders, konu, tekrar ve çalışma programı takip uygulaması.

- Telefona, tablete ve bilgisayara kurulabilen web uygulaması (PWA); internet olmadan çalışır.
- Tüm veriler yalnızca cihazda tutulur. Hesap, sunucu ya da ücretli servis yoktur.
- Derleme adımı ve bağımlılık yoktur: `index.html`, `app.js` (arayüz), `algoritma.js` (program ve tekrar algoritması), `styles.css`, `sw.js` (çevrimdışı önbellek).

Yerelde denemek için klasörde `python3 -m http.server` çalıştırıp `http://localhost:8000` adresini açmak yeterli.


## PDF'ler
Konulara PDF eklenebilir. Dosyalar yalnızca cihazda (IndexedDB) saklanır ve uygulama içindeki okuyucuyla internet olmadan açılır. Okuyucu için [pdf.js](https://github.com/mozilla/pdf.js) (Apache 2.0, `vendor/pdfjs/`) kullanılır. Normal yedek PDF'leri içermez; Ayarlar'daki "PDF'lerle birlikte indir" seçeneği hepsini tek dosyada yedekler.
