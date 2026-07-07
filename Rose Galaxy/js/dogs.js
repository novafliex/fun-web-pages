/**
 * Interactive Footer Dogs Easter Egg
 * Charlie and Max (Awwwards Creative Style)
 */

document.addEventListener("DOMContentLoaded", () => {
  const dogContainer = document.getElementById("fixed-dogs");
  if (!dogContainer) return;

  // ==================================
  // 1. Lenis Velocity Binding (Wind Effect)
  // ==================================
  if (window.lenis) {
    window.lenis.on('scroll', (e) => {
      const velocity = Math.abs(e.velocity);
      
      if (velocity > 30) {
        dogContainer.classList.add("is-windy");
      } else {
        dogContainer.classList.remove("is-windy");
      }
    });
  }

  // ==================================
  // 2. Click Tracker (5 clicks in 1.5 seconds)
  // ==================================
  let clickCount = 0;
  let clickTimer = null;
  const CLICK_THRESHOLD = 5;
  const TIME_WINDOW_MS = 1500;
  
  // 断电模式状态时间常量
  const BLACKOUT_TOTAL_DUR = 6000; // 6s total display

  dogContainer.addEventListener("click", () => {
    clickCount++;
    
    if (clickCount >= CLICK_THRESHOLD) {
      triggerBlackout();
      clickCount = 0;
      clearTimeout(clickTimer);
    } else {
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        clickCount = 0;
      }, TIME_WINDOW_MS);
    }
  });

  // ==================================
  // 3. Blackout Easter Egg logic
  // ==================================
  function triggerBlackout() {
    if (document.body.classList.contains("is-blackout")) return;
    
    // 强制接管页面控制权，显示纯黑幕布与祝福文字
    document.body.classList.add("is-blackout");
    
    // 优雅恢复：6秒后移除 blackout 解锁页面（配合 CSS 的 fade-out 平滑褪去黑幕）
    setTimeout(() => {
      document.body.classList.remove("is-blackout");
    }, BLACKOUT_TOTAL_DUR);
  }
});
