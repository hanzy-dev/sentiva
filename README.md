# Sentiva — Secure File Vault (Next.js + Supabase)

[![Cleanup (Sentiva)](https://github.com/hanzy-dev/sentiva/actions/workflows/cleanup.yml/badge.svg)](https://github.com/hanzy-dev/sentiva/actions/workflows/cleanup.yml)
[![CI (Sentiva)](https://github.com/hanzy-dev/sentiva/actions/workflows/ci.yml/badge.svg)](https://github.com/hanzy-dev/sentiva/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)

**Sentiva** adalah *private file vault* untuk menyimpan dan berbagi file secara aman.

Fokus project ini: pola yang umum dipakai di production — **direct-to-storage upload (LFA)**, **signed URL**, **one-time / expiring share link (atomic via DB RPC)**, **RLS**, **security headers**, **observability (correlation id + structured logs)**, **rate limiting**, dan **cleanup job** untuk mencegah *cloud shock*.

🌐 **Demo:** https://sentiva.vercel.app

---

## Engineering Decisions (Why I built it this way)

- **Bye-bye Payload Bottleneck**  
  Server nggak bakal “sesak napas” karena upload file besar. Upload dilakukan **direct-to-bucket** (data plane), server cuma ngurus validasi & metadata (control plane).

- **Zero-Trust Access**  
  Nggak ada file yang kebuka publik. Akses selalu lewat **RLS** dan URL aksesnya berupa **signed URL** dengan TTL pendek.

- **Race-Condition Proof**  
  Logika **one-time link** dibikin bulletproof di level database (RPC) supaya nggak bisa dieksploitasi lewat request paralel.

- **Automated Housekeeping**  
  Menghindari “Cloud Shock” dengan rutin beresin file sampah (soft-deleted) lewat **cleanup endpoint** + **GitHub Actions cron**.

- **Built for Debugging**  
  Logs sudah terstruktur. Kalau ada error, tracing gampang karena ada **correlation ID** di setiap request.

---

## Proof (CI + Tests)

Project ini punya **CI** di GitHub Actions yang menjalankan: **lint → typecheck → test → build**.

High-signal tests (Vitest):
- **One-time share link contract:** request pertama ke `/s/:token` redirect (302), request kedua jadi **404** (netral).
- **Request ID propagation:** `/s/:token` meneruskan `p_request_id` ke RPC untuk audit trail.
- **Upload commit idempotency contract:** saat insert metadata gagal (mis. duplicate), `/api/uploads/commit` fallback mengambil row existing → **tidak membuat metadata dobel**.

E2E tests (Playwright):
- **Smoke tests:** home/login/health/vault redirect.
- **Share link contract:** one-time link 302 lalu 404 (menggunakan object storage yang memang ada untuk stabilitas).

---

## Status Implementasi ✅

- Login Google (Supabase Auth)
- Upload file (direct-to-storage)
- Multi-file upload + UX progress (simulated)
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
   Verifikasi object di storage + simpan metadata ke tabel `files` + audit log (**idempotent**).

> Ini sengaja untuk menghindari limit memory serverless saat upload file besar.

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
- Playwright (E2E tests)
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

#### Wajib (local & prod)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Untuk cleanup job (wajib jika memakai endpoint cleanup)

```
CRON_SECRET=
```

#### Opsional (rate limiting / recommended di production)

```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Jika UPSTASH_* tidak diisi, limiter nonaktif (by design).

### 3) Jalankan

```bash
npm run dev
```

## Supabase: Redirect URLs (penting untuk login)

Di Supabase Auth settings, tambahkan redirect URL berikut:

Local: `http://localhost:3000/auth/callback`

Production: `https://sentiva.vercel.app/auth/callback` (atau domain Vercel kamu)

Database & Migration

## Migrations ada di:

- `supabase/migrations`

Push ke remote:

```
npx supabase@latest link --project-ref <project_ref>
npx supabase@latest db push
```

## E2E (Playwright)
### Env untuk E2E

Copy `.env.e2e.example` → `.env.e2e.local`, lalu isi:

- `E2E_EXISTING_BUCKET`
- `E2E_EXISTING_OBJECT_PATH`
- `E2E_OWNER_ID`

Nilai ini harus menunjuk ke object storage yang benar-benar ada, supaya test share link stabil (first hit dapat 302 signed URL).

### Run

```bash
npm run test:e2e
```

Lihat report:

```bash
npx playwright show-report
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