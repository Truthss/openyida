# 成员、数据范围与字段权限

## 选择配置维度

| 用户要配置什么 | 使用什么 |
| --- | --- |
| 哪些人适用本权限组 | `--members`、`--roles`、`--all-members`，或引用已有矩阵 |
| 能访问哪些记录 | `--data-permission`：全部、本人创建、部门范围或完整自定义条件 |
| 能执行哪些操作 | `--action-permission`：查看、编辑、删除等操作 |
| 能查看或编辑哪些字段 | `--field-permission` 完整配置，或 `--field-access` 逐字段配置 |

四个维度分别确定，不能由角色名称推断数据范围或字段权限。不同权限组可能叠加，先查询所有相关组，检查是否有其他组扩大访问范围。

## 数据范围

`--data-permission` 支持主技能列出的范围类型，以及完整 `rule`、`customDepartmentData`、`formulaData`。修改自定义条件时，从平台已有配置取得条件结构，按用户要求调整真实字段、比较值和条件组合。当前 CLI 支持完整条件传入，尚无任意自定义条件的简化编排入口。

仅当需求是“某个主表成员字段包含当前登录人”时，使用快捷参数 `--owner-field <fieldId>`。字段必须是实际存在的主表成员字段；它会替换本组数据范围，只支持 VIEW，不能与 `--data-permission` 同传。平台在访问时确定当前登录人。

不要把这个快捷条件用于其他数据范围，也不要用创建人、固定人员 ID 或固定业务字段代替用户要求的筛选条件。

## 成员与角色

`--members <userId,...>` 替换 PERSONS 条目，`--roles <roleId,...>` 替换 ROLE 条目；其他成员类型与排除条目保留。使用目标组织已有的真实 ID，CLI 不创建角色或调整角色内部成员。

`--roles` 不与 `--members/--all-members/--matrix` 混用。替换成员时检查完整 before/after；CLI 要求确认移除项时，经用户确认后加 `--confirm-member-replace`。部门和参数成员当前只能保留，不能新增。

## 字段权限

`--field-access <fieldId:view|edit|hidden|encrypt>` 可重复，分别表示只读、可编辑、隐藏、加密。

- 首次转为自定义字段权限时，必须用 `--field-default` 指定其余字段权限。它不等于保留表单原有的动态显隐规则，应逐项核对预览。
- 已有 CUSTOM 字段权限时，只传要修改的字段；不传 `--field-default`，其他字段保留。
- 字段可编辑还要求操作权限允许 `OPERATE_EDIT`。
- 子表列可编辑时，所属子表也须显式设置为 `edit`。

更新已有权限组并预览单个字段变化：

```bash
openyida save-permission <appType> <formUuid> --package-uuid <packageUuid> \
  --field-access <真实字段ID>:hidden --dry-run
```

所有 ID 从实际查询结果取得。`--dry-run` 只展示 before/after，返回 `remoteWrites: 0`；使用 `--owner-field` 时，`otherPackagesToReview` 另列其他待复核权限组。核对并确认后去掉 `--dry-run` 保存。

## 引用已有矩阵

普通成员或角色权限组不要求 OA 矩阵。引用矩阵前查询可用性：

```bash
openyida get-permission <appType> <formUuid> --check-matrix --json
```

`matrixAvailability.management` 表示组织矩阵管理入口，`usage` 表示当前应用能否使用矩阵：

| 结果 | 处理 |
| --- | --- |
| `available` | 可以继续；`purchaseVerified: false`，不据此宣称已购买 |
| `unavailable` | 告知当前不可用，请管理员核对或开通 OA 增强权益包；提供[官方说明](https://docs.aliwork.com/docs/yida_support/_15/ifpp7g/rxz494bh83kecq29) |
| `unknown` | 展示查询错误，停止矩阵配置；不要断言缺少权益 |

`save-permission --matrix` 只引用真实已有矩阵，保存前检查当前应用的使用能力；不可用或未知时停止写入。当前 CLI 不支持矩阵本体新增、编辑或删除。不得修改用户版本、权益或额度，也不得伪造可用性结果。
