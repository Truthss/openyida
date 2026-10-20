---
name: yida-form-message
description: 查询和维护已有普通表单「页面设置 > 消息通知」中的原生触发、接收对象和消息模板。适用于提交、编辑、删除或评论后的表单通知；不用于应用级通知、自定义页面消息、机器人发送或集成自动化。
---

# 表单消息通知

使用 `openyida form-message` 管理表单级原生消息绑定。先查询目标表单和选项，再按用户明确要求创建或修改；保存配置不会立即发送测试消息。

```bash
openyida form-message list <appType> <formUuid> --json
openyida form-message options <appType> <formUuid> --json
openyida form-message inspect <appType> <formUuid> <messageId> --json
openyida form-message create <appType> <formUuid> --config message.json --json
openyida form-message update <appType> <formUuid> <messageId> --config patch.json --expected-hash <configHash> --json
```

普通表单已验证的写入触发为 `FORM_DATA_CREATE`、`FORM_DATA_EDIT`、`FORM_DATA_DELETE`、`FORM_COMMENT`。日期字段定时、流程开始/结束、流程节点和审批操作的已有配置可查询，但当前 CLI 会拒绝写入这些未完成独立目标验证的规则。不要用近似触发或集成自动化冒充原生设置。

接收人可以是指定人员、角色、人员字段或系统变量 `originator`；用 `options` 返回的真实字段 ID。群置顶模板使用 `groups` 中的平台群 ID。一次消息最多选择 100 人；具体人员可见性、离职状态、群成员关系和组织版本仍由平台控制。

模板 key 包括 `workNotice`、`detailImage`、`imageCard`、`detailText`、`commentCard`、`pinnedImage`、`pinnedText`。工作通知及普通卡片发送给人，置顶卡片发送到群；详情类模板的字段映射只使用 `options.messageFields` 或系统字段。配置结构、变量和场景见 [reference](references/guide.md)。

更新时 `template` 属性合并，`recipients`、`groups` 和 `template.fields` 数组整体替换。写入前自动备份并再次比较列表；写后必须看到 `readbackVerified: true`。超时或回读不一致时保留 `backupPath`，先重新 list/inspect，不自动重放创建、更新或删除。

平台当前没有独立启停字段或启停接口；不要把 `isSendMessage` 当作通知开关。移除配置只能删除，必须由用户明确要求，使用最新 hash：

```bash
openyida form-message delete <appType> <formUuid> <messageId> --expected-hash <configHash> --yes --json
```

删除后重建会产生新 ID，备份不能自动恢复旧引用。配置保存、触发生效和消息实际送达是三项独立证据；未经单独授权，不提交表单数据、不发送测试通知、不向真实人员或群发消息。
