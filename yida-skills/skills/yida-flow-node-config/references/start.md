# 发起与触发

## 什么时候用

配置流程发起时的字段或发起范围，或者选择自动化何时执行。两者虽然都在画布开头，配置不共用同一结构。

## 必填配置

| 场景 | 配置位置 | 当前能力 |
| --- | --- | --- |
| 流程发起时能填哪些字段 | 定义顶层 `startFormConfig.behaviorList`，与 `nodes` 同级 | 可直接生成配置 |
| 哪些人能发起流程 | 表单 START 权限组 | 通过 `yida-form-permission` 维护，非节点 props |
| 自动化表单事件 | spec 顶层 `events`；默认 `insert` | 可直接生成配置 |
| 自动化流程完成或节点事件 | spec 的 `events/approvalActions`，节点事件另有 `approvalNodeIds` | 可直接生成配置 |
| 自动化定时、应用事件、手动/卡片触发 | 各自的触发定义 | 当前 create 未封装，不能用表单事件冒充 |

流程的发起与结束由 CLI 自动生成，不手写到 `nodes`。自动化也由 CLI 生成触发与结束，不接收流程的 `startFormConfig`。

## 最小示例

流程发起页的字段权限片段：

```json
{
  "startFormConfig": {
    "behaviorList": [{"fieldId":"<真实字段ID>","fieldBehavior":"NORMAL"}]
  }
}
```

谁能发起先查现状，再用表单权限技能修改目标组：

```bash
openyida get-permission <appType> <formUuid> --package-type FORM_PACKAGE_START
```

自动化流程完成事件：

```json
{"events":["processFinish"],"approvalActions":["agree"],"nodes":[{"id":"self","type":"getSelf"}]}
```

节点事件使用 `activityTask`，spec 还需 `approvalNodeIds: ["<真实节点ID>"]`。只用命令选项创建时，分别使用 `--events`、`--approval-actions` 和 `--approval-node-ids`；不要假设这些选项会补入 spec。这里只示范触发，后续动作按实际需求补充。

## 特有限制

- START 权限组控制谁能发起，`startFormConfig` 控制发起页字段，两者分别维护。
- 字段权限的可编辑、只读、隐藏及子表规则统一读 [字段权限](fields.md)，不在此重复定义。
- 保留现有事件类型与范围。读取到某类触发不代表 CLI 能创建该类触发；尚未封装时报告缺口。
