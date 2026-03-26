---
name: facebook
description: Perform actions inside user's Facebook. Interact with user's Facebook via CLI. Includes scripts for common workflows such as making a post to a facebook group. Exposed via Python CLI.
---

# Interact with user's Facebook via CLI

## Requirements

- Python 3.12+
- `agent-browser` must be installed and available on `PATH`
- Chrome or Chromium must be installed and runnable on the machine
- the browser session must be started with CDP before posting
- the sandboxed browser profile must be reused so the Facebook login session can persist


## Install Chrome or Chromium including Playwright

If Chrome or Chromium is not already installed, install one of them before using this skill.

Common Linux package names:

- `google-chrome`
- `chromium`
- `chromium-browser`

**TODO**: Playwright installation steps missing

###Install agent-browser
- check if agent-browser is already installed: `agent-browser --version`
- if not installed, see instructions at: https://github.com/vercel-labs/agent-browser on how to install


## How to use

1. check dependencies are installed:
   1.1 check if agent-browser is installed: `agent-browser --version`
   1.2 check if chrome or chromium is installed: `google-chrome --version` or `chromium --version`
   
   if any is missing you must first install them

2. run `python3 facebook.py start-browser 9222 ./.chrome-profile`

2. run `python3 facebook.py prepare-session 9222 ./.chrome-profile`

3. if the command reports that login is still needed, complete the Facebook login manually in that browser window and rerun:
   `python3 facebook.py check-logged-in 9222`

5. once you've got a logged in facebook session, perform your actions inside facebook.

6. when you're finished interacting with facebook, tear down the browser session

**PRO TIP**: after the initial session you may reuse the same profile in headless mode.
   `python3 facebook.py start-browser 9222 ./.chrome-profile --headless`


## Interface

- `./scripts/facebook.py` is the main entrypoint.

### Primary entrypoint

<!-- TODO: add examples -->

```bash
python3 facebook.py post-to-group <post_title> <post_description> <city> <image_path> <group_url> [cdp_port]
```

Use this for the normal user-facing task: make a Facebook group post.

### Setup browser session

```bash
python3 facebook.py prepare-session [cdp_port] [profile_dir]
```

Use this when you need to bootstrap the sandboxed Chrome profile and complete the one-time manual Facebook login.

### Supporting commands

```bash
python3 facebook.py check-logged-in [cdp_port]
```

Use this to verify that the persisted Facebook session is still valid.

```bash
python3 facebook.py start-browser [cdp_port] [profile_dir] [--headless]
```

Use this to start or reuse the browser profile directly. Prefer visible mode for first-time setup and `--headless` for routine automated runs after login is already saved.

### Tear down browser session
1. find the Chrome or Chromium process: `ps -ef | grep -E 'chrome|chromium' | grep -- '--remote-debugging-port=9222'`
2. stop it cleanly first: `pkill -f -- '--remote-debugging-port=9222'`
3. if it does not stop, force kill it: `pkill -9 -f -- '--remote-debugging-port=9222'`


## Important Notes
- Initial Facebook login is manual and should happen in a visible browser window.
- Routine posting should reuse the persisted profile and can run in headless mode.
