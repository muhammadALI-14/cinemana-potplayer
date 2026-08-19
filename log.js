// log.js — صفحة عرض/تنزيل سجل تشخيص الإضافة
const KEY = "cp_diag_log";

function render() {
  chrome.storage.local.get(KEY, (r) => {
    const arr = r[KEY] || [];
    document.getElementById("out").textContent =
      arr.length ? arr.join("\n") : "(لا توجد سجلات بعد — افتح حلقة واضغط الزر)";
  });
}

document.getElementById("refresh").addEventListener("click", render);

document.getElementById("download").addEventListener("click", () => {
  chrome.storage.local.get(KEY, (r) => {
    const arr = r[KEY] || [];
    const blob = new Blob([arr.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cinemana_potplayer_log.txt";
    a.click();
    URL.revokeObjectURL(url);
  });
});

document.getElementById("clear").addEventListener("click", () => {
  chrome.storage.local.remove(KEY, render);
});

render();
setInterval(render, 2000);
