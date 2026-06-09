from __future__ import annotations

import argparse
import logging
import math
import os
import random
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from threading import Event
from typing import Sequence

from pynput import keyboard

from logger import get_logger

log = get_logger("instagram")


class AgentBrowserError(RuntimeError):
    pass


@dataclass(frozen=True)
class CommentRequest:
    comment_text: str
    cdp_port: int = 9222
    dry_run: bool = False


def gaussian_random(mean: float, std_dev: float, lo: float, hi: float) -> float:
    """Generate a Gaussian-distributed random number, clamped to [lo, hi]."""
    u1 = random.random()
    u2 = random.random()
    while u1 == 0:
        u1 = random.random()
    z = math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)
    value = z * std_dev + mean
    return max(lo, min(hi, value))


def find_agent_browser_executable() -> str:
    # Try PATH first (works when env is passed correctly from companion)
    resolved = shutil.which("agent-browser")
    if resolved:
        return resolved

    # Fallback: search NVM directories for the actual user
    try:
        import pwd

        home = Path(pwd.getpwuid(os.getuid()).pw_dir)
    except (ImportError, KeyError):
        home = Path.home()

    nvm_bin_dir = home / ".nvm" / "versions" / "node"
    try:
        if nvm_bin_dir.is_dir() and os.access(nvm_bin_dir, os.R_OK):
            for node_ver in sorted(nvm_bin_dir.iterdir(), reverse=True):
                if node_ver.is_dir():
                    agent_bin = node_ver / "bin" / "agent-browser"
                    if agent_bin.exists():
                        return str(agent_bin)
    except (PermissionError, OSError):
        pass

    return "agent-browser"


class AgentBrowserClient:
    def __init__(self, cdp_port: int) -> None:
        self.cdp_port = cdp_port
        self.executable = find_agent_browser_executable()

    def run(self, *args: str, capture_output: bool = False) -> str:
        command = [self.executable, "--cdp", str(self.cdp_port), *args]
        result = subprocess.run(
            command,
            check=False,
            text=True,
            capture_output=True,
        )
        if result.returncode != 0:
            message = (result.stderr or result.stdout or "").strip()
            raise AgentBrowserError(
                message or f"agent-browser command failed: {' '.join(args)}"
            )
        return result.stdout if capture_output else ""

    def snapshot(self) -> str:
        return self.run("snapshot", "-i", capture_output=True)

    def click(self, ref: str) -> None:
        self.run("click", ref)

    def fill(self, ref: str, value: str) -> None:
        self.run("fill", ref, value)

    def type_text(self, ref: str, text: str) -> None:
        self.run("type", ref, text)

    def type_char(self, ref: str, char: str) -> None:
        self.run("type", ref, char)

    def press(self, key: str) -> None:
        self.run("press", key)

    def scroll(self, direction: str, pixels: int = 300) -> None:
        self.run("scroll", direction, str(pixels))

    def get_url(self) -> str:
        return self.run("get", "url", capture_output=True).strip()


class InstagramCommenter:
    COMMENT_INPUT_PATTERNS = [
        r'textbox "Add a comment\u2026"',
        r'textbox "Add a comment\.\.\."',
        r'textbox "Add a comment"',
        r"textbox.*[Aa]dd a comment",
    ]

    SUBMIT_PATTERNS = [
        r'button "Post"',
        r'button "Publish"',
    ]

    CHALLENGE_PATTERNS = [
        r'textbox "Phone number, username, or email"',
        r'button "Log in"',
        r'heading "We Suspended Your Account"',
        r'heading "Your account has been disabled"',
        r'heading "Suspicious Login Attempt"',
        r'heading "Confirm it\'s you"',
    ]

    def __init__(self, request: CommentRequest) -> None:
        self.request = request
        self.browser = AgentBrowserClient(request.cdp_port)

    def _log(self, message: str) -> None:
        log.info(message)

    def _wait(self, lo: float = 0.8, hi: float = 2.5) -> None:
        time.sleep(random.uniform(lo, hi))

    def _snapshot(self) -> str:
        return self.browser.snapshot()

    def _find_ref(self, label: str, patterns: list[str]) -> str:
        snap = self._snapshot()
        for line in snap.splitlines():
            for pattern in patterns:
                if re.search(pattern, line):
                    m = re.search(r"\[ref=([^\]]+)\]", line)
                    if m:
                        return m.group(1)
        raise AgentBrowserError(
            f"Could not find '{label}' on the page.\n"
            "Make sure you are on an Instagram post page. "
            "Run with --dump-snapshot to inspect the accessibility tree."
        )

    def _check_for_challenge(self) -> None:
        snap = self._snapshot()
        for pattern in self.CHALLENGE_PATTERNS:
            if re.search(pattern, snap):
                raise AgentBrowserError(
                    "Instagram is showing a login or security challenge. "
                    "Please resolve it manually in the browser and try again."
                )

    def _scroll_reading_pattern(self) -> None:
        """Simulate reading the post before commenting — multiple short scrolls with pauses."""
        scroll_actions = random.randint(2, 4)
        for i in range(scroll_actions):
            px = random.randint(150, 400)
            direction = random.choice(["down", "down", "down", "up"])
            self.browser.scroll(direction, px)
            pause = gaussian_random(mean=1.2, std_dev=0.4, lo=0.6, hi=2.5)
            time.sleep(pause)
        self.browser.scroll("up", random.randint(200, 500))

    def _human_type(self, ref: str, text: str) -> None:
        """Type text character-by-character with Gaussian delays and word-boundary pauses.

        Press Escape to cancel typing at any time.
        """
        cancel_event = Event()

        def on_press(key):
            if key == keyboard.Key.esc:
                cancel_event.set()
                return False  # Stop listener

        listener = keyboard.Listener(on_press=on_press)
        listener.start()

        mean_delay = 0.003
        std_delay = 0.0013
        word_pause_mean = 0.016
        word_pause_std = 0.08

        try:
            for i, char in enumerate(text):
                if cancel_event.is_set():
                    self._log("Typing cancelled by user (Escape)")
                    self.browser.press("Escape")  # Close any open dialogs
                    raise AgentBrowserError("Typing cancelled by user")

                if char == "\n":
                    # Shift+Enter creates a new line instead of posting
                    self.browser.press("Shift+Enter")
                else:
                    self.browser.type_char(ref, char)
                if char == "\n":
                    pause = gaussian_random(word_pause_mean, word_pause_std, 0.1, 0.2)
                elif char == " " or (i > 0 and text[i - 1] in ".!?"):
                    pause = gaussian_random(word_pause_mean, word_pause_std, 0.1, 0.2)
                else:
                    pause = gaussian_random(mean_delay, std_delay, 0.04, 0.15)
                time.sleep(pause)
        finally:
            listener.stop()

    def post_comment(self, dump_snapshot: bool = False) -> None:
        current_url = self.browser.get_url()
        self._log(f"Current page: {current_url}")

        if dump_snapshot:
            log.debug("=== SNAPSHOT ===")
            log.debug(self._snapshot())
            log.debug("=== END SNAPSHOT ===")

        self._check_for_challenge()

        if self.request.dry_run:
            self._log(f"[DRY RUN] Would type: {self.request.comment_text!r}")
            return

        self._log("Clicking comment input")
        ref = self._find_ref("comment input", self.COMMENT_INPUT_PATTERNS)
        self.browser.click(ref)
        self._wait(0.5, 1.5)

        self._log("Typing comment (human-like)")
        ref = self._find_ref("comment input", self.COMMENT_INPUT_PATTERNS)
        self._human_type(ref, self.request.comment_text)
        self._wait(1.0, 2.2)

        self._log("Submitting")
        submit_ref = self._find_ref("Post button", self.SUBMIT_PATTERNS)
        self.browser.click(submit_ref)
        self._wait(1.5, 3.0)

        self._check_for_challenge()
        self._log("Done.")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def is_cdp_available(port: int) -> bool:
    url = f"http://localhost:{port}/json/version"
    try:
        with urllib.request.urlopen(url, timeout=2) as response:
            return response.status == 200
    except urllib.error.URLError:
        return False


def is_logged_into_instagram(cdp_port: int) -> bool:
    browser = AgentBrowserClient(cdp_port)
    snap = browser.snapshot()
    logged_in_markers = [
        r'link "New post"',
        r'link "Create"',
        r'link "Direct"',
        r'link "Notifications"',
    ]
    return any(re.search(p, snap) for p in logged_in_markers)


def find_chrome_executable() -> str:
    candidates = [
        "google-chrome",
        "chromium",
        "chromium-browser",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ]
    for candidate in candidates:
        resolved = shutil.which(candidate)
        if resolved:
            return resolved
        if Path(candidate).is_file() and os.access(candidate, os.X_OK):
            return candidate
    raise AgentBrowserError("Chrome or Chromium executable not found.")


def wait_for_cdp(port: int, timeout_seconds: int = 20) -> None:
    deadline = time.time() + timeout_seconds
    url = f"http://localhost:{port}/json/version"
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1) as response:
                if response.status == 200:
                    return
        except urllib.error.URLError:
            pass
        time.sleep(1)
    raise AgentBrowserError("Chrome failed to start with CDP")


def start_browser(cdp_port: int, profile_dir: str, headless: bool = False) -> None:
    chrome_bin = find_chrome_executable()
    Path(profile_dir).mkdir(parents=True, exist_ok=True)
    chrome_args = [
        chrome_bin,
        f"--remote-debugging-port={cdp_port}",
        f"--user-data-dir={profile_dir}",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        "about:blank",
    ]
    if headless:
        chrome_args.insert(-1, "--headless=new")
    subprocess.Popen(chrome_args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    wait_for_cdp(cdp_port)
    mode = "headless" if headless else "visible"
    log.info(f"Chrome started with CDP on port {cdp_port} ({mode})")


def prepare_instagram_session(cdp_port: int, profile_dir: str) -> bool:
    if not is_cdp_available(cdp_port):
        start_browser(cdp_port, profile_dir, headless=False)
    if is_logged_into_instagram(cdp_port):
        log.info("Instagram session is ready")
        return True
    log.info(
        "Not logged in. Log in manually in the browser window, "
        "then rerun `python3 instagram.py check-logged-in`."
    )
    return False


def read_comment_from_file(path: str) -> str:
    """Read comment text from a file, stripping markdown image lines."""
    lines = Path(path).read_text().splitlines()
    filtered = [line for line in lines if not re.match(r"^\s*\(.*\)\[.*\]\s*$", line)]
    return "\n".join(filtered).strip()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

DEFAULT_PROFILE_DIR = str(Path.home() / ".config" / "instagram-chrome-profile")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Post a comment on the currently open Instagram post",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Launch a persistent Chrome with CDP (do this once)
  python3 instagram.py start-browser

  # Log in manually in the browser, then verify:
  python3 instagram.py check-logged-in

  # Navigate to a post in the browser, then run:
  python3 instagram.py post-comment --text "Great work!"
  python3 instagram.py post-comment --file ./comments/outreach.md

  # Preview without posting:
  python3 instagram.py post-comment --text "Test" --dry-run

  # Debug selector issues:
  python3 instagram.py post-comment --text "Test" --dry-run --dump-snapshot
""",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # start-browser
    sb = subparsers.add_parser("start-browser", help="Launch Chrome with CDP enabled")
    sb.add_argument("cdp_port", nargs="?", type=int, default=9222)
    sb.add_argument("profile_dir", nargs="?", default=DEFAULT_PROFILE_DIR)
    sb.add_argument("--headless", action="store_true")

    # prepare-session
    ps = subparsers.add_parser(
        "prepare-session", help="Open Instagram and prompt login if needed"
    )
    ps.add_argument("cdp_port", nargs="?", type=int, default=9222)
    ps.add_argument("profile_dir", nargs="?", default=DEFAULT_PROFILE_DIR)

    # check-logged-in
    cl = subparsers.add_parser(
        "check-logged-in", help="Check whether Instagram is logged in"
    )
    cl.add_argument("cdp_port", nargs="?", type=int, default=9222)

    # post-comment
    pc = subparsers.add_parser(
        "post-comment",
        help="Type and submit a comment on the currently open post",
    )
    group = pc.add_mutually_exclusive_group(required=True)
    group.add_argument("--text", help="Comment text")
    group.add_argument("--file", help="Path to text/markdown file with comment")
    pc.add_argument("--cdp-port", type=int, default=9222, dest="cdp_port")
    pc.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be posted without posting",
    )
    pc.add_argument(
        "--dump-snapshot",
        action="store_true",
        help="Print accessibility tree for debugging",
    )

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        if args.command == "start-browser":
            start_browser(args.cdp_port, args.profile_dir, headless=args.headless)
            return 0

        if args.command == "prepare-session":
            return (
                0 if prepare_instagram_session(args.cdp_port, args.profile_dir) else 1
            )

        if args.command == "check-logged-in":
            if not is_cdp_available(args.cdp_port):
                log.error(
                    "Browser not running. Run `python3 instagram.py start-browser` first."
                )
                return 1
            if is_logged_into_instagram(args.cdp_port):
                log.info("Logged in.")
                return 0
            log.info("Not logged in.")
            return 1

        if args.command == "post-comment":
            if not is_cdp_available(args.cdp_port):
                log.error(
                    "Browser not running. Run `python3 instagram.py start-browser` first."
                )
                return 1
            comment_text = args.text if args.text else read_comment_from_file(args.file)
            request = CommentRequest(
                comment_text=comment_text,
                cdp_port=args.cdp_port,
                dry_run=args.dry_run,
            )
            commenter = InstagramCommenter(request)
            commenter.post_comment(dump_snapshot=args.dump_snapshot)
            return 0

    except (AgentBrowserError, subprocess.CalledProcessError) as exc:
        log.error(str(exc))
        return 1

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
