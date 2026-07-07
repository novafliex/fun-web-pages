/**
 * Smooth Scroll Implementation (Lenis)
 * 丝滑的全局平滑滚动
 */

document.addEventListener("DOMContentLoaded", () => {
  if (typeof Lenis === "undefined") {
    return;
  }

  // Initialize Lenis
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
    direction: "vertical", 
    gestureDirection: "vertical", 
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  });

  // Expose lenis globally for other scripts to bind scroll events if needed
  window.lenis = lenis;

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);
});
