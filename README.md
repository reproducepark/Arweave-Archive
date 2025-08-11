### arweave-archive

A service that captures a full-page screenshot of a webpage at a specific point in time, stores it permanently on Arweave, and lets you search/retrieve it by URL. Users pay the storage fee directly on Polygon via their wallet provider, and uploads are handled by Irys. The MATIC paid by the user on Polygon is converted by Irys into the appropriate AR to fund storage on Arweave.

## How It Works

### Archiving Pipeline
1) The user enters a URL and clicks “Archive”.
2) The frontend sends `POST /api/capture` → Playwright generates a full-page JPEG screenshot and returns metadata.
3) The frontend calls Irys SDK `getPrice(bytes)` → shows the estimated cost and asks for confirmation.
4) The user approves payment with their wallet (`fund`), then the app performs the `upload`.
5) The app receives an Arweave transaction ID (`txId`) → provides a permanent link `https://arweave.net/{txId}`.

### Search and Retrieval Pipeline
1) Enter the same URL and click “Search”.
2) Query Arweave GraphQL by the `Original-URL` tag, sorted by latest first.
3) Click a result to view the image at `https://arweave.net/{txId}`.

### Tag Schema (Arweave)
- `Content-Type`: `image/jpeg`
- `App-Name`: `arweave-archive`
- `Original-URL`: normalized original URL
- `Url-Hash`: `SHA-256(Original-URL)`
- `Captured-At`: ISO 8601 timestamp
- `Page-Title`: page title at capture time

## Quick Start

### Installation/Run
```bash
npm ci
npm run dev
# production build/run
npm run build
npm start
```