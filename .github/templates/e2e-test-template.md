## 🚨 Live Test Failure Report

**Workflow:** `$WORKFLOW`
**Run ID:** [$RUN_ID]($SERVER_URL/$REPOSITORY/actions/runs/$RUN_ID)
**Run Number:** `$RUN_NUMBER`
**Triggered By:** `$EVENT_NAME`
**Execution Time (UTC):** `$RUN_DATE`

---

### 🛠️ Job Status
| Job Name | Status | Duration |
|----------|--------|----------|
| Frontend | `$FRONTEND_STATUS` | `$FRONTEND_DURATION` |
| Backend  | `$BACKEND_STATUS`  | `$BACKEND_DURATION`  |

---

### 🌡️ Backend Health Snapshot
Below is the `/health` endpoint response at the time of testing:

```json
$HEALTH_JSON
```

---

### 📄 Logs & Artifacts
- [View Full Workflow Logs]($SERVER_URL/$REPOSITORY/actions/runs/$RUN_ID)
- Download attached artifacts for detailed logs.

---

### 🔍 Suggested Next Steps
1. If the backend health check shows `"status": "Unhealthy"`, investigate failing dependencies first.
2. Review the **log tail** below for immediate clues.
3. Check full logs for stack traces or assertion errors.
4. Re-run the workflow manually to confirm reproducibility.

---
