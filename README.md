# Cinemana → PotPlayer

> **English** is the primary language below; Arabic translation follows each section.

A Brave/Chrome extension (Manifest V3) that captures video URLs from [cinemana.shabakaty.com](https://cinemana.shabakaty.com) and opens them directly in **PotPlayer** on Windows — with automatic Arabic subtitle loading and correct episode info.

---

إضافة Brave/Chrome (Manifest V3) تلتقط روابط الفيديو من [cinemana.shabakaty.com](https://cinemana.shabakaty.com) وتفتحها مباشرةً في **PotPlayer** على ويندوز — مع تحميل الترجمة العربية تلقائياً ومعلومات الحلقة الصحيحة.

## Features | المميزات

- **One-click playback** — floating button inside the video player (bottom-right)
- **Arabic subtitles** — auto-downloaded and injected into PotPlayer (cached per episode GUID)
- **Correct title** — series name + season (S1/S2) + episode number (e.g. `House of the Dragon - S1E3`)
- **Resume from last position** — remembers where you stopped and opens PotPlayer from there, per episode
- **Episode switching in the same tab** — supports SPA navigation within the same page without leaking progress between episodes
- **Pause site video** — clicking "Open in PotPlayer" immediately pauses the Cinemana player
- **Diagnostics page** — `log.html` to trace every event and download the log when needed
- **Fast** — uses the native Windows protocol handler (no slow bridges)

---

- **تشغيل بنقرة واحدة** — زر عائم داخل مشغّل الفيديو (أسفل يمين)
- **ترجمة عربية** — تُحمَّل وتُحقن في PotPlayer تلقائياً (مع كاش حسب GUID الحلقة)
- **عنوان صحيح** — اسم المسلسل + الموسم (S1/S2) + رقم الحلقة (مثل `House of the Dragon - S1E3`)
- **استئناف من مكان التوقف** — يتذكّر وين وقفت ويفتح PotPlayer من نفس الموضع لكل حلقة
- **تبديل الحلقات بنفس التاب** — يدعم تنقّل SPA داخل نفس الصفحة بدون تسرّب التقدّم بين الحلقات
- **إيقاف فيديو الموقع** — عند الضغط على "فتح في PotPlayer" يوقف مشغّل Cinemana فوراً
- **صفحة تشخيص** — `log.html` لتتبّع كل الأحداث وتنزيل السجل عند اللزوم
- **سريع** — يستخدم معالج البروتوكول الأصلي في ويندوز (بلا جسور بطيئة)

## Installation | التثبيت

### 1. Register the protocol handler (one-time) | تسجيل معالج البروتوكول (مرة واحدة)

> **Administrator** rights are required for this step. | تحتاج **صلاحيات Administrator** لهذه الخطوة.

1. Download or clone this repo
2. Go to the `setup/` folder
3. Double-click **`register.bat`** → approve the UAC prompt
4. Done — the `cinemana-player://` protocol is now registered

---

1. حمّل أو استنسخ هذا المستودع
2. اذهب لمجلد `setup/`
3. انقر مزدوجاً على **`register.bat`** → وافق على طلب UAC
4. انتهينا — أصبح بروتوكول `cinemana-player://` مسجّلاً

### 2. Install the extension | تثبيت الإضافة

1. Open `brave://extensions` (or `chrome://extensions`)
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked**
4. Select the `cinemana-potplayer` folder
5. The extension icon appears — you're ready!

---

1. افتح `brave://extensions` (أو `chrome://extensions`)
2. فعّل **Developer mode** (الزر بالأعلى يمين)
3. اضغط **Load unpacked**
4. اختر مجلد `cinemana-potplayer`
5. يظهر أيقونة الإضافة — جاهز!

## Usage | الاستخدام

1. Go to any video page on cinemana.shabakaty.com
2. Play the video
3. Click the **▶ Open in PotPlayer** button (bottom-right of the player)
4. PotPlayer opens with the video + subtitle + episode title, and the site video pauses

### Episode switching | تبديل الحلقات
Switch to any episode **in the same tab** (no reload) → click the button → the new episode opens from the start (position 0) with its correct title (season + episode).

بدّل لأي حلقة **بنفس التاب** (بدون تحديث) → اضغط الزر → تفتح الحلقة الجديدة من الصفر (موضع 0)، وعنوانها الصحيح (موسم + حلقة).

### Clear progress | مسح التقدّم
The **↺** button (next to the open button) clears the saved position for this episode so it starts from the beginning.

زر **↺** (بجانب زر الفتح) يمسح موضع التوقف المحفوظ لهذه الحلقة لتبدأ من البداية.

## How it works | كيف يعمل

| Component | Role |
|-----------|------|
| `content.js` | Injects the floating button, extracts title/episode from the DOM, builds the protocol URL |
| `background.js` | Captures video + subtitle URLs via `webRequest` + collects the diagnostics log |
| `setup/open.vbs` | VBScript handler — parses the URL, downloads the subtitle, launches PotPlayer |
| `setup/register.reg` | Registers the `cinemana-player://` protocol in Windows |
| `log.html` | Page to view/download the diagnostics log from the extension |

## Troubleshooting | استكشاف الأخطاء

- **Button doesn't appear?** Reload the page and make sure the video is playing
- **Subtitle not loading?** Check `%TEMP%\cinemana_sub.vtt` exists after clicking
- **Protocol not working?** Re-run `setup/register.bat` as admin
- **Episode switching not working?** Make sure you click **Reload** on the extension in `chrome://extensions` after each update

---

- **الزر ما يظهر؟** أعِد تحميل الصفحة وتأكد إن الفيديو يشتغل
- **الترجمة ما تحمّل؟** تأكد وجود `%TEMP%\cinemana_sub.vtt` بعد الضغط
- **البروتوكول ما يشتغل؟** أعِد تشغيل `setup/register.bat` كـ admin
- **تبديل الحلقات ما يشتغل؟** تأكد من عمل **Reload** للإضافة في `chrome://extensions` بعد كل تحديث

## Developer | المطوّر

**Muhammad ALI** — [GitHub](https://github.com/muhammadALI-14)

## License | الرخصة

MIT
