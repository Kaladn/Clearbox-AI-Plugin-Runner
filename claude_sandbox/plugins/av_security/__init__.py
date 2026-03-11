# av_security — Audio/visual correlation and forensic security
# Clearbox AI Studio Plugin — mounts at /api/av_security
# See CONTRACT.md for full boundary contract and API surface

from .api.router import router, plugin_pre, plugin_post

__all__ = ["router", "plugin_pre", "plugin_post"]

VERSION = "0.1.0"
