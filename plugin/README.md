# plugin/ —— 状态机插件（Story 2 交付）

`stage_get` / `stage_set`：转移合法性校验（加载 configs/ 下转移表数据文件，禁止硬编码）+ `.stage-history` JSONL 留痕。契约：A 仓 `07-state-machine.md`。
