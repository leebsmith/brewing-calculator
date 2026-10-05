# Known-good Method of HTML File Injection With `vite-plugin-html-inject`

## Install the vite, itself as a dependency as well as the `vite-plugin-html-inject`

`npm install vite vite-plugin-html-inject --save-dev`

## Add the following to `vite.config.js`

```
import { defineConfig } from 'vite';
import { injectHTML } from 'vite-plugin-html-inject';

export default defineConfig({
  plugins: [injectHTML()]
});
```

## Set up a partials folder

### Example, from `frontend/`

`mkdir ./src/partials/`

## Use the `<load>` tag where you want the insert

### Example

`<load src="./src/partials/catalog-status.html" />`

## Note

My current Makefile local-dev target includes `&` to push the processes the `npm run dev` and the firestore emulators into the background. The `concurrently` "-k" flag allows `Ctrl+C` to kill everything.

```
local-dev:
	@echo "Starting local emulators and development servers using concurrently..."
	@echo "When finished, access the app at http://localhost:5173"
	npx concurrently -k -p "[{name}]" -n "Vite,Firebase,Backend" -c "cyan,yellow,green" \
		"cd frontend && npm run dev" \
		"npx firebase emulators:start" \
		"cd backend && FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 uv run uvicorn app.main:app --reload --port 8000"
```
