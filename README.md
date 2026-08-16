# Cinemana → PotPlayer

Brave/Chrome extension (Manifest V3) that captures video URLs from [cinemana.shabakaty.com](https://cinemana.shabakaty.com) and opens them directly in **PotPlayer** on Windows — with automatic Arabic subtitle loading and episode info.

## Features

- **One-click playback** — floating button inside the video player
- **Arabic subtitles** — auto-downloaded and loaded into PotPlayer
- **Episode info** — shows series name + season/episode number
- **Fast** — uses native Windows protocol handler (no slow bridges)

## Installation

### 1. Register the protocol handler (one-time)

> You need **Administrator** rights for this step.

1. Download or clone this repo
2. Go to `setup/` folder
3. Double-click **`register.bat`** → approve the UAC prompt
4. Done — `cinemana-player://` protocol is now registered

### 2. Install the extension

1. Open `brave://extensions` (or `chrome://extensions`)
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `cinemana-potplayer` folder
5. The extension icon appears — you're ready!

## Usage

1. Go to any video page on cinemana.shabakaty.com
2. Play the video
3. Click the **▶ فتح في PotPlayer** button (bottom-right of the player)
4. PotPlayer opens with the video, subtitles, and episode title

## How it works

| Component | Role |
|-----------|------|
| `content.js` | Injects the floating button, extracts title/episode, builds protocol URL |
| `background.js` | Captures video + subtitle URLs via `webRequest` |
| `setup/open.vbs` | VBScript handler — parses URL, downloads subtitle, launches PotPlayer |
| `setup/register.reg` | Registers `cinemana-player://` protocol in Windows |

## Troubleshooting

- **Button doesn't appear?** Reload the page and make sure the video is playing
- **Subtitle not loading?** Check `%TEMP%\cinemana_sub.vtt` exists after clicking
- **Protocol not working?** Re-run `setup/register.bat` as admin

## License

MIT
