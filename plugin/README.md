# plugin/ —— 状态机插件（Story 2 交付）

`stage_get` / `stage_set`：转移合法性校验（加载 configs/ 下转移表数据文件，禁止硬编码）+ `.stage-history` JSONL 留痕。契约：A 仓 `07-state-machine.md`。

> **入口实际位置**：`src/plugin/index.ts`（单包工程范式，代码统一在 `src/`，package.json 以 `exports["./plugin"]` 指向入口）。本目录保留目录规划叙事，为规划占位说明。
