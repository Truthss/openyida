---
name: yida-data-card
description: 创建、读取、保存和发布宜搭原生数据卡片，按 cardCode 管理完整 Schema；查询主题、业务前后台和数据卡片管理入口。用于原生数据卡片，不用于 React 卡片或钉钉酷卡片。
---

# 宜搭原生数据卡片

先用 auth snapshot 核对目标组织和应用。已有 cardCode 时复用；用户要求新建时使用 create。卡片与表单、页面是不同资源，不调用 create-page 或 publish 页面命令替代。

## Skill 与 CLI 执行边界

- 应用搭建由本 Skill 编排，通过 OpenYida CLI 完成字段查询、卡片创建、组件配置、保存和发布。基础指标卡优先使用 `save --config`；完整配置使用 `save --schema`，由已核实的原生契约生成，不能要求用户先在浏览器拖拽出样本。
- 开发 OpenYida 能力时，可以用浏览器分析接口、参数、组件类型、配置选项和原生行为；核实后将可复用实现落入 CLI，并把操作方法、支持范围和验收规则写入 Skill。
- 正式搭建中的浏览器用于预览、原生可编辑性和真实取数验收。若某个组件或配置尚无 CLI 路径，明确说明缺口；在开发任务中补齐 CLI 与 Skill 后，再验证搭建，不用浏览器代替该步骤并宣称已支持。
- 验证记录区分浏览器调研、CLI 搭建和浏览器验收；全 CLI 搭建必须能从配置与真实元数据完成，不依赖本轮浏览器保存或临时控制台脚本。

## 配置入口

用户只询问配置位置时，执行下列只读命令并返回其中 `url`，不触发设置变更：

```bash
openyida app-settings APP_XXX --section theme --json
openyida app-settings APP_XXX --section basic --json
openyida app-settings APP_XXX --section data-card --json
```

三项依次为主题与导航、基础设置（业务前后台配置所在入口）、原生数据卡片管理。使用实际应用的返回地址，不固定示例域名或应用。地址生成不证明接收者拥有管理权限。

## 卡片操作

```bash
openyida data-card list APP_XXX --size 50 --json
openyida data-card create APP_XXX --name '销售数据卡片' --out .cache/openyida/data-card/new.json --json
openyida data-card get APP_XXX CARD-xxx --out .cache/openyida/data-card/draft.json --json
openyida data-card save APP_XXX CARD-xxx --config .cache/openyida/data-card/indicators.json --expected-hash <get返回的schemaHash> --json
openyida data-card publish APP_XXX CARD-xxx --expected-hash <最新草稿schemaHash> --json
openyida data-card get APP_XXX CARD-xxx --published --json
```

`get` 默认读取草稿，可通过 `--version` 读取指定版本。输出 `card.schemaBody` 为完整配置，`--out` 单独导出该 Schema；输出文件已存在时拒绝覆盖。平台初始 Schema 可以没有 schemaType/schemaVersion，保留其实际结构。

使用 `--schema` 保存是完整 Schema 替换：在本次读取的副本上编辑，保留未知键、pages、动作、组件映射、数据集和多语言引用。保存和发布都要求原始草稿摘要，写前自动备份并再次读取检查；平台没有原子锁，摘要不是并发事务。`backupPath` 可用于恢复前取证；不要无条件覆盖发生变化的卡片。

原生组件使用 Youshu 图表、基础指标卡、基础表格、下拉或时间筛选等物料。数据在 `props.dataSetModelMap` 及 `dataViewQueryModel`，样式在 `settings`。字段与数据集引用必须来自真实配置或已核实元数据；不根据展示名称臆造 cubeCode 或字段 ID。开启筛选涉及头部及筛选容器节点和联动引用，不是添加任意 enableFilter 键。支持完整 Schema 读写不等于已经支持任意自然语言自动生成图表。

`config.i18nKeyList` 与组件内词条引用一起保留；词条集合改变时 CLI 在保存前同步 dataCard 词条绑定。绑定成功、草稿写入失败时保留备份并核对远程状态，不盲目重放。

## 完成证据

- create 必须返回真实 cardCode 并读取其初始配置；创建空壳不等于配置完成。
- save 必须返回 `readbackVerified=true`；它只证明草稿配置回读一致，不证明发布成功。`published=false` 表示本次操作没有发布，不表示平台一定没有旧发布版。
- publish 发布当前已保存草稿，不自动读取并保存本地文件；必须返回 `published=true`、发布版本及已发布 Schema 回读证据。
- `urls.designerUrl/previewUrl/dataCardManageUrl` 可用于验收；渲染、编辑和真实取数需分别验证。

写请求不自动重放。创建超时或回读失败时先按返回 cardCode 或列表核对，不能直接再次新建。权限、卡片数量和图表数量权益失败时保留平台错误码，建议管理员处理或升级；不修改应用标记、版本、额度或权益。卡片发布不包含播报、定时推送、删除或消息测试。


## 通过 CLI 搭建指标卡

创建、读取、配置保存和发布默认通过 CLI 完成，浏览器用于最终查看与编辑验收。新卡片无需先在浏览器拖拽生成 Schema。先用 `get-schema APP_XXX FORM-xxx --field-map-json` 核对真实字段，再准备配置文件：

```json
{
  "indicators": [{
    "title": "报名统计",
    "formUuid": "FORM-真实表单ID",
    "fieldId": "serialNumberField_真实字段ID",
    "aggregate": "COUNT",
    "label": "报名总数"
  }]
}
```

```bash
openyida data-card save APP_XXX CARD-xxx --config indicators.json --expected-hash <当前草稿schemaHash> --json
```

`--config` 与 `--schema` 二选一。CLI 读取目标应用中的真实表单字段，生成原生基础指标组件、查询模型、组件映射和布局，追加到当前卡片并保存草稿；已有组件及未知配置保留。每个配置项生成一个指标组件，再次保存相同配置会再次追加，应先回读当前状态。数字字段支持 COUNT/SUM/AVG/MIN/MAX；文本、多行文本和流水号支持 COUNT。暂不自动生成子表指标、复杂筛选或其他图表，不能填写未核实的字段。权益与权限仍由平台校验，失败停止，不更改应用标记或额度。
