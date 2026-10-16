# 流转控制

## 什么时候用

根据条件走不同分支、执行并行分支，或重复处理数据。先区分改变走向的条件分支与同一节点内的条件选人。

## 必填配置

| 节点 | 流程 | 自动化 spec |
| --- | --- | --- |
| 条件分支 | 可直接生成：`route.conditions[]`，分支内用 `rules/childNodes` | 可直接生成：`route.branches[]`，分支内用 `conditions/nodes` |
| 并行分支 | 可直接生成：`parallel.branches[]`，分支内用 `rules/childNodes` | 当前未封装 |
| 循环容器 | 需要已有真实 `CycleContainer` 配置才能透传 | 当前未封装；批量复制使用批量数据节点 |
| 拒绝后跳转 | 人工节点的 `routeRules` | 不适用，不是自动化分支 |

比较规则和变量来源只读 [条件与变量](conditions-variables.md)。流程分支按数组顺序生成优先级；自动化指定至多一个 `default: true` 兜底分支。不要手写底层连线或 `conditionNode`。

## 最小示例

流程：金额超过阈值时进入审批，未命中时 CLI 自动补“其他情况”分支。

```json
{
  "type":"route",
  "name":"金额分支",
  "conditions":[{
    "name":"金额超过一万",
    "rules":[{"fieldId":"<真实金额字段ID>","fieldName":"金额","componentType":"NumberField","op":"GreaterThan","value":10000}],
    "childNodes":[{"type":"approval","name":"财务审批","approver":"originator"}]
  }]
}
```

自动化：`self` 是前面已声明的 `getSelf` 节点；命中后更新当前记录。

```json
{
  "type":"route",
  "branches":[
    {
      "name":"已获取记录",
      "conditions":[{"fieldId":"${self}.form_inst_id","fieldName":"表单实例ID","componentType":"TextField","opCode":"ExistValue"}],
      "nodes":[{"type":"dataUpdate","source":"self","assignments":[{"column":"<真实处理状态字段ID>","valueType":"literal","value":"待处理"}]}]
    },
    {"name":"其他情况","default":true,"nodes":[]}
  ]
}
```

流程并行时改用 `type: "parallel"` 和 `branches`，每个分支提供 `name/childNodes`；可选 `rules/logic`，不设置条件表示该分支全部进入。

### 并行分支示例

```json
{
  "type":"parallel",
  "name":"并行会审",
  "branches":[
    {
      "name":"第一分支",
      "childNodes":[{"type":"approval","name":"第一分支审批","approver":"originator"}]
    },
    {
      "name":"条件分支",
      "logic":"AND",
      "rules":[{"fieldId":"<真实金额字段ID>","fieldName":"金额","componentType":"NumberField","op":"GreaterThan","value":10000}],
      "childNodes":[{"type":"approval","name":"第二分支审批","approver":"originator"}]
    }
  ]
}
```

### 流程分支参数

| 位置 | 参数与限制 |
| --- | --- |
| 条件路由节点 | `type: route`，`conditions` 为分支列表 |
| 条件分支 | `name/rules`，可选 `logic/childNodes`；`logic` 默认 `AND`，可用 `OR` |
| 并行节点 | `type: parallel`，`branches` 为分支列表，兼容 `conditions/parallelBranches` |
| 并行分支 | 可选 `name/rules/logic/childNodes`；无规则表示全部进入，不是互斥兜底 |
| 一条规则 | `fieldId/fieldName/componentType/op/value`；使用真实字段及其组件类型 |

别名 `route/branch/ConditionContainer` 归一为条件路由，`parallel/parallelBranch` 归一为并行。按字段类型选择操作符，见 [条件与变量](conditions-variables.md)；不要把自动化的 `opCode/valueType` 直接放进流程条件。

人工节点拒绝后回退的片段：

```json
{"routeRules":[{"when":"disagree","jumpTo":"主管审核"}]}
```

`jumpTo` 用流程中实际目标节点的 `name`，或 `"结束"`。

## 特有限制

- 流程嵌套分支不超过 3 层；超过时必须拆分结构。默认“其他情况”由 CLI 生成；排查底层结构时核对最后一个条件为 `conditionType: else`，不猜测或省略兜底。
- 并行分支可能同时执行；不能用多个按优先级选择的条件分支假装并行。
- 节点别名只能引用当前分支的上游。某条分支内查询出的数据不能在无关分支中使用。
- 流程循环容器的范围、当前项、退出条件与子节点必须来自真实配置，不能只写空 `cycleContainerRules`。
- 批量取数再逐行新增不需要额外循环节点，见 [数据](data.md)。
