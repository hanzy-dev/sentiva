# Sentiva — Secure File Vault (Next.js + Supabase)

[![Cleanup (Sentiva)](https://github.com/hanzy-dev/sentiva/actions/workflows/cleanup.yml/badge.svg)](https://github.com/hanzy-dev/sentiva/actions/workflows/cleanup.yml)
[![CI (Sentiva)](https://github.com/hanzy-dev/sentiva/actions/workflows/ci.yml/badge.svg)](https://github.com/hanzy-dev/sentiva/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)

**Sentiva** adalah *private file vault* untuk menyimpan dan berbagi file secara aman.

Project ini fokus ke pola yang umum dipakai di production:
**direct-to-storage upload (LFA)**, **signed URL**, **one-time / expiring share link (atomic via DB RPC)**, **RLS**, **security headers**, **observability (correlation id + structured logs)**, **rate limiting**, dan **cleanup job** untuk mencegah *cloud shock*.

🌐 **Demo:** https://sentiva.vercel.app

---

## Proof (CI + Tests)
Project ini punya **CI** di GitHub Actions yang menjalankan: **lint → typecheck → test → build**.

High-signal tests (Vitest):
- **One-time share link contract:** request pertama ke `/s/:token` redirect (302), request kedua jadi **404** (netral).
- **Request ID propagation:** `/s/:token` meneruskan `p_request_id` ke RPC untuk audit trail.
- **Upload commit idempotency contract:** saat insert metadata gagal (mis. duplicate), `/api/uploads/commit` fallback mengambil row existing → **tidak membuat metadata dobel**.

---

## Kenapa project ini “bernilai tinggi”
- **Large File Upload (LFA):** upload langsung ke Supabase Storage → hemat memory/CPU server (cocok untuk serverless).
- **Security by default:** private bucket + RLS + signed URL TTL pendek + token share disimpan sebagai hash.
- **Atomic share link:** konsumsi one-time link secara atomik untuk mencegah race condition.
- **Cost control:** cleanup endpoint + GitHub Actions cron untuk menghapus file yang sudah soft-delete.
- **Operasional siap produksi:** health endpoint, correlation id, structured logs, error handling konsisten, dan rate limiting.

---

## Status Implementasi
### Implemented ✅
- Login Google (Supabase Auth)
- Upload file (direct-to-storage)
- List file (sorted newest)
- Download aman (signed URL TTL pendek)
- Hapus file (soft delete)
- Share link (expiring + one-time view)
- Consume share link publik: `/s/:token` (redirect ke signed URL)
- Preview:
  - Image (PNG/JPG/WebP): preview inline via signed URL (TTL pendek)
  - PDF: beberapa browser dapat memblok iframe PDF cross-origin → fallback **“Buka di tab baru”**
- Audit log page (timeline aktivitas) + filter action + copy request id
- `GET /api/health`
- Middleware: correlation id + latency log + security headers
- Rate limiting (Upstash Redis) untuk endpoint publik & sensitif
  - **Jika env Upstash tidak diset → limiter otomatis nonaktif (by design)** agar dev/CI tetap stabil
- Cleanup job via GitHub Actions (cron)

### Planned / Roadmap 🧭
- Rename file (metadata)
- Trash / restore UI
- Multi-file upload + real progress tracking
- E2E tests (Playwright) (opsional)

---

## Arsitektur singkat

### Direct Upload (Data plane vs Control plane)
**Control plane (server):**
1. `POST /api/uploads/init`  
   Validasi input (mime/size), generate `object_path`, return info upload.

**Data plane (client → storage):**
2. Client upload langsung ke Supabase Storage (private bucket).

**Finalize (server):**
3. `POST /api/uploads/commit`  
   Verifikasi object di storage + simpan metadata ke tabel `files` + audit log (idempotent).

> Menghindari limit memory serverless saat upload file besar.

### Signed Download
- Client → `POST /api/files/:id/signed-download`
- Server verifikasi owner (RLS) → generate signed URL TTL pendek.

### Share Link (one-time + expiring) — anti race condition
- Link publik: `/s/:token`
- Token disimpan sebagai **hash** di DB (`token_hash`)
- Konsumsi link dilakukan atomik di DB via RPC:
  - increment `views_used` hanya jika `views_used < max_views`, belum expired/revoked, dan file belum deleted

> Endpoint publik mengembalikan respons netral untuk token invalid/expired/used.

---

## Security Model
- **Supabase RLS:** user hanya bisa akses data miliknya (`files`, `share_links`, `audit_logs`)
- **Private storage bucket** + signed URL TTL pendek
- **Token safety:** share token tidak disimpan plaintext (hash)
- **Input validation:** Zod schema untuk payload API
- **Security headers:** CSP, nosniff, referrer policy, dll
- **Rate limiting:** Upstash Redis (serverless-safe)

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
- Vitest (contract/unit tests)
- Upstash Redis (rate limiting)
- GitHub Actions:
  - `cleanup.yml` (scheduled cleanup)
  - `ci.yml` (lint/typecheck/test/build)

---

## Setup Lokal

### 1) Install
```bash
npm install
```

### 2) Buat .env.local

Gunakan template .env.example, lalu isi value.

#### Wajib (local & prod):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Untuk cleanup job (wajib jika memakai endpoint cleanup):

```
CRON_SECRET=
```

#### Opsional (rate limiting / recommended di production):

```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Jika UPSTASH_* tidak diisi, limiter nonaktif (by design).

### 3) Jalankan

```
npm run dev
```

## Supabase: Redirect URLs (penting untuk login)

Di Supabase Auth settings, tambahkan redirect URL berikut:

- Local: `http://localhost:3000/auth/callback`
- Production: `https://sentiva.vercel.app/auth/callback` (atau domain Vercel kamu)

## Database & Migration

Migrations ada di:

- supabase/migrations

Push ke remote:

```
npx supabase@latest link --project-ref <project_ref>
npx supabase@latest db push
```

## CI / Automation

Workflow:

- `.github/workflows/ci.yml`
- `.github/workflows/cleanup.yml`

Secrets untuk cleanup workflow:

- `CLEANUP_URL` (contoh: `https://sentiva.vercel.app/api/maintenance/cleanup`)
- `CRON_SECRET`

## Trade-offs (Why)

- Direct upload dipilih untuk menghindari memory/CPU limit di serverless.
- Signed URL TTL pendek dipilih untuk membatasi risiko kebocoran link.
- Soft delete dipilih agar ada ruang untuk recovery + cleanup batch.