// background.js — Service Worker
// مسؤول عن: مراقبة طلبات الشبكة لالتقاط رابط الفيديو المباشر
// (mp4 موقّع)، تخزينه لكل تاب، والاستجابة لرسائل content.js.
// ملاحظة: الترجمة بموقع cinemana مدمجة داخل الفيديو (burned-in)،
// فلا يوجد ملف ترجمة منفصل لالتقاطه.

const VIDEO_URL_PATTERN = /_video\.mp4\?/i;
const VIDEO_HOST_PATTERN = /(cdn|cndw\d*)\.shabakaty\.com/i;

// نمط ملف الترجمة
const SUBTITLE_URL_PATTERN = /_(ar|en)_transfile\.vtt\?/i;
const SUBTITLE_HOST_PATTERN = /shabakaty\.com/i;

// خزن آخر رابط ملتقط لكل تاب
// الشكل: { [tabId]: { video: {url, capturedAt}, subs: { ar: url, en: url } } }
const captured = {};

function getEntry(tabId) {
  if (!captured[tabId]) {
    captured[tabId] = { video: null, subs: {} };
  }
  return captured[tabId];
}

function isCandidateVideoUrl(url) {
  try {
    const u = new URL(url);
    return VIDEO_HOST_PATTERN.test(u.hostname) && VIDEO_URL_PATTERN.test(url);
  } catch (e) {
    return false;
  }
}

function matchSubtitleUrl(url) {
  try {
    const u = new URL(url);
    if (!SUBTITLE_HOST_PATTERN.test(u.hostname)) return null;
    const m = url.match(SUBTITLE_URL_PATTERN);
    return m ? m[1].toLowerCase() : null;
  } catch (e) {
    return null;
  }
}

// مراقبة الطلبات (قراءة فقط — بدون حجب أو تعديل)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0) return; // تجاهل الطلبات اللي مو من تاب مرئي

    if (isCandidateVideoUrl(details.url)) {
      const entry = getEntry(details.tabId);
      entry.video = { url: details.url, capturedAt: Date.now() };
      console.log("[Cinemana→PotPlayer] رابط فيديو ملتقط:", details.url);
      return;
    }

    const lang = matchSubtitleUrl(details.url);
    if (lang) {
      const entry = getEntry(details.tabId);
      entry.subs[lang] = details.url;
      console.log("[Cinemana→PotPlayer] رابط ترجمة ملتقط (" + lang + "):", details.url);
    }
  },
  { urls: ["*://*.shabakaty.com/*"] }
);

// تنظيف التخزين عند إغلاق التاب
chrome.tabs.onRemoved.addListener((tabId) => {
  delete captured[tabId];
});

// تنظيف التخزين فقط عند تغيّر رابط الصفحة فعلياً (انتقال لحلقة/فيديو مختلف)
// وليس عند أي حدث "loading" عابر (اللي يصير كثير بالـ SPA وكان يمسح الرابط
// الملتقط قبل لا يضغط المستخدم الزر)
const lastKnownUrl = {};
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    const prev = lastKnownUrl[tabId];
    if (prev && prev !== changeInfo.url) {
      delete captured[tabId];
    }
    lastKnownUrl[tabId] = changeInfo.url;
  }
});

// الاستماع لرسائل من content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : message.tabId;

  if (message.type === "GET_VIDEO_URL") {
    const entry = captured[tabId];
    const video = entry && entry.video ? entry.video.url : null;
    const subs = entry ? entry.subs : {};
    console.log(
      "[Cinemana→PotPlayer] طلب رابط لتاب",
      tabId,
      "→ فيديو:",
      video || "لا يوجد",
      "ترجمة:",
      subs.ar ? "عربي ✓" : subs.en ? "إنكليزي ✓" : "لا يوجد"
    );
    sendResponse({ ok: !!video, url: video, subs });
    return true;
  }

  return false;
});
