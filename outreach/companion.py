#!/usr/bin/env python3
from __future__ import annotations

import os
from pathlib import Path

import yaml
import subprocess
import sys
from logger import get_logger

log = get_logger("companion")

CONFIG_FILE = Path(__file__).parent / "shortcuts.yaml"
SCRIPT_PATH = Path(__file__).parent / "instagram.py"
VENV_PYTHON = Path(__file__).parent.parent / ".venv" / "bin" / "python"


def get_python_executable() -> Path:
    if VENV_PYTHON.exists():
        return VENV_PYTHON
    return Path(sys.executable)


def load_config() -> dict[str, str]:
    if not CONFIG_FILE.exists():
        log.error(f"Config file not found: {CONFIG_FILE}")
        sys.exit(1)
    with open(CONFIG_FILE, "r") as f:
        return yaml.safe_load(f) or {"__comments__": "No shortcuts defined"}


def get_original_user() -> str | None:
    return os.environ.get("SUDO_USER")


def get_user_env() -> dict[str, str]:
    """Capture the current environment to pass to child processes.
    When running under sudo, PATH is stripped — we preserve it here
    at startup time (before sudo clobbers it) so child processes can
    find NVM-installed binaries like agent-browser."""
    return dict(os.environ)


# Capture the PATH at import time, before sudo strips it
_ORIGINAL_ENV: dict[str, str] = get_user_env()


def trigger_comment(text: str) -> None:
    original_user = get_original_user()
    python_exe = get_python_executable()

    cmd = [str(python_exe), str(SCRIPT_PATH), "post-comment", "--text", text]

    if original_user:
        # -H sets HOME to the target user's home directory
        cmd = ["sudo", "-u", original_user, "-H", "XDG_RUNTIME_DIR=/run/user/1000"] + cmd

    log.info(f"Triggered comment: {text[:50]}{'...' if len(text) > 50 else ''}")
    log.debug(f"Executing: {' '.join(cmd)}")

    subprocess.Popen(
        cmd,
        env=_ORIGINAL_ENV,
        start_new_session=True,
    )


def main() -> None:
    if os.geteuid() != 0:
        log.error(
            "This script must be run with sudo to capture global keyboard events."
        )
        log.info(f"Usage: sudo {get_python_executable()} companion.py")
        sys.exit(1)

    try:
        import keyboard
    except ImportError:
        log.error("'keyboard' library not installed.")
        log.info("Install with: uv pip install keyboard")
        sys.exit(1)

    config = load_config()

    log.info(f"Loaded {len(config)} shortcuts from {CONFIG_FILE}")
    log.info("Registered hotkeys:")
    for hotkey, text in config.items():
        log.info(f"  {hotkey} -> {text[:40]}{'...' if len(text) > 40 else ''}")
        keyboard.add_hotkey(hotkey, lambda t=text: trigger_comment(t))

    log.info("Companion listener running. Press Ctrl+C to stop.")
    log.info("Browse Instagram and use your shortcuts to post comments.")

    try:
        keyboard.wait()
    except KeyboardInterrupt:
        log.info("Stopping companion listener...")
        sys.exit(0)


if __name__ == "__main__":
    main()
