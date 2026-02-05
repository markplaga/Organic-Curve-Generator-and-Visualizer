# Publishing to GitHub

This guide explains how to publish the **Organic Curve Generator** project to GitHub and optionally host it live using GitHub Pages.

---

## Prerequisites

1. **Git installed** on your machine
   - Check: `git --version`
   - Install: https://git-scm.com/downloads

2. **GitHub account**
   - Sign up at https://github.com

---

## Step 1: Initialize Git Repository

Open Terminal, navigate to the project folder, and run:

```bash
cd /Users/markplaga/Documents/Art-Creator-1-part2
git init
```

## Step 2: Create a .gitignore File (Optional)

Create a `.gitignore` to exclude unnecessary files:

```bash
echo ".DS_Store" > .gitignore
```

## Step 3: Stage and Commit Your Files

```bash
git add .
git commit -m "Initial commit: Organic Curve Generator"
```

## Step 4: Create a GitHub Repository

1. Go to https://github.com/new
2. Enter a repository name (e.g., `organic-curve-generator`)
3. Choose **Public** or **Private**
4. **Do NOT** initialize with README, .gitignore, or license (we already have files)
5. Click **Create repository**

## Step 5: Connect Local Repo to GitHub

After creating the repo, GitHub will show commands. Run these (replace with your username and repo name):

```bash
git remote add origin https://github.com/YOUR_USERNAME/organic-curve-generator.git
git branch -M main
git push -u origin main
```

> **Note**: You may be prompted to authenticate. Use a [Personal Access Token](https://github.com/settings/tokens) or GitHub CLI for authentication.

---

## Hosting with GitHub Pages (Free Live Website)

Since this is a static HTML/CSS/JS project, you can host it for free on GitHub Pages.

### Option A: Deploy from `main` branch

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under "Source", select **Deploy from a branch**
4. Choose **main** branch and **/ (root)** folder
5. Click **Save**
6. Wait 1-2 minutes, then your site will be live at:
   ```
   https://YOUR_USERNAME.github.io/organic-curve-generator/
   ```

### Option B: Use GitHub Actions (Advanced)

For more control, you can use GitHub Actions to deploy. This is useful if you add a build step later.

---

## Updating Your Published Site

After making changes locally:

```bash
git add .
git commit -m "Description of changes"
git push
```

GitHub Pages will automatically redeploy within 1-2 minutes.

---

## Quick Reference

| Action | Command |
|--------|---------|
| Check status | `git status` |
| View commit history | `git log --oneline` |
| Pull latest changes | `git pull` |
| Push changes | `git push` |

---

## Troubleshooting

### "Permission denied" error
- Use HTTPS with a Personal Access Token, or set up SSH keys
- Guide: https://docs.github.com/en/authentication

### GitHub Pages not updating
- Check the **Actions** tab for deployment status
- Hard refresh browser (Cmd+Shift+R on Mac)

### Three.js not loading on GitHub Pages
- This project uses CDN imports, so it should work automatically
- Ensure your `index.html` has the correct import map pointing to unpkg.com

---

## Project Structure for Reference

```
Art-Creator-1-part2/
├── index.html          # Main HTML file
├── style.css           # Styles
├── js/
│   ├── main.js         # Main application logic
│   ├── state.js        # State management
│   ├── math.js         # Geometry calculations
│   ├── view3d.js       # Three.js 3D rendering
│   └── export.js       # SVG export functionality
├── PROJECT_STATE.md    # Project documentation
├── TECHNOLOGY_STACK.md # Tech stack info
└── PUBLISHING.md       # This file
```
