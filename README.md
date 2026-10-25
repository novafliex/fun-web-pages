# fun-web-pages

收集有趣的 Web 页面，用 HTML、CSS 和 JavaScript 实现一些创意和交互。

## 页面

- [Rose Galaxy](Rose%20Galaxy/index.html)：银河风格的个人展示页，包含动态背景、图片展示和音乐播放器。
- [NOVA Music Studio](NOVA%20Music%20Studio/index.html)：实验视觉风格的音乐播放器，中央慢旋转"声音天体"装置，右侧歌词面板可展开 / 收起，含曲库搜索、收藏与本地听歌档案（听歌时长统计、导出 / 导入）。
- [Fliex Music](fliex-music/)：深空线框星球主题的沉浸式私人音乐播放器（React + TypeScript + Vite），漂浮同步歌词、长播放列表、本地收藏与听歌档案。详见 [fliex-music/README.md](fliex-music/README.md)。

## 预览

Rose Galaxy 与 NOVA Music Studio 直接打开各自 `index.html` 即可；Fliex Music 需要 Node 环境：

```bash
cd fliex-music
npm install && npm run dev
```

或在仓库根目录启动静态服务预览前两者：

```bash
python -m http.server 5500
```

访问 [http://localhost:5500/Rose%20Galaxy/](http://localhost:5500/Rose%20Galaxy/) 或 [http://localhost:5500/NOVA%20Music%20Studio/](http://localhost:5500/NOVA%20Music%20Studio/)。

## 目录约定

每个页面独立放在一个文件夹中；纯静态页面包含入口 `index.html` 和所需资源，`fliex-music/` 为独立的前端工程（构建产物不提交）。

## 部署

GitHub Pages 工作流（`.github/workflows/pages.yml`）在 push 到 main 时自动构建：Rose Galaxy 与 NOVA Music Studio 原样复制，Fliex Music 使用 Vite 构建产物，统一发布。使用前需在仓库 Settings → Pages 将 Source 设为 GitHub Actions。
