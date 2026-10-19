---
name: yida-formula-evaluate
description: 读取已有公式和依赖、查询函数、检查写法与类型；带样例按原生字段链路试算，批量核对预期结果。用于排查公式报错、日期或金额为空、子表计算不对；其他配置使用对应实际入口验证。
---

# 检查和试算公式

先用 `yida-formula` 确定要保存的内容。相同输入格式共用同一检查方法，按页面名称选择检查器容易选错。

## 选择操作

| 想知道什么 | 命令 |
| --- | --- |
| 有哪些保存方式，哪些已接入检查器 | `formula contracts --json` |
| 字段保存了什么公式 | `formula inspect APP FORM --json` |
| 函数需要什么参数 | `formula functions APP --name ROUND --json` |
| 公式写法、参数和字段引用有没有问题 | `formula check`，旧命令 `formula evaluate` 继续做本地检查 |
| 通用表达式接口对这份输入返回什么 | `formula test` |
| 已存字段公式能否正确绑定并得到目标值 | `formula test APP FORM --field 字段ID --data-file data.json --expect JSON` |
| 修改后多组样例是否都正确 | `formula test APP FORM --field 字段ID --cases cases.json` |

## 读取配置和函数

```bash
openyida get-schema APP_XXX FORM_XXX
openyida formula inspect APP_XXX FORM_XXX --field numberField_total --json
openyida formula functions APP_XXX --name ROUND --output metadata.json --json
```

完整表单结构保存为任务目录的 `schema.json`。`inspect` 读取字段默认值公式及字段 `validation`；表单级、流程全局、节点和报表公式从各自完整设计配置读取。

函数签名来自当前组织的表达式元数据；可用清单还参考 CLI 自带的函数菜单。目标组件、组织开关和注入变量也会影响实际可用性，查询结果会标明 `consumerAvailabilityVerified: false`。`--output` 创建新快照，使用新文件名保留上次结果。

## 本地检查

```bash
openyida formula check formula.txt --contract field-value --schema schema.json --metadata metadata.json --target-type NumberField --strict --json
```

| `--contract` | 检查的输入 |
| --- | --- |
| `field-value` | 普通字段的取值公式；默认选项 |
| `validation-rule` | 原生校验规则中的公式原文，布尔目标可加 `--target-type Boolean` |
| `business-action` | 业务动作中的公式原文；查询条件和写入效果还需对应入口检查 |
| `node-expression` | 节点公式的执行文本或编辑器原文 |
| `dataset-expression`、`javascript` | 已识别的其他输入类型；当前检查器会明确返回未支持，使用对应编辑器或代码工具检查 |

原 `--context form/validation/business/automation` 继续作为前四种方式的兼容别名。两种参数一起提供时应匹配。这里的选择表示输入格式和参考函数菜单；不代表已模拟整张页面或整条流程。

`--metadata` 更新参考参数和类型；`--schema` 提供真实字段。自定义组件的子属性若只有父组件类型，本地不猜测子属性类型。

| 提示 | 下一步 |
| --- | --- |
| 参数数量不对 | 查询函数，按实际参数修改 |
| 找不到字段 | 读取真实 ID，并核对当前输入允许哪些字段或上游节点 |
| 类型不匹配 | 查看字段和样例原始值，按目标组件格式转换 |
| 函数未收录、类型或可用位置未知 | 查询当前配置提供的函数和字段，保留未确认状态 |
| 输入方式未支持 | 使用对应的数据集编辑器或 JavaScript 工具检查 |

`ok: true` 表示本地没有发现错误；`unknown` 表示缺少信息。混合类型分支、日期对象及数值目标中的文本结果会提示进一步试算。`checks.consumerPreprocessing/platform/runtime: not_run` 表示未完成预处理、平台执行和实际运行。`--strict` 在发现错误时返回失败退出码。

## 优先按目标字段试算

```bash
openyida formula test APP_XXX FORM_XXX --field numberField_total --data-file data.json --expect 24.6 --json
openyida formula test APP_XXX FORM_XXX --field numberField_total --cases cases.json --json
```

字段试算读取已保存公式及其依赖，将组件类型、子表行和计算顺序交给平台原生字段计算接口。也可以在 APP/FORM 后提供候选公式，只用于本次试算。完整样例、保存后重试和日期说明由统一的 `yida-formula` 技能提供，按其“字段绑定与样例验证”参考执行。

`--cases` 文件每项包含唯一 `name`、`data` 和 `expect`，单次 1 至 100 项；与 `--data-file/--expect` 分开使用。字段试算的 `--context` 为默认 `form`，无需 `--binding`；原始数据保持组件格式，子字段放入子表行对象。`--timezone-offset` 单位为分钟、向东为正，默认 480。

`verification: field-runtime` 表示平台字段计算已调用。`rawValue` 是平台组件绑定后的字段值；`value` 是 CLI 按部分原生回填规则转换后的值。没有预期值时 `assertion: not_requested`；结果缺失、转换为空或只解析出部分数字会明确失败。批量结果保留每个样例名称和失败原因。

试算不保存字段、不提交记录。`widgetFormatting/submission: not_run` 表示字段精度、日期显示、页面事件及提交还需实际验收。依赖公式会重新计算，不把样例中预填的计算结果当成已验证结果。

## 调用表达式接口

创建 `data.json`，用真实字段 ID 作为键、样例原始值作为值：

```json
{"numberField_total":12.345}
```

```bash
openyida formula test APP_XXX FORM_XXX 'ROUND(#{numberField_total}, 2)' --data-file data.json --json
```

默认 `--binding platform` 原样提交公式和 `varMap`。命令返回结果及原始类型，并输出本次送出的 `expression`。它不保存公式或提交表单数据，只接受已确认不写业务数据的函数。

需要单独探查“把数字直接写进公式后，接口如何计算”时，可显式使用：

```bash
openyida formula test APP_XXX FORM_XXX 'ROUND(#{numberField_total}, 2)' --data-file data.json --binding numeric-literals --json
```

此模式只将数值样例替换为数字常量，字符串和其他值仍走 `varMap`。这是独立的接口探查方式，不是页面原生取值过程。两种模式结果不同，应继续查真实调用的预处理和字段转换，不能用替换数字掩盖差异。

加 `--expect` 可按 JSON 值和类型核对结果，例如平台返回字符串 `"12.35"` 时使用 `--expect '"12.35"'`。

需要原生预处理的 `EXIST/EQUAL` 在这个入口停止；写数据函数和未知函数也停止。校验、自动化、子表和图表聚合使用各自实际执行入口验证。当前 `test --context` 仅接受 `form/validation`，用于选择参考菜单，不增加对应运行上下文。

## 说明验证范围

分别报告本地检查、原生字段试算或接口探查、配置回读和实际执行。通用接口返回 `verification: expression-endpoint`；字段试算返回 `field-runtime`，批量返回 `field-runtime-cases`。这些结果仍标记 `runtimeVerified: false`，避免把部分试算当成页面、校验、节点或图表的完整验收。

用户要求暂停测试时，保留上述步骤作为后续验收说明，不执行接口探查或实际业务操作。
