# Sempai AI Visibility Report Generator

Generator raportu widoczności AI dla agencji **[Sempai](https://sempai.pl)**.

## Co robi?

Narzędzie do analizy widoczności marki w odpowiedziach AI (Google AI Overviews, ChatGPT, Perplexity, Copilot). Umożliwia:

- Import danych CSV per platforma AI
- Wizualizację AI Share of Voice, Brand Mentions, Citation Score
- Animowany AI Signal Scanner
- Automatyczne spostrzeżenia analityczne
- Generowanie gotowego promptu do analizy raportu w Claude / ChatGPT

## Stack

- **React 18** + **Vite**
- **Recharts** — wykresy
- Canvas API — animacje

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Otwórz [http://localhost:5173/sempai-ai-visibility/](http://localhost:5173/sempai-ai-visibility/)

## Deploy na GitHub Pages

1. Wgraj repo na GitHub
2. W ustawieniach repo: **Settings → Pages → Source: GitHub Actions**
3. Każdy push na `main` automatycznie deployuje aplikację

**Ważne:** w `vite.config.js` zmień `base` na nazwę swojego repozytorium:
```js
base: '/NAZWA-TWOJEGO-REPO/',
```

## Format CSV

```csv
query,brand_mentioned,brand_cited,comp1_mentioned,comp1_cited,comp2_mentioned,comp2_cited
best crm software,1,1,1,0,0,0
top marketing tools,1,0,1,1,1,0
```

---

© Sempai · Let us perform!
