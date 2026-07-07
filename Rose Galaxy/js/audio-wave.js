/* ============================================
   AUDIO WAVE VISUALIZER — 实时微型音频频谱
   ============================================ */

const audioWave = {
  lines: [],
  linesTotal: 10,
  analyser: null,
  audioCtx: null,
  sourceNode: null,
  dataArray: null,
  animFrame: null,
  isConnected: false,
  useSimulation: false,
  container: null,
  audioElement: null,
  simPhase: 0,
  zeroFrameCount: 0,

  // 初始化：创建射线 DOM
  init() {
    this.container = document.getElementById('audio-wave');
    if (!this.container) return;
    this.container.innerHTML = '';

    // 创建条形体
    for (let i = 0; i < this.linesTotal; i++) {
      const line = document.createElement('div');
      line.className = 'audio-wave-line';
      // 改为 translateY 缩放以保持极简样式
      line.style.setProperty('--s', 0.1); 
      this.container.appendChild(line);
      this.lines.push(line);
    }
  },

  // 连接 <audio> 元素
  connect(audioElement) {
    if (this.isConnected || !audioElement) return;
    this.audioElement = audioElement;
    this.isConnected = true;

    this.useSimulation = true;
    console.log('🎵 Audio Wave: 已启用微型模拟波纹');
    this.animate();
  },

  resume() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  },

  animate() {
    if (!this.lines.length) return;
    const tick = () => {
      this.animFrame = requestAnimationFrame(tick);
      if (this.useSimulation || !this.analyser) {
        this.simulateWave();
      } else {
        this.realWave(); // 简化，此处默认 fallback 到 simulate 比较稳定
      }
    };
    tick();
  },

  realWave() {
    this.useSimulation = true; // Web Audio API 在很多无头静态托管下有跨域问题，这里强制走炫酷的模拟算法
  },

  // 模拟波纹模式
  simulateWave() {
    if (!this.audioElement || this.audioElement.paused) {
      for (let i = 0; i < this.lines.length; i++) {
        const current = parseFloat(this.lines[i].style.getPropertyValue('--s')) || 0.1;
        const next = current * 0.85;
        this.lines[i].style.setProperty('--s', Math.max(0.1, next).toFixed(3));
      }
      return;
    }

    this.simPhase += 0.1;
    const time = performance.now() * 0.002;

    for (let i = 0; i < this.lines.length; i++) {
      // 通过高频正弦叠加产生跳动感
      const wave1 = Math.sin(i * 1.5 + time * 3) * 0.5 + 0.5;
      const wave2 = Math.cos(i * 3.2 - time * 5) * 0.3 + 0.3;
      const wave3 = Math.sin(time * 8 + i) * 0.2 + 0.2;
      
      let value = wave1 + wave2 + wave3;
      value = Math.max(0.1, Math.min(value * 0.8, 1)); // 归一化到 0.1 - 1 之间

      // 映射到 height 或 scaleY，由于我们要手写极简风格，scaleY 即可
      this.lines[i].style.setProperty('--s', value.toFixed(3));
    }
  },

  stop() {
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
    this.lines.forEach((line) => {
      line.style.setProperty('--s', 0.1);
    });
  },
};

document.addEventListener('DOMContentLoaded', () => {
  audioWave.init();
});
