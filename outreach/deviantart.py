from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence


class AgentBrowserError(RuntimeError):
    pass


@dataclass(frozen=True)
class CommentRequest:
    url: str
    comment_text: str
    cdp_port: int = 9222


class AgentBrowserClient:
    def __init__(self, cdp_port: int) -> None:
        self.cdp_port = cdp_port

    def run(self, *args: str, capture_output: bool = False) -> str:
        command = ["agent-browser", "--cdp", str(self.cdp_port), *args]
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

    def open(self, url: str) -> None:
        self.run("open", url)

    def snapshot(self) -> str:
        return self.run("snapshot", "-i", capture_output=True)

    def click(self, ref: str) -> None:
        self.run("click", ref)

    def fill(self, ref: str, value: str) -> None:
        self.run("fill", ref, value)

    def get_url(self) -> str:
        return self.run("get", "url", capture_output=True).strip()


class DeviantArtCommenter:
    def __init__(self, request: CommentRequest) -> None:
        self.request = request
        self.browser = AgentBrowserClient(request.cdp_port)

    def print_status(self, message: str) -> None:
        print(f"[deviantart-commenter] {message}")

    def wait(self, seconds: float) -> None:
        time.sleep(seconds)

    def snapshot(self) -> str:
        return self.browser.snapshot()

    def find_ref(self, label: str, pattern: str) -> str:
        for line in self.snapshot().splitlines():
            if re.search(pattern, line):
                ref_match = re.search(r"\[ref=([^\]]+)\]", line)
                if ref_match:
                    return ref_match.group(1)
                raise AgentBrowserError(f"Could not extract ref for: {label}")
        raise AgentBrowserError(f"Could not find element for: {label}")

    def click_ref(self, label: str, pattern: str) -> None:
        self.browser.click(self.find_ref(label, pattern))

    def fill_ref(self, label: str, pattern: str, value: str) -> None:
        self.browser.fill(self.find_ref(label, pattern), value)

    def ensure_session_ready(self) -> bool:
        if not is_cdp_available(self.request.cdp_port):
            print(
                "Browser with CDP is not running. Run `python3 deviantart.py start-browser` first."
            )
            return False

        self.print_status("Checking DeviantArt login session")
        if is_logged_into_deviantart(self.request.cdp_port):
            self.print_status("DeviantArt session is ready")
            return True

        print(
            "DeviantArt login required. Complete login in the browser window, then rerun this command."
        )
        return False

    def post_comment(self) -> None:
        self.print_status(f"Navigating to {self.request.url}")
        self.browser.open(self.request.url)
        self.wait(3)

        self.print_status("Clicking comment input")
        self.click_ref("Add a new comment button", r'button "Add a new comment\.\.\."')
        self.wait(1)

        self.print_status("Typing comment text")
        self.fill_ref(
            "Comment textbox", r'textbox(?!\s*"Search")', self.request.comment_text
        )
        self.wait(1)

        self.print_status("Submitting comment")
        self.click_ref("Comment submit button", r'button "Comment"(?!.*nth=0)')
        self.wait(3)

        # Verify: look for our comment in the snapshot
        snap = self.snapshot()
        current_url = self.browser.get_url()
        self.print_status(f"Comment posted at {current_url}")


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


def is_logged_into_deviantart(cdp_port: int) -> bool:
    browser = AgentBrowserClient(cdp_port)
    browser.open("https://www.deviantart.com/")
    time.sleep(2)
    snapshot = browser.snapshot()
    logged_in_markers = [
        r'link "Messages',
        r'button "User Menu"',
        r'link "Submit"',
    ]
    return any(re.search(pattern, snapshot) for pattern in logged_in_markers)


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

    subprocess.Popen(
        chrome_args,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    wait_for_cdp(cdp_port)
    mode = "headless" if headless else "visible"
    print(
        f"[deviantart-commenter] Chrome started with CDP on port {cdp_port} in {mode} mode"
    )


def prepare_deviantart_session(cdp_port: int, profile_dir: str) -> bool:
    if not is_cdp_available(cdp_port):
        start_browser(cdp_port, profile_dir, headless=False)

    if is_logged_into_deviantart(cdp_port):
        print("[deviantart-commenter] DeviantArt session is ready")
        return True

    print(
        "DeviantArt session is not logged in. Complete login manually in the browser window, "
        "then rerun `python3 deviantart.py check-logged-in`."
    )
    return False


def read_comment_from_file(path: str) -> str:
    """Read comment text from a markdown file, stripping image/logo lines."""
    lines = Path(path).read_text().splitlines()
    filtered = [
        line
        for line in lines
        if not re.match(r"^\s*\(.*\)\[.*\]\s*$", line)  # strip (text)[url] image lines
    ]
    return "\n".join(filtered).strip()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Post a comment on a DeviantArt deviation"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # start-browser
    sb = subparsers.add_parser("start-browser", help="Launch Chrome with CDP")
    sb.add_argument("cdp_port", nargs="?", type=int, default=9222)
    sb.add_argument(
        "profile_dir",
        nargs="?",
        default=str(Path.home() / ".config" / "deviantart-chrome-profile"),
    )
    sb.add_argument("--headless", action="store_true")

    # prepare-session
    ps = subparsers.add_parser(
        "prepare-session", help="Launch browser and prompt login"
    )
    ps.add_argument("cdp_port", nargs="?", type=int, default=9222)
    ps.add_argument(
        "profile_dir",
        nargs="?",
        default=str(Path.home() / ".config" / "deviantart-chrome-profile"),
    )

    # check-logged-in
    cl = subparsers.add_parser("check-logged-in", help="Check if logged in")
    cl.add_argument("cdp_port", nargs="?", type=int, default=9222)

    # post-comment
    pc = subparsers.add_parser("post-comment", help="Post a comment on a deviation")
    pc.add_argument("url", help="DeviantArt deviation URL")
    group = pc.add_mutually_exclusive_group(required=True)
    group.add_argument("--text", help="Comment text directly")
    group.add_argument("--file", help="Path to markdown file containing comment text")
    pc.add_argument("--cdp-port", type=int, default=9222, dest="cdp_port")

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
                0 if prepare_deviantart_session(args.cdp_port, args.profile_dir) else 1
            )

        if args.command == "check-logged-in":
            if not is_cdp_available(args.cdp_port):
                print(
                    "Browser with CDP is not running. Run `python3 deviantart.py start-browser` first."
                )
                return 1
            if is_logged_into_deviantart(args.cdp_port):
                print("[deviantart-commenter] DeviantArt session is ready")
                return 0
            print("Not logged in. Complete login in the browser window.")
            return 1

        if args.command == "post-comment":
            comment_text = args.text if args.text else read_comment_from_file(args.file)
            request = CommentRequest(
                url=args.url,
                comment_text=comment_text,
                cdp_port=args.cdp_port,
            )
            commenter = DeviantArtCommenter(request)
            if not commenter.ensure_session_ready():
                return 1
            commenter.post_comment()
            return 0

    except (AgentBrowserError, subprocess.CalledProcessError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
