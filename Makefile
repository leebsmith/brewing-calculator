# --- Variables ---
# Google Cloud Project ID. Ensure this is set correctly.
PROJECT_ID := batch-brewing-calculator

# Cloud Run service name and region for deployment.
CLOUD_RUN_SERVICE := batch-brewing-calculator-backend
CLOUD_RUN_REGION := us-east4

# Frontend build output directory (matches vite.config.js).
FRONTEND_PUBLIC_DIR := public

.PHONY: local local-dev clean deploy deploy-backend deploy-frontend destroy

# Target to start local emulators and development servers using concurrently
local-dev:
	@echo "Starting local emulators and development servers with concurrently..."
	@echo "When finished, access the app at http://localhost:5173"
	@./frontend/node_modules/.bin/concurrently \
	  --names "VITE,FIREBASE,UV" \
	  --prefix-colors "blue,yellow,green" \
	  "cd frontend && npx vite dev" \
	  "npx firebase emulators:start" \
	  "cd backend && uv run uvicorn app.main:app --reload --port 8000"

# Target to clean up local environment: stop processes and close ports.
clean:
	@echo "Cleaning up local environment..."
	@echo "Stopping Firebase emulators and other local services..."
	@pkill -f 'firebase emulators:start' || true
	@pkill -f 'vite dev' || true
	@pkill -f 'uvicorn app.main:app' || true
	@echo "Ports reclaimed."

deploy: deploy-backend deploy-frontend

deploy-backend:
	@echo "Exporting uv dependencies for Cloud Buildpacks..."
	cd backend && uv pip compile pyproject.toml -o requirements.txt
	@echo "Deploying backend to Cloud Run via Buildpacks..."
	gcloud run deploy $(CLOUD_RUN_SERVICE) \
		--source backend/ \
		--region $(CLOUD_RUN_REGION) \
		--project $(PROJECT_ID) \
		--allow-unauthenticated

deploy-frontend:
	@echo "Building frontend..."
	cd frontend && npx vite build
	@echo "Deploying frontend to Firebase Hosting..."
	npx firebase deploy --only hosting --project $(PROJECT_ID)

destroy:
	@echo "Destroying Cloud Run service..."
	gcloud run services delete $(CLOUD_RUN_SERVICE) \
		--region $(CLOUD_RUN_REGION) \
		--project $(PROJECT_ID) \
		--quiet
	@echo "Disabling Firebase Hosting..."
	npx firebase hosting:disable --project $(PROJECT_ID) --force
