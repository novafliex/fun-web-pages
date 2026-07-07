# fun-web-pages

一个用来存放有趣 Web 页面想法的小仓库。

这里不追求“完整产品”，更像是一个前端创意实验室：想到一个有画面感、交互感或者个人风格的页面，就把它做出来、放进来、慢慢迭代。

## 当前页面

### Rose Galaxy

`Rose Galaxy/` 是目前的第一个页面实验，主题偏个人主页与沉浸式展示。

主要内容包括：

- 银河感 Hero 首屏与动态 canvas 背景
- 个人介绍与图片展示区
- 电影/审美偏好展示模块
- 扑克牌样式音乐播放器
- 平滑滚动、悬浮动画、自定义光标
- 回到顶部、固定装饰和隐藏彩蛋

入口文件：

```text
Rose Galaxy/index.html
```

## 项目结构

```text
fun-web-pages/
├─ README.md
└─ Rose Galaxy/
   ├─ index.html
   ├─ css/
   │  ├─ global.css
   │  ├─ hero.css
   │  ├─ showcase.css
   │  ├─ melody.css
   │  ├─ poker.css
   │  ├─ galaxy.css
   │  ├─ cursor.css
   │  ├─ dogs.css
   │  ├─ audio-wave.css
   │  └─ footer.css
   ├─ js/
   │  ├─ smooth-scroll.js
   │  ├─ galaxy-canvas.js
   │  ├─ showcase.js
   │  ├─ poker.js
   │  ├─ cursor.js
   │  ├─ dogs.js
   │  ├─ hero-anim.js
   │  └─ audio-wave.js
   └─ img/
      └─ 页面图片资源
```

## 如何运行

这是一个静态前端项目，可以直接打开 HTML 文件预览：

```text
Rose Galaxy/index.html
```

也可以在项目根目录启动一个本地静态服务，例如：

```bash
python -m http.server 5500
```

然后访问：

```text
http://localhost:5500/Rose%20Galaxy/
```

## 技术与依赖

项目主要使用原生前端技术：

- HTML
- CSS
- JavaScript
- Canvas

页面中还通过 CDN 使用了部分辅助库：

- Lenis：平滑滚动
- Vanilla Tilt：卡片倾斜交互
- Google Fonts：字体资源

## 适合放进来的页面想法

后续可以继续加入这些类型的小页面：

- 会随鼠标移动变化的视觉首页
- 个人歌单、影单、书单展示页
- 节日祝福页、生日页、纪念日页面
- 交互式时间轴或成长记录
- 小型小游戏或解谜页面
- CSS/Canvas 动画练习
- 充满个人审美的单页作品集

## 开发记录

这个仓库会持续收集一些灵感型页面。每个页面可以独立成一个文件夹，保留自己的 `index.html`、`css/`、`js/` 和 `img/` 资源，方便单独预览和维护。

## 目标

把突然想到的、有点好玩的 Web 页面都认真做一做。

不一定复杂，但要有自己的氛围、交互和记忆点。
