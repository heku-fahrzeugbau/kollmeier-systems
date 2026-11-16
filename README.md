# Kollmeier Systems

Persönliche Website von Robin Kollmeier für CAD-Konstruktion, Automatisierung, 3D-Druck-Beratung und technische KI-Lösungen.

## Entwicklung

```sh
npm install
npm run dev
npm run check
npm run test:visual
```

## Produktion

```sh
npm run build
npm run preview
```

Der statische Build wird in `dist/` erzeugt und bei IONOS bereitgestellt. Die Website basiert auf Astro 7 und Tailwind CSS 4; das Kontaktformular nutzt Web3Forms.

`npm run test:visual` prüft die Startseite sowie die Rechtstexte in einem lokalen Chromium-Browser auf Desktop- und Mobile-Viewports, horizontale Überläufe, JavaScript-Fehler, Navigation und Reduced Motion. Screenshots landen lokal unter `artifacts/visual/` und werden nicht versioniert.
