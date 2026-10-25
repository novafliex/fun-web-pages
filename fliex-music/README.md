# Fliex Music — A Personal Music Space

深空观测站主题的沉浸式私人音乐播放器。左下巨大的银白线框星球缓慢自转、随声音轻微呼吸，中央是漂浮的同步中文歌词，右侧是可分类、可搜索的长播放列表与折叠的听歌档案。它首先是一件可交互的数字作品，其次才是音乐管理工具。

- 视觉母题：Signal From Somewhere — Monochrome / Deep Space / Orbital
- 技术栈：React 18 + TypeScript + Vite，全局单例 `HTMLAudioElement`
- 数据：歌曲/歌单/友链全部由 `public/config/*.json` 配置驱动；收藏、历史、偏好只保存在访客自己的浏览器

## 功能

**已完成（V1）**

- 播放核心：播放/暂停、上一首/下一首（播过 3 秒后"上一首"回到本曲开头）、进度拖动、音量与静音、列表循环/单曲循环/随机播放
- 状态恢复：刷新后回到上次播放的歌曲与进度（不会自动发声，遵守浏览器自动播放策略）
- 歌词：标准 `.lrc` 解析、逐行同步高亮、点击跳转、手动滚动后可一键"返回正在播放"、无歌词/纯音乐优雅占位
- 播放列表：全部 / 配置歌单 / 私人歌单 / 我喜欢的 分类、面板内搜索、当前曲目声波标识（与心形收藏严格区分）、列表内部滚动
- **私人歌单（访客本机功能）**：创建 / 重命名 / 删除歌单，从「···」菜单或歌单内多选添加歌曲，移除与上下移动排序，播放全部 / 随机播放；播放歌单 = 生成临时队列，上一首/下一首/随机按队列执行且不影响歌单本身；「下一首播放」插入队列；数据存本机并跨刷新恢复（队列一并恢复）
- **音乐随笔（私人音乐日记）**：点击「音乐随笔」标签 → `＋ 写点什么` 新建；Markdown 编辑 / 预览（标题、引用、列表、粗体、行内代码；渲染前全部转义，杜绝脚本注入）；**自动保存草稿**（刷新不丢）；可关联曲库歌曲（点击歌名直接播放，写作时音乐不中断）；搜索、删除（二次确认）、JSON 导出 / 导入（同 id 保留较新版本）；公开随笔通过 `public/config/notes.json` 下发（**只读**，与访客本地随笔分区展示）；歌曲「···」菜单有「为这首歌写随笔」直达
- 听歌档案：默认折叠的 LISTENING ARCHIVE 入口；有效收听（达到 min(30 秒, 音轨 50%)）才计入；支持清空
- 收藏：本机持久化
- **Customize（实时预览工作台，五个分类）**：
  - Background：主题预设（带缩略色块，Original Space / Cold Nebula / Pure Black / Custom Image）、背景图上传（缩略图预览 + 文件状态 + 移除，存 IndexedDB）、暗度 / 模糊 / 缩放 / 焦点 / 显示方式、颗粒透明度、星点密度、星轨开关
  - Orb：显示/隐藏星球、大小 / 线条亮度 / 节点密度 / 位置偏移（含一键恢复默认位置）/ 音乐响应强度
  - Lyrics：Focus / Classic / Minimal 预设 + 行数 / 字号 / 行距 / 对齐 / 当前句亮度 / 其他句透明度 / 区域位置与宽度 / 自动滚动开关
  - Layout：播放器（悬浮/紧凑、右下/居中/左下、透明度、宽度）、控制台宽度、终端状态与品牌导航显隐
  - Motion：背景粒子、星球旋转与速度、鼠标视差、音频响应、动效质量（高/低省电）、低动态模式、对比度
  - **Before / After**：按住「按住对比原始」临时查看原始深空主题（不写入存储），松开恢复修改
  - 底部固定 **Reset / Save / Export / Import**（Reset 两段确认；导出 JSON 含版本校验、未知字段兼容、非法参数修正，不含图片数据）
- **Discover（作品展示，宽幅右侧浮层）**：PERSONAL SPACES 仅展示配置中的真实作品（当前两个：本站 Fliex Music — 点击返回 Listen；NovaFliex Blog — 新标签页打开 https://novafliex.github.io/ ）。作品数据集中在 public/config/spaces.json（id / name / category / description / image / linkType: internal|external / url）；internal 作品点击关闭面板回 Listen，external 以新标签页打开；没有截图时显示细线视觉占位，随时可用 image 字段替换
- **Guestbook（留言墙）**：基于 giscus + GitHub Discussions 的真实留言 / 回复 / 表情回应；未配置时显示"留言暂未开放"（配置步骤见下文），加载失败可重试且不影响其他功能
- **生成式视觉装置（Generative Cosmic Signal）**：三层 Canvas —— 背景粒子场 / 透视投影粒子天体（主壳点云 + 0.8R 内壳 + 柔和边缘辉光，不再是实心半球）/ 信号流场（连续向量场驱动的流动线条与尾迹）；低/中/高三段频带分别驱动呼吸、流速与枢纽辉光；全部参数可在 Customize 调整
- **沉浸模式**：按 F 隐藏导航与面板，只留音乐与歌词（Esc 退出）；Esc 也可关闭侧面板
- 视觉：基准星域图 1:1 铺底 + 动态线框星球（斐波那契球面粒子网络、边缘高光、音频响应）、稀疏闪烁星点
- 可访问性：键盘操作（Space 播放暂停、←/→ 切歌、F 沉浸、Esc 关闭）、aria 标注、`prefers-reduced-motion` 支持
- 兼容：GitHub Pages 子路径部署（base 自动推导）、禁用本地存储时降级为会话内存

**未做（V1 边界）**：账号体系、云同步、全网曲库搜索、上传、自由拖拽画布。

## 本地开发

```bash
cd fliex-music
npm install
npm run dev        # 开发（默认 base 为 /fun-web-pages/fliex-music/）
npm run test       # 单元测试（LRC / 配置校验 / 存储 / 听歌计时）
npm run typecheck  # 类型检查
npm run build      # 产物输出到 dist/
npm run preview    # 本地预览构建产物
```

> 开发服务器地址为 `http://localhost:5173/fun-web-pages/fliex-music/`（带 base 路径）。部署到其他仓库名时，构建前设置环境变量 `DEPLOY_BASE`（如 `DEPLOY_BASE=/你的仓库名/`）；仓库内的工作流会按 `GITHUB_REPOSITORY` 自动推导。

## 添加一首歌曲

1. 把音频与封面放入 `public/music/`、`public/covers/`（音频必须是合法再分发的内容）；
2. 在 `public/config/songs.json` 追加：

```json
{
  "id": "demo-001",
  "title": "Example Track",
  "artist": "Demo Artist",
  "album": "Optional Album",
  "audio": "music/example.mp3",
  "cover": "covers/example.jpg",
  "lyrics": "lyrics/example.lrc",
  "duration": 214
}
```

3. 纯音乐 omit `lyrics` 字段即可，页面会显示"纯音乐 · 请欣赏"。

## 添加歌词

`public/lyrics/example.lrc`，标准 LRC 格式：

```
[ti:歌曲名]
[00:12.30]第一句歌词
[00:17.80]第二句歌词
```

- 一行多时间戳（`[00:12.00][01:30.00]副歌`）会展开为多行；
- 非法行被跳过，不影响其余歌词；全部无时间戳时按非同步歌词整段展示。

## 歌单 / 友链 / 品牌文案

- `public/config/playlists.json`：`{ "id": "personal", "name": "私人歌单", "description": "...", "songIds": ["demo-001"] }`，`songIds` 必须存在于 songs.json（启动时校验）。
- `public/config/spaces.json`：Discover 作品列表。每个作品：`id` / `name` / `category` / `description` 必填；`linkType` 为 `external` 时 `url` 必须是可访问的 http(s) 地址，为 `internal` 时点击返回 Listen（不需要 url）；`image` 为真实预览图（放在 public/ 下，如 `covers/spaces/xxx.png`），省略时使用视觉占位。
- `public/config/site.json`：品牌名、副标、中英文短句、GitHub/联系/投稿链接（`links.submit` 指向接收友链投稿的 Issue 页）；`giscus` 填入 `{ "repo", "repoId", "category", "categoryId" }` 启用留言墙，留 `null` 关闭。
- `public/config/notes.json`（可选）：站点主人发布的**公开随笔**（访客只读）。格式 `[{ "id", "title", "content"(Markdown), "songId"(可选，关联 songs.json 的 id), "createdAt", "updatedAt" }]`。访客自己在浏览器里写的随笔与此完全独立，也不会写回仓库。

## 开启 Guestbook 留言墙（giscus 配置步骤）

留言墙已接入 `@giscus/react` + GitHub Discussions，当前配置映射方式为 **specific**（全站共用一条名为 `Fliex Music Guestbook` 的 Discussion，严格标题匹配），访客用 GitHub 账号留言/回复/表情回应，无需自建后端。

Fork 后换成你自己的留言墙：

1. 在你的仓库 **Settings → General → Features** 勾选 **Discussions**；
2. 安装 [giscus GitHub App](https://github.com/apps/giscus) 并只授权给你的仓库；
3. 打开 [giscus.app/zh-CN](https://giscus.app/zh-CN)：填入仓库名，映射方式选 **specific（特定字符串）** 并填写固定标识（如 `Fliex Music Guestbook`），**严格匹配建议开启**，分类选 General（或新建 Announcements 类型分类）；
4. 复制页面生成的 `data-repo-id` 与 `data-category-id`（形如 `R_kgDO...` / `DIC_kwDO...`）——**必须来自该页面，不能编造**；
5. 写入 `public/config/site.json`：

```json
"giscus": {
  "repo": "你的用户名/你的仓库",
  "repoId": "页面生成的 repoId",
  "category": "General",
  "categoryId": "页面生成的 categoryId",
  "term": "Fliex Music Guestbook",
  "strict": "1",
  "inputPosition": "bottom"
}
```

6. `npm run dev` 打开 Discover → Guestbook 验证组件加载；部署后在线上再验证一次。
7. 不想开启时把 `giscus` 设为 `null`，访客只会看到「留言暂未开放」。

> 注意：giscus 组件要求站点以 http(s) 访问，`localhost` 开发可用；未安装 App 或 Discussions 未开启时组件不会出现，属正常现象。

## 两种配置的区别

- **Browser Customization（浏览器定制）**：访客在 Customize 面板里做的修改（背景图、星球、歌词、布局参数）只保存在当前浏览器（localStorage + IndexedDB），刷新后恢复，换浏览器或别人访问时不受影响，**不会写入仓库**。
- **Deployment Theme（部署主题）**：站点主人修改源码里 `public/config/*.json` 与代码默认值后提交部署，所有访客看到的默认样子随之改变。想让定制随网站永久生效，把参数写成默认值或放入配置再部署；Customize 的"导出配置"JSON 可以作为参考，但其中不含本地背景图片（背景图需要手动放进仓库资源目录并在配置中引用）。

## 部署（GitHub Pages）

仓库自带 `.github/workflows/pages.yml`：push 到 main 后自动构建 fliex-music、原样复制其他作品目录、发布整站。需要在仓库 Settings → Pages 中把 Source 设为 **GitHub Actions**。

部署后访问 `https://<用户名>.github.io/<仓库名>/fliex-music/`；其他作品（Rose Galaxy 等）同时保留可访问。

## 数据与隐私

- 本地存储键：`fliex-music:v1:player` / `favorites` / `history` / `preferences`，读取时经结构校验，损坏即回退默认；自定义背景图存 IndexedDB（`fliex-music` 库，仅本机）。
- 访客的收藏、历史、设置、上传的背景只存在其浏览器，不会上传或共享。
- 历史记录上限 200 条，可在档案视图中手动清空；Customize 支持配置导出/导入（JSON）与恢复默认。
- 浏览器禁用本地存储时自动降级为"本次会话有效"，Customize 中会提示。

## 版权说明

- 仓库中的示例音频/封面/歌词仅供演示，请确认再分发授权后再使用自己的内容；
- 代码与媒体内容授权彼此独立；公开静态站点上音频路径对任何访问者可见，真正私密的音乐不要放进公共仓库。
