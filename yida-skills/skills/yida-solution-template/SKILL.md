---
name: yida-solution-template
description: 仅在用户明确提到宜搭方案中心、方案模板、模板启用、模板 AI 搭，或继续该上下文时使用。查询模板与详情；定制需求交给平台原生 AI 搭建入口；原样使用模板时可在明确应用名称后直接启用，并以本地请求收据和应用列表回读防止超时重建。泛称“搭应用/系统”仍走 yida-app。
---

# 宜搭方案模板

本技能处理方案中心模板的发现、详情、原生 AI 搭建入口和直接启用。只有用户明确提到“方案中心”“方案模板”“模板启用”“模板 AI 搭”或延续已确认模板任务时加载；普通“搭应用/系统”必须继续使用 `yida-app`。

## 顺序

先核对登录环境，再查询模板和详情：

```bash
openyida login --check-only --json
openyida solution-template search --query '合同' --json
openyida solution-template detail TPL_XXX --json
openyida solution-template prepare TPL_XXX --name '合同管理' --with-data n --json
```

原样启用前用 `prepare` 获取只读摘要，向用户说明目标组织/环境、模板版本、应用名称、是否带示例数据、当前账号创建的同名应用和已有请求。它不写入应用或收据。`directEnableSupported` 仅说明存在复制源；`enableEligibility=platform-decides-on-submit` 表示权限和权益尚待平台在提交时裁决，不能承诺当前账号一定能启用。用户已明确授权且参数齐全时，不额外增加确认环节。

- 需要修改业务范围、字段、页面或流程：执行 `ai-build` 获取平台原生搭建入口，把定制要求交给原生搭建器。返回的 `submissionAccepted=false`、`applicationVerified=false` 表示只完成入口交接，不能宣称应用已创建。
- 希望原样使用模板：只有用户明确目标应用名称并允许创建资源时，才执行 `enable`。`--with-data y|n` 决定是否带模板数据。

```bash
openyida solution-template ai-build TPL_XXX --json
openyida solution-template enable TPL_XXX --name '合同管理' --with-data y --json
```

## 超时、回读与完成口径

直接启用会先写本地请求收据，每次尝试只提交一次。默认最多等待 10 秒，按递增间隔只读查询应用；`--wait 0` 只查一次，`--wait 0-60` 设置等待预算。超时和不完整响应也先尝试只读恢复。没有后台轮询或百分比进度。

平台明确拒绝时，本次尝试结束，保留平台错误；`status` 和普通重复 `enable` 只返回拒绝原因，不将后来出现的同名应用归为本次结果，不自动重试、不修改权限或权益。仅当用户再次明确要求提交时，使用相同参数和 `--retry` 开始一次新尝试，继续由平台鉴权：

```bash
openyida solution-template enable TPL_XXX --name '合同管理' --with-data n --request-id st-xxxxxxxx --retry --json
```

未知结果或应用尚不可见时，不得盲目重建；`--retry` 也不会重放未知请求。使用返回的请求号查询，可选择在本次命令内等待：

```bash
openyida solution-template status st-xxxxxxxx --wait 10 --json
```

分别读取 `submissionAccepted` 与 `applicationVerified`。只有 `applicationVerified=true` 才表示本次查询确认应用存在；`previouslyVerified` 和 `lastVerifiedAt` 保留历史创建证据。即使历史 `state=completed`，本次查询失败或应用不再可见时也必须返回 `applicationVerified=false`，不能声称当前可访问。查询失败保留已受理状态和平台原因，通过 `nextAction` 继续查状态，不转成启用失败。`uncertain` 或 `ambiguous` 不得重提；多候选需核对身份。已完成请求重复执行只返回原应用；只有用户明确要求再建一份时才使用新的 `--request-id`。

登录、组织权限、版本权益、AI 额度和模板可用性均由平台裁决。保留平台错误，不切换组织、不修改权益、不绕过限制。真实启用后还需按用户要求打开并验收应用；应用列表回读只证明资源身份，不证明页面效果、业务数据或运行时权限正确。
