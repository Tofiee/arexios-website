# ARXCSGO Topluluk Web Sitesi - Kapsamlı Antigravity AI Görev Planı

## Proje Özeti
Bu proje, ARXCSGO adlı CS:GO modlu CS 1.6 topluluk sunucusu için geliştirilecek çok kapsamlı bir web portalıdır. Sistem; çoklu dil (Türkçe/İngilizce) ve tema (Light/Dark) desteğine sahip olacak, oyuncu istatistiklerini, VIP satışlarını, ban listesini, TeamSpeak 3 entegrasyonunu ve üyelik sistemini tek bir çatı altında toplayacaktır.

## Teknoloji Yığını (Tech Stack)
*   **Frontend:** React.js (Vite kullanılarak), Tailwind CSS (Dark/Light mode uyumlu).
*   **Çoklu Dil (i18n):** `react-i18next` kütüphanesi.
*   **Backend:** Python (FastAPI) - Sunucu Query'leri, TS3 Query'leri ve RCON işlemleri için.
*   **Veritabanı:** MySQL - Oyun içi istatistiklerin (AMXX/ReAPI) ve web kullanıcılarının ortak tutulacağı veritabanı.
*   **Kimlik Doğrulama:** JWT (JSON Web Token) tabanlı güvenli üyelik sistemi.

---

## Aşama 1: Temel Kurulum, Tema ve Dil Altyapısı
**Agent Talimatı:** React ve FastAPI projelerini ayağa kaldır, global mimariyi kur.

- [ ] Vite ile React projesi ve FastAPI ile Python backend oluşturulacak.
- [ ] Tailwind CSS entegre edilecek ve `darkMode: 'class'` ayarı açılarak sistemin varsayılan olarak Koyu Tema'da başlaması sağlanacak. Sitede Tema Değiştirme (Sun/Moon) butonu olacak.
- [ ] `react-i18next` kurularak `tr.json` ve `en.json` dosyaları eklenecek. Sitede hiçbir metin statik kalmayacak, tamamen çevrilebilir (Dil Seçenekli) olacak.

## Aşama 2: Üyelik Sistemi (Auth) ve Profiller
**Agent Talimatı:** Oyuncuların siteye kayıt olup Steam hesaplarını bağlayabileceği yapıyı kur.

- [ ] MySQL üzerinde `users` tablosu (Kullanıcı Adı, Şifre, Email, SteamID, Yetki) oluşturulacak.
- [ ] Backend'de JWT kullanılarak `/register` ve `/login` endpoint'leri yazılacak.
- [ ] React tarafında oyuncunun giriş yaptıktan sonra kendi istatistiklerini ve VIP süresini görebileceği `/profile` sayfası tasarlanacak.

## Aşama 3: Ana Sayfa ve Canlı Entegrasyon Widget'ları
**Agent Talimatı:** Ana sayfa tasarımını ve canlı veri çeken bileşenleri oluştur.

- [ ] **Hero Section:** Büyük "ARXCSGO" logosu, "Hemen Oyuna Katıl" (`steam://connect/IP`) butonu ve "IP Kopyala" butonu eklenecek.
- [ ] **CS 1.6 Sunucu Durumu:** Python'da `python-a2s` kullanılarak anlık oyuncu sayısı (Örn: 24/32) ve mevcut harita bilgisini çeken API yazılacak. Frontend bu veriyi şık bir widget içinde gösterecek.
- [ ] **TeamSpeak 3 Widget'ı:** Python üzerinden TS3 ServerQuery kullanılarak aktif odalar ve odalardaki kullanıcılar çekilecek. Ana sayfada canlı olarak listelenecek.

## Aşama 4: İstatistikler (Top15) ve Ban Listesi
**Agent Talimatı:** Oyun içi rekabet ve disiplin verilerini web'e yansıt.

- [ ] **Top15 / Rank Sistemi:** `reapi` destekli eklentilerden MySQL `stats` tablosuna yazılan veriler (K/D Oranı, Oynama Süresi, Headshot Yüzdesi) çekilecek. React'te aranabilir ve sıralanabilir bir istatistik tablosu yapılacak.
- [ ] **Ban Listesi (CSBans Entegrasyonu):** `bans` tablosundan aktif banlar çekilecek. Hangi adminin, kime, ne sebeple ve ne kadar süreyle ban attığını gösteren şeffaf bir liste yapılacak. İçerisinde "Ban İtiraz Formu" butonu bulunacak.

## Aşama 5: VIP Market ve Etkileşim
**Agent Talimatı:** Topluluk için sunucu içi yetki satışlarını otomatize et.

- [ ] **VIP Market Paneli:** VIP, Slot ve Adminlik paketlerinin özelliklerinin karşılaştırıldığı (ekstra HP, özel silahlar, yedek slot vb.) şık bir fiyatlandırma/özellik tablosu (Pricing Table) yapılacak.
- [ ] **Discord Webhook Otomasyonu:** Siteden biri VIP satın alma talebi gönderdiğinde veya ban itirazı yaptığında, otomatik olarak ARXCSGO Discord sunucusundaki ilgili kanala bildirim (Embed mesaj) düşecek.

## Aşama 6: Web RCON (Admin Paneli)
**Agent Talimatı:** Yetkili kullanıcılar için sunucu yönetim araçlarını ekle.

- [ ] React'te sadece `is_admin = true` olan kullanıcıların girebileceği korumalı bir sayfa yapılacak.
- [ ] Python backend üzerinden sunucuya güvenli RCON komutları gönderme özelliği eklenecek (Web üzerinden kick/ban atma, harita değiştirme, duyuru geçme).

## Aşama 7: Test ve Doğrulama (Artifact Üretimi)
**Agent Talimatı:** Tasarımın ve işlevlerin sorunsuz olduğunu test et ve kaydet.

- [ ] Sitenin, özellikle Top15 ve Ban Listesi tablolarının mobil (Responsive) cihazlarda kusursuz göründüğü test edilecek.
- [ ] Açık/Koyu tema geçişlerinin ve TR/EN dil değişiminin sayfa yenilenmeden çalıştığı doğrulanacak.
- [ ] CS 1.6 veya TS3 sunucusu kapalı olduğunda, sitenin çökmediği ve ilgili widget'larda zarifçe "Sunucu Çevrimdışı" uyarısının çıktığı teyit edilecek.