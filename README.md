# Skull King Project

## Projektaufbau

Das Projekt besteht aus zwei Hauptkomponenten:

1. **Frontend** (Angular):
   - Speicherort: `frontend/`
   - Enthält den Angular-Code für die Benutzeroberfläche.
   - Produktions-Build wird in `dist/skullking/browser/` erstellt.

2. **Backend** (Express.js):
   - Speicherort: `backend/`
   - Stellt die Angular-App bereit und bietet API-Endpunkte.
   - Hauptdatei: `server.js`

Zusätzlich wird das Projekt mit Docker orchestriert, um eine einfache Bereitstellung zu ermöglichen.

## Voraussetzungen

- Installiertes Docker und Docker Compose
- Node.js (falls Änderungen am Code vorgenommen werden sollen)

## Befehle

### Entwicklung

1. **Frontend lokal starten:**
   ```bash
   cd frontend
   npm install
   npm start
   ```
   Die Anwendung ist unter `http://localhost:4200` erreichbar.

2. **Backend lokal starten:**
   ```bash
   cd backend
   npm install
   node server.js
   ```
   Das Backend ist unter `http://localhost:3000` erreichbar.

### Produktion mit Docker

1. **Build und Starten der Anwendung:**
   ```bash
   docker compose up -d --build
   ```
   Die Anwendung ist unter `http://localhost:3000` erreichbar.

2. **Container stoppen:**
   ```bash
   docker compose down
   ```

## API-Endpunkte

Das Backend bietet API-Endpunkte unter dem Präfix `/api`. Beispiel:

- **Gesundheitsprüfung:**
  ```
  GET /api/health
  ```
  Antwort: `{ "status": "ok" }`

## Ordnerstruktur

```
.
├── backend/               # Express.js Backend
│   ├── server.js          # Hauptserverdatei
│   ├── package.json       # Backend-Abhängigkeiten
│   └── Dockerfile         # Multi-Stage Dockerfile
├── frontend/              # Angular Frontend
│   ├── src/               # Quellcode
│   ├── angular.json       # Angular-Konfiguration
│   └── package.json       # Frontend-Abhängigkeiten
├── docker-compose.yml     # Docker Compose Konfiguration
└── README.md              # Projektbeschreibung
```

## Hinweise

- Änderungen am Frontend erfordern einen neuen Build, bevor sie im Docker-Container sichtbar sind.
- API-Routen können in `backend/server.js` hinzugefügt werden.

