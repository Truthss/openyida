# 人员与角色

## 什么时候用

选择审批人、办理人、抄送人或旧版多人审批环节的处理人时。角色是人员来源之一，不能与人员条件模式、权限矩阵或表单数据访问权限混淆。

消息接收人另读 [通知](notifications.md)，不在这里重复消息结构。

## 必填配置

| 来源 | 人员对象 |
| --- | --- |
| 发起人本人 | `"originator"` |
| 指定成员 | `{"type":"user","users":[{"id":"<真实userId>","name":"负责人"}]}` |
| 指定角色 | `{"type":"role","roles":[{"id":"<真实角色ID>","name":"财务","roleType":"YIDA"}]}` |
| 部门主管 | `{"type":"deptLeader","source":"originator","level":1}` |
| 直属主管 | 上一项改为 `"type":"directLeader"` |

这些来源可直接生成配置。审批和旧版多人审批放在 `approver`，办理放在 `executor`，抄送放在 `receiver`，同一人员对象无需重复改写。

用户只给姓名时，先通过 `corp-manager search-user "<姓名>" --json` 等现有通讯录能力查真实 ID；同名时按组织信息消歧。角色 ID 从目标组织已有配置或平台只读查询取得，不用角色名称代替，也不编造角色。

## 最小示例

```json
{
  "type":"approval",
  "name":"财务审批",
  "approver":{
    "type":"role",
    "roles":[{"id":"<真实角色ID>","name":"财务","roleType":"YIDA"}],
    "multiApproverType":"or"
  }
}
```

`multiApproverType` 用 `all`（会签）、`or`（或签）、`oneByOne`（依次审批）。旧版 `multiApproval` 另在节点上设置相同取值的 `mode`。

### 发起人本人

```json
{"type":"approval","name":"发起人确认","approver":"originator"}
```

### 指定成员

```json
{
  "type":"approval",
  "name":"指定成员审批",
  "approver":{
    "type":"user",
    "users":[{"id":"<真实userId>","name":"<真实姓名>"}],
    "multiApproverType":"all"
  }
}
```

成员 ID 通过目标组织的通讯录、应用成员或已知人员配置取得，姓名不能作为 ID 提交。

### 部门主管与直属主管

```json
{
  "type":"approval",
  "name":"部门主管审批",
  "approver":{
    "type":"deptLeader",
    "source":"originator",
    "level":1,
    "needLeaderReplace":true,
    "ignoreNoLeaderDept":false
  }
}
```

直属主管使用 `type: directLeader`，来源和层级仍用 `source/level`；替补参数使用 `needDeptLeaderReplace`，不要把部门主管的两个替补参数直接套入。

## 原始审批人配置（高级透传）

简化 DSL 无法覆盖某个真实人员规则时，可把完整原始对象放在 `approver` 或 `approverConfig`。下面展示发起人规则的结构：

```json
{
  "type":"approval",
  "name":"发起人确认",
  "approver":{
    "approvalType":"ext_target_approval_originator",
    "approvals":[["originator"]],
    "processProps":{},
    "approverRules":{
      "type":"ext_target_approval_originator",
      "mode":"ApprovalNode_rules_only",
      "approverList":[{"type":"ext_target_approval"}],
      "multiApproverType":"all",
      "conditionalMode":"conditional",
      "description":"发起人本人"
    }
  }
}
```

- `approvalType/approvals/processProps` 用于运行配置，`approverRules` 用于设计器；不能只保留其中一侧。`processProps` 兼容原始对象的 `props`。
- `approverConfig` 优先于简化人员参数；不要同时提供相互矛盾的配置。旧版多人审批仍由 CLI 生成对应内外层规则。
- 不同租户的接口人、第三方服务、连接器选人、权限矩阵规则可能不同。必须从已有流程、已验证接口或经授权保存的设计器配置取得完整结构，缺少时停止，不编造参数。
- 示例是单一发起人规则，不是条件选人示例。`conditionalMode` 本身不代表已配置条件模式；条件选人仍需真实的条件、人员、兜底及运行层与设计层配置。

## 特有限制

- `roleType` 默认为 `YIDA`，钉钉角色用 `DINGTALK`；CLI 按来源生成 `multiRoles`。角色数量、成员范围和可用性以真实角色与服务端校验为准，不创建或变更角色成员。
- 部门主管支持 `needLeaderReplace/ignoreNoLeaderDept`；直属主管支持 `needDeptLeaderReplace`。主管来源和层级应按业务需求确定。
- 平台审批、办理、抄送共用“条件模式”：每项配置人员和生效条件，再选按优先级或并行生效，并保留兜底人员。每项也可选择角色。
- 当前 CLI 尚无完整的条件选人简化 DSL。仅设置 `approver.mode: "ApprovalNode_rules_multiple"` 或 `conditionalMode` 不足以生成完整的运行层人员列表与设计器规则；不要把条件分支当成条件选人交付。
- 条件模式若需高级透传，必须已有真实的运行层、设计层配置并分别核对；缺少完整配置时停止，不编造条件选人规则。保存发布时按 `configure-process` 返回处理，明确提示权益不足时再引导开通。
- 普通指定角色不要求因此配置权限矩阵。特殊接口人、连接器选人或矩阵规则需已有真实配置；不能随意套用上述简化对象。
