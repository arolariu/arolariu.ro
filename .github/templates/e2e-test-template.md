## 🚨 Live Test Failure Report

**Workflow:** `${{ github.workflow }}`
**Run ID:** [${{ github.run_id }}](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})
**Run Number:** `${{ github.run_number }}`
**Triggered By:** `${{ github.event_name }}`
**Execution Time (UTC):** `${{ steps.date.outputs.datetime }}`

---

### 🛠️ Job Status
| Job Name   | Status   | Duration |
|------------|----------|----------|
| Frontend   | `${{ needs.frontend.result }}` | `${{ needs.frontend.outputs.duration }}` |
| Backend    | `${{ needs.backend.result }}`  | `${{ needs.backend.outputs.duration }}`  |

---

### 🌡️ Backend Health Snapshot
Below is the `/health` endpoint response at the time of testing:

\`\`\`json
${{ steps.health.outputs.json }}
\`\`\`

---

### 📄 Logs & Artifacts
- [View Full Workflow Logs](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})
- Download attached artifacts for detailed logs.

---

### 🔍 Suggested Next Steps
1. If the backend health check shows `"status": "Unhealthy"`, investigate failing dependencies first.
2. Review the **log tail** below for immediate clues.
3. Check full logs for stack traces or assertion errors.
4. Re‑run the workflow manually to confirm reproducibility.

---
