/* ============================================
   SHOWCASE — 入场动画 + 3D 倾斜效果 (性能优化版)
   ============================================ */

const showcaseModule = {
  init() {
    // 检查是否支持 hover (排除大部分纯触摸设备)
    const canHover = window.matchMedia('(hover: hover)').matches;

    // IntersectionObserver → 滚动触发入场动画和按需加载 Tilt
    const sections = document.querySelectorAll('.showcase-section');
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 触发入场动画
            entry.target.classList.add('showcase--visible');

            // 如果支持 hover 且未初始化过 VanillaTilt，则初始化
            if (canHover) {
              const card = entry.target.querySelector('.showcase-card');
              if (card && !card.vanillaTilt && typeof VanillaTilt !== 'undefined') {
                VanillaTilt.init(card, {
                  max: 15,
                  speed: 400,
                  glare: true,
                  "max-glare": 0.3,
                  scale: 1.02,
                  easing: "cubic-bezier(.03,.98,.52,.99)",
                });
              }
            }
          }
        });
      },
      { threshold: 0.15 } // 提前一点点触发
    );

    sections.forEach((s) => observer.observe(s));
  },
};

document.addEventListener('DOMContentLoaded', () => {
  showcaseModule.init();
});
