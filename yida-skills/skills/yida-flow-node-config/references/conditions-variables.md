# 条件与变量

## 什么时候用

比较字段、选择变量来源、给数据或连接器参数赋值，或者在通知中展示表单内容时。条件分支、条件选人和多人会签分别配置。

## 必填配置

先从真实 schema 确认字段 ID、组件类型和子表归属，再确定值来自哪里。

| 场景 | 格式或来源 |
| --- | --- |
| 流程分支比较 | `fieldId/fieldName/componentType/op/value`，分支用 `logic: AND/OR` |
| 自动化触发/分支比较 | `fieldId/fieldName/componentType/opCode/value/valueType`；分别放到顶层 `triggerConditions` 或分支 `conditions` |
| 自动化取数筛选 | 左侧 `bFieldId` 是目标表字段，右侧 `aFieldId` 是触发表单或上游节点字段；固定值须设置 `valueType: literal` |
| 数据/连接器赋固定值 | `valueType: literal` |
| 自动化引用字段或上游输出 | `valueType: processVar`；触发表单字段 ID 或 `${别名}.字段ID` |
| 公式赋值 | `valueType: column`，公式按对应节点契约编写 |
| 自动化公式的设计器展示源码 | 可提供 `__source`，上游引用用 `#{别名//字段ID}` |
| 消息标题/正文中的触发表单字段 | `#{fieldId-ComponentType}#` |
| 批量新增中的当前源行 | `${batchSource别名}.字段ID`，CLI 转为平台的 `batch_` 引用 |

流程原生组件中的上游引用采用真实节点 ID；不要套用仅由自动化 spec 解析的别名。消息模板语法也不能直接当作查询条件或赋值表达式。

取数右侧选择“公式”时，使用 `valueType: column`，把执行公式及编辑器内容保存在 `value: {value, __source, __display}`。例如“金额大于上游金额乘以 2”，见 [节点表达式](../../yida-formula/references/automation-formulas.md)。直接比较两个字段仍使用 `processVar`；固定门槛用 `literal`。左侧字段属于目标表，右侧字段属于指定的触发记录或上游节点。

触发、分支和取数分别使用对应位置及字段类型支持的操作符。如下文触发例子的 `LessThan` 与数值取数比较中的 `Lesser` 不可直接互换。某个位置的保存或运行结果，也只作为该位置的证据；分别记录取数匹配结果、分支是否进入及触发是否发生。

## 最小示例

需要嵌套时先选择正确结构：自动化同层条件使用节点/分支的 AND 或 OR；分支 `A 且（B 或 C）` 使用 [完整公式与嵌套分支示例](../../yida-formula/references/node-examples.md#嵌套分支先决定是否复核再决定级别)。取数节点当前只有平铺条件和一层 logic，见 [多条件取数示例](../../yida-formula/references/node-examples.md#按编号字段嵌套公式和固定状态取数)；不要自行嵌入 conditions/rules 对象改变查询含义。

### 字段与字段比较：当前库存 < 库存下限

本小节讨论表单事件的触发条件。该位置的字段比较格式当前仅通过本地编译检查，尚未通过平台保存及运行验收；引用它时说明验证范围。获取数据节点右侧选择“字段”的用法见下节，独立判断其输入和运行结果。固定值比较不受此说明影响。

先从真实 schema 取得两个数字字段 ID。下面的 `numberField_stock`、`numberField_minStock` 和接收人 ID 都须替换。

直接设置自动化触发条件，默认保存草稿：

```bash
openyida integration create APP_XXX FORM_XXX "库存不足通知" \
  --events insert,update \
  --trigger-condition "numberField_stock:当前库存:LessThan:numberField_minStock:NumberField:processVar" \
  --receivers USER_ID
```

关键是最后的 `processVar`：右侧取“库存下限”字段的值。省略时默认 `literal`，会把字段 ID 当作固定文本。若比较“当前库存 < 10”，则写 `numberField_stock:当前库存:LessThan:10:NumberField:literal`。

使用 `--spec` 时，将同一条件放到顶层 `triggerConditions`，不要同时传 `--trigger-condition`：

```json
{
  "events": ["insert", "update"],
  "triggerConditions": [{
    "fieldId": "numberField_stock",
    "fieldName": "当前库存",
    "componentType": "NumberField",
    "opCode": "LessThan",
    "value": "numberField_minStock",
    "valueType": "processVar"
  }],
  "nodes": [{"type":"sendMessage","content":"库存不足，请补货","receivers":["<真实用户ID>"]}]
}
```

触发条件只引用触发表单字段，不能引用尚未执行的下游节点。多条 spec 触发条件默认 `AND`，需要任选其一时设置顶层 `triggerConditionLogic: OR`。

### 分支和取数中的字段比较

以下是各位置的配置格式；保存后按具体节点的匹配记录和运行结果说明验证状态。

自动化分支可以比较上游节点的两个字段；例如先配置 `getSelf` 节点 `id: self`，再在 `route` 分支的 `conditions` 中写：

```json
{"fieldId":"${self}.numberField_stock","fieldName":"当前库存","componentType":"NumberField","opCode":"LessThan","value":"${self}.numberField_minStock","valueType":"processVar"}
```

取数节点则比较“目标表库存”和“上游记录库存下限”，放到 `dataRetrieve.conditions`：

```json
{"bFieldId":"numberField_stock","bFieldName":"当前库存","componentType":"NumberField","opCode":"Lesser","aFieldId":"${self}.numberField_minStock","valueType":"processVar"}
```

`self` 必须是当前节点的上游别名，字段 ID 也须与各自表单一致。取数条件默认 `processVar`，触发和分支条件默认 `literal`；建议显式写出。完整分支结构见 [流转控制](control.md)。

### 流程分支中的固定值比较

流程分支中的一条数字规则：

```json
{"fieldId":"<真实金额字段ID>","fieldName":"金额","componentType":"NumberField","op":"GreaterThan","value":10000}
```

当前流程 DSL 的 `route.conditions[].rules` 按固定值编译；上述 `processVar` 字段比较写法适用于自动化，不能直接套入流程 DSL。

## 特有限制

- 流程操作符按下表和字段真实类型选择；`value` 使用对应类型的固定值或选项数组。
- 自动化存在性判断使用其支持的 `ExistValue/NotExistValue`；不要因为流程有同名含义就直接照搬操作符。复杂空值规则需要时用已验证公式。
- 自动化分支的复杂空值判断使用已验证的 `ISEMPTY()` 公式，配置在分支的 `expression` 中；参照 [分支按公式判断](../../yida-formula/references/automation-formulas.md)。
- `valueType`、右侧值来源和数据类型一起检查；`0`、`false`、空值不能互相代替。
- 字段比较属于自动化条件配置，与审批人“条件模式”是两项能力；按 `integration create` 返回处理，明确提示权益不足时再引导开通。执行前仍须按自动化入口确认配置摘要。
- 人员条件模式当前缺完整简化配置，按 [人员选择](actors.md) 的高级透传要求处理。
- 没有真实资源 ID 或参数 schema 时，先补齐证据，不为通过编译随意填字段类型、节点别名或占位条件。

## 流程操作符速查

| 操作符 | 含义 | 适用类型 |
| --- | --- | --- |
| `Equal` | 等于 | 各字段类型，值须与类型匹配 |
| `NotEqual` | 不等于 | 各字段类型 |
| `Contains` | 包含 | 文本 |
| `NotContain` | 不包含 | 文本 |
| `IsEmpty` | 为空 | 各字段类型 |
| `IsNotEmpty` | 不为空 | 各字段类型 |
| `GreaterThan` | 大于 | 数字 |
| `GreaterThanOrEqual` | 大于等于 | 数字 |
| `LessThan` | 小于 | 数字 |
| `LessThanOrEqual` | 小于等于 | 数字 |
| `In` | 属于 | 单选、下拉选项 |
| `NotIn` | 不属于 | 单选、下拉选项 |

这是流程规则的 `op` 清单；自动化使用其自己的 `opCode`，不要跨入口替换参数名。
