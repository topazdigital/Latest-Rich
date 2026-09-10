---
name: Artifact preview ports
description: Non-obvious preview behavior for generated web artifacts and screenshot verification
---

Generated artifact web workflows can expose Vite on an internal port such as 19060 even when the project-level preview mapping references port 5000. Use the running workflow's reported port for local screenshot verification rather than assuming 5000.

**Why:** The screenshot helper targets port 5000 by default, which can fail with connection refused while the artifact workflow is healthy on its actual internal port.

**How to apply:** Check the workflow logs after restarting a generated artifact and pass the reported local port to app preview checks.

Generated artifact API workflows may share the main API's configured port and cannot run concurrently; keep the primary API workflow active when the duplicate artifact API reports EADDRINUSE.

**Why:** The generated API workflow can build successfully and then fail only when it tries to bind the same 8080 port already held by the primary API workflow.

**How to apply:** Treat the primary API workflow as authoritative for app verification; restart the duplicate only when the primary is stopped or its port mapping is intentionally changed.