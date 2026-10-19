# 宜搭原生数据卡片

`data-card` 管理宜搭原生数据卡片，可在原生设计器编辑并供门户等场景使用。简化配置支持九类组件、多指标、日期维度和同源下拉筛选，完整参数见[多组件配置与验收](../../yida-skills/skills/yida-data-card/references/chart-config.md)。

通过 `yida-data-card` Skill 编排搭建，使用 CLI 查询真实字段、创建卡片、配置组件、保存和发布，浏览器负责最终效果与可编辑性验收。研发阶段可以用浏览器核实接口、参数和组件能力，但交付能力必须落实到 CLI 与 Skill；尚未支持的操作应明确说明，不能用浏览器完成后当作 CLI 能力交付。

```bash
openyida data-card create APP_XXX --name '销售概览' --out initial.json --json
openyida data-card list APP_XXX --size 50 --json
openyida data-card get APP_XXX CARD-xxx --out draft.json --json
openyida data-card save APP_XXX CARD-xxx --schema edited.json --expected-hash <草稿schemaHash> --json
openyida data-card publish APP_XXX CARD-xxx --expected-hash <最新草稿schemaHash> --json
openyida data-card get APP_XXX CARD-xxx --published --json
openyida data-card probe APP_XXX CARD-xxx --published --json
```

创建返回真实 `cardCode`、初始 Schema 和设计器入口。初始卡片为空，可用 `save --config` 通过 CLI 搭建基础指标卡，或用 `save --schema` 保存完整原生 Schema。读取支持草稿、已发布状态或 `--version <version>`；输出文件不会覆盖已有文件。

保存采用完整 Schema 替换，先导出原配置，再编辑副本。保留 `pages` 中的组件树、组件映射、数据源，以及动作、多语言和未知配置。原生图表的字段映射必须来自实际数据集，支持 Schema 读写不代表能自动生成任意图表。

保存和发布都要求当前草稿的 `schemaHash`，自动备份原配置并在写前再次读取检查。保存后核对草稿，发布后核对在线 Schema、状态及版本；`publish` 只发布已保存草稿，不读取或保存本地文件。平台没有原子条件写入，哈希检查不能消除全部并发窗口。

回读失败或传输错误时保留返回的 `backupPath`，先读取远程状态再决定是否重试，尤其不能盲目重复创建。多语言词条集合改变时，CLI 在写草稿前同步卡片词条绑定；词条绑定与草稿写入不是同一个事务。

`save` 的 `published=false` 表示本次未执行发布，不表示旧的发布版本不存在。回读一致不证明实际渲染、数据查询或接收者权限，这些需要单独验收。

## 应用设置入口

```bash
openyida app-settings APP_XXX --section theme --json
openyida app-settings APP_XXX --section basic --json
openyida app-settings APP_XXX --section data-card --json
```

分别返回主题与导航、基础设置（业务前后台配置入口）、原生数据卡片管理的 `url`。省略 `--section` 返回全部 `urls`。地址使用当前应用域名和真实应用 ID，仅查询入口不会修改设置。

卡片操作受平台管理员权限、卡片数量和图表数量限制。CLI 保留平台权益错误，不改变版本、应用标记或额度。当前命令不包含播报、消息发送或删除。


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

`--config` 与 `--schema` 二选一。CLI 读取目标应用中的真实表单字段，生成原生基础指标组件、查询模型、组件映射和布局，追加到当前卡片并保存草稿；已有组件及未知配置保留。每个配置项生成一个指标组件，再次保存相同配置会再次追加，应先回读当前状态。数字字段支持 COUNT/SUM/AVG/MIN/MAX；文本、多行文本和流水号支持 COUNT。复杂卡片可改用 charts/filters 格式，生成 indicator/bar/line/pie/table/combo/gauge/funnel/calendarheatmap；子表、跨源筛选、时间或区间筛选和未注册组件暂不自动生成。不能填写未核实的字段。权益与权限仍由平台校验，失败停止，不更改应用标记或额度。

## 多样化验收

单卡最多五个图表，指标卡内多个指标仍是一个组件；已有与新增合计超过上限时在卡片写入前停止。简化配置默认追加，不是按标题更新。表格默认占六列，其余组件默认三列，可通过 w 调整；仪表盘需明确单位，可用 range 指定刻度。

probe 使用原生 CARD 运行时逐组件查询，返回 data/meta，查询失败给出组件级诊断；这不同于保存后的 Schema 回读。渲染、筛选和可编辑性仍需浏览器验收。屏幕外组件会延迟加载，必须逐块滚动并等待，筛选后也要核对下方明细和重置结果。COUNT 只计非空字段，零与负数应保留。数字精度、货币及自定义日期显示格式尚未进入简化配置 DSL。
