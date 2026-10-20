# 表单消息通知配置

## 场景与触发

| 场景 | trigger | 说明 |
| --- | --- | --- |
| 新记录提醒 | `FORM_DATA_CREATE` | 表单创建成功后发送 |
| 关键记录被修改 | `FORM_DATA_EDIT` | 任意编辑成功后发送；当前 CLI 不把字段条件伪装成已支持 |
| 删除审计提醒 | `FORM_DATA_DELETE` | 删除成功后发送，接收人需在删除后仍可解析 |
| 评论协作提醒 | `FORM_COMMENT` | 评论成功后发送 |

原生页面还展示按日期字段发送，以及流程开始、结束、到达节点和审批操作等能力。它们需要定时条件、流程版本、节点和审批结果上下文；当前 CLI 只读保留这些已有绑定，不写入。

## 配置示例

普通工作通知：

```json
{
  "trigger": "FORM_DATA_CREATE",
  "recipients": [
    {"type": "variable", "value": "originator"},
    {"type": "formField", "value": "实际人员字段ID"}
  ],
  "groups": [],
  "template": {
    "key": "workNotice",
    "title": "订单已提交",
    "content": "订单 ${!serialNo} 已提交，请及时处理",
    "fields": [],
    "image": [],
    "button": null
  }
}
```

变量按原生格式写为 `$!{变量或字段ID}`。系统字段以 `options.systemFields` 为准；表单字段以 `options.messageFields` 为准，不凭标签猜 ID。

详情卡片：

```json
{
  "trigger": "FORM_DATA_CREATE",
  "recipients": [{"type": "variable", "value": "originator"}],
  "groups": [],
  "template": {
    "key": "detailText",
    "title": "订单详情",
    "fields": [
      {"type": "variable", "value": "serialNo", "title": "流水号"},
      {"type": "formField", "value": "实际金额字段ID", "title": "金额"}
    ],
    "image": [],
    "button": {"name": "查看详情", "type": "formInstDetail", "value": ""}
  }
}
```

`detailImage` / `detailText` 使用 `fields`；`workNotice` / `imageCard` / `commentCard` / `pinnedImage` / `pinnedText` 使用 `content`。`button.type` 可为 `formInstDetail`、`comment` 或 `custom`；自定义链接仅接受无账号密码的 HTTP(S) URL。

群置顶模板把 `recipients` 设为空，并提供平台返回的群标识：

```json
{
  "trigger": "FORM_DATA_EDIT",
  "recipients": [],
  "groups": [{"cid": "实际群ID", "name": "业务群"}],
  "template": {
    "key": "pinnedText",
    "title": "订单状态更新",
    "content": "订单状态已更新",
    "fields": [],
    "image": []
  }
}
```

## 接收对象

- `employee`：平台人员 ID；配置读取和保存不证明人员仍在组织内。
- `role`：宜搭角色 ID；实际成员按触发时权限解析。
- `formField`：目标表单中的人员字段，必须出现在 `options.recipientFields`。
- `variable`：当前仅支持原生 `originator`（发起人）。
- `groups`：原生群置顶卡片目标；群权限、酷应用支持和成员关系仍由平台校验。

## 安全与验收

1. `list` / `inspect` 核实表单、通知 ID、触发和当前 hash。
2. `options` 核实表单类型、字段、模板和 `supportsToggle: false`。
3. 创建或修改只使用独立测试目标；带 `--backup` 可指定新文件，否则写入 `.cache/openyida/form-message/`。
4. 仅把 `readbackVerified: true` 视为配置回读成功；实际触发需另行提交/编辑测试数据，真实送达还需接收端验收和单独授权。
5. 写请求结果不确定时不重放；先重新查询，按实际远端状态决定下一步。
