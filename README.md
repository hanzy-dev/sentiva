# Sentiva — Secure File Vault (Next.js + Supabase)

[![Cleanup (Sentiva)](https://github.com/hanzy-dev/sentiva/actions/workflows/cleanup.yml/badge.svg)](https://github.com/hanzy-dev/sentiva/actions/workflows/cleanup.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)

**Sentiva** adalah *private file vault* untuk menyimpan dan berbagi file secara aman.  
Dibangun dengan standar industri: **direct-to-storage upload (LFA)**, **signed URL**, **one-time / expiring share link (atomic)**, **RLS**, **security headers**, **observability (correlation id + structured logs)**, dan **cleanup job** untuk mencegah *cloud shock*.

🌐 **Demo:** https://sentiva.vercel.app

---

## Kenapa project ini “bernilai tinggi”
- **Large File Upload (LFA):** upload langsung ke Supabase Storage → hemat memory/CPU server (cocok untuk serverless).
- **Security by default:** private bucket + RLS + signed URL TTL pendek + token share disimpan sebagai hash.
- **Atomic share link:** konsumsi one-time link secara atomik untuk mencegah race condition.
- **Cost control:** cleanup endpoint + GitHub Actions cron untuk menghapus file yang sudah soft-delete.
- **Operasional siap produksi:** health endpoint, correlation id, structured logs, dan error handling konsisten.

---

## Fitur
### MVP
- Login Google (Supabase Auth)
- Upload file (direct-to-storage)
- List file
- Download aman (signed URL)
- Hapus file (soft delete)
- Buat share link (expiring + one-time)
- Consume share link publik: `/s/:token`

### Ops / Production readiness
- `GET /api/health` (status layanan)
- Middleware: correlation id + latency log + security headers
- Cleanup job via GitHub Actions (cron)

---

## Arsitektur singkat
### 1) Direct Upload (Data plane vs Control plane)
**Control plane (server):**
1. `POST /api/uploads/init`  
   validasi input (mime/size), generate `object_path`, return info upload.

**Data plane (client → storage):**
2. Client upload langsung ke Supabase Storage (private bucket).

**Finalize (server):**
3. `POST /api/uploads/commit`  
   insert metadata ke tabel `files` + audit log.

> Ini menghindari limit memory serverless saat upload file besar.

### 2) Signed Download
- Client → `POST /api/files/:id/signed-download`
- Server verifikasi owner (RLS) → generate signed URL TTL pendek.

### 3) Share Link (one-time + expiring) — anti race condition
- Link publik: `/s/:token`
- Token disimpan sebagai **hash** di DB (`token_hash`)
- Konsumsi link dilakukan dengan query atomik:
  - increment `views_used` hanya jika `views_used < max_views` dan belum expired/revoked

---

## Security Model
- **Supabase RLS:** user hanya bisa akses data miliknya (`files`, `share_links`, `audit_logs`)
- **Private storage bucket** + signed URL TTL pendek
- **Token safety:** share token tidak disimpan plaintext (hash)
- **Input validation:** Zod schema untuk payload API
- **Security headers:** CSP, nosniff, referrer policy, dll

---

## Cleanup Job (Anti Cloud Shock)
- Endpoint: `POST /api/maintenance/cleanup`
- Aman karena wajib header `x-cron-secret`
- Dipanggil via **GitHub Actions cron** setiap hari
- Menghapus:
  - object storage untuk file yang soft-deleted melebihi batas hari
  - row DB yang sudah lewat cutoff
  - share_links lama (expired/revoked)

---

## Tech Stack
- Next.js 14 (App Router) + TypeScript
- Supabase (Auth, Postgres, Storage, RLS)
- shadcn/ui + Tailwind CSS
- Pino (structured logging)
- GitHub Actions (scheduled cleanup)

---

## Setup Lokal

### 1) Install

```bash
npm install
```

### 2) Buat .env.local

Gunakan template .env.example, lalu isi value:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

### 3) Jalankan

```
npm run dev
```

## Database & Migration

Migrations ada di:

- `supabase/migrations`

Push ke remote:

```
npx supabase@latest link --project-ref <project_ref>
npx supabase@latest db push
```

## CI / Automation

Workflow:

- `.github/workflows/cleanup.yml`

Secrets yang dibutuhkan:

- `CLEANUP_URL`
- `CRON_SECRET`

## Trade-offs (Why)

- Direct upload dipilih untuk menghindari memory/CPU limit di serverless.
- Signed URL TTL pendek dipilih untuk membatasi risiko kebocoran link.
- Soft delete dipilih agar ada ruang untuk recovery + cleanup batch.

## Roadmap

- Trash / restore UI
- Audit log page
- Rename file
- Multi-file upload + real progress tracking