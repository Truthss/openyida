---
name: yida-page-design
description: 宜搭单页设计子流程。用于已有应用里新增单个自定义页面、页面美化、重构、视觉升级和主题范围确认。
---

# page-design

单页设计子流程。已有应用里单独新增自定义页面也执行本流程，先形成该页设计说明，再交给页面开发；不要求先做完整应用规划。用于自定义页面的新增或美化：页面美化、视觉升级、官网首页、列表、看板、大屏、详情、工作台和表单入口体验优化。

已有页面美化先由 [ui-improve](../ui-improve/SKILL.md) 编排。本文件只提供主题证据和设计方法；方案确认前写入独立草稿，不能覆盖有效 `design.md` 或主题 CSS。确认及备份完成后才交接实现，不得因主题缺失自动修改应用主题，也不得把原有表单打开方式、业务交互或导航改成默认实现。

## Step 1：读取应用主题与功能契约

单页设计和页面重构先确认当前应用主题，同时记录现有功能契约。页面美感提升默认属于 UI-only 改造：调整布局、密度、间距、视觉层级、素材和图标表达，业务功能保持原样。

| 证据来源 | 读取内容 | 写入设计补充 |
| --- | --- | --- |
| 用户给出的应用 URL、`appType`、页面 URL、resource context | 目标应用、目标页面、页面所处业务上下文 | `appType`、`pageFormUuid`、`themeEvidence.source` |
| `project/config.json`、`.cache/<项目名>-schema.json`、`.openyida-page.json` | 已记录的 app/page/form、themeProfile、页面视觉摘要 | `themeEvidence.source=workspace` |
| 当前应用配置中的 `colour`、`themeColor`、`navTheme` | 当前应用主色和导航明暗 | `currentAppTheme` |
| 已有 Page Spec / 页面源码中的 `themeProfile`、应用主题消费方式 | 页面正在消费的应用主题 token | `currentPageTheme` |
| 已有 Page Spec / 页面源码 / 用户描述中的按钮、筛选、数据源、表单入口、跳转、权限、状态 | 当前页面功能契约和业务动作 | `functionContract` |

主题证据齐全时，页面重构和局部美化默认沿用当前应用 `colour` / `themeColor`。旧主题新增页面先执行下方范围确认。主题证据缺失时，记录 `themeEvidence.status=missing`，继续只读核对应用能力；能力未知时按页面局部方案设计，不因缺失自动生成、上传应用主题。

## 旧主题应用新增页面的风格范围

先用 `openyida app-theme snapshot <appType> --output-dir <新的本地目录> --json` 读取主题证据；核对目标应用与服务端解析的 `appThemeEnable`、`appThemeMode`。只有 `y` / `modern` 才按新版主题处理；`appThemeEnable=n` 或 `appThemeMode=legacy` 属于旧主题，其余记录为能力未知，不凭应用版本或存储的主题名判断。

旧主题应用新增自定义页面时，先读取用户已有选择。用户明确要求沿用当前风格、指定新页面独立风格，或已有同范围的确认，直接沿用，不重复问。没有明确方向时通过 `ask_human` 确认一次：

> 新增页面希望采用哪种风格？
> - 与现有应用风格保持一致。
> - 保留现有导航和其他页面，仅把新增自定义页面设计得更现代、更独立。

问题只确认视觉范围；不附带主题升级、隐藏导航或全应用换肤。等待选择期间可核对数据与业务入口，不实施依赖选择的页面样式。能力未知时先说明尚未确认主题能力，再询问同样的页面范围，继续保留应用原配置。

- **沿用应用风格**：`themeDecision=follow-app`，消费已验证的平台变量；按当前页面任务设计层级、密度、卡片和交互，不照搬旧页面布局。
- **仅新增页独立设计**：`themeDecision=page-enhance`，在当前页面设计章节写清局部颜色、字体、表面、圆角、密度与状态。局部变量使用页面命名空间并声明在该页根容器，样式选择器均限定到该根；不修改平台 `:root`、`html`、`body`、父容器或应用主题变量。antd 控件与浮层也须落在本页已验证的样式作用域，检查浮层挂载和颜色继承。

独立视觉是页面内的设计范围，不要求新增自绘导航。保留现有平台导航、其他页面和主题模式；不写 `customThemeStyle`，不自动升级主题。确需应用层覆盖时，另按 [旧主题应用的样式作用域与确认](../../references/application-style-library.md#旧主题应用的样式作用域与确认) 核查并确认，页面独立风格的选择不能替代该确认。

两种选择均输出当前页 `design.md` 补充，记录主题能力证据、用户选择及来源、页面样式作用域、首屏焦点、布局、卡片密度、状态与响应式验收。可复用主题目录的视觉规则，但不把整份应用 CSS 包进页面根节点冒充局部实现。

## 共享主题消费

先读取当前应用的 `design.md`，沿用已确认主题和组件规则；不重新选型或为单页另建主题库。尚无主题契约且本次需要确定风格时，按 [共享主题选择规则](../../references/theme-selection.md) 只读 [主题索引](../../templates/design-themes/index.json) 摘要，选中后读取一份完整主题，再补当前页面的项目化设计。局部美化仍保持应用主题、导航和功能契约；已确认的旧主题新增页独立方案按上方页面范围实现，不执行应用主题同步。

## 完整步骤

| 步骤 | 复用文件 | 单页执行重点 |
| --- | --- | --- |
| 1 | 本文件：读取应用主题与功能契约 | 获取 `currentAppTheme`、`currentPageTheme`、`themeEvidence`、`functionContract` |
| 2 | [读取整理后的用户需求](../../workflow/step-1-read-brief.md) | 聚焦当前页面的用户、任务、业务对象和 UI-only 改造目标；没有完整应用需求文件时使用当前页面上下文 |
| 3 | [选择主题色和 token](../../workflow/step-2-theme-system.md) | 先按已确认范围设计；旧主题页面局部方案仅交付页面样式，应用级换肤另走主题流程 |
| 5 | [页面结构和交互设计](../../workflow/step-4-wireframe-interaction.md) | 明确布局骨架、主操作、详情抽屉、表单提交入口和 PC/移动端差异 |
| 6 | [UI 视觉和状态设计](../../workflow/step-5-visual-states.md) | 细化当前页视觉、素材、图标、空态、加载态、错误态和业务化自检 |
| 7 | [写入 design.md](../../workflow/step-6-handoff.md) | 输出当前页面的设计补充，交给 `yida-canvas-custom-page` 实现；业务或页面契约变化时交给 `yida-prd` 更新 PRD |

## 主题决策口径

- 沿用应用主题时，`themeProfile.name` 使用当前应用主题 key，`themeColorSource=application-theme`；旧主题新增页已确认独立设计时，名称和颜色来源按用户选择与实际设计填写，在当前页正文说明局部作用域，不据此更新应用主色。
- 新版主题下的共享角色由 `yida-design` 收敛到应用主题文件；已确认的旧主题新增页独立设计保留页面局部变量，不提升为应用变量。
- 页面重构/局部美化：以当前应用主题为基准，使用 `design.md` 确定的品牌色阶和语义变量。
- 页面美感提升/改 UI：`functionContract` 保持稳定，现有数据源、字段映射、按钮动作、筛选逻辑、提交 URL、权限和业务状态按原有实现交付。
- 用户明确要求更换应用整体主色时，先核对主题能力及应用级授权，再执行 `openyida sample yida-design app-theme --output <app-theme.css> --design-file prd/<项目名>/design.md` 复制模板并按 `design.md` 自动替换 token；严禁重新生成或覆盖整份 CSS。
- 用户明确要全应用换肤：将诉求回到 `yida-design` 的主题色和 token 分支，输出应用主题 CSS、`themeColor` 和 `navTheme`。
- 单页只做局部美化：保持平台导航和应用主题稳定，直接使用当前主题变量。

## 输出补充字段

在 [design.md 输出格式](../../workflow/output-design.md) 基础上补充：

```markdown
- themeEvidence：<source/status/currentAppTheme/currentPageTheme>
- currentAppTheme：<colour/navTheme/config.COLOUR 或 missing>
- currentPageTheme：<当前应用主题变量或 missing>
- themeDecision：<follow-app / page-enhance / app-theme-update>
- functionContract：<保留的数据源/字段映射/按钮动作/筛选逻辑/提交 URL/权限/状态>
- changeScope：<UI-only：颜色/布局/密度/间距/视觉层级/素材/图标>
- 页面范围说明：<主题能力证据、用户选择及来源、根选择器、变量与浮层作用域、保留的导航和其他页面>
```
