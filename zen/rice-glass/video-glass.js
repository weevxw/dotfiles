(() => {
  const MARK = "⁠";
  const MIN_W = 320;
  const MIN_H = 180;
  const isTop = window === window.top;

  const watching = () => {
    const fs = document.fullscreenElement;
    for (const v of document.getElementsByTagName("video")) {
      if (v.ended || v.readyState < 2) continue;
      if (fs && fs.contains(v)) return true;
      if (v.paused && v.currentTime === 0) continue;
      if (v.muted || v.volume === 0) continue;
      const r = v.getBoundingClientRect();
      if (r.width >= MIN_W && r.height >= MIN_H) return true;
    }
    return false;
  };

  const frames = new Set();
  let self = false;
  let marked = false;
  let titleObserver = null;

  const fixTitle = () => {
    if (!document.title.startsWith(MARK)) document.title = MARK + document.title;
  };

  const apply = () => {
    for (const f of frames) if (f.closed) frames.delete(f);
    const want = self || frames.size > 0;
    if (want === marked) return;
    marked = want;
    if (want) {
      fixTitle();

      titleObserver = new MutationObserver(fixTitle);
      titleObserver.observe(document.head ?? document.documentElement, {
        subtree: true,
        childList: true,
        characterData: true,
      });
    } else {
      titleObserver?.disconnect();
      titleObserver = null;
      if (document.title.startsWith(MARK)) document.title = document.title.slice(MARK.length);
    }
  };

  if (isTop) {
    addEventListener("message", (e) => {
      if (typeof e.data?.riceGlassVideo !== "boolean" || !e.source || e.source === window) return;
      if (e.data.riceGlassVideo) frames.add(e.source);
      else frames.delete(e.source);
      apply();
    });
  }

  let last = false;
  let timer = 0;

  const report = (now) => {
    if (now === last) return;
    last = now;
    if (isTop) {
      self = now;
      apply();
    } else {
      window.top.postMessage({ riceGlassVideo: now }, "*");
    }
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => report(watching()), 120);
  };

  for (const type of ["playing", "pause", "ended", "emptied", "volumechange", "loadeddata"]) {
    document.addEventListener(type, schedule, { capture: true, passive: true });
  }
  document.addEventListener("fullscreenchange", schedule, { passive: true });
  addEventListener("pagehide", () => report(false));
})();
