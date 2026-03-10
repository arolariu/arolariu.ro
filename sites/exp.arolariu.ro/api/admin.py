"""Admin UI for viewing and editing the in-memory config snapshot."""

from __future__ import annotations

import base64
import json
import logging
import os

from fastapi import APIRouter, Header, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse

from config.loader import get_config, update_config_value
from config.settings import get_runtime_infra_mode

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_infra_mode() -> str:
    return get_runtime_infra_mode()


def _get_tenant_id() -> str:
    return os.getenv("AZURE_TENANT_ID", "") or os.getenv("WEBSITE_AUTH_AAD_ALLOWED_TENANTS", "")


def _get_client_id() -> str:
    """Return the Entra App Registration client ID for MSAL popup login.

    Checks EXP_ENTRA_APP_CLIENT_ID first, then falls back to the Easy Auth
    provider's client ID (MICROSOFT_PROVIDER_AUTHENTICATION_CLIENT_ID) which
    is auto-set by App Service when Easy Auth is configured.
    """
    return (
        os.getenv("EXP_ENTRA_APP_CLIENT_ID", "")
        or os.getenv("MICROSOFT_PROVIDER_AUTHENTICATION_CLIENT_ID", "")
    )


def _is_azure_mode() -> bool:
    return _get_infra_mode() == "azure"


def _verify_admin_token(authorization: str | None) -> bool:
    """Lightweight tenant-ID check on a Bearer JWT for Azure mode.

    This is intentionally *not* a production-grade validation — it only
    decodes the JWT payload (without signature verification) and checks
    that the ``tid`` claim matches the configured tenant.  It exists as a
    simple guard for internal admin tooling.
    """

    if not authorization or not authorization.startswith("Bearer "):
        return False

    token = authorization.removeprefix("Bearer ").strip()
    try:
        # JWT is three base64url segments separated by dots.
        payload_segment = token.split(".")[1]
        # Add padding so base64 doesn't complain.
        padding = 4 - len(payload_segment) % 4
        if padding != 4:
            payload_segment += "=" * padding
        decoded = base64.urlsafe_b64decode(payload_segment)
        claims = json.loads(decoded)
    except Exception:
        return False

    expected_tid = _get_tenant_id()
    if not expected_tid:
        logger.warning("AZURE_TENANT_ID not set — rejecting admin request")
        return False

    return claims.get("tid") == expected_tid


def _require_auth(authorization: str | None) -> JSONResponse | None:
    """Return a 401 JSONResponse if auth fails in Azure mode, else ``None``."""

    if not _is_azure_mode():
        return None

    if not _verify_admin_token(authorization):
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    return None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/admin", response_class=HTMLResponse)
def admin_page() -> HTMLResponse:
    """Serve the single-page admin UI."""

    infra = _get_infra_mode()
    client_id = _get_client_id()
    tenant_id = _get_tenant_id()

    html = _build_admin_html(infra=infra, client_id=client_id, tenant_id=tenant_id)
    return HTMLResponse(content=html)


@router.get("/admin/api/config")
def admin_get_config(
    authorization: str | None = Header(default=None),
) -> Response:
    """Return all config keys and values as JSON."""

    auth_error = _require_auth(authorization)
    if auth_error is not None:
        return auth_error

    snapshot = get_config()
    return JSONResponse(snapshot)


@router.put("/admin/api/config/{key:path}")
async def admin_put_config(
    key: str,
    request: Request,
    authorization: str | None = Header(default=None),
) -> Response:
    """Update a single config value in the in-memory snapshot."""

    auth_error = _require_auth(authorization)
    if auth_error is not None:
        return auth_error

    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)

    value = body.get("value")
    if value is None:
        return JSONResponse({"error": "Missing 'value' field"}, status_code=400)

    existed = update_config_value(key, str(value))
    status = 200 if existed else 201
    return JSONResponse({"key": key, "value": str(value), "existed": existed}, status_code=status)


# ---------------------------------------------------------------------------
# HTML builder
# ---------------------------------------------------------------------------


def _build_admin_html(*, infra: str, client_id: str, tenant_id: str) -> str:
    is_azure = infra == "azure"
    auth_label = "MSAL (Entra ID)" if is_azure else "None (open)"

    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>exp admin</title>
<style>
*,*::before,*::after{{box-sizing:border-box}}
body{{
  margin:0;padding:0;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,sans-serif;
  background:#0d1117;color:#c9d1d9;
}}
.header{{
  background:#161b22;border-bottom:1px solid #30363d;
  padding:16px 24px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;
}}
.header h1{{margin:0;font-size:18px;color:#58a6ff}}
.badge{{
  display:inline-block;padding:2px 8px;border-radius:12px;font-size:12px;
  font-weight:600;text-transform:uppercase;
}}
.badge-local{{background:#238636;color:#fff}}
.badge-azure{{background:#1f6feb;color:#fff}}
.badge-auth{{background:#30363d;color:#8b949e}}
.toolbar{{
  padding:12px 24px;display:flex;gap:8px;align-items:center;
  border-bottom:1px solid #21262d;background:#0d1117;
}}
.btn{{
  padding:6px 14px;border:1px solid #30363d;border-radius:6px;
  background:#21262d;color:#c9d1d9;cursor:pointer;font-size:13px;
  transition:background .15s;
}}
.btn:hover{{background:#30363d}}
.btn-primary{{background:#238636;border-color:#238636;color:#fff}}
.btn-primary:hover{{background:#2ea043}}
.btn-signin{{background:#1f6feb;border-color:#1f6feb;color:#fff}}
.btn-signin:hover{{background:#388bfd}}
#user-info{{font-size:13px;color:#8b949e;margin-left:auto}}

.container{{padding:16px 24px}}
table{{
  width:100%;border-collapse:collapse;
  font-size:13px;table-layout:fixed;
}}
th{{
  text-align:left;padding:8px 12px;
  background:#161b22;border-bottom:2px solid #30363d;
  color:#8b949e;font-weight:600;position:sticky;top:0;
}}
td{{
  padding:6px 12px;border-bottom:1px solid #21262d;
  vertical-align:middle;
}}
.col-key{{width:40%}}
.col-val{{width:45%}}
.col-act{{width:15%;text-align:right}}
tr:hover td{{background:#161b22}}
.key-cell{{
  font-family:'Cascadia Code','Fira Code',Consolas,monospace;
  font-size:12px;color:#79c0ff;word-break:break-all;
}}
.val-input{{
  width:100%;padding:4px 8px;border:1px solid #30363d;border-radius:4px;
  background:#0d1117;color:#c9d1d9;
  font-family:'Cascadia Code','Fira Code',Consolas,monospace;
  font-size:12px;
}}
.val-input:focus{{border-color:#58a6ff;outline:none;box-shadow:0 0 0 2px rgba(88,166,255,.3)}}

/* Toggle switch for feature flags */
.toggle{{position:relative;display:inline-block;width:42px;height:22px}}
.toggle input{{opacity:0;width:0;height:0}}
.slider{{
  position:absolute;cursor:pointer;inset:0;
  background:#30363d;border-radius:22px;transition:.2s;
}}
.slider::before{{
  content:'';position:absolute;height:16px;width:16px;left:3px;bottom:3px;
  background:#c9d1d9;border-radius:50%;transition:.2s;
}}
input:checked+.slider{{background:#238636}}
input:checked+.slider::before{{transform:translateX(20px)}}

/* Flash feedback */
@keyframes flash-green{{0%{{background:#238636}}100%{{background:transparent}}}}
@keyframes flash-red{{0%{{background:#da3633}}100%{{background:transparent}}}}
.flash-ok{{animation:flash-green .6s ease-out}}
.flash-err{{animation:flash-red .6s ease-out}}

.empty{{text-align:center;padding:40px;color:#484f58}}
.search-box{{
  padding:6px 12px;border:1px solid #30363d;border-radius:6px;
  background:#0d1117;color:#c9d1d9;font-size:13px;width:260px;
}}
.search-box:focus{{border-color:#58a6ff;outline:none}}
.count{{font-size:12px;color:#484f58}}
</style>
</head>
<body>
<div class="header">
  <h1>exp.arolariu.ro — admin</h1>
  <span class="badge {"badge-azure" if is_azure else "badge-local"}">{infra}</span>
  <span class="badge badge-auth">auth: {auth_label}</span>
</div>
<div class="toolbar">
  <button class="btn btn-primary" onclick="refreshConfig()" id="btn-refresh">&#x21bb; Refresh</button>
  <input class="search-box" type="text" id="search" placeholder="Filter keys\u2026" oninput="filterRows()" />
  <span class="count" id="count"></span>
  {"<button class='btn btn-signin' id='btn-signin' onclick='signIn()'>Sign In</button>" if is_azure else ""}
  <span id="user-info"></span>
</div>
<div class="container">
  <table>
    <thead><tr>
      <th class="col-key">Key</th>
      <th class="col-val">Value</th>
      <th class="col-act"></th>
    </tr></thead>
    <tbody id="config-body">
      <tr><td colspan="3" class="empty">Loading\u2026</td></tr>
    </tbody>
  </table>
</div>

{"<script src='https://alcdn.msauth.net/browser/2.38.0/js/msal-browser.min.js'></script>" if is_azure else ""}
<script>
(function() {{
  "use strict";

  const INFRA = "{infra}";
  const IS_AZURE = INFRA === "azure";
  const CLIENT_ID = "{client_id}";
  const TENANT_ID = "{tenant_id}";
  const AUTHORITY = "https://login.microsoftonline.com/" + TENANT_ID;

  let accessToken = null;
  let msalInstance = null;

  // Feature-flag key detection
  function isFeatureFlag(key) {{
    return key.startsWith("FeatureManagement:") || key.startsWith(".appconfig.featureflag/");
  }}

  function featureFlagEnabled(value) {{
    if (!value) return false;
    const lower = value.trim().toLowerCase();
    if (lower === "true" || lower === "1" || lower === "yes") return true;
    if (lower === "false" || lower === "0" || lower === "no") return false;
    // Try JSON payload (Azure App Configuration format)
    try {{
      const obj = JSON.parse(value);
      return Boolean(obj.enabled);
    }} catch (_) {{
      return false;
    }}
  }}

  // ---- MSAL ----
  if (IS_AZURE && typeof msal !== "undefined" && CLIENT_ID && TENANT_ID) {{
    msalInstance = new msal.PublicClientApplication({{
      auth: {{ clientId: CLIENT_ID, authority: AUTHORITY, redirectUri: window.location.origin + "/admin" }},
      cache: {{ cacheLocation: "sessionStorage" }},
    }});
    // MSAL 2.x requires initialize() before any interaction
    msalInstance.initialize().then(() => {{
      console.log("MSAL initialized");
    }}).catch(e => {{
      console.error("MSAL init failed", e);
      msalInstance = null;
    }});
  }}

  window.signIn = async function() {{
    if (!msalInstance) return;
    try {{
      const resp = await msalInstance.loginPopup({{ scopes: ["openid", "profile", "email"] }});
      accessToken = resp.accessToken || resp.idToken;
      document.getElementById("user-info").textContent = resp.account?.username || "signed in";
      document.getElementById("btn-signin").style.display = "none";
      refreshConfig();
    }} catch (e) {{
      console.error("MSAL sign-in failed", e);
    }}
  }};

  function authHeaders() {{
    const h = {{"Content-Type": "application/json"}};
    if (IS_AZURE && accessToken) h["Authorization"] = "Bearer " + accessToken;
    return h;
  }}

  // ---- Config table ----
  let allEntries = [];

  function renderTable(entries) {{
    const tbody = document.getElementById("config-body");
    if (entries.length === 0) {{
      tbody.innerHTML = '<tr><td colspan="3" class="empty">No keys found.</td></tr>';
      document.getElementById("count").textContent = "";
      return;
    }}
    document.getElementById("count").textContent = entries.length + " keys";
    tbody.innerHTML = entries.map(([k, v]) => {{
      const flag = isFeatureFlag(k);
      const checked = flag && featureFlagEnabled(v);
      const id = "row-" + CSS.escape(k);
      if (flag) {{
        return `<tr id="${{id}}">
          <td class="key-cell">${{escHtml(k)}}</td>
          <td>
            <label class="toggle">
              <input type="checkbox" ${{checked ? "checked" : ""}}
                     onchange="saveFlag('${{escAttr(k)}}', this.checked, this.closest('tr'))" />
              <span class="slider"></span>
            </label>
          </td>
          <td></td>
        </tr>`;
      }}
      return `<tr id="${{id}}">
        <td class="key-cell">${{escHtml(k)}}</td>
        <td><input class="val-input" value="${{escAttr(v)}}" data-key="${{escAttr(k)}}" /></td>
        <td style="text-align:right">
          <button class="btn" onclick="saveRow(this.closest('tr'))">Save</button>
        </td>
      </tr>`;
    }}).join("");
  }}

  function escHtml(s) {{
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }}
  function escAttr(s) {{
    return s.replace(/&/g,"&amp;").replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }}

  function flash(el, ok) {{
    el.classList.remove("flash-ok","flash-err");
    // Force reflow to restart animation.
    void el.offsetWidth;
    el.classList.add(ok ? "flash-ok" : "flash-err");
  }}

  window.refreshConfig = async function() {{
    try {{
      const resp = await fetch("/admin/api/config", {{headers: authHeaders()}});
      if (!resp.ok) throw new Error(resp.status);
      const data = await resp.json();
      allEntries = Object.entries(data).sort(([a],[b]) => a.localeCompare(b));
      filterRows();
    }} catch (e) {{
      console.error("Failed to load config", e);
      document.getElementById("config-body").innerHTML =
        '<tr><td colspan="3" class="empty" style="color:#da3633">Failed to load config. ' +
        (IS_AZURE ? "Sign in first." : "Check service.") + '</td></tr>';
    }}
  }};

  window.filterRows = function() {{
    const q = (document.getElementById("search").value || "").toLowerCase();
    const filtered = q ? allEntries.filter(([k]) => k.toLowerCase().includes(q)) : allEntries;
    renderTable(filtered);
  }};

  window.saveRow = async function(tr) {{
    const input = tr.querySelector(".val-input");
    const key = input.dataset.key;
    const value = input.value;
    try {{
      const resp = await fetch("/admin/api/config/" + encodeURIComponent(key), {{
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({{value}}),
      }});
      flash(tr, resp.ok);
      if (resp.ok) {{
        // Update local cache so a refresh re-renders correctly.
        const idx = allEntries.findIndex(([k]) => k === key);
        if (idx >= 0) allEntries[idx][1] = value;
      }}
    }} catch (_) {{
      flash(tr, false);
    }}
  }};

  window.saveFlag = async function(key, enabled, tr) {{
    const value = enabled ? "true" : "false";
    try {{
      const resp = await fetch("/admin/api/config/" + encodeURIComponent(key), {{
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({{value}}),
      }});
      flash(tr, resp.ok);
      if (resp.ok) {{
        const idx = allEntries.findIndex(([k]) => k === key);
        if (idx >= 0) allEntries[idx][1] = value;
      }}
    }} catch (_) {{
      flash(tr, false);
    }}
  }};

  // Auto-load on page ready
  refreshConfig();
}})();
</script>
</body>
</html>"""
