# 美化方案确认

读取 [用户交互契约](../../../references/ask-human-interaction-contract.md)。在同一次确认交互中附上 `visual-plan.html`，绑定当前 revision，询问“是否按这份方案美化？”。提供“确认并开始美化 / 继续调整 / 暂不修改”选项；使用宿主真实 schema，不虚构工具参数。

逻辑 payload（相对路径从当前 workspace 起，实际执行时替换占位）：

```json
{
  "title": "确认美化方案",
  "question": "是否按这份方案美化？原有功能保持不变，不满意可恢复本轮修改前的样子。",
  "options": [
    { "value": "confirm_ui", "label": "确认并开始美化", "description": "完成备份后，按当前方案修改外观。" },
    { "value": "revise_ui", "label": "继续调整", "description": "先调整方案，再确认是否执行。" },
    { "value": "cancel_ui", "label": "暂不修改", "description": "保留当前页面和应用外观。" }
  ],
  "attachments": [{ "name": "视觉方案", "path": "project/.cache/openyida/<任务名>/ui-improve/<runId>/visual-plan.html" }],
  "revision": "<当前 revision>",
  "submitLabel": "提交选择"
}
```

宿主不支持附件或 revision 字段时，在该次问题中提供可打开的不可变方案链接，内部将真实交互 ID 绑定到该版本及内容摘要。没有允许的结构化提问工具时，用对话展示同一方案并明确提问，等待用户实际回答；记录消息与版本关联。这些都是 `ask_human` 的宿主适配，不能伪造调用记录。无法展示方案或无法取得明确回答时停在 `awaiting_confirmation`，不能靠超时继续。

仅在回答明确同意且 `revision = presentedRevision = confirmedRevision`、目标与内容摘要未变时进入实施。异步问题创建成功、默认选项、关闭、未答、“再看看”和旧版本同意都不是批准。继续调整只修改草案并重新提问；取消标记 `cancelled`。恢复会话时重新核对这些证据，不能只信一个 `confirmed: true`。

展示成功后写 `status=awaiting_confirmation`、`presentedRevision=revision` 和实际交互 ID；收到匹配版本的明确同意后写 `status=confirmed`、`confirmedRevision=revision`、回答证据和时间。修改方案则清空以上确认字段，回到 `draft`。
