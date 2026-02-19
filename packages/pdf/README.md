# @coloring/pdf

Pakiet generujący PDF z kolorowankami. Każdy obraz trafia na osobną stronę A4.

## Instalacja

Pakiet jest częścią monorepo – dostępny jako `@coloring/pdf` przez `workspace:*`.

## API

### `createPackPdf(options): Promise<Buffer>`

Generuje PDF i zwraca go jako `Buffer`.

#### Parametry

| Pole | Typ | Opis |
|---|---|---|
| `imageBuffers` | `Buffer[]` | Tablica buforów obrazów (PNG lub JPEG) |
| `pageSize` | `"A4"` | Rozmiar strony (na razie tylko A4) |
| `marginPt` | `number` | Margines w punktach typograficznych (1 pt = 1/72 cala) |

#### Zachowanie

- Każdy obraz = 1 strona A4 (595 × 842 pt)
- Obraz jest skalowany proporcjonalnie, aby zmieścił się w obszarze roboczym (A4 minus marginesy)
- Obraz jest centrowany na stronie
- Obsługiwane formaty: **PNG** i **JPEG**

## Przykład użycia

```typescript
import { createPackPdf } from "@coloring/pdf";
import { readFileSync, writeFileSync } from "node:fs";

const imageBuffers = [
  readFileSync("image1.png"),
  readFileSync("image2.jpg"),
];

const pdfBuffer = await createPackPdf({
  imageBuffers,
  pageSize: "A4",
  marginPt: 36, // ~1.27 cm
});

writeFileSync("output.pdf", pdfBuffer);
```

## Zależności

- [`pdf-lib`](https://pdf-lib.js.org/) – generowanie PDF w czystym JavaScript, bez zewnętrznych binariów
