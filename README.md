# Coloring Portal

Monorepo (pnpm workspaces) z portalem kolorowanek.

## Struktura

```
apps/
  web/      – Next.js 16 (port 3000)
  worker/   – BullMQ worker generujący PDF
packages/
  db/       – Prisma + PostgreSQL
  pdf/      – generowanie PDF (pdf-lib)
infra/
  docker-compose.yml  – PostgreSQL 16 + Redis 7
```

---

## PDF Pack Generator (DEV)

### 1. Uruchom infrastrukturę (PostgreSQL + Redis)

```bash
docker compose -f infra/docker-compose.yml up -d
```

### 2. Zainstaluj zależności

```bash
pnpm install
```

### 3. Skonfiguruj zmienne środowiskowe

```bash
# packages/db – już zawiera .env z domyślnymi wartościami
# apps/web
copy apps\web\.env.example apps\web\.env.local
# apps/worker
copy apps\worker\.env.example apps\worker\.env
```

### 4. Zsynchronizuj schemat bazy i załaduj dane

```bash
# Synchronizacja schematu (bez historii migracji)
pnpm --filter @coloring/db db:push

# Seed – 6 przykładowych kolorowanek
pnpm --filter @coloring/db seed
```

### 5. Uruchom aplikację

**Opcja A – wszystko naraz (web + worker równolegle):**

```bash
pnpm dev:all
```

**Opcja B – osobne terminale:**

```bash
# Terminal 1 – frontend
pnpm --filter web dev

# Terminal 2 – worker
pnpm --filter worker dev
```

Adresy:
- Frontend: http://localhost:3000
- Worker nasłuchuje na kolejce BullMQ `pdf-pack`

---

### 6. Test end-to-end

1. Otwórz http://localhost:3000/pl
2. Kliknij **"Dodaj do paczki"** przy co najmniej 2 kolorowankach
3. Przejdź do **Paczki** (ikona koszyka) lub http://localhost:3000/pl/pack
4. Kliknij **"Generuj PDF (N)"**
5. Obserwuj zmieniający się status: `PENDING` → `PROCESSING` → `DONE`
6. Kliknij zielony przycisk **"Pobierz PDF"**
7. Plik PDF jest też dostępny bezpośrednio pod:
   ```
   http://localhost:3000/generated/{jobId}.pdf
   ```
   oraz zapisany lokalnie w `apps/web/public/generated/{jobId}.pdf`

---

## Skrypty (root)

| Skrypt | Opis |
|---|---|
| `pnpm dev` | Uruchamia wszystkie pakiety (`-r dev`) |
| `pnpm dev:all` | Uruchamia web + worker równolegle |
| `pnpm build` | Buduje wszystkie pakiety |
| `pnpm lint` | Lintuje wszystkie pakiety |
| `pnpm --filter @coloring/db db:push` | Synchronizuje schemat Prisma z bazą |
| `pnpm --filter @coloring/db seed` | Ładuje przykładowe dane |
| `pnpm --filter @coloring/db studio` | Otwiera Prisma Studio |
