# 实验记录：OpenCode V1(1.18.31) × V2(2.0.10) 插件兼容实证

**日期**：2026-09-20 ｜**环境**：本机 1.18.31（生产）/ V2 npm `@opencode/cli-linux-x64@2.0.10`（独立路径 `/tmp/opencode/v2bin`，XDG 三目录隔离，不覆盖生产 binary）

## 实验 1：1.18.31 default 对象入口（object entrypoint）

观测法：插件 default export `{id, setup, server}`，各方法写 MARK 文件；`opencode run` 触发。

| 观测 | 结果 |
|---|---|
| `server()` 被调 | ✅（返回的 V1 tool map 正常注册，工具被模型调用，execute 执行实证） |
| `setup()` 被调 | ✅（1.18.31 前向误调）——传入 ctx 为普通 object，**无 `tool.transform` 域**（形态防御走 else 分支实证） |
| named export 非函数 | 抛 TypeError（D1 既有实证，本次未复测） |
| 挂载形态 | `file://单文件` / `绝对路径字符串` / `[路径, {}] 元组` 三形态等价 ✅ |

结论：**双形状成立**——server() 承载 V1 语义，setup() 做形态防御后跳过。

坑：实验目录无 node_modules 时插件 import 静默失败（无报错无日志）——import 解析锚=文件物理位置，B 仓挂载生产形态不受影响。

## 实验 2：V2 setup() 形状验证

V2 获取：npm 平台包（`curl opencode.ai/update/api/latest/cli/npm` → 2.0.10，ref v2 分支）；GitHub v2.x 仅 git tag 无 release 二进制；installer `https://opencode.ai/v2/install`。

| 观测 | 结果 |
|---|---|
| `.opencode/plugins/` 约定目录自动发现 | ✅ setup 被调，`ctx.tool.transform` 域存在（真 V2 ctx），注册链路 `editor.add` 正常 |
| `server()` 在 V2 | 未被调（符合设计，互不干扰） |
| 手写形状（不经 `Plugin.define()`） | ✅ 被接受 |
| 手写 V1 工具对象（裸 {description, args:{}, execute}，无 tool() helper） | ✅ 在 1.18.31 可注册（备用结论） |

## 实验 3：挂载矩阵（V2，run 触发 + MARK 硬观测）

| 形态 | 加载 |
|---|---|
| 配置 `"plugin"` 键 file://目录（V1 键归一化路径） | ❌ |
| 配置 `"plugins"` 键 file://目录 | ❌ |
| 配置 `"plugins"` 键 `{package: 单文件}` | ❌ |
| 配置 `"plugins"` 键裸字符串目录 | ❌ |
| 约定目录 + 拷贝单文件 | ✅ |
| 约定目录 + symlink 目录 | ✅ |
| 约定目录 + symlink 单 .ts | ✅ |
| 约定目录 + 转发壳（真文件 re-export 绝对路径） | ✅ |

## 陷阱与运维注意（V2）

1. **`opencode plugin list` 不触发加载**——只列注册表（曾致矩阵误判"No plugins found"，全部结论以 MARK 文件为准重跑修正）
2. **共享后台服务持有启动时配置**——改配置不生效直到服务重启；调试用 `--standalone` 或 `pkill -f "opencode.*serve"`（注意 pkill 模式别匹配自身命令行，`[o]pencode` 技巧）
3. V2 默认 free 模型（jev/nemotron）间歇 500（Internal server error）——与插件无关，观测插件不需要模型成功
4. V2 读项目级 V1 `opencode.json` 的 `plugin` 键（归一化尝试）但单文件路径报 WARN "must be a directory"——**生产项目级 V1 配置在 V2 下会告警不生效**，全局配置同理
5. LSP：V2 接受 `lsp` 配置但不运行语言服务器；`compaction.prune` 忽略带警告（均知悉项，非本 Issue 范围）

## V2 基础设施事实

- V2 分发渠道：npm `@opencode/cli-*` 平台包 / installer `https://opencode.ai/v2/install`（支持 `--version`）；与 V1 同 `opencode` 命令不并存
- V2 SDK：`@opencode/plugin@2.0.10` 已发 npm（latest）——本仓仅 devDep 引类型，运行时不 import
- V2 服务模型：共享后台服务 + `--standalone` 私有服务；`opencode debug paths` 查路径；日志在 `{data}/opencode/log/opencode.log`
