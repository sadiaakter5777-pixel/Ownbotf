# Netlify Deployment Instructions

This project is ready to be deployed on Netlify.

## Steps to Deploy

1.  **Push to GitHub/GitLab/Bitbucket:**
    Ensure your project is pushed to a remote repository.

2.  **Connect to Netlify:**
    -   Log in to [Netlify](https://app.netlify.com/).
    -   Click **"Add new site"** -> **"Import an existing project"**.
    -   Select your repository.

3.  **Build Settings:**
    Netlify should automatically detect the settings from `netlify.toml`:
    -   **Build command:** `npm run build`
    -   **Publish directory:** `dist`

4.  **Environment Variables:**
    You **MUST** set the following environment variable in the Netlify dashboard (**Site settings** -> **Environment variables**):
    -   `OPENROUTER_API_KEY`: Your OpenRouter API Key (e.g., `sk-or-v1-...`).

5.  **Firebase Authorized Domains (CRITICAL):**
    For Authentication to work on Netlify, you MUST add your Netlify URL to Firebase:
    -   Go to [Firebase Console](https://console.firebase.google.com/).
    -   Select your project.
    -   Go to **Authentication** -> **Settings** -> **Authorized domains**.
    -   Click **"Add domain"** and enter your Netlify site URL (e.g., `your-site.netlify.app`).

7.  **API Key Restrictions (If applicable):**
    If you have restricted your Firebase API Key in the Google Cloud Console:
    -   Go to [Google Cloud Console](https://console.cloud.google.com/).
    -   Go to **APIs & Services** -> **Credentials**.
    -   Edit your API Key.
    -   Under **Website restrictions**, add your Netlify URL.

8.  **Deploy:**
    Click **"Deploy site"**.

## SPA Routing
The project includes a `public/_redirects` file and `netlify.toml` configuration to handle Single Page Application (SPA) routing. This ensures that refreshing the page or navigating to sub-routes works correctly.
