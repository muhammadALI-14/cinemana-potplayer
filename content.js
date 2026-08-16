// content.js — يعمل داخل صفحة الحلقة على cinemana.shabakaty.com
// مسؤول عن: حقن زر "فتح في PotPlayer" بالمكان المحدد، وربطه بمنطق
// طلب الرابط الملتقط من background.js وفتح PotPlayer.
// إصدار: v1.3 (iframe مخفي + عنوان)

console.log("[Cinemana→PotPlayer] content.js v1.5 محمّل");

const BUTTON_ID = "cinemana-potplayer-btn";

function createButton() {
  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.className = "cinemana-potplayer-button";
  btn.type = "button";
  btn.innerHTML = `<span class="cpp-icon">▶</span><span>فتح في PotPlayer</span>`;
  btn.addEventListener("click", onButtonClick);
  return btn;
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

function extractTitle() {
  const h1 = document.querySelector("h1");
  const showName = (h1 && h1.textContent.trim()) ? sanitizeTitle(h1.textContent) : sanitizeTitle(document.title.replace(/\s*[-–]\s*Cinemana.*$/i, ""));
  const epNum = findEpisodeNumber();
  if (showName && epNum) return showName + " - " + epNum;
  return showName;
}

function findEpisodeNumber() {
  const bodyText = document.body.innerText;
  const m1 = bodyText.match(/الموسم[:\s]*(\d+).*?الحلقة[:\s]*(\d+)/);
  if (m1) return "S" + m1[1] + "E" + m1[2];
  const m3 = bodyText.match(/الحلقة[:\s]+(\d+)/);
  if (m3) return "Ep. " + m3[1];
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const s of scripts) {
    try {
      const d = JSON.parse(s.textContent);
      const ep = d.episodeNumber || d.episode || (d.partOf && d.partOf.episodeNumber);
      if (ep) return "Ep. " + ep;
    } catch(e) {}
  }
  const nd = document.getElementById("__NEXT_DATA__");
  if (nd) {
    try {
      const d = JSON.parse(nd.textContent);
      const ep = JSON.stringify(d).match(/"episodeNumber"\s*:\s*(\d+)/);
      if (ep) return "Ep. " + ep[1];
    } catch(e) {}
  }
  return null;
}

function sanitizeTitle(name) {
  // نزيل رموزاً قد تكسر فاصل العنوان (backslash) أو تفسير الرابط
  return (name || "").replace(/[\\/:*?"<>|]/g, "").trim();
}

function buildPotPlayerUri(videoUrl, title, subUrl) {
  if (subUrl) {
    let uri = "cinemana-player://" + videoUrl.replace(/:\/\//g, "%3A%2F%2F");
    if (title) { uri += "%5C" + title; }
    uri += "#sub=" + subUrl.replace(/:\/\//g, "%3A%2F%2F");
    return uri;
  }
  let uri = "potplayer://" + videoUrl;
  if (title) { uri += "\\" + title; }
  return uri;
}

function openInPotPlayer(videoUrl, title, subUrl) {
  const uri = buildPotPlayerUri(videoUrl, title, subUrl);
  console.log("[Cinemana→PotPlayer] فتح بروتوكول:", uri);

  // نفتح البروتوكول عبر iframe مخفي — هذا ما يسبب أي تنقّل لإطار
  // الصفحة الرئيسي، فالمشغل بالموقع (SPA) يبقى سليماً وما يختفي.
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = uri;
  document.body.appendChild(iframe);
  setTimeout(() => iframe.remove(), 3000);
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

    if (!response || !response.ok || !response.url) {
      showToast("شغّل الفيديو أولاً ثم اضغط الزر");
      return;
    }

    const title = extractTitle();
    const subs = response.subs || {};
    const subUrl = subs.ar || subs.en || null;

    openInPotPlayer(response.url, title, subUrl);

    if (subUrl) {
      showToast(title ? "جارِ فتح PotPlayer: " + title + " + ترجمة ✓" : "جارِ فتح PotPlayer + ترجمة ✓");
    } else {
      showToast(title ? "جارِ فتح PotPlayer: " + title : "جارِ فتح PotPlayer...");
    }
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
}

// مراقبة تغيّرات الصفحة (المحتوى يُحمّل ديناميكياً، وتبديل الحلقات
// قد يصير بدون إعادة تحميل كامل للصفحة)
const observer = new MutationObserver(() => {
  injectButtonIfNeeded();
});

observer.observe(document.body, { childList: true, subtree: true });

// محاولة أولى فورية
injectButtonIfNeeded();

// مراقبة تغيّر رابط الصفحة (تبديل حلقة داخل SPA) لإزالة الزر القديم
// وإعادة حقنه من جديد مرتبط بالحلقة الجديدة
let lastHref = location.href;
setInterval(() => {
  if (location.href !== lastHref) {
    lastHref = location.href;
    const oldBtn = document.getElementById(BUTTON_ID);
    if (oldBtn) oldBtn.remove();
    injectButtonIfNeeded();
  }
}, 800);
