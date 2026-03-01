"""
Test configuration — runs before any test module is imported.

Ensures INFRA=local so that config_loader uses config.json
instead of trying to connect to Azure App Configuration.
"""

import os

# Force local mode BEFORE function_app.py is imported (which calls load_config() at module level)
os.environ["INFRA"] = "local"
