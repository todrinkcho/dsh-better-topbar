# @todrink/dsh-better-topbar

把 DSH 侧栏顶部的入口收成一行统一图标，让侧栏只剩工作区内容。

## 做了什么

| 位置 | 内容 |
| --- | --- |
| 窗口标题栏带（宿主的原生位） | **收起侧边栏**：宿主自己的 `[data-sidebar-toggle]`，插件完全不碰（桌面端它在 `left:12px; top:6px`） |
| 侧栏顶部一行 | **主页**（原 brand 按钮，房子图标）+ **插件 / 项目文件夹 / 自动化任务 / 更多**（宿主 `nav` 入口列表，横向 chip） |
| 侧栏 | `DEEPSEEK HARNESS` 品牌标记隐藏，只剩「新会话 + 工作区」 |
| 底部 | 设置 + 账号保持宿主原位 |

行几何：chip 28×28，间距 4px。收起按钮在标题栏带、图标行在它下面一行（侧栏从菜单带下面开始），两者不占同一行，
所以图标行从 **14px** 起，让 16px glyph 落在宿主的图标列 **x=20** 上；入口从 46px 起。图标 16×16、1px 描边、`currentColor`。

## 图标统一的规则

- 五个 glyph 都在 **16×16 网格、1px 描边、圆头圆角、同色** 下绘制，颜色走 `--dsw-alias-label-secondary`，激活态转 `--dsw-alias-label-primary`。
- 插件 / 自动化任务 / 更多 / 项目文件夹四个图标直接使用 **DSH 自带图标路径**（`plugin-pinwheel-outline`、`clock-outline`、`apps-add-outline`、`folder-open-outline`），和侧栏其它图标是同一套画法；房子按同网格自绘（宿主没有 home 图标）。
- 图标用 **CSS mask**（`::before` + `mask-image` + `background-color: currentColor`）绘制，所以颜色随主题/token 变化；宿主原 glyph（包括第三方插件注册的实心图标）在分类命中时隐藏。
- 整个 mask 规则放在 `@supports` 里：不支持 mask 的浏览器既不画也不藏，直接保留宿主原图标，不会出现实心方块。
- 按 `aria-label` 分类，中英文都认：插件 / 项目文件夹 / 自动化任务 / 更多。**分类不到的入口保留自己的图标**，只归一到 16px。

## 实现要点

- **不重建任何入口**：只给宿主已有的容器/按钮打 `data-tbn-*` 标记，再用 CSS `position: fixed` 搬位置。点击、弹层锚点、固定/取消固定、快捷键、aria 全部留在宿主手里。
- 宿主结构锚点：`nav`（入口竖排，`[data-slot="sidebar.panellist"]` 只是图标槽）、`[data-slot="sidebar.brand.mark"]`（主页按钮内部）、`[class*="logoRow"]`。
- **收起按钮不动**：不打标记、不改坐标。它在标题栏带（`y=6..34`），图标行在侧栏里（`y=46..74`），垂直不重叠，所以水平方向也不用给它留位。
- 行高按实际内容撑开（`--tbn-pad = max(40, 行高 + 12)`），插件新增入口换行时预留区自动变高。
- 按钮全部 `-webkit-app-region: no-drag`，层级 `z-index: 31`（压在 better-sidebar 的 25 层之上，菜单之下）。
- 折叠成 48px 图标栏时整体让位（`data-tbn-compact`，所有 chip 规则都带 `:not([data-tbn-compact])`），继续用宿主原生 rail。
- 几何变量只在值变化时写（`setVar`）；`ensureStyle()` 每次都会刷新样式文本（热替换后旧的 `<style>` 可能还在）。

## 用到的 token（都在本版 DSH 里存在）

| 用途 | token |
| --- | --- |
| 图标常态 / 激活 | `--dsw-alias-label-secondary` / `--dsw-alias-label-primary` |
| hover、菜单打开 | `--dsw-alias-interactive-bg-hover` |
| 悬停文字气泡 | `--dsw-alias-tooltip-bg` / `--dsw-alias-tooltip-label` |
| 圆角 | `--dsw-radius-sm`（8px，和宿主的 28px iconButton 一致；`--dsw-radius-md` 是 12px） |

注意：`--dsw-alias-bg-hover` / `--dsw-alias-bg-inverse` / `--dsw-alias-label-inverse` **这一版里都不存在**（旧代码一直在吃 fallback），不要再写。

## 验证

- `node --check`；`tools/verify-client.cjs` 断言 glyph 网格/描边、mask URL、中英分类、chip 几何（`INSET=14`、入口在 `+32`）、关键 selector、无死 token、不得出现 `data-tbn-toggle`。
- **真浏览器复测（web profile，同一套 UI 代码）**：`tools/measure-web.mjs` 量到 home `(14,6,28,28)`、入口 `46 / 78 / 110 / 142`、`--tbn-pad=40`，`::before` 的 mask 与 `background-color: rgb(97,102,107)` 都在。
- 桌面端真机截图（UIA 量）：收起按钮 `(12,6,28,28)`，图标行在 `y=46`。

## 生效方式（重要）

**改完 `client.js` 后，桌面端的窗口必须重启 DSH 才能加载新模块。** 本版 DSH 的 client-hmr 会重建并下发新文件，但不会把这个已经挂载的客户端模块重新执行一遍；桌面壳也没有绑定 Ctrl+R / F5。开发时用 `dsh web --port 6011 --no-open` 起一个 web 实例 + `tools/measure-web.mjs` 验证几何，再重启桌面端看最终效果。

## 已知坑

`client.js` 里的 CSS 是模板字符串，**注释里不要出现反引号**，否则会提前闭合字符串，整个 client 静默不执行（报 `Unexpected identifier '...'`）。

## 待办 / 观察项

- 图标行起点 14px 依赖「收起按钮在图标行上面一行」这个前提：如果哪天菜单带被藏掉、侧栏从 y=0 开始，收起按钮（12,6）就会和主页 chip（14,6）重叠，需要改成「按 toggle 的实际 rect 决定行首或行高」。
- 折叠态没回归：`logoRow` 在折叠态仍被压成 0 高（沿用旧行为）；宿主 rail 的 toggle 是 `position: fixed`，不受影响。
