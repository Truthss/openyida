# 完整视觉方向候选规则

## 用途

- 用户已说明想要的风格，就按要求设计。
- Plan 没有明确完整风格时，读取本文，准备三套配色、表面层次和组件样式方案供用户选择。
- 用户选界面风格，AI 负责匹配实现用的主题模板。

## 核心关系

```text
应用场景与视觉证据
  → AI 定义项目视觉方向
  → 选择命名模板，或自由创意独立推演
  → 用户选择一套完整方向
  → 风格、配色和主题选择；导航结构沿用业务规划
  → 命名模板的导航明暗由模板派生；自由创意明确设计导航明暗
  → CLI 读取所选完整模板并生成 design.md
```

先按[设计方向比较](../../../references/theme-selection.md#设计方向比较)根据项目需求发展风格，可匹配主题索引中的模板，也可独立推演。按[应用风格与自由创意](../../../references/application-style-library.md)交付。

应用编排先根据业务需求确定导航结构。视觉设计按 [主题与导航兼容规则](../../../references/navigation-decision.md#主题与导航兼容规则) 筛选支持该结构的主题，再设计各页面共用的配色、背景、圆角和组件样式；命名模板的导航明暗采用模板 `navTheme`；自由创意由项目设计明确填写。页面内容、布局和操作顺序按业务规划执行。

配色按模板实际声明处理，固定值、变量引用和主色推导可以组合使用；只计算已有公式，其他色值保持原样。模板声明 `themeProfile.themeColorSource: theme-default` 时，按其默认整套配色展示与选择，并将 `themeProfile.themeColor` 写入 `colorStrategy.primaryColor`；需要改色时，将明确要修改的色值写入 `visualStyle.tokens`；主色声明与 `colorStrategy.primaryColor` 保持一致，其他色阶按视觉需要调整，不自动重染整套配色。已选方向承诺的画布、卡片、填充、字体或辅助色与模板不同时，将具体差异写入 `visualStyle.tokens`，不等待用户逐个指定色值。`description` 和 `colorStrategy.usage` 只说明用途，不会被编译成配色。按 [共用主题规则](../../../references/application-theme-consistency.md) 完成变量后再交接页面；渐变和图片按公共输出契约处理。Fast 与 Plan 使用相同规则。

## 公共选型规则

输入证据优先级、摘要匹配和读取边界统一按 [共享主题选择规则](../../../references/theme-selection.md) 执行。候选使用 `openyida design-plan catalog --json` 的 `themes[].styleSummary`、`label` 和 `previewImage`；直接读 [公共主题索引](../../../templates/design-themes/index.json) 时按 [名称与效果图展示规则](../../../references/theme-selection.md#选择时展示名称与效果图) 关联已有图片；选中后才读取对应的一份完整模板。本文件只规定 Plan 的三套候选、用户可见内容和选择事实写入，不另设评分或主题库。

## 候选结构与约束

生成三项选择：两个具体视觉方向，加一项“自由创意：根据业务重新推演”。用户已明确风格时直接沿用，无需重选。具体方向包含风格名称和适用说明，有对应效果图时附图。下列尖括号是待填写字段，必须按当前项目替换；示例不提供默认颜色：

```json
{
  "directionId": "relationship-context",
  "directionLabel": "关系洞察型",
  "description": "以客户上下文和跟进节奏为视觉主线，层级柔和但关键动作清晰。",
  "themeId": "<有效索引记录，仅内部>",
  "themeLabel": "<catalog 对应主题的 label>",
  "previewImage": { "url": "<catalog 对应主题的 previewImage.url>", "alt": "<catalog 对应主题的 previewImage.alt>" },
  "primaryColor": "<项目实际主色色值>",
  "primaryColorName": "<项目实际主色名称>",
  "contentTone": "light",
  "recommendationReason": "适合需要持续查看关系历史和推进状态的日常工作。"
}
```

`themeLabel` 与 `previewImage` 是本轮展示元数据，不写入 Plan 的视觉事实；无对应图时直接省略 `previewImage`，不传空值、不显示占位或缺图提示。

规则：

1. 按 [共享主题选择规则](../../../references/theme-selection.md) 准备候选，确定推荐项并放在第一项。
2. `directionLabel`、`description` 和 `recommendationReason` 由 AI 根据项目的用户、任务和界面效果编写。
3. `themeId` 必须来自索引，两个模板方向绑定不同记录，自由创意使用 catalog.creativeOption；模板路径由索引在选择后确定性补齐。
4. 模板候选保持已确认的导航结构，但不输出 `navigationTone`。候选可以通过不同主题呈现深色或浅色导航差异，这个差异来自主题模板，而不是 AI 单独填写字段；优先至少两项视觉维度不同。用户约束固定的部分保持不变。
5. 配色依据品牌素材、用户偏好和实际使用场景选择，并写清理由。用户明确菜单明暗时，将其作为主题筛选条件；用户未明确时不推导菜单明暗。
6. 用户明确品牌色时保留该颜色，通过主题基底、材质和组件表达形成差异。
7. 项目色彩按用户约束调整；已确定导航结构作为筛选条件，不能绕过 CLI catalog 返回的 `supportedNavigationLayouts`，导航明暗不得覆盖模板 `navTheme`。AI 自选主题不兼容时更换基底；用户明确指定主题且与明确布局冲突时，通过现有方案确认解决冲突，不擅自改动任一要求。
8. 方案缺少匹配模板时走自由创意，填写独立设计决策和 Token。自由创意的导航明暗由项目设计决定，写入 navigationStyle.tone；内容与导航按[主题明暗双轴](../../../references/application-style-library.md#主题明暗双轴)分别设计。

平台导航沿用 `navigationType` 对应的顶部、侧边或 L 型布局。自定义导航由视觉设计细化顶部、侧边等菜单样式，按该入口已确定的配置范围实施。

## 用户可见边界

进度说明当前应用正在设计的界面效果。例如：“正在为萌宠社交应用设计配色和界面风格，让宠物动态和互动入口更清晰。”应用名与功能使用当前需求中的内容。方案准备好后，直接提问：“萌宠社交应用的这三种界面风格，你更喜欢哪一种？”

风格确定后，写“设计主题风格为{风格名称}，适合{业务场景}”。名称取项目的视觉方向，场景取当前业务用途；建议阶段使用“建议采用……风格”。

用户只看到：

- 对应主题的风格名称 `themeLabel`，可附项目方向 `directionLabel`；
- 有图时展示与该主题一一对应的效果参考图（含替代文字），无图时省略；
- `description`；
- `recommendationReason`；
- 第一项的“推荐”标记。

展示图片时统一注明“效果参考图，实际内容、布局和品牌色按本次方案调整”。展示方式按 [名称与效果图展示规则](../../../references/theme-selection.md#选择时展示名称与效果图) 适配宿主；下例为有图候选的逻辑结构，无图候选删除 `previewImage`；该字段不能直接传给不支持它的工具。文字选项宿主先展示对应图文卡片，再用相同编号和名称提问。

`themeId`、`templatePath` 和模板匹配结果保存在内部实施记录中；千问组件的自然语言回传按共享规则携带 `themeId`，供 Agent 绑定选择，卡片不展示模板路径。

```json
{
  "interactionId": "plan_visual_direction_r{revision}",
  "id": "visual_direction",
  "questionType": "single_choice",
  "title": "选择整体视觉方向",
  "prompt": "{应用名称}的这三种界面风格，你更喜欢哪一种？",
  "options": [
    {
      "value": "<first.directionId>",
      "label": "1 · <first.themeLabel> · <first.directionLabel>（推荐）",
      "previewImage": { "url": "<first.previewImage.url>", "alt": "<first.previewImage.alt>" },
      "description": "<first.description> <first.recommendationReason>"
    },
    {
      "value": "<second.directionId>",
      "label": "2 · <second.themeLabel> · <second.directionLabel>",
      "previewImage": { "url": "<second.previewImage.url>", "alt": "<second.previewImage.alt>" },
      "description": "<second.description> <second.recommendationReason>"
    },
    {
      "value": "free-creative",
      "label": "3 · 自由创意",
      "description": "根据这项业务重新推演构图、材质和表单布局。"
    }
  ],
  "allowCustom": true,
  "aiDefault": "<first.directionId>"
}
```

## 一次保存选择结果

选中一套方向后，一次写入四组事实：

```json
{
  "forUser": {
    "visualDirection": {
      "label": "关系洞察型",
      "description": "以客户上下文和跟进节奏为视觉主线，层级柔和但关键动作清晰。",
      "source": "user_selected"
    },
    "colorStrategy": {
      "source": "user_selected",
      "primaryColor": "<项目实际主色色值>",
      "primaryColorName": "<项目实际主色名称>",
      "usage": "用于主操作、关键焦点和选中状态",
      "confidence": "high"
    },
    "navigationStyle": {
      "structure": "side",
      "source": "user_selected",
      "selectionReason": "持续工作场景需要稳定的侧边入口；导航明暗由所选主题模板确定。"
    }
  },
  "internal": {
    "selectedTheme": {
      "themeId": "<selected.themeId>",
      "source": "user_selected",
      "customText": ""
    }
  }
}
```

`build-plan.json` 保存选中方案；完整候选保留在本轮选择记录中（千问组件的候选数据和自然语言回传，或其他环境的 `ask_human` 问答）。命名模板由 CLI 补入 `navigationStyle.tone` 和 `toneSource=theme_derived`；自由创意在 visual.json 中明确编写 tone=light|dark，CLI 标记 toneSource=project_defined，后续可通过 patch 修改该 tone。上例只展示选择事实，已选方向需要的画布、字体、辅助色等差异还须写入同级 `tokens`，见 [共用主题示例](../../../references/application-theme-consistency.md#先把风格落到变量)。

## 直接选择与自定义输入

- 只有用户已明确完整视觉风格、指定现有主题，或要求严格继承可信品牌/模板时，AI 才直接匹配一个有效基底并写入，`source=user_explicit | material_extracted`。单独的主题色、导航结构或导航明暗只作为候选约束，不视为已给出完整风格；导航明暗也不另存为可覆盖模板的输入。
- 用户在三套候选中明确采用推荐方案时，选择第一项，`source=user_selected`。
- 用户自由描述新方向时，先匹配核心视觉特征最近且不违反硬约束的模板。能够匹配则记录原文为 `customText` 并写入项目覆盖项。
- 所有模板都不支持时，沿用自由创意选项，从已确认业务独立推演并继续规划。

## 运行时读取边界

- Step 2 读取本规则和主题索引中的精简风格摘要，不读取候选模板全文。
- 候选阶段展示风格名称、配色与体验说明，有对应效果图时附图；无需读取候选模板全文。
- 用户选择后保存选中方向、内部主题绑定、导航结构和实现该方向所需的 token 差异；CLI 从模板读取导航明暗。
- 用户确认主题后，规划时读取 CLI 返回的主题上下文；CLI 仅按已确认的 selectedTheme.themeId 读取选中的完整模板生成文档。
