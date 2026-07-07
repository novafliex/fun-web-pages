/* ============================================
   MAGNETIC CURSOR LOCIC (4-Corner Bracket, Hero Only)
   首屏专属：当靠近文字/交互区域时浮现四个角框死死咬定元素
   ============================================ */

const MagneticCursor = {
  cursor: null,
  dot: null,
  frame: null,

  mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  pos: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  
  speed: 0.25,

  active: false,
  targetEl: null, 

  init() {
    if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) return;

    this.createCursor();
    this.bindEvents();
    this.animate();
    this.addMagneticElements();
  },

  createCursor() {
    this.cursor = document.createElement('div');
    this.cursor.className = 'magnetic-cursor';
    
    this.dot = document.createElement('div');
    this.dot.className = 'magnetic-cursor-dot';
    
    // 创建包围边框及四个独立角落
    this.frame = document.createElement('div');
    this.frame.className = 'magnetic-cursor-frame';
    
    const tl = document.createElement('div'); tl.className = 'cursor-corner cursor-corner-tl';
    const tr = document.createElement('div'); tr.className = 'cursor-corner cursor-corner-tr';
    const bl = document.createElement('div'); bl.className = 'cursor-corner cursor-corner-bl';
    const br = document.createElement('div'); br.className = 'cursor-corner cursor-corner-br';
    
    this.frame.appendChild(tl);
    this.frame.appendChild(tr);
    this.frame.appendChild(bl);
    this.frame.appendChild(br);

    this.cursor.appendChild(this.dot);
    this.cursor.appendChild(this.frame);
    document.body.appendChild(this.cursor);
  },

  bindEvents() {
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;

      if (this.targetEl) {
        this.magnetizeElement(e, this.targetEl);
      }
    });

    document.addEventListener('mouseleave', () => this.cursor.style.opacity = '0');
    document.addEventListener('mouseenter', () => this.cursor.style.opacity = '1');
  },

  addMagneticElements() {
    // 监听想要被重点吸附与带有四角框的元素
    const interactables = document.querySelectorAll('.hero-title, .hero-subtitle, .hero-scroll-hint, .showcase-title, .showcase-desc, .showcase-label');
    
    interactables.forEach(el => {
      el.addEventListener('mouseenter', () => {
        this.active = true;
        this.targetEl = el;
        this.cursor.classList.add('active');
        
        // 读取目标元素宽高并稍微加一点内补间放大
        const rect = el.getBoundingClientRect();
        this.frame.style.width = `${rect.width + 16}px`;
        this.frame.style.height = `${rect.height + 16}px`;
      });

      el.addEventListener('mouseleave', () => {
        this.active = false;
        this.targetEl = null;
        this.cursor.classList.remove('active');
        
        // 脱离吸附时框恢复为 0
        this.frame.style.width = '0px';
        this.frame.style.height = '0px';
        
        el.style.transform = '';
      });
    });
  },

  magnetizeElement(e, el) {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    
    // 给字母或者小标签非常柔和的向外延展物理牵拉感，仿佛被鼠标吸起
    const magneticStrength = 0.15; 
    let moveX = dx * magneticStrength;
    let moveY = dy * magneticStrength;

    // 限幅拉扯，保持克制高级感
    if(moveX > 10) moveX = 10;
    if(moveX < -10) moveX = -10;
    if(moveY > 10) moveY = 10;
    if(moveY < -10) moveY = -10;

    el.style.transform = `translate(${moveX}px, ${moveY}px)`;
  },

  animate() {
    let targetX = this.mouse.x;
    let targetY = this.mouse.y;

    if (this.active && this.targetEl) {
        // 当咬住元素时，外面的四个角框应该牢牢锁定元素重心
        const rect = this.targetEl.getBoundingClientRect();
        const elCx = rect.left + rect.width / 2;
        const elCy = rect.top + rect.height / 2;
        
        const dx = this.mouse.x - elCx;
        const dy = this.mouse.y - elCy;
        
        // 框略微追随物理鼠标方向产生错位悬浮立体感，但整体依然吸附在文字周围
        targetX = elCx + dx * 0.08;
        targetY = elCy + dy * 0.08;
        
        // 如果元素处于运动（如被拉扯），框体要保证始终包裹最新的形状
        this.frame.style.width = `${rect.width + 16}px`;
        this.frame.style.height = `${rect.height + 16}px`;
    }

    this.pos.x += (targetX - this.pos.x) * this.speed;
    this.pos.y += (targetY - this.pos.y) * this.speed;

    // 中心微点精确跟着硬鼠标走
    this.cursor.style.transform = `translate3d(${this.mouse.x}px, ${this.mouse.y}px, 0)`;
    
    const frameOffsetX = this.pos.x - this.mouse.x;
    const frameOffsetY = this.pos.y - this.mouse.y;
    
    // 被拖动的四边框
    this.frame.style.transform = `translate(calc(-50% + ${frameOffsetX}px), calc(-50% + ${frameOffsetY}px))`;

    requestAnimationFrame(() => this.animate());
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    MagneticCursor.init();
  }, 150);
});
