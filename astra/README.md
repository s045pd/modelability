# ENTERPRISE — 企业号 D 型探索档案

直接用现代浏览器打开 **index.html**。这是一个约 0.8 MB 的独立文件，Three.js、样式、模型、纹理和音效全部内置；运行不需要联网或安装工具。

## 已制作
- 银河级 NCC-1701-D 外观：椭圆碟部、次级舰体、双引擎、舰桥结构、相位阵列、偏导盘、舰体标识、装甲分区、舷窗、逃生舱盖、散热格栅与导航灯。
- 四个探索区域：主舰桥、与舰桥实际连通的长走廊、轮机舱、穿梭机库。
- 第一人称行走、实体碰撞、可操作滑动舱门、占用安全联锁、涡轮升降机目的地选择。
- 外观视角、自动环绕、部件标注、结构线框、曲速视觉效果、两种照明、可选环境音、两档画质。
- 触屏行走按钮、实时平面图、键盘指南。

## 操作
- 外观：鼠标拖动旋转；滚轮缩放；右键拖动平移。R 重置；H 切换简洁展示。
- 舱内：WASD / 方向键行走；Shift 加速；拖动环视，或点击「锁定鼠标」。Esc 释放鼠标。
- 靠近舱门按 E，或点击屏幕交互提示。走廊尽头的涡轮升降机可选择其他区域。
- 音效默认关闭，点击扬声器后开启。画质较慢可切换右下角「流畅画质」。

## 范围说明
这是程序化同人重建，不是官方影视生产模型、精确工程 CAD 或整艘舰船所有甲板的逐舱复刻。全舰参考参数与本体验实际开放区域已在界面中区分。跨甲板通过场景切换，舰桥和本层走廊则可直接走通。机库穿梭机和走廊侧门为外观陈设，不提供进一步进入。

Star Trek 相关名称与标识属于其权利人。Three.js 采用 MIT 许可证，许可文本已嵌入 HTML。

## 维护源文件
最终用户仅需 `index.html`。修改源码才需要 Node.js：

```sh
npm ci
npm run build
npm test
```

- `src/exterior.js`：舰体曲面与实例化外观细节。
- `src/interiors.js`：内部空间、灯光、家具与舱门。
- `src/textures.js`：程序化装甲、窗列与标识纹理。
- `src/geometry.js`：安全曲面轮廓、行走碰撞和舱门占用检查。
- `src/main.js`：场景、镜头、交互与界面状态。
- `src/shell.html`：中文界面与自适应布局。
- `build.mjs`：生成内嵌全部代码的单文件。

## 参考
- [StarTrek.com 舰型介绍](https://www.startrek.com/en-un/news/unveiling-the-official-lego-enterprise-d)
- [官方重建舰桥布景导览](https://www.startrek.com/en-un/videos/star-trek-picard-enterprise-d-tour)
- [Three.js 文档](https://threejs.org/docs/)
