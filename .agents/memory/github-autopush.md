---
name: GitHub auto-push
description: How to push to GitHub after completing any task in this project
---

# GitHub Auto-Push

After completing any task (or at the end of every session), push changes to GitHub.

**Command:**
```bash
bash scripts/push-to-github.sh
```

**Why:** The user explicitly requested that every agent session end with a push to GitHub. The `GITHUB_TOKEN` secret is already configured in Replit Secrets.

**How to apply:** Run the push script as the final step of every task, after all code changes are done and the server builds successfully.

**Remote:** `https://github.com/topazdigital/Latest-Rich` (branch: `main`)

**Manual alternative:**
```bash
git push https://topazdigital:${GITHUB_TOKEN}@github.com/topazdigital/Latest-Rich.git main
```
