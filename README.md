# bkm-org browser extension

A browser extension that saves your bookmarks to plain-text collections managed by the companion `digorg`/`bkm-org` project, instead of the browser's own bookmark store.

The extension has two parts:

- **`extension/`** — a WebExtension (Firefox 78+) with a toolbar button and popup. The button icon shows whether the current page is already bookmarked.
- **`app/`** — a Python [native messaging](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging) host (`com.basiliskus.bkm_org_ext`) that receives commands from the extension and reads/writes bookmark collections through the `digorg` modules.

```text
popup ⇄ background script ⇄ native messaging ⇄ app/bkm_org_ext.py ⇄ plain-text collections
```

## Features

- Add, update, and delete a bookmark for the current tab from the popup, with a title and comma-separated tags.
- Switch between bookmark collections; the popup lists every collection in the catalog.
- Import your existing browser bookmarks into the current collection, converting the folder hierarchy into categories and tags.
- Toolbar icon reflects bookmark state per tab: filled when the page is saved, outlined when it isn't.

## Requirements

- Firefox 78 or later.
- Python 3.
- A checkout of the `digorg` project **next to this repository** (the host imports it from `../../digorg/` relative to `app/`).
- A `digorg` config file defining `global.log_path`, `bkm-org.plain_home` (the collections directory), and `bkm-org.collection_fpath` (the default collection).

## Setup

1. Clone this repository as a sibling of `digorg`:

   ```bash
   git clone <this-repo> bkm-org-browser-extension
   ls  # bkm-org-browser-extension  digorg
   ```

2. Create a launcher script the browser can execute, e.g. `app/bkm_org_ext.sh`:

   ```bash
   #!/bin/sh
   cd "$(dirname "$0")" && exec python3 bkm_org_ext.py
   ```

   Make it executable with `chmod +x app/bkm_org_ext.sh`. The `cd` matters: the host resolves `digorg` relative to its working directory.

3. Register the native messaging host by writing `com.basiliskus.bkm_org_ext.json` to Firefox's [native messaging host location](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_manifests#manifest_location) (on macOS: `~/Library/Application Support/Mozilla/NativeMessagingHosts/`):

   ```json
   {
     "name": "com.basiliskus.bkm_org_ext",
     "description": "Native messaging host for the bkm-org browser extension",
     "path": "/absolute/path/to/bkm-org-browser-extension/app/bkm_org_ext.sh",
     "type": "stdio",
     "allowed_extensions": ["bkm_org_ext@example.org"]
   }
   ```

4. Load the extension: open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on…**, and select `extension/manifest.json`.

## Usage

Click the toolbar button on any page:

- **Add bookmark** saves the page to the current collection with the title and tags you enter.
- On an already-saved page the popup switches to **Update bookmark** and shows a **Delete** button.
- The dropdown at the top changes the current collection.
- **Import bookmarks** pulls all of the browser's built-in bookmarks into the current collection.

Every change is written back to the collection file immediately.

## Repository layout

| Path | Contents |
| --- | --- |
| `extension/manifest.json` | WebExtension manifest (v2) |
| `extension/background.chrome.js` | Background script: tab tracking, icon state, native messaging client |
| `extension/popup/` | Popup UI (HTML/CSS/JS) |
| `app/bkm_org_ext.py` | Native messaging host: command loop backed by `digorg` bookmark collections |
| `app/modules/nativemessaging.py` | stdio framing helpers for the native messaging protocol |
