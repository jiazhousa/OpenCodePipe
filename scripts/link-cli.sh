#!/usr/bin/env bash
# 生成 ocp wrapper 到目标路径（默认 ~/.local/bin/ocp）。
# 为什么是 wrapper 而非裸 ln -s：cli/index.ts 的 shebang 是 #!/usr/bin/env bun，
# 裸 symlink 要求 PATH 中有全局 bun；wrapper 固定走本仓 devDep 的 bun
# （node_modules/.bin/bun），前置仅需「本仓已 bun install」。
# B 仓整体移位后重跑本脚本即可恢复。
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_bun="$repo_root/node_modules/.bin/bun"
target="${1:-$HOME/.local/bin/ocp}"

if [ ! -x "$repo_bun" ]; then
  echo "错误：未找到 $repo_bun" >&2
  echo "请先在本仓完成依赖安装（任一途径获取 bun 后执行 bun install）：官方安装器 / npm i -g bun / 借用任一项目的 devDep bun" >&2
  exit 1
fi

mkdir -p "$(dirname "$target")"
cat > "$target" <<EOF
#!/usr/bin/env bash
# 由 scripts/link-cli.sh 生成——ocp wrapper，勿手改；重装：重跑该脚本
exec "$repo_bun" "$repo_root/cli/index.ts" "\$@"
EOF
chmod +x "$target"
echo "已安装：$target"
echo "  -> $repo_bun $repo_root/cli/index.ts"
