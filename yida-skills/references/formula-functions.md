# 常用公式函数与选择方法

先看要得到什么结果，再选函数。参数以当前组织查询结果为准：

```bash
openyida formula functions APP_XXX --name ROUND --context form --json
```

`required` 是必填参数类型，`optional` 是可选参数类型，`variadic` 表示可继续添加参数，`result` 是结果类型。函数清单会随平台更新，本页提供常用例子。

## 数值和判断

| 目的 | 公式示例 |
| --- | --- |
| 金额保留两位小数 | `ROUND(#{numberField_total}, 2)` |
| 多个数字相加 | `SUM(1, 2, 3)` |
| 求平均值 | `AVERAGE(1, 2, 3)` |
| 向下取整 | `INT(#{numberField_total})` |
| 绝对值 | `ABS(#{numberField_diff})` |
| 取余 | `MOD(#{numberField_count}, 7)` |
| 大于、大于等于 | `GT(#{numberField_total}, 100)`、`GE(#{numberField_total}, 100)` |
| 小于、小于等于 | `LT(#{numberField_total}, 100)`、`LE(#{numberField_total}, 100)` |
| 相等 | `EQ(#{textField_status}, "通过")` |
| 按条件返回不同值 | `IF(GT(#{numberField_total},100), "高", "低")` |
| 多个条件同时满足 | `AND(GE(#{numberField_age},18), LE(#{numberField_age},60))` |
| 任一条件满足 | `OR(EQ(#{textField_status},"通过"), EQ(#{textField_status},"免审"))` |
| 空备注显示默认文本 | `IF(ISEMPTY(#{textField_remark}), "无备注", #{textField_remark})` |

## 文本

| 目的 | 公式示例 |
| --- | --- |
| 拼接姓名和编号 | `CONCATENATE(#{textField_name}, "-", #{textField_code})` |
| 截取前四位、后四位 | `LEFT(#{textField_code}, 4)`、`RIGHT(#{textField_code}, 4)` |
| 文本长度 | `LEN(#{textField_content})` |
| 去掉首尾空格 | `TRIM(#{textField_content})` |
| 大写、小写 | `UPPER(#{textField_code})`、`LOWER(#{textField_code})` |
| 数字文本转数字 | `VALUE(#{textField_amount})` |
| 手机号中间四位打码 | `REPLACE(#{textField_phone}, 4, 4, "****")` |
| 按逗号分割后取第一项 | `ARRAYGET(SPLIT(#{textField_tags}, ","), 1)` |

## 日期、人员和子表

| 目的 | 公式示例或做法 |
| --- | --- |
| 今天 | `TODAY()` |
| 取年份、月份 | `YEAR(#{dateField_start})`、`MONTH(#{dateField_start})` |
| 两个日期相隔天数 | `DAYS(#{dateField_end}, #{dateField_start})` |
| 日期加 90 天 | `DATEDELTA(#{dateField_start}, 90)` |
| 当前登录人填入成员字段 | `USER()` |
| 当前登录人昵称填入文本字段 | `GETUSERNAME()` |
| 当前登录人的第一级主管名称 | `DIRECTOR(1)` |
| 汇总子表金额列 | 在主表字段中配置 `SUM(#{numberField_lineAmount})` |
| 子表当前行金额 | 在子表金额字段配置 `ROUND(#{numberField_linePrice} * #{numberField_lineQty}, 2)` |
| 子表两列对应相乘后求和 | `SUMPRODUCT(#{numberField_lineQty}, #{numberField_linePrice})` |

子表使用子字段自己的 ID。主表汇总、子表当前行计算是不同用途，保存后用两行不同数值检查结果。

日期函数可能需要日期对象或时间戳；先查询参数，需要转换时使用 `DATE` 或 `TIMESTAMP`，再带真实样例试算。人员函数依赖登录人和组织信息，以目标组织实际结果为准。

## 集合与校验

| 目的 | 公式示例或说明 |
| --- | --- |
| 合并两个多选集合 | `UNIONSET(#{checkboxField_a}, #{checkboxField_b})` |
| 两集合共同选项 | `INTERSECTIONSET(#{checkboxField_a}, #{checkboxField_b})` |
| 从已有集合扣除选项 | `DIFFERENCESET(#{checkboxField_all}, #{checkboxField_selected})` |
| 严格比较文本 | `EXACT(#{textField_a}, #{textField_b})` |
| 检查一列值是否重复 | `ARRAYREPEATED(#{textField_lineCode})`，按原生校验输入确认 |
| 检查已有表单记录是否包含该字段值 | `EXIST(#{textField_code})`，由原生校验编辑器预处理，并带入表单上下文 |

`EXIST` 用于已有记录查询，不是“某值是否在任意集合里”。`COUNT` 的元数据说明是统计指定表单提交的数据总数，也不能直接当作子表行数函数。

## 其他常用计算

| 目的 | 公式示例 |
| --- | --- |
| 最大、最小值 | `MAX(#{numberField_a}, #{numberField_b})`、`MIN(#{numberField_a}, #{numberField_b})` |
| 多个数字相乘 | `PRODUCT(#{numberField_price}, #{numberField_qty})` |
| 平方、平方根 | `POWER(#{numberField_base}, 2)`、`SQRT(#{numberField_area})` |
| 条件取反 | `NOT(ISEMPTY(#{textField_name}))` |
| 金额格式化为文本 | `TEXT(#{numberField_total}, "0.00")` |
| 人民币大写 | `RMBFORMAT(#{numberField_total})` |
| 生成编号字符串 | `UUID()` |
| 截取中间字符 | `MID(#{textField_code}, 3, 4)` |
| 当前时间、日期转时间戳 | `NOW()`、`TIMESTAMP(TODAY())` |
| 工作日天数 | `NETWORKDAYS(#{dateField_start}, #{dateField_end})` |
| 当前登录人的部门名称 | `DEPTNAME(LOGINUSERWORKNO())` |

这些例子以普通字段和校验为基础。调用前查询参数；具体可选函数由目标配置提供，自动化等输入可能没有其中某些函数。

## 按输入方式核对

使用 `formula check --contract field-value/validation-rule/business-action/node-expression` 选择相应的公式原文检查。原 `--context form/validation/business/automation` 是兼容别名，不代表已执行对应业务。

同一种函数写法可以在多个设计器共用；字段令牌、保存对象和实际执行的数据另看 `yida-formula`。数据集表达式和 JavaScript 使用自己的函数与检查入口。签名查询、静态诊断和实际运行分别提供不同证据，见 `yida-formula-evaluate`。

遇到嵌套 IF、AND/OR/NOT、除零处理或复杂校验时，读取 [带完整配置和预期结果的示例](../skills/yida-formula/references/nested-examples.md)，按对应小节改字段和常量。
