## 🚨 Live E2E Test Failure Report

**Workflow:** `$WORKFLOW`  
**Run ID:** [$RUN_ID]($SERVER_URL/$REPOSITORY/actions/runs/$RUN_ID)  
**Run Number:** `$RUN_NUMBER`  
**Triggered By:** `$EVENT_NAME`  
**Execution Time (UTC):** `$RUN_DATE`  
**Targets:** `$TARGETS`

---

## 📋 Target Status Matrix

| Target | Status | Duration | Failed Assertions | Failed Requests |
|--------|--------|----------|-------------------|-----------------|
| Frontend | `$FRONTEND_STATUS` | `$FRONTEND_DURATION` | `$FRONTEND_FAILED_ASSERTIONS` | `$FRONTEND_FAILED_REQUESTS` |
| Backend | `$BACKEND_STATUS` | `$BACKEND_DURATION` | `$BACKEND_FAILED_ASSERTIONS` | `$BACKEND_FAILED_REQUESTS` |
| CV | `$CV_STATUS` | `$CV_DURATION` | `$CV_FAILED_ASSERTIONS` | `$CV_FAILED_REQUESTS` |

---

## 📊 Newman Result Highlights

### Frontend
$FRONTEND_NEWMAN_SUMMARY

### Backend
$BACKEND_NEWMAN_SUMMARY

### CV
$CV_NEWMAN_SUMMARY

---

## 🔬 Failure Analysis

### Frontend Breakdown
- Client errors (4xx): `$FRONTEND_CLIENT_ERRORS`
- Server errors (5xx): `$FRONTEND_SERVER_ERRORS`
- Timeouts: `$FRONTEND_TIMEOUTS`
- Assertion failures: `$FRONTEND_ASSERTION_FAILURES`
- Other: `$FRONTEND_OTHER_FAILURES`

### Backend Breakdown
- Client errors (4xx): `$BACKEND_CLIENT_ERRORS`
- Server errors (5xx): `$BACKEND_SERVER_ERRORS`
- Timeouts: `$BACKEND_TIMEOUTS`
- Assertion failures: `$BACKEND_ASSERTION_FAILURES`
- Other: `$BACKEND_OTHER_FAILURES`

### CV Breakdown
- Client errors (4xx): `$CV_CLIENT_ERRORS`
- Server errors (5xx): `$CV_SERVER_ERRORS`
- Timeouts: `$CV_TIMEOUTS`
- Assertion failures: `$CV_ASSERTION_FAILURES`
- Other: `$CV_OTHER_FAILURES`

---

## 🏥 Backend Health Snapshot

```json
$HEALTH_JSON
```

---

## 📝 Assertion Summaries

$ASSERTION_SUMMARIES

---

## 📄 Log Tails

### Frontend
```text
$FRONTEND_LOG_TAIL
```

### Backend
```text
$BACKEND_LOG_TAIL
```

### CV
```text
$CV_LOG_TAIL
```

---

## 📦 Artifacts
- [View Workflow Logs and Artifacts]($SERVER_URL/$REPOSITORY/actions/runs/$RUN_ID)
- Newman JSON reports: `newman-*.json`
- JUnit reports: `newman-*.xml`
- Status summaries: `newman-*-summary.md`

---

## 🔍 Suggested Next Steps
1. Prioritize targets in `failure` or `unknown` state from the status matrix.
2. Validate backend health first; infrastructure failures can cascade into all targets.
3. Compare failed assertions with historical flaky routes before escalating.
4. Re-run the workflow with the same targets to confirm deterministic failure.
5. Reproduce locally using `node scripts/test-e2e.ts <target>` and matching environment profile.
