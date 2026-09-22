# modelability

同一个提示词、不同模型的产出对比：让各家模型用 **Three.js** 从零程序化生成一艘可探索的 **企业号 (USS Enterprise)** 星舰，第一人称走进舰内。这个仓库把各模型的原始产出放进各自目录，配上 GitHub Pages 在线演示，方便直接对比渲染效果、性能和代码组织方式。

> 提示词的隐含要求之一是"单个 HTML 文件"（不依赖构建工具即可双击打开）。下表标注了每个模型是否真的做到了这一点。

## 在线演示

| 模型目录 | 在线演示 | 是否单 HTML 文件 | 备注 |
|---|---|---|---|
| [astra](astra/) | [Demo](https://s045pd.github.io/modelability/astra/) | ✅ 是（`index.html` 约 0.8MB，代码/纹理/音效全内嵌，`build.mjs` 打包生成） | 唯一严格满足"单文件"要求且不依赖模块加载的实现 |
| [grok4.7](grok4.7/) | [Demo](https://s045pd.github.io/modelability/grok4.7/enterprise.html) | ✅ 是（`enterprise.html` 单文件，内部用 `<script type="module">` + importmap） | 文件名不是 `index.html`，需要走完整路径访问 |
| [grok4.6](grok4.6/) | [Demo](https://s045pd.github.io/modelability/grok4.6/dist/) | ❌ 否（`index.html` + 独立 `src/*.js`/`*.css`，需 Vite 开发服务器） | 已用 `npm run build` 产出 `dist/`，并把 `vite.config.js` 的 `base` 改成 `'./'` 让打包产物支持部署在子路径下 |
| [opus4.6](opus4.6/) | [Demo](https://s045pd.github.io/modelability/opus4.6/) | ❌ 否（`index.html` + `js/*.js` + `styles.css`） | Three.js 走 CDN importmap，静态托管无需改动 |
| [opus5](opus5/) | [Demo](https://s045pd.github.io/modelability/opus5/) | ❌ 否（`index.html` + `src/**/*.js`） | 原版 importmap 指向本机 `/node_modules/three/...`，部署到子路径会 404；已改成 jsdelivr CDN（对应本地锁定的 `three@0.169.0`） |
| [sonnet5](sonnet5/) | [Demo](https://s045pd.github.io/modelability/sonnet5/) | ❌ 否（`index.html` + `src/**/*.js`） | 已把 importmap 改成 jsdelivr CDN（`three@0.186.0`）修好部署路径问题；另外原版 `src/interior/rooms/shell.js:14` 调用了从未定义的函数 `backWindowWall`（模型自身代码 bug，加载即崩溃白屏），已补上该函数（后墙开窗+窗框+防撞玻璃），确认「舰长舱」「观景休息室」两处窗户均正常渲染 |
| ~~gemini3.8flash~~ | — | — | 目录内容是"鹈鹕骑自行车"动画，和其他目录的"企业号飞船"主题不一致，本轮对比暂未收录，见 `.gitignore` |

## 结构说明

每个模型目录基本保持模型的原始产出，仅做了两类改动，都是为了让站点能在 GitHub Pages 的子路径（`/modelability/<model>/...`）下正常访问，不涉及功能或美术上的修改：

1. **路径修正**：把指向站点根目录的绝对路径（`/src/...`、`/node_modules/...`）改成相对路径或 CDN 地址（`grok4.6`、`opus5`）。
2. **构建产物**：`grok4.6` 基于 Vite，本地开发用的根 `index.html` 需要 `vite dev` 才能跑，故演示用的是 `npm run build` 产出的 `dist/`。

单文件类型的模型（`astra`、`grok4.7`）不需要任何改动，本地双击 `index.html` / `enterprise.html` 即可直接运行；其余多文件结构的模型需要通过 HTTP 服务器访问（本地可用 `python3 -m http.server` 或各目录自带的 `npm start`），直接用 `file://` 打开会因 ES module 的跨域限制白屏。

## 本地预览

```bash
# 在仓库根目录起一个静态服务器，可以按 GitHub Pages 的路径结构逐个访问
python3 -m http.server 8080
# 然后打开 http://localhost:8080/<model>/
```

或使用各模型目录自带的 `npm start`（见各自 `README.md` / `package.json`）。
