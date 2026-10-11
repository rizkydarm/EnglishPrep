Untuk web app yang fokus pada vocabulary, reading, dan writing level B1–B2, referensi yang paling relevan selain Duolingo adalah **Clozemaster**, Readlang, LingQ, Busuu, dan Babbel. Masing-masing memberi inspirasi yang berbeda: latihan kosakata dalam konteks, membaca interaktif, kurikulum terstruktur, dan latihan menulis dengan feedback. [clozemaster](https://www.clozemaster.com/?ref=zmfiywm)

Menurut saya, arah produk Anda sebaiknya bukan “Duolingo tanpa audio”, tetapi aplikasi dengan alur: membaca → memahami kosakata → menggunakannya dalam tulisan → mengulang bagian yang belum dikuasai.

Di bawah ini saya pisahkan fitur aplikasi yang menjadi referensi dari usulan fitur untuk aplikasi Anda. Contoh soal menggunakan bahasa Inggris agar konkret; bahasa target aplikasi Anda belum ditentukan.

## 1. Aplikasi referensi dan apa yang bisa Anda ambil

| Aplikasi | Fitur dan jenis latihan yang relevan | Inspirasi untuk aplikasi Anda | Batasannya sebagai referensi |
|---|---|---|---|
| Clozemaster | Kalimat dengan satu kata kosong atau *cloze*. Jawaban bisa pilihan ganda atau diketik. Memiliki pengulangan terjadwal, poin, dan progres berdasarkan frekuensi kata.  [clozemaster](https://www.clozemaster.com/?ref=zmfiywm) | Vocabulary drill berbasis konteks; dua mode berbeda untuk mengenali kata dan mengingat kata tanpa pilihan jawaban. | Mekanisme utamanya berpusat pada kalimat rumpang, bukan seluruh kebutuhan reading dan writing. |
| Readlang | Membaca teks atau halaman web, klik kata/frasa untuk melihat terjemahan, lalu kata yang dicari disimpan untuk latihan flashcard.  [readlang](https://readlang.com/) | Interactive reader dan vocabulary bank pribadi yang terbentuk dari bacaan pengguna. | Alur membaca dan flashcard perlu Anda lengkapi dengan soal pemahaman serta tugas menulis. |
| LingQ | Membaca teks yang diimpor, mengeklik kata/frasa untuk melihat arti, menandai status kata seperti baru, dipelajari, atau diketahui, serta melacak jumlah kata yang diketahui.  [lingoblend](https://www.lingoblend.app/blog/lingq-vs-readlang-vs-lingoblend) | Penandaan kata dalam bacaan dan progres vocabulary yang terhubung dengan aktivitas membaca. | Menandai kata “diketahui” belum sama dengan membuktikan bahwa pengguna bisa menggunakannya dalam tulisan. |
| Busuu | Kursus yang mengikuti CEFR, placement test, review vocabulary dan grammar, serta latihan tertulis yang bisa dikoreksi komunitas.  [help.busuu](https://help.busuu.com/hc/en-gb/articles/15936615354641-What-is-Busuu) | Struktur B1–B2 yang jelas, checkpoint, dan feedback untuk writing terbuka. | Koreksi komunitas membutuhkan pengguna aktif dan pengelolaan kualitas; bukan fitur MVP yang paling ringan. |
| Babbel | Latihan mencocokkan, melengkapi kalimat, menyusun kalimat, pilihan ganda, dan latihan berbasis dialog. Review tersedia dalam beberapa format, termasuk flashcard dan writing.  [testprepinsight](https://testprepinsight.com/comparisons/busuu-vs-babbel/) | Variasi latihan dalam satu unit dan transisi dari mengenali kosakata ke penggunaannya dalam kalimat. | Babbel juga melatih listening/speaking; yang relevan untuk Anda hanya bagian berbasis teks. |

### Prioritas referensi

Untuk scope Anda, saya akan mempelajari:

1. Clozemaster untuk mekanisme quiz vocabulary.
2. Readlang untuk hubungan antara reading dan vocabulary review.
3. Busuu untuk struktur pembelajaran dan feedback writing.
4. Babbel untuk variasi format latihan.
5. LingQ untuk pengalaman membaca serta pelacakan status kata.

Ini adalah prioritas desain yang saya sarankan, bukan peringkat kualitas keseluruhan aplikasinya.

## 2. Apa yang perlu dibedakan antara B1 dan B2?

Level sebaiknya tidak hanya dibedakan lewat “kata lebih sulit” atau “teks lebih panjang”.

Pada reading, B1 berfokus pada memahami teks faktual yang relatif lugas tentang topik yang familiar. B2 menuntut pembacaan yang lebih mandiri, termasuk memahami artikel atau laporan yang mengandung sudut pandang dan argumen. [cefrlevels](https://cefrlevels.com/descriptors/reading/)

Pada writing, B2 mencakup kemampuan membuat teks yang jelas dan rinci serta menyampaikan alasan yang mendukung atau menentang suatu pandangan. Karena itu, latihan menulis Anda perlu bergerak melampaui pengisian kata kosong. [api.macmillanenglish](https://api.macmillanenglish.com/fileadmin/user_upload/Blog_and_Resources/Blogs_and_articles/CEFR-all-scales-and-all-skills.pdf)

Berikut penerjemahannya menjadi rancangan konten:

| Aspek | Rancangan untuk B1 | Rancangan untuk B2 |
|---|---|---|
| Vocabulary | Kata dalam situasi familiar, collocation umum, pilihan kata sesuai konteks. | Nuansa makna, register formal/informal, collocation yang lebih beragam. |
| Reading | Informasi utama, detail eksplisit, urutan kejadian, hubungan sebab-akibat yang jelas. | Sikap penulis, inferensi, hubungan antarargumen, fakta versus opini. |
| Writing | Email, pengalaman, penjelasan, dan opini singkat dengan alasan. | Teks argumentatif, membandingkan pilihan, merangkum dan menanggapi pandangan. |
| Distraktor jawaban | Alternatif yang berbeda makna atau penggunaannya. | Alternatif yang sama-sama masuk akal, tetapi hanya satu cocok dengan konteks. |
| Feedback | Jelaskan arti dan alasan jawaban benar. | Jelaskan pula mengapa alternatif lain kurang tepat secara makna, register, atau struktur. |

Tabel ini adalah usulan desain, bukan daftar format soal resmi CEFR. CEFR menyediakan deskriptor kemampuan; Anda tetap perlu memetakan setiap latihan ke kemampuan yang ingin diuji. [coe](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors)

## 3. Jenis quiz vocabulary yang cocok

### A. Latihan inti

| Tipe quiz | Cara bermain dan contoh | Tujuan |
|---|---|---|
| Contextual multiple choice | “The company decided to ___ the launch.” Pilih *postpone*, *borrow*, *attend*, atau *earn*. | Mengenali makna dan penggunaan kata dalam kalimat. |
| Typed cloze | Kalimat rumpang tanpa pilihan jawaban; pengguna mengetik kata yang hilang. | Mengingat kata secara aktif, bukan sekadar mengenali. |
| Collocation builder | Pasangkan *raise → awareness*, *reach → an agreement*, *meet → a deadline*. | Menggunakan pasangan kata yang alami. |
| Meaning in context | Pilih arti *issue* dalam sebuah paragraf: “masalah”, “edisi”, atau “menerbitkan”. | Memahami kata yang punya beberapa makna. |
| Word formation | “Her ___ helped the team succeed.” Bentuk kata dari *determine*: *determination*. | Menghubungkan bentuk kata dengan fungsi dalam kalimat. |
| Register choice | Pilih ungkapan yang sesuai untuk email formal versus pesan ke teman. | Menyesuaikan pilihan bahasa dengan situasi. |

Cloze dengan pilihan ganda dan input teks merupakan mekanisme nyata yang dapat Anda pelajari dari Clozemaster. Tipe lain di tabel adalah pengembangan yang saya sarankan untuk kebutuhan B1–B2. [clozemaster](https://www.clozemaster.com/?ref=zmfiywm)

### B. Bentuk game-nya

Anda tidak perlu membuat setiap format menjadi game terpisah. Satu mekanisme bisa memakai beberapa jenis soal:

- Word detective: cari kata atau frasa dalam bacaan berdasarkan petunjuk.
- Collocation puzzle: susun pasangan kata yang tepat.
- Context challenge: jawab serangkaian cloze dari satu tema.
- Review challenge: ulangi kata yang sebelumnya salah dengan kalimat baru.

Matching kata–arti boleh digunakan sebagai pemanasan, tetapi jangan dijadikan aktivitas utama produk. Untuk scope Anda, lebih baik kata muncul kembali dalam kalimat, bacaan, dan tulisan.

## 4. Jenis quiz reading

Reading membutuhkan teks utuh sebagai stimulus, bukan hanya kumpulan kalimat lepas. Usulan format:

| Tipe quiz | Mekanisme | Fokus |
|---|---|---|
| Main idea / best title | Pilih judul atau ringkasan paling tepat. | Memahami keseluruhan teks. |
| Detail search | Jawab pertanyaan berdasarkan informasi tertentu. | Menemukan informasi eksplisit. |
| True / False / Not stated | Bedakan informasi yang benar, bertentangan, dan tidak disebutkan. | Membaca teliti tanpa menambahkan asumsi. |
| Reference tracking | Tentukan rujukan *it*, *they*, *this decision*, atau frasa lain. | Memahami hubungan antarkalimat. |
| Paragraph ordering | Urutkan paragraf atau bagian cerita. | Memahami koherensi dan struktur teks. |
| Sentence insertion | Tempatkan kalimat yang hilang pada posisi yang tepat. | Memahami transisi dan hubungan gagasan. |
| Inference | Pilih kesimpulan yang didukung teks meskipun tidak dinyatakan langsung. | Membaca makna tersirat. |
| Author stance | Identifikasi sikap penulis: mendukung, skeptis, netral, dan sebagainya. | Memahami pandangan dan argumen. |
| Evidence selection | Setelah menjawab, pilih kalimat yang mendukung jawaban. | Memastikan jawaban benar-benar berbasis bacaan. |

Untuk B1, prioritaskan main idea, detail, reference tracking, dan urutan. Untuk B2, tambahkan inference, author stance, sentence insertion, dan evaluasi argumen—selaras dengan peningkatan tuntutan reading pada level tersebut. [cefrhub](https://cefrhub.ai/en/cefr-descriptors-reading-comprehension-b1-b2/)

### Fitur reader yang paling berguna

Ambil alur Readlang: pengguna mengeklik kata yang belum diketahui, lalu kata itu masuk ke daftar review. [readlang](https://readlang.com/)

Untuk aplikasi Anda, saya sarankan menyimpan bukan hanya kata, tetapi juga:

- Kalimat asalnya.
- Arti yang sesuai dengan konteks.
- Frasa atau collocation terkait.
- Sumber bacaan.
- Status review.
- Riwayat penggunaan dalam jawaban writing.

Dengan begitu, vocabulary bank tidak terpisah dari pengalaman membaca.

## 5. Jenis quiz writing

Pisahkan writing terkontrol dari writing terbuka. Mengetik satu kata memang melatih recall, tetapi belum cukup untuk menguji kemampuan menulis teks.

### Writing terkontrol

| Tipe | Contoh tugas |
|---|---|
| Sentence reconstruction | Susun potongan kalimat menjadi kalimat yang koheren. |
| Error correction | Perbaiki satu atau beberapa kesalahan dalam kalimat. |
| Sentence transformation | Ubah kalimat menggunakan *although*, *unless*, atau struktur yang ditentukan tanpa mengubah makna. |
| Guided sentence | Buat kalimat menggunakan dua kata/frasa target. |
| Paraphrase | Tulis ulang satu kalimat dengan makna yang sama. |

### Writing terbuka

| Tipe | Contoh tugas |
|---|---|
| Short message/email | Tulis email meminta perubahan jadwal dan jelaskan alasannya. |
| Reading-to-summary | Ringkas ide utama teks tanpa menyalin kalimatnya. |
| Opinion response | Nyatakan pendapat dan berikan alasan. |
| Compare and recommend | Bandingkan dua pilihan, lalu rekomendasikan salah satunya. |
| Text-based response | Tanggapi argumen dari bacaan dengan menyebutkan bukti atau alasan. |

Sebagai batas awal produk, Anda bisa memakai 60–100 kata untuk tugas B1 dan 120–180 kata untuk B2. Ini usulan panjang tugas agar manageable, bukan batas resmi CEFR.

### Feedback writing

Busuu memberi referensi konkret untuk feedback manusia: pengguna mengirim tulisan, kemudian anggota komunitas dapat mengoreksi teks secara langsung. [busuu](https://www.busuu.com/en/how-to/corrections)

Untuk aplikasi Anda, gunakan empat dimensi penilaian:

1. Task completion: apakah semua instruksi dijawab?
2. Organization: apakah gagasannya runtut?
3. Vocabulary: apakah pilihan kata tepat dan cukup beragam?
4. Grammar: apakah struktur membantu atau mengganggu pemahaman?

Jika menggunakan AI, saya sarankan hasilnya disajikan sebagai feedback formatif, bukan sertifikasi level. Tampilkan potongan tulisan yang dikomentari, alasan koreksi, dan kesempatan revisi. Jangan otomatis mengganti seluruh tulisan dengan versi “lebih bagus” tanpa menjelaskan perubahan.

## 6. Fitur produk yang perlu disiapkan

### Fitur pembelajaran inti

- Placement awal untuk menentukan titik mulai B1 atau B2.
- Learning path berdasarkan tema dan tujuan kemampuan.
- Review terjadwal untuk kata serta pola yang belum dikuasai.
- Vocabulary bank pribadi dari bacaan dan kesalahan quiz.
- Error notebook: kelompokkan kesalahan vocabulary, collocation, grammar, dan pemahaman teks.
- Feedback setelah jawaban, termasuk penjelasan distraktor.
- Checkpoint dengan teks dan konteks baru, bukan mengulang soal yang sama.

Placement, struktur CEFR, serta review vocabulary/grammar dapat dipelajari dari Busuu; pengulangan kalimat terjadwal dapat dipelajari dari Clozemaster. [clozemaster](https://www.clozemaster.com/?ref=zmfiywm)

### Fitur game sebagai lapisan tambahan

- XP dan target harian.
- Streak yang tidak terlalu menghukum.
- Quest bertema, misalnya menyelesaikan bacaan dan menulis email.
- Badge berdasarkan kemampuan, bukan hanya jumlah klik.
- Checkpoint atau “boss challenge” di akhir unit.
- Timer opsional untuk latihan ringan, tidak wajib untuk reading dan writing.

Bedakan progres aktivitas dari progres kemampuan. “Menyelesaikan 100 soal” adalah ukuran aktivitas; “mampu menjawab inferensi pada teks baru” adalah target kemampuan.

## 7. MVP yang saya sarankan

Jangan langsung membangun semua jenis quiz. Mulai dari delapan format berikut:

| Area | Format MVP |
|---|---|
| Vocabulary | Contextual multiple choice, typed cloze, collocation matching. |
| Reading | Main idea, detail question, evidence selection. |
| Writing | Sentence transformation, short guided writing. |

Lengkapi dengan lima fitur pendukung:

1. Pilihan jalur B1/B2.
2. Review terjadwal.
3. Vocabulary bank.
4. Feedback dan error notebook.
5. Progres per kemampuan.

Tunda leaderboard, multiplayer, koreksi komunitas, dan banyak variasi game sampai alur belajar utamanya terbukti berguna.

### Contoh satu unit yang terhubung

Tema: remote work.

1. Pengguna membaca artikel pendek.
2. Pengguna menjawab main idea dan pertanyaan detail.
3. Pengguna memilih bukti dari teks.
4. Kosakata seperti *flexible schedule*, *commute*, dan *productivity* masuk ke latihan cloze/collocation.
5. Pengguna menulis email meminta pengaturan kerja yang lebih fleksibel.
6. Pengguna menerima feedback lalu merevisi.
7. Kata atau pola yang masih salah muncul kembali pada sesi review dengan konteks baru.

Inilah kombinasi yang paling sesuai dengan tujuan Anda: mekanisme quiz Clozemaster, reader dan vocabulary bank ala Readlang/LingQ, serta struktur dan feedback writing ala Busuu—tanpa harus memasukkan listening atau speaking. [clozemaster](https://www.clozemaster.com/?ref=zmfiywm)

Ya, dengan fokus tersebut, konsepnya lebih tepat sebagai **challenge** persiapan ujian untuk dewasa: singkat, interaktif, berbasis konteks, dan menuntut pemahaman—bukan permainan mencocokkan kata dengan gambar atau mengumpulkan poin semata.

Saya merekomendasikan tiga pilar utama:

1. Vocabulary in context: melengkapi kata, memilih collocation, dan mengenali paraphrase.
2. Interactive reading: satu teks menjadi rangkaian tantangan, termasuk mencari bukti dan menghubungkan informasi.
3. Progressive writing: menulis jawaban, mendapat pertanyaan lanjutan, lalu memperbaiki tulisan.

Inspirasi DET yang paling cocok adalah Interactive Reading dan Interactive Writing. Interactive Reading menggabungkan melengkapi kalimat, melengkapi passage, menyorot jawaban, menentukan ide utama, dan memilih judul. Interactive Writing meminta respons awal, kemudian respons lanjutan untuk mengembangkan gagasan. [englishtest-static.duolingo](https://englishtest-static.duolingo.com/media/resources/GPN%20The%20DET%20Handbook.pdf)

## 1. Pisahkan gaya interaksi dari format ujian

Anda bisa memakai interaksi ala Duolingo English Test, tetapi konten dan keterampilan tetap diarahkan ke IELTS atau TOEIC.

| Jalur | Karakter konten | Fokus latihan |
|---|---|---|
| IELTS | Artikel dan isu akademik/populer; untuk Academic Writing, juga tabel, grafik, atau diagram. | Pemahaman argumen, informasi versus klaim, ringkasan, deskripsi data, dan essay.  [ielts](https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test) |
| TOEIC | Email, pengumuman, chat kerja, iklan, dan dokumen bisnis. | Ketepatan vocabulary/grammar, kelengkapan teks, tujuan komunikasi, detail, dan hubungan antardokumen.  [ets](https://www.ets.org/toeic/test-takers/prepare.html) |

Catatan penting: TOEIC Listening & Reading tidak memiliki bagian writing. Jadi, fitur menulis sebaiknya diberi label “writing skill practice” atau dibuat sebagai jalur TOEIC Writing tersendiri—jangan digabung seolah-olah bagian dari TOEIC Reading. ETS menyediakan persiapan untuk tes-tes TOEIC sebagai produk yang berbeda. [ets](https://www.ets.org/toeic/test-takers/prepare.html)

Rekomendasi di bawah adalah desain latihan Anda, bukan klaim bahwa semuanya merupakan format soal resmi. Durasi dan panjang latihan juga merupakan usulan produk.

## 2. Vocabulary: empat tipe quiz yang layak dibuat

### 1. Context Restoration — pulihkan kata dalam passage

Terinspirasi dari Read and Complete DET: pengguna melengkapi bagian kata yang hilang di dalam paragraf. Format tersebut menggabungkan pemahaman konteks dengan pengetahuan kosakata dan bentuk kata. [detpractice](https://www.detpractice.com/question-types)

Cara bermain:

- Tampilkan paragraf pendek, sekitar 80–120 kata.
- Beberapa kata kehilangan huruf akhirnya atau sebagian hurufnya.
- Pengguna mengetik huruf yang hilang.
- Satu passage berisi 4–6 target kata.
- Setelah submit, tampilkan passage lengkap dan alasan tiap jawaban.

Contoh:

> The company introduced a flex____ working policy to improve employee satisf______.

Jawaban: *flexible*, *satisfaction*.

Untuk B1, petunjuk huruf lebih banyak dan konteks lebih eksplisit. Untuk B2, gunakan word formation dan konteks yang membutuhkan pembacaan beberapa kalimat.

Mengapa menarik: pengguna memulihkan makna sebuah teks, bukan menghafal pasangan kata–arti.

Batasan: jangan menjadikannya sekadar tes ejaan. Pilih kata yang konteksnya benar-benar membantu menentukan jawaban.

### 2. Precision Choice — pilih kata yang paling tepat

Cara bermain:

- Tampilkan kalimat dari artikel atau email.
- Berikan empat kata yang tampak masuk akal.
- Pengguna memilih kata yang paling tepat secara makna dan penggunaan.
- Setelah menjawab, pengguna bisa membuka penjelasan “mengapa tiga pilihan lain tidak cocok”.

Contoh:

> The findings ___ the claim that remote work always reduces productivity.

Pilihan: *challenge / compete / refuse / prevent*.

Jawaban: *challenge*.

Variasi soal:

- Collocation: *meet a deadline*.
- Word form: *significant / significantly / significance*.
- Makna kontekstual.
- Preposition atau pola setelah kata tertentu.
- Formalitas bahasa dalam email.

Format ini sangat relevan dengan latihan incomplete sentences pada TOEIC Reading, tetapi contoh dan sistem interaksinya bisa Anda desain sendiri. [toeicmocktests](https://toeicmocktests.com/toeic-reading-practice.html)

### 3. Paraphrase Match — cari makna yang sama, bukan kata yang sama

Cara bermain:

- Tampilkan satu kalimat sumber.
- Berikan tiga atau empat versi paraphrase.
- Pengguna memilih yang mempertahankan makna paling akurat.
- Pada pembahasan, tandai perubahan penting: negasi, jumlah, tingkat kepastian, atau sebab-akibat.

Contoh sumber:

> Employees are not required to attend the session.

Pilihan:

- Attendance is optional.
- Employees must attend.
- The session has been cancelled.
- Only some employees may attend.

Jawaban: *Attendance is optional.*

B1: perubahan vocabulary dan struktur sederhana.

B2: perubahan yang melibatkan *some/all*, *may/will*, *not necessarily*, atau hubungan logis.

Mengapa menarik: distraktor tidak harus berupa bahasa yang salah. Semuanya bisa gramatikal, tetapi hanya satu mempertahankan makna.

### 4. Collocation Repair — perbaiki bahasa yang kurang alami

Cara bermain:

- Tampilkan email atau paragraf pendek dengan 2–3 frasa yang kurang tepat.
- Pengguna mengeklik frasa bermasalah.
- Pengguna mengganti satu kata melalui pilihan atau input teks.
- Sistem menunjukkan versi sebelum dan sesudah.

Contoh:

> We need to do a decision before Friday.

Perbaikan: *make a decision*.

Untuk B2, gunakan kesalahan yang lebih halus dalam pilihan kata atau register.

Penting: berikan instruksi dan target yang jelas. Jika ada beberapa perbaikan valid, sistem harus menerima semuanya, bukan memaksakan satu redaksi.

## 3. Reading: empat tipe quiz utama

### 5. Passage Mission — satu passage, beberapa tahap

Ini kandidat fitur utama aplikasi Anda. Mekanismenya paling dekat dengan Interactive Reading DET, yang menggunakan beberapa tugas terhadap passage yang sama. [englishtest-static.duolingo](https://englishtest-static.duolingo.com/media/resources/GPN%20The%20DET%20Handbook.pdf)

Cara bermain:

Satu sesi berisi passage sekitar 150–300 kata dengan tahapan:

1. Complete: isi beberapa kata kosong.
2. Restore: pilih kalimat yang hilang.
3. Locate: sorot bagian yang menjawab pertanyaan.
4. Interpret: jawab pertanyaan detail atau inferensi.
5. Summarize: pilih ide utama atau judul terbaik.

Contoh tema:

- IELTS: perubahan pola kerja, transportasi kota, kebiasaan belajar.
- TOEIC: perubahan kebijakan kantor, peluncuran layanan, jadwal konferensi.

Rasa “game”-nya berasal dari menyelesaikan satu misi pemahaman, bukan lima soal acak.

Desain feedback: dalam mode practice, tampilkan pembahasan di akhir rangkaian agar pembahasan tahap pertama tidak membocorkan jawaban berikutnya.

### 6. Evidence Hunt — jawab dan buktikan

Cara bermain:

- Tampilkan passage dan pertanyaan.
- Pengguna menjawab.
- Pengguna kemudian menyorot kalimat atau rentang teks yang mendukung jawabannya.
- Sistem menilai jawaban dan bukti secara terpisah.

Contoh:

> Why was the workshop postponed?

Pengguna memilih “The venue was unavailable”, lalu menyorot kalimat yang menyatakan alasan tersebut.

Ini mengadaptasi interaksi Highlight the Answer pada DET. [englishtest-static.duolingo](https://englishtest-static.duolingo.com/media/resources/GPN%20The%20DET%20Handbook.pdf)

Variasi IELTS:

Gunakan True / False / Not Given:

- True: informasi sesuai teks.
- False: informasi bertentangan dengan teks.
- Not Given: informasi yang diperlukan tidak tersedia.

Format tersebut memang digunakan dalam IELTS Reading. Untuk *Not Given*, jangan memaksa pengguna menyorot “bukti yang tidak ada”; sediakan opsi “informasi tidak ditemukan”. [ielts](https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test)

### 7. Document Detective — gabungkan informasi antardokumen

Ini sangat cocok untuk jalur TOEIC, yang mencakup pemahaman dokumen seperti email, notice, chat, dan artikel. [toeicmocktests](https://toeicmocktests.com/toeic-reading-practice.html)

Cara bermain:

Tampilkan dua atau tiga dokumen dalam tab atau panel:

- Email pemesanan.
- Jadwal pengiriman.
- Pesan perubahan pesanan.

Pengguna menyelesaikan pertanyaan yang membutuhkan gabungan informasi.

Contoh:

- Email: klien meminta barang tiba sebelum Jumat.
- Jadwal: layanan standar tiba Senin.
- Pesan: layanan express masih tersedia.

Pertanyaan:

> Which delivery option meets the client’s requirement?

Pengguna memilih jawabannya dan menandai informasi pendukung dari dua dokumen.

B1: dua dokumen, detail eksplisit.

B2: tiga dokumen, revisi informasi, pengecualian, dan inferensi sederhana.

Mengapa menarik: terasa seperti menyelesaikan masalah kerja nyata, bukan membaca passage lalu menjawab soal yang berdiri sendiri.

### 8. Paragraph Logic — bangun kembali alur teks

Cara bermain:

- Tampilkan artikel dengan satu kalimat hilang.
- Berikan beberapa kandidat.
- Pengguna memilih kalimat dan menentukan posisi yang benar.
- Pembahasan menandai petunjuk seperti *however*, *this finding*, *as a result*, dan rujukan pronoun.

Variasi:

- Cocokkan paragraf dengan heading.
- Cocokkan klaim dengan paragraf pendukung.
- Lengkapi ringkasan menggunakan informasi dari teks.

Sentence insertion relevan dengan Interactive Reading DET; matching headings dan summary completion merupakan format IELTS Reading. [englishtest-static.duolingo](https://englishtest-static.duolingo.com/media/resources/GPN%20The%20DET%20Handbook.pdf)

Untuk MVP, saya lebih memilih sentence insertion daripada menyusun seluruh paragraf dengan drag-and-drop: aturan jawabannya lebih mudah dibuat jelas dan interaksinya lebih ringan.

## 4. Writing: tiga tipe quiz yang tidak terasa seperti tugas sekolah

### 9. Interactive Writing — jawaban awal dan pertanyaan lanjutan

Ini tipe writing yang paling saya rekomendasikan. DET menggunakan respons awal lalu pertanyaan lanjutan untuk memperluas gagasan. [englishtest-static.duolingo](https://englishtest-static.duolingo.com/media/resources/GPN%20The%20DET%20Handbook.pdf)

Cara bermain:

Tahap pertama:

> Should universities allow students to use AI tools for assignments?

Pengguna menulis pendapat singkat.

Tahap kedua:

> Describe one situation where such use should be restricted, and explain why.

Pengguna memperluas atau membatasi pendapatnya.

Untuk latihan aplikasi, Anda bisa mulai dengan:

- B1: 60–90 kata + lanjutan 40–60 kata.
- B2: 100–140 kata + lanjutan 60–90 kata.

Angka tersebut adalah panjang micropractice, bukan persyaratan ujian.

Feedback yang ditampilkan:

- Apakah pertanyaan dijawab?
- Apakah alasan cukup jelas?
- Apakah jawaban kedua konsisten dengan jawaban pertama?
- Apakah vocabulary dan grammar mendukung penyampaian gagasan?

### 10. Data Brief — ubah tabel menjadi laporan singkat

Cocok untuk IELTS Academic Writing Task 1, yang meminta deskripsi visual information seperti grafik, tabel, atau diagram. Tidak membutuhkan audio maupun video. [ielts](https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-writing)

Cara bermain:

1. Tampilkan tabel atau grafik sederhana.
2. Pengguna memilih dua temuan utama.
3. Pengguna menulis overview.
4. Pengguna menulis satu paragraf perbandingan.

Contoh data: jumlah mahasiswa yang menggunakan bus, sepeda, dan mobil dalam dua tahun.

Tantangannya bukan hanya menghasilkan kalimat gramatikal, tetapi memilih informasi penting dan membandingkannya secara akurat.

Feedback:

- Akurasi angka.
- Ketepatan perbandingan.
- Keberadaan overview.
- Pemilihan fitur utama.
- Bahasa tren dan perbandingan.

Versi singkat ini latihan bertahap. Untuk mode simulasi resmi, IELTS Academic Task 1 meminta sedikitnya 150 kata, sedangkan Task 2 sedikitnya 250 kata. [ielts](https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-writing)

### 11. Revision Challenge — perbaiki tulisan Anda sendiri

Cara bermain:

- Pengguna menulis paragraf atau email.
- Sistem menampilkan maksimal tiga target perbaikan.
- Sistem tidak langsung memberikan versi final.
- Pengguna merevisi.
- Sistem menunjukkan perubahan kualitas sebelum dan sesudah.

Contoh feedback:

> Anda menyatakan bahwa biaya meningkat, tetapi belum menjelaskan dampaknya pada mahasiswa.

Atau:

> Kata “this” pada kalimat kedua tidak memiliki rujukan yang jelas.

Rasa game-nya berasal dari menyelesaikan target revisi: memperjelas argumen, memperbaiki hubungan kalimat, atau menggunakan pilihan kata yang lebih tepat.

Jika memakai AI, saya sarankan mengutamakan feedback berbukti—kutip bagian tulisan yang dikomentari—dan tidak menampilkan estimasi IELTS band sebagai skor resmi.

## 5. Paket MVP yang paling kuat

Saya akan mulai dengan enam tipe, bukan langsung semuanya:

| Prioritas | Tipe | Peran |
|---|---|---|
| 1 | Passage Mission | Identitas utama aplikasi; menggabungkan vocabulary dan reading. |
| 2 | Context Restoration | Latihan aktif kosakata tanpa flashcard. |
| 3 | Precision Choice | Latihan singkat, terutama untuk kebutuhan TOEIC. |
| 4 | Document Detective | Pembeda jalur TOEIC. |
| 5 | Interactive Writing | Latihan pengembangan gagasan untuk dewasa. |
| 6 | Data Brief | Pembeda jalur IELTS Academic. |

Evidence Hunt bisa menjadi mekanisme di dalam Passage Mission dan Document Detective. Revision Challenge bisa menjadi tahap akhir Interactive Writing, sehingga tidak perlu dibangun sebagai modul terpisah sejak awal.

## 6. Seperti apa pengalaman “game” untuk dewasa?

Saya sarankan menggunakan sesi 8–15 menit dengan gaya antarmuka seperti assessment interaktif:

- Progress berdasarkan tahapan misi.
- Timer opsional dalam practice, aktif dalam exam mode.
- Skor terpisah untuk accuracy, evidence, dan writing quality.
- Pembahasan yang menjelaskan alasan, bukan sekadar “benar/salah”.
- Tantangan ulang dengan konteks baru.
- Tema akademik, kampus, karier, layanan publik, dan dunia kerja.
- Tanpa nyawa, maskot wajib, flashcard, atau animasi hadiah yang berlebihan.

Contoh satu sesi TOEIC:

> Baca email → lengkapi kata yang hilang → buka jadwal → selesaikan masalah perubahan booking → pilih bukti.

Contoh satu sesi IELTS:

> Baca artikel → lengkapi passage → identifikasi klaim → pilih bukti → tulis opini → jawab follow-up → revisi.

Terakhir, pisahkan label “skill practice” dari “exam simulation”. Latihan pendek B1–B2 boleh menyederhanakan panjang teks dan beban tugas, tetapi simulasi ujian harus mengikuti format tes yang dituju. Dengan begitu, aplikasi Anda tetap menarik tanpa memberi kesan bahwa microquiz sudah setara dengan kesiapan menghadapi seluruh ujian.