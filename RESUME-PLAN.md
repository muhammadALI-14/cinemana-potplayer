# Cinemana → PotPlayer — خطة الإصلاح الجذري (v1.10.0)

## المشكلة الجذرية (تبديل الحلقات بنفس التاب)
كان التقدّم/الرابط يتسرّب بين الحلقات رغم تبديل SPA لأن:
1. `onButtonClick` كان يقرأ `video.currentSrc` في لحظة واحدة — والموقع
   **يتأخر بتحديث `src`** لثوانٍ بعد تبديل الحلقة، فيُلتقط GUID الحلقة **القديمة**.
2. مفتاح التخزين `getResumeKey()` كان مشتقاً من `extractVideoGuid()` وقت
   الحفظ/القراءة — نفس مشكلة التأخير → يتسرّب موضع الحلقة القديمة.

## الحل المطبّق (مُختبر بمحاكاة كاملة ✅)
- متغير عالمي `currentStableGuid` = المصدر الموثوق لتحديد الحلقة.
- `onEpisodeMaybeChanged()` يحدّث `currentStableGuid` **فوراً** عند رصد
  تبديل SPA (تغيّر GUID أو href) — قبل ما يستقر الفيديو الجديد.
- `captureStableMedia(timeout, cb)`: ينتظر حتى يُظهر `currentSrc` GUIDاً
  **مطابقاً لـ `currentStableGuid`** (الحلقة الصحيحة) قبل الفتح؛ إن انتهت
  المهلة يرجّع الرابط الحالي. هذا يضمن عدم فتح رابط الحلقة القديمة حتى
  لو كان `currentSrc` لسه قديم وقت الضغط.
- `getResumeKey()` / `savePosition()` / `getSavedPosition()` كلها تعتمد
  على `currentStableGuid` (لا قراءة `currentSrc` وقت الحفظ).
- `hookVideo()` يربط `currentStableGuid` بالفيديو المربوط فعلياً.

## نتيجة المحاكاة (السيناريو الأسوأ)
- حلقة 2 (A) + تقدّم 240s → مفتاح `resume:AAAA...` pos=240.
- تبديل SPA لحلقة 3 (B) → مفتاح `resume:BBBB...` pos=0 ✅ (ما تسرّب).
- ضغط الزر والـ currentSrc لسه A (الموقع متأخر) → الرابط انفتح BBBB،
  pos=0 ✅ (لا تسرّب، يبدأ من الصفر).

## استخراج العنوان (الموسم + الحلقة)
- الموقع Angular SPA؛ يُعرض الموسم فقط في **رأس التفاصيل** بجانب h1
  (i18n `GENERAL.SEASON + video.season`)، بينما قائمة الحلقات تعرض
  "الحلقة N" بدون موسم.
- `getHeaderContext()` يجمع نص h1 + أسلافه حتى كتلة detail/header للبحث
  عن الموسم. `findSeasonEpisode()` يفضّل نمط `S{n}E{n}` من العنوان، وإلا
  يجمع الموسم من الرأس + الحلقة من القائمة النشطة (iswatching).

## التشخيص
- `cpLog()` يسجّل كل خطوة ويرسلها لـ background.js (`CP_LOG`)، وتُحفظ في
  `chrome.storage.local` مفتاح `cp_diag_log`.
- صفحة `log.html` (options_page) تعرض/تنزل السجل كـ `cinemana_potplayer_log.txt`.

## خطوات التطبيق الإلزامية
1. Reload الإضافة في `chrome://extensions` بعد كل تعديل.
2. افتح حلقة → اضغط الزر → افتح `chrome-extension://<id>/log.html`
   وتأكد: `OPEN → title= ... - S1E3  guid=...  pos=0  sub=yes`.
3. بدّل حلقة بنفس التاب → اضغط الزر → يجب تفتح من الصفر (pos=0) + عنوان
   الحلقة الجديدة + سطر `EPISODE CHANGED` بالسجل.
