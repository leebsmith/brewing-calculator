# Production Deployment Commands

Execute the following commands from your project root to deploy the backend container to Google Cloud Run and publish your frontend configuration to Firebase Hosting:

## 1. Deploy Backend to Google Cloud Run
Navigate into the backend directory and build/deploy the FastAPI service as a managed container:
```bash
cd backend
gcloud run deploy batch-brewing-calculator-backend \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated

```

## 2. Deploy Frontend and Hosting Rewrites

Return to the project root and deploy your static assets, cache headers, and Cloud Run API rewrites:

```bash
cd ..
firebase deploy --only hosting

```
