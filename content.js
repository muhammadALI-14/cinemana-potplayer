// content.js — يعمل داخل صفحة الحلقة على cinemana.shabakaty.com
// مسؤول عن: حقن زر "فتح في PotPlayer" بالمكان المحدد، وربطه بمنطق
// طلب الرابط الملتقط من background.js وفتح PotPlayer.
// إصدار: v1.6 (ميزة تذكّر مكان التوقف / Resume)

console.log("[Cinemana→PotPlayer] content.js v1.6 محمّل");

const BUTTON_ID = "cinemana-potplayer-btn";
const RESET_ID = "cinemana-potplayer-reset";

function createButton() {
  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.className = "cinemana-potplayer-button";
  btn.type = "button";
  btn.innerHTML = `<span class="cpp-icon">▶</span><span>فتح في PotPlayer</span>`;
  btn.addEventListener("click", onButtonClick);
  return btn;
}

function createResetButton() {
  const b = document.createElement("button");
  b.id = RESET_ID;
  b.type = "button";
  b.className = "cinemana-potplayer-reset";
  b.title = "مسح التقدّم — ابدأ من البداية";
  b.textContent = "↺";
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    clearPosition();
    b.style.display = "none";
    showToast("تم مسح التقدّم — سيبدأ من البداية");
  });
  return b;
}

function showToast(message) {
  let toast = document.getElementById("cinemana-potplayer-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "cinemana-potplayer-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("cpp-toast-visible");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.classList.remove("cpp-toast-visible");
  }, 3200);
}

// ===== تسجيل أحداث التشخيص (يُجمع في background.js ويمكن تنزيله) =====
function cpLog() {
  const args = Array.prototype.slice.call(arguments);
  const line = "[" + new Date().toISOString() + "] " +
    args.map(function (a) { return (typeof a === "object" ? JSON.stringify(a) : String(a)); }).join(" ");
  console.log("[CP] " + line);
  try { chrome.runtime.sendMessage({ type: "CP_LOG", line: line }); } catch (e) {}
}

function stripEpisodeFromName(name) {
  return (name || "")
    .replace(/S\d+E\d+/gi, "")
    .replace(/الحلقة\s*\d+/g, "")
    .replace(/Ep\.?\s*\d+/gi, "")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s*-\s*$/, "").trim();
}

// يستخرج الموسم والحلقة من الصفحة الحالية (بعد تبديل SPA ضمن نفس التاب).
// ملاحظة مهمة من فحص bundle الموقع: الموسم يُعرض فقط في رأس التفاصيل
// (GENERAL.SEASON + video.season) بجانب عنوان h1، بينما قائمة الحلقات
// تعرض "الحلقة N" بدون موسم. لذلك نجمع نص الرأس (h1 + أسلافه حتى كتلة
// التفاصيل/الهيدر) للبحث عن الموسم، ونأخذ الحلقة من القائمة/المشغّل.
function getHeaderContext() {
  const h1 = document.querySelector("h1");
  if (!h1) return "";
  const parts = [h1.textContent || ""];
  let el = h1.parentElement;
  // نصعد حتى 10 مستويات أو حتى نصل لعنصر يحوي class فيه detail/header/info
  for (let i = 0; i < 10 && el && el !== document.body; i++) {
    parts.push(el.textContent || "");
    if (/detail|header|info|title|watch/i.test(el.className || "")) break;
    el = el.parentElement;
  }
  return parts.join(" \n ");
}

function findSeasonEpisode() {
  const h1 = document.querySelector("h1");
  const titleText = (document.title || "") + " " + (h1 ? h1.textContent : "");

  // 1) المفضّل: نمط S{n}E{n} من عنوان الصفحة أو h1 (يحوي الموسم والحلقة)
  let m = titleText.match(/S(\d+)\s*E(\d+)/i);
  if (m) { cpLog("SEASON/EPISODE من العنوان S{}E{}:", m[1], m[2]); return { season: m[1], episode: m[2] }; }

  // 2) نمط S{n} وحيد من العنوان/h1 (الموقع يعرض "House of the Dragon - S1")
  m = titleText.match(/\bS(\d+)\b/i);
  let titleSeason = m ? m[1] : null;

  // 3) الحلقة النشطة (iswatching) تعطينا رقم الحلقة الحالي
  let epNum = null;
  let epSeason = null;
  const items = document.querySelectorAll(".episode-item, .keen-slider__slide.item, [class*='episode'], [class*='Episode']");
  for (const it of items) {
    if (/iswatching/i.test(it.className)) {
      const mm = (it.innerText || it.textContent || "").match(/الحلقة\s*(\d+)/);
      if (mm) epNum = mm[1];
      const sm = (it.innerText || it.textContent || "").match(/الموسم\s*(\d+)|موسم\s*(\d+)|Season\s*(\d+)/i);
      if (sm) epSeason = sm[1] || sm[2] || sm[3];
      break;
    }
  }
  // 4) قرب المشغّل (الحلقة الحالية غالباً)
  const player = findVideoContainer();
  if (!epNum && player && player.parentElement) {
    const mm = (player.parentElement.innerText || "").match(/الحلقة\s*(\d+)/);
    if (mm) epNum = mm[1];
  }
  // 5) أول ظهور (احتياط أخير)
  if (!epNum) {
    const mm = (document.body ? document.body.innerText : "").match(/الحلقة\s*(\d+)/);
    if (mm) epNum = mm[1];
  }

  // الموسم: نبحث في نطاق أوسع — رأس التفاصيل (حتى 10 مستويات) + الحاوية
  // الكاملة للمشغّل + نص العنوان + الحلقة النشطة.
  let season = epSeason || titleSeason;
  if (!season) {
    const headerCtx = getHeaderContext();
    let sm = headerCtx.match(/الموسم\s*(\d+)|موسم\s*(\d+)|Season\s*(\d+)/i);
    if (sm) season = sm[1] || sm[2] || sm[3];
  }
  if (!season && player && player.parentElement) {
    const fullCtx = (player.innerText || "") + " " + (player.parentElement.innerText || "");
    const sm = fullCtx.match(/الموسم\s*(\d+)|موسم\s*(\d+)|Season\s*(\d+)/i);
    if (sm) season = sm[1] || sm[2] || sm[3];
  }
  if (!season) {
    // نبحث في كامل الـ body عن "الموسم N" قرب كلمة حلقة
    const sm = (document.body ? document.body.innerText : "").match(/الموسم\s*(\d+)|موسم\s*(\d+)|Season\s*(\d+)/i);
    if (sm) season = sm[1] || sm[2] || sm[3];
  }

  cpLog("SEASON/EPISODE المكتشف:", { season: season, episode: epNum, titleSeason: titleSeason, epSeason: epSeason });
  if (epNum && season) return { season: season, episode: epNum };
  if (epNum) return { season: null, episode: epNum };
  return null;
}

function formatEpisode(se) {
  if (!se) return null;
  return se.season ? ("S" + se.season + "E" + se.episode) : ("Ep. " + se.episode);
}

function extractTitle() {
  const h1 = document.querySelector("h1");
  const raw = (h1 && h1.textContent.trim())
    ? h1.textContent
    : document.title.replace(/\s*[-–]\s*Cinemana.*$/i, "");
  const showName = stripEpisodeFromName(raw);
  const se = findSeasonEpisode();
  const epPart = formatEpisode(se);
  cpLog("TITLE → showName=", showName, " epPart=", epPart);
  if (showName && epPart) return showName + " - " + epPart;
  return showName;
}

// ===== هوية الحلقة الحالية (من DOM — يتغيّر فوراً عند تبديل SPA) =====
// المصدر الموثوق لتحديد الحلقة هو DOM الموقع (رقم الحلقة النشطة + الموسم)
// لأنه يتحدّث فوراً عند تبديل الحلقة، بينما video.currentSrc/GUID يتأخر
// ثوانٍ — وهذا كان سبب تسرّب التقدّم بين الحلقات. نستخدم الهوية كمفتاح
// تخزين ومطابقة للرابط.
function getEpisodeIdentity() {
  const se = findSeasonEpisode();
  const epPart = formatEpisode(se); // "S1E3" أو "Ep. 3"
  const key = "resume:" + location.pathname + "#" + (epPart || "unknown");
  return { se: se, epPart: epPart, key: key };
}

// نستخرج GUID الملف الفريد من رابط الفيديو (ثابت لكل حلقة) — يُستخدم
// فقط كاحتياط لمطابقة الرابط، لا كمفتاح تخزين.
function extractVideoGuid() {
  const v = document.querySelector("video");
  let url = v ? (v.currentSrc || v.src || "") : "";
  if (!/^https?:/i.test(url)) {
    const s = v && v.querySelector("source");
    if (s && s.src) url = s.src;
  }
  const m = url.match(/[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/);
  return m ? m[0] : null;
}

function sanitizeTitle(name) {
  // محتفظ كاحتياط (نستخدم stripEpisodeFromName حالياً)
  return (name || "").replace(/[\\/:*?"<>|]/g, "").trim();
}

function buildPotPlayerUri(videoUrl, title, subUrl, posSeconds) {
  const posPart = (posSeconds && posSeconds > 5) ? "#pos=" + Math.floor(posSeconds) : "";
  // نشفّر // بـ %3A%2F%2F في رابط الفيديو دايماً (سواء بترجمة أو بدون) حتى
  // لا يتكسر البروتوكول عند تمريره لـ open.vbs.
  const safeVideo = videoUrl.replace(/:\/\//g, "%3A%2F%2F");
  if (subUrl) {
    let uri = "cinemana-player://" + safeVideo;
    if (title) { uri += "%5C" + title; }
    uri += "#sub=" + subUrl.replace(/:\/\//g, "%3A%2F%2F");
    return uri + posPart;
  }
  let uri = "potplayer://" + safeVideo;
  if (title) { uri += "\\" + title; }
  return uri + posPart;
}

function openInPotPlayer(videoUrl, title, subUrl, posSeconds) {
  const uri = buildPotPlayerUri(videoUrl, title, subUrl, posSeconds);
  console.log("[Cinemana→PotPlayer] فتح بروتوكول:", uri);

  // نفتح البروتوكول عبر iframe مخفي — هذا ما يسبب أي تنقّل لإطار
  // الصفحة الرئيسي، فالمشغل بالموقع (SPA) يبقى سليماً وما يختفي.
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = uri;
  document.body.appendChild(iframe);
  setTimeout(() => iframe.remove(), 3000);
}

function getLiveMedia() {
  const v = document.querySelector("video");
  if (!v) return { url: null, sub: null };
  let url = v.currentSrc || v.src || "";
  if (!/^https?:/i.test(url)) {
    const s = v.querySelector("source");
    if (s && s.src) url = s.src;
  }
  let sub = null;
  const tr = v.querySelector('track[kind="subtitles"], track[kind="captions"]');
  if (tr && tr.src) sub = tr.src;
  if (!sub) {
    try {
      const tracks = v.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        if ((t.kind === "subtitles" || t.kind === "captions") && t.src) { sub = t.src; break; }
      }
    } catch (e) {}
  }
  return { url: url || null, sub: sub };
}

function finishOpen(videoUrl, subs, title, identity, subUrl) {
  // نوقف الفيديو بمشغّل الموقع حتى لا يستمر بالتشغيل خلف PotPlayer
  pauseSiteVideo();

  // نقرأ موضع التوقف المحفوظ لهذه الحلقة (عبر مفتاح الهوية الفوري)
  // ونمرّره لـ PotPlayer. مفتاح الهوية يضمن عدم تسرّب تقدّم حلقة أخرى.
  getSavedPositionFor(identity.key, function (pos) {
    cpLog("OPEN → title=", title, " identity=", identity.epPart, " key=", identity.key, " pos=", pos, " sub=", subUrl ? "yes" : "no", " url=", videoUrl.slice(0, 60) + "...");
    openInPotPlayer(videoUrl, title, subUrl, pos);
  });

  if (subUrl) {
    showToast(title ? "جارِ فتح PotPlayer: " + title + " + ترجمة ✓" : "جارِ فتح PotPlayer + ترجمة ✓");
  } else {
    showToast(title ? "جارِ فتح PotPlayer: " + title : "جارِ فتح PotPlayer...");
  }
}

// نوقف الفيديو داخل مشغّل الموقع (Cinemana) عند فتح الحلقة في PotPlayer
function pauseSiteVideo() {
  const v = document.querySelector("video");
  if (v && !v.paused) {
    try { v.pause(); cpLog("تم إيقاف فيديو الموقع"); } catch (e) {}
  }
}

function onButtonClick() {
  const btn = document.getElementById(BUTTON_ID);
  if (btn) {
    btn.disabled = true;
    btn.classList.add("cpp-loading");
  }

  chrome.runtime.sendMessage({ type: "GET_VIDEO_URL" }, (response) => {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove("cpp-loading");
    }

    if (chrome.runtime.lastError) {
      showToast("خطأ بالاتصال بالإضافة، حاول تحديث الصفحة");
      return;
    }

    // نحدّد الحلقة من DOM الموقع (فوري عند تبديل SPA) — هذا مفتاح التخزين
    // الصحيح ولا يعتمد على currentSrc المتأخر.
    const identity = getEpisodeIdentity();
    const title = extractTitle();
    const live = getLiveMedia();
    const subs = (response && response.subs) || {};
    const subUrl = live.sub || subs.ar || subs.en || null;

    // أولوية رابط الفيديو:
    //  1) رابط background الملتقط (webRequest) — الأصح لـ Cinemana لأن
    //     currentSrc بالـ <video> غالباً blob/فارغ.
    //  2) live.url (currentSrc) كاحتياط.
    let videoUrl = (response && response.url) ? response.url : null;
    if (!videoUrl && live.url && /^https?:/i.test(live.url)) videoUrl = live.url;

    if (!videoUrl) {
      // الرابط لسه ما انلتقط — نعيد المحاولة مرتين (الفيديو يتأخر بالتحميل)
      let tries = 0;
      const retry = () => {
        if (tries++ > 2) { showToast("شغّل الفيديو أولاً ثم اضغط الزر"); return; }
        chrome.runtime.sendMessage({ type: "GET_VIDEO_URL" }, (r2) => {
          if (r2 && r2.url) {
            finishOpen(r2.url, r2.subs || {}, title, identity, subUrl);
          } else {
            setTimeout(retry, 500);
          }
        });
      };
      retry();
      return;
    }

    finishOpen(videoUrl, subs, title, identity, subUrl);
  });
}

function findVideoContainer() {
  // نبحث عن حاوية المشغل (div يحتوي عنصر <video>) ونحقن الزر فيها
  // بحيث يكون الزر عائماً داخل المشغل (position: absolute) مثل
  // أزرار يويوتيوب.
  const video = document.querySelector("video");
  if (!video) return null;

  // نصعد في الـ DOM نبحث عن حاوية بـ position: relative/absolute
  let el = video.parentElement;
  while (el && el !== document.body) {
    const style = window.getComputedStyle(el);
    if (style.position === "relative" || style.position === "absolute") {
      return el;
    }
    el = el.parentElement;
  }

  // احتياطي: نستخدم الأب المباشر لعنصر الفيديو
  return video.parentElement;
}

function injectButtonIfNeeded() {
  if (document.getElementById(BUTTON_ID)) return;

  const player = findVideoContainer();
  if (!player) return;

  // نتأكد إن الحاوية تدعم position: absolute لأبنائها
  const playerStyle = window.getComputedStyle(player);
  if (playerStyle.position === "static") {
    player.style.position = "relative";
  }

  const btn = createButton();
  player.appendChild(btn);
  // نضيف زر "مسح التقدّم" فقط إن وُجد موضع محفوظ لهذه الحلقة
  getSavedPositionFor(getEpisodeIdentity().key, function(pos) {
    if (pos > 5 && !document.getElementById(RESET_ID)) {
      player.appendChild(createResetButton());
    }
  });
  hookVideo();
}

// ===== ميزة تذكّر موقف التشغيل (Resume) — مفتاح من هوية DOM فورية =====
// المفتاح = path الصفحة + رقم الحلقة المستخرج من DOM (يتغيّر فوراً عند
// تبديل SPA) — لا يعتمد على video.currentSrc/GUID المتأخر.
function savePosition(pos, duration) {
  const key = getEpisodeIdentity().key;
  const data = { pos: pos, duration: duration || 0, savedAt: Date.now(), key: key };
  chrome.storage.local.set({ [key]: data });
}

function getSavedPositionFor(key, callback) {
  chrome.storage.local.get(key, function(r) {
    const v = r[key];
    callback(v && v.pos > 5 ? v.pos : 0);
  });
}

function clearPosition() {
  const key = getEpisodeIdentity().key;
  chrome.storage.local.remove(key);
  cpLog("CLEAR pos للحلقة key=", key);
}

let hookedVideo = null;
let lastSaveAt = 0;

function hookVideo() {
  const video = document.querySelector("video");
  if (!video || video === hookedVideo) return;
  hookedVideo = video;
  cpLog("HOOK new video (الحلقة تُحدّد من DOM):", getEpisodeIdentity().key);

  // حفظ دوري كل 3 ثوانٍ أثناء المشاهدة
  video.addEventListener("timeupdate", function () {
    const now = Date.now();
    if (now - lastSaveAt > 3000 && video.currentTime > 5 && !video.paused && !video.ended) {
      lastSaveAt = now;
      savePosition(video.currentTime, video.duration);
    }
  });
  // حفظ فوري عند الإيقاف المؤقت
  video.addEventListener("pause", function () {
    if (video.currentTime > 5 && !video.ended) savePosition(video.currentTime, video.duration);
  });
  // مسح التقدّم عند انتهاء الحلقة (تبدأ من جديد المرة القادمة)
  video.addEventListener("ended", clearPosition);
  // حفظ عند مغادرة الصفحة
  window.addEventListener("pagehide", function () {
    if (video.currentTime > 5 && !video.ended) savePosition(video.currentTime, video.duration);
  });
}

// ===== مراقبة تبديل الحلقة داخل نفس التاب (SPA) =====
// نتتبّع هوية الحلقة المستخرجة من DOM (path + رقم الحلقة): تتغيّر فوراً
// عند تبديل الحلقة حتى لو بقي نفس مسار الصفحة. نعيد حقن الزر ونمسح الكاش.
// ملاحظة: لا نرسل CLEAR_CAPTURED أثناء التحميل الأولي (unknown → S1E1)
// لأن ذلك يمسح رابط الفيديو الملتقط قبل ما يضغط المستخدم الزر.
let lastIdentity = getEpisodeIdentity().key;
let bootDone = false;
setTimeout(() => { bootDone = true; }, 2500); // نسمح بالتهيئة الأولى

function onEpisodeMaybeChanged() {
  const newIdentity = getEpisodeIdentity().key;
  if (newIdentity === lastIdentity) return;
  const wasValid = /#S\d+E\d+|#Ep\./.test(lastIdentity);
  const isNowValid = /#S\d+E\d+|#Ep\./.test(newIdentity);
  lastIdentity = newIdentity;
  const oldBtn = document.getElementById(BUTTON_ID);
  if (oldBtn) oldBtn.remove();
  const oldReset = document.getElementById(RESET_ID);
  if (oldReset) oldReset.remove();
  hookedVideo = null;
  // نمسح الفيديو الملتقط فقط عند تبديل حلقة حقيقي (valid→valid) بعد
  // اكتمال التهيئة — لا أثناء التحميل الأولي.
  if (bootDone && wasValid && isNowValid) {
    cpLog("EPISODE CHANGED →", newIdentity);
    try { chrome.runtime.sendMessage({ type: "CLEAR_CAPTURED" }); } catch (e) {}
  } else {
    cpLog("IDENTITY UPDATE (بدون مسح التقاط):", newIdentity);
  }
  injectButtonIfNeeded();
}

// مراقبة تغيّرات الصفحة (المحتوى يُحمّل ديناميكياً، وتبديل الحلقات
// قد يصير بدون إعادة تحميل كامل للصفحة)
const observer = new MutationObserver(() => {
  injectButtonIfNeeded();
  onEpisodeMaybeChanged();
});

observer.observe(document.body, { childList: true, subtree: true });

// فحص دوري احتياطي لتتبّع تبديل الحلقة (يدقق كل 800ms)
setInterval(onEpisodeMaybeChanged, 800);

// محاولة أولى فورية
injectButtonIfNeeded();
