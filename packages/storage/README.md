# @coloring/storage

Klient Cloudflare R2 kompatybilny z S3 (AWS SDK v3).

## Instalacja

Pakiet jest częścią monorepo – nie wymaga osobnej instalacji.  
Dodaj jako zależność workspace w docelowym pakiecie:

```json
"dependencies": {
  "@coloring/storage": "workspace:*"
}
```

## Konfiguracja

Skopiuj `.env.example` do `.env` i uzupełnij wartości:

```bash
cp packages/storage/.env.example .env
```

| Zmienna              | Opis                                                                 |
|----------------------|----------------------------------------------------------------------|
| `R2_ENDPOINT`        | URL endpointu S3 API R2: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID`   | Access Key ID z tokenu API R2                                        |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key z tokenu API R2                                  |
| `R2_BUCKET`          | Nazwa bucketu R2                                                     |
| `R2_PUBLIC_BASE_URL` | Publiczny base URL bucketu (bez trailing slash)                      |

### Jak uzyskać dane dostępowe

1. Zaloguj się do [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Przejdź do **R2 Object Storage** → wybierz bucket
3. Kliknij **Settings** → **S3 API** – skopiuj endpoint
4. Przejdź do **Manage R2 API Tokens** → **Create API Token**
5. Ustaw uprawnienia: `Object Read & Write` dla wybranego bucketu
6. Skopiuj `Access Key ID` i `Secret Access Key`
7. Publiczny URL: włącz **Public Access** na buckecie lub skonfiguruj własną domenę

## API

```typescript
import { uploadBuffer, deleteObject, getPublicUrl } from "@coloring/storage";
```

### `uploadBuffer(key, buffer, contentType): Promise<string>`

Wgrywa `Buffer` do R2 pod podanym kluczem.  
Zwraca publiczny URL wgranego obiektu.

```typescript
const url = await uploadBuffer(
  "pdfs/my-pack.pdf",
  pdfBuffer,
  "application/pdf"
);
// → "https://pub-<hash>.r2.dev/pdfs/my-pack.pdf"
```

### `deleteObject(key): Promise<void>`

Usuwa obiekt z R2 o podanym kluczu.

```typescript
await deleteObject("pdfs/my-pack.pdf");
```

### `getPublicUrl(key): string`

Zwraca publiczny URL dla klucza **bez** wykonywania żadnego żądania sieciowego.

```typescript
const url = getPublicUrl("pdfs/my-pack.pdf");
// → "https://pub-<hash>.r2.dev/pdfs/my-pack.pdf"
```

## Uwagi

- Klient S3 jest tworzony leniwie (przy pierwszym wywołaniu) i cachowany jako singleton w procesie.
- Wszystkie zmienne środowiskowe są walidowane przy pierwszym użyciu – brak zmiennej rzuca `Error` z czytelnym komunikatem.
- `region` jest ustawiony na `"auto"` zgodnie z wymaganiami Cloudflare R2.
- `forcePathStyle: false` – wymagane dla R2 (virtual-hosted style).
