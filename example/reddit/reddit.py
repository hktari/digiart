from __future__ import annotations

import argparse
import json
import re
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
class RedditPostRequest:
    subreddit: str
    title: str
    body: str | None = None
    url: str | None = None
    image_path: str | None = None
    flair: str | None = None
    cdp_port: int = 9222
    publish: bool = False


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

    def snapshot_json(self) -> dict:
        output = self.run("snapshot", "-i", "--json", capture_output=True)
        return json.loads(output)

    def click(self, selector: str) -> None:
        self.run("click", selector)

    def fill(self, selector: str, value: str) -> None:
        self.run("fill", selector, value)

    def upload(self, selector: str, value: str) -> None:
        self.run("upload", selector, value)

    def eval_json(self, javascript: str) -> dict | list | str | int | float | bool | None:
        output = self.run("eval", javascript, capture_output=True)
        return json.loads(output)

    def get_url(self) -> str:
        return self.run("get", "url", capture_output=True).strip()


class RedditPoster:
    def __init__(self, request: RedditPostRequest) -> None:
        self.request = request
        self.browser = AgentBrowserClient(request.cdp_port)

    def print_status(self, message: str) -> None:
        print(f"[reddit-poster] {message}")

    def wait(self, seconds: float) -> None:
        time.sleep(seconds)

    def open_submit(self) -> None:
        self.browser.open(f"https://www.reddit.com/r/{self.request.subreddit}/submit")
        self.wait(2.5)

    def snapshot(self) -> dict:
        return self.browser.snapshot_json()

    def find_ref_by_name(self, name: str, snapshot: dict | None = None) -> str:
        snap = snapshot or self.snapshot()
        refs = snap.get("data", {}).get("refs", {})
        for ref, meta in refs.items():
            if (meta.get("name") or "") == name:
                return f"@{ref}"
        raise AgentBrowserError(f"Could not find ref by exact name: {name}")

    def find_ref_by_role_name_contains(
        self, role: str, needle: str, snapshot: dict | None = None
    ) -> str:
        snap = snapshot or self.snapshot()
        refs = snap.get("data", {}).get("refs", {})
        needle_lc = needle.lower()
        for ref, meta in refs.items():
            if (meta.get("role") or "") != role:
                continue
            if needle_lc in (meta.get("name") or "").lower():
                return f"@{ref}"
        raise AgentBrowserError(
            f"Could not find ref with role={role!r} containing name={needle!r}"
        )

    def click_name(self, name: str, snapshot: dict | None = None) -> None:
        self.browser.click(self.find_ref_by_name(name, snapshot=snapshot))

    def fill_name(self, name: str, value: str, snapshot: dict | None = None) -> None:
        self.browser.fill(self.find_ref_by_name(name, snapshot=snapshot), value)

    def fill_contains(
        self, role: str, needle: str, value: str, snapshot: dict | None = None
    ) -> None:
        self.browser.fill(
            self.find_ref_by_role_name_contains(role, needle, snapshot=snapshot), value
        )

    def choose_flair(self, flair_name: str) -> None:
        self.print_status(f"Selecting flair: {flair_name}")
        snap = self.snapshot()
        self.browser.click(self.find_ref_by_role_name_contains("button", "Add flair", snap))
        self.wait(1.2)
        snap = self.snapshot()
        self.browser.click(self.find_ref_by_role_name_contains("radio", flair_name, snap))
        self.browser.click(self.find_ref_by_name("Add", snap))
        self.wait(1)

    def ensure_cdp_ready(self) -> None:
        if not is_cdp_available(self.request.cdp_port):
            raise AgentBrowserError(
                f"Browser with CDP is not running on port {self.request.cdp_port}"
            )

    def post_link(self) -> None:
        self.print_status(f"Opening r/{self.request.subreddit} submit page")
        self.open_submit()
        snap = self.snapshot()

        self.print_status("Switching to Link tab")
        self.browser.click(self.find_ref_by_name("Link", snap))
        self.wait(1.5)
        snap = self.snapshot()

        self.print_status("Filling title")
        self.fill_name("Title", self.request.title, snap)

        if not self.request.url:
            raise AgentBrowserError("url is required for link posts")
        self.print_status("Filling link URL")
        self.fill_contains("textbox", "Link URL", self.request.url, snap)

        if self.request.body:
            self.print_status("Filling optional body")
            self.fill_contains("textbox", "Optional Body", self.request.body, snap)

        flair = self.request.flair or "Text"
        self.choose_flair(flair)
        self.submit_if_requested()

    def post_text(self) -> None:
        self.print_status(f"Opening r/{self.request.subreddit} submit page")
        self.open_submit()
        snap = self.snapshot()

        self.print_status("Switching to Text tab")
        self.browser.click(self.find_ref_by_name("Text", snap))
        self.wait(1.2)
        snap = self.snapshot()

        self.print_status("Filling title")
        self.fill_name("Title", self.request.title, snap)

        if self.request.body:
            self.print_status("Filling post body")
            self.fill_contains("textbox", "Post body", self.request.body, snap)

        flair = self.request.flair or "Text"
        self.choose_flair(flair)
        self.submit_if_requested()

    def upload_image_best_effort(self, image_path: str) -> None:
        self.print_status("Trying direct file input upload")
        try:
            self.browser.upload('input[type="file"]', image_path)
            return
        except AgentBrowserError:
            pass

        self.print_status("Trying temporary injected file input workaround")
        self.browser.eval_json(
            """
(() => {
  const old = document.getElementById('__reddit_upload_input__');
  if (old) old.remove();
  const input = document.createElement('input');
  input.type = 'file';
  input.id = '__reddit_upload_input__';
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  document.body.appendChild(input);
  return { ok: true };
})()
""".strip()
        )
        self.browser.upload("#__reddit_upload_input__", image_path)
        self.browser.eval_json(
            """
(() => {
  const input = document.getElementById('__reddit_upload_input__');
  if (!input) return { ok: false, reason: 'missing temp input' };
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return {
    ok: true,
    fileCount: input.files ? input.files.length : 0,
    names: input.files ? [...input.files].map(f => f.name) : []
  };
})()
""".strip()
        )

    def post_image(self) -> None:
        self.print_status(f"Opening r/{self.request.subreddit} submit page")
        self.open_submit()
        snap = self.snapshot()

        self.print_status("Switching to Images & Video tab")
        self.browser.click(self.find_ref_by_name("Images & Video", snap))
        self.wait(1.5)
        snap = self.snapshot()

        self.print_status("Filling title")
        self.fill_name("Title", self.request.title, snap)

        if not self.request.image_path:
            raise AgentBrowserError("image_path is required for image posts")

        self.upload_image_best_effort(self.request.image_path)
        self.wait(3)

        if self.request.body:
            snap = self.snapshot()
            self.print_status("Filling optional body")
            self.fill_contains("textbox", "Optional Body", self.request.body, snap)

        flair = self.request.flair or "Image - Other"
        self.choose_flair(flair)
        self.submit_if_requested()

    def submit_if_requested(self) -> None:
        snap = self.snapshot()
        post_ref = self.find_ref_by_name("Post", snap)
        if self.request.publish:
            self.print_status("Publishing post")
            self.browser.click(post_ref)
            self.wait(3)
            self.print_status(f"Current URL: {self.browser.get_url()}")
        else:
            self.print_status("Dry run complete. Post is prepared but not published.")


def is_cdp_available(port: int) -> bool:
    url = f"http://localhost:{port}/json/version"
    try:
        with urllib.request.urlopen(url, timeout=1) as response:
            return response.status == 200
    except urllib.error.URLError:
        return False


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    def add_common(subparser: argparse.ArgumentParser) -> None:
        subparser.add_argument("subreddit")
        subparser.add_argument("title")
        subparser.add_argument("--body")
        subparser.add_argument("--flair")
        subparser.add_argument("--cdp-port", type=int, default=9222)
        subparser.add_argument("--publish", action="store_true")

    link_parser = subparsers.add_parser("post-link")
    add_common(link_parser)
    link_parser.add_argument("url")

    text_parser = subparsers.add_parser("post-text")
    add_common(text_parser)

    image_parser = subparsers.add_parser("post-image")
    add_common(image_parser)
    image_parser.add_argument("image_path")

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        if args.command == "post-link":
            poster = RedditPoster(
                RedditPostRequest(
                    subreddit=args.subreddit,
                    title=args.title,
                    url=args.url,
                    body=args.body,
                    flair=args.flair,
                    cdp_port=args.cdp_port,
                    publish=args.publish,
                )
            )
            poster.ensure_cdp_ready()
            poster.post_link()
            return 0

        if args.command == "post-text":
            poster = RedditPoster(
                RedditPostRequest(
                    subreddit=args.subreddit,
                    title=args.title,
                    body=args.body,
                    flair=args.flair,
                    cdp_port=args.cdp_port,
                    publish=args.publish,
                )
            )
            poster.ensure_cdp_ready()
            poster.post_text()
            return 0

        if args.command == "post-image":
            image_path = str(Path(args.image_path).expanduser().resolve())
            poster = RedditPoster(
                RedditPostRequest(
                    subreddit=args.subreddit,
                    title=args.title,
                    image_path=image_path,
                    body=args.body,
                    flair=args.flair,
                    cdp_port=args.cdp_port,
                    publish=args.publish,
                )
            )
            poster.ensure_cdp_ready()
            poster.post_image()
            return 0
    except (AgentBrowserError, subprocess.CalledProcessError, json.JSONDecodeError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
