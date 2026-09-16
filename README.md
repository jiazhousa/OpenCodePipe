# OpenCodePipe

**SpecPipe 体系的 OpenCode 实现仓**——插件、CLI 工具包与代理定义，在硬件层面践行 [SpecPipe](https://github.com/jiazhousa/SpecPipe) 规章中的工作流与工件规范。

> 体系表述：**SpecPipe（规章）/ OpenCodePipe（实现）**。SpecPipe 定义"应该怎样"（平台无关的工作流 + 工件规范）；本仓负责"强制做到"（状态机校验、权限白名单、质量门前置、机械检查）。判断交给模型，强制交给代码。

## 命名基线

- 仓库名：`OpenCodePipe`
- CLI 命令：`ocp`（如 `ocp init` / `ocp doctor` / `ocp stage set`）
- npm 包名：`opencodepipe`

## 目录规划

| 目录 | 规划内容 | 交付归属 |
|---|---|---|
| `plugin/` | 状态机插件：`stage_get` / `stage_set`（转移合法性校验 + `.stage-history` 留痕，转移表以数据文件加载 A 仓 `07-state-machine.md` 契约） | Story 2 |
| `agents/` | 五角色代理定义迁移（调度者/调研者/审查者/执行者/视觉解析者）+ 权限白名单，文件头声明对口 A 仓 `08-roles.md` | Story 2 |
| `cli/` | `ocp init`（铺设工作流目录与模板）/ `ocp doctor`（环境自检）/ `ocp worktree` + pre-push hook（质量门前置强制） | Story 3 |
| `check-tools/` | 机械检查项：禁词扫描 / 行数预算 / commit 格式 / 转移表一致性 / 平台词扫描；预留 Task.yaml 图论校验模块位 | Story 3 |
| `configs/` | 可配置数据：状态转移表数据文件、Git 分支策略、规则库（自 v1 迁移） | Story 2/3 |

> 各目录当前为规划占位，随对应 Story 交付填充——**本仓自身开发走 SpecPipe 工作流**（规格先行，档案见工作流目录）。

## 与 SpecPipe 的关系

- 规章事实源在 A 仓（[SpecPipe](https://github.com/jiazhousa/SpecPipe)），本仓以 **vendored 副本**携带规章（发版时从 A 仓拉取 tag + 转移表一致性校验后打包），运行时代理只读本地文件
- 用户规则（user-rule）按 A 仓 `10-composition.md` 的组合覆盖机制叠加于本仓默认配置之上

## License

[MIT](LICENSE)
