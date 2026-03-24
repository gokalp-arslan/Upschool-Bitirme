# Upschool Kariyer Platformu - Proje Hafızası (V2)

## 🛠 Teknolojiler
- **Framework:** Next.js 16 (App Router, `src/app`)
- **Database & Auth:** Supabase (`@supabase/supabase-js`)
- **Styling:** Tailwind CSS (Modern & SaaS style)
- **Icons:** Lucide React

## 🗄 Veritabanı ve Sahiplik Yapısı
- **Ana Tablolar:** `profiles`, `internships`, `trainings`.
- **Başvuru Tabloları:** `internship_applications`, `training_applications`.
- **Sahiplik Kuralı:** İlanlarda sahiplik kontrolü öncelikle `user_id` sütunu, o yoksa `added_by` sütunu üzerinden yapılır. Düzenleme/Silme işlemlerinde `supabase.auth.getUser().id` ile bu iki sütundan biri mutlaka eşleşmelidir.

## 📍 Önemli Route'lar & Navigasyon
- `/` : Ana Dashboard (5 ana kart: Profil, CV, Kartvizit, İlan Ekle, İlanlara Başvur).
- `/profil` : Kullanıcı bilgilerini görüntüleme. (QR oluşturma buradan kaldırıldı).
- `/kartvizit` : Dijital Kartvizit modülü (QR + vCard). Kapatılınca `/` (Dashboard)'a döner.
- `/ilanlar` : Tüm ilanların listesi ve yönetimi.
- `/staj-ekle` & `/egitim-ekle` : İlan oluşturma ve `?id=` ile düzenleme sayfaları.
- `/cv-olustur` : Profilden ATS uyumlu CV önizleme + `react-to-print` ile PDF (yazdır) indirme.
- `/giris-yap` & `/kayit-ol` : Temel Auth sayfaları.
- `/login` : Sunucu taraflı kontrolle doğrudan `/giris-yap` sayfasına yönlendirir.
- `/profil-tamamlama` : İlk kayıt sonrası veya profil güncelleme için kullanılan 4 adımlı form.
- `/ilan-ekle` : Staj veya Eğitim ilanı seçimi yapılan ana hub sayfası.

## ⚠️ Kritik Geliştirme Kuralları
1. **State Yönetimi:** Bir ilan silindiğinde, sayfa yenilenmeden önce yerel state (`setInternships`/`setTrainings`) `filter` yöntemiyle anlık güncellenmelidir.
2. **Build Uyumu:** `useSearchParams` kullanılan sayfalar (ilan ekleme/düzenleme) mutlaka `Suspense` bileşeni ile sarmalanmalıdır.
3. **Güvenlik:** RLS (Row Level Security) politikaları `user_id` veya `added_by` sütunlarına göre kurgulanmıştır; silme/güncelleme sorgularında bu filtreleme unutulmamalıdır.
4. **Tasarım:** Mevcut Tailwind yapısına ve renk paletine (Slate/Blue/Yellow tonları) sadık kalınmalıdır.

## ✅ Tamamlanan İşler
- [x] Profil sayfasındaki mükerrer QR menüsü kaldırıldı.
- [x] İlan yönetimi (3 nokta menüsü) ve sahiplik kontrolü eklendi.
- [x] Kartvizit yönlendirmesi Dashboard'a çekildi.
- [x] CV oluşturma (`/cv-olustur`): profil verisi, ATS uyumlu düzen, PDF (yazdır) indirme.

## ⏳ Bekleyen İşler
- [ ] Dinamik QR Checkbox seçimlerinin vCard çıktısına tam entegrasyonu.

