#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

if [[ "${SKIP_PRE_PUSH:-0}" == "1" ]]; then
  echo "[pre-push] SKIP_PRE_PUSH=1，跳过检查"
  exit 0
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[pre-push] 未找到 pnpm，请先安装 pnpm"
  exit 1
fi

if ! command -v go >/dev/null 2>&1; then
  echo "[pre-push] 未找到 go，请先安装 Go"
  exit 1
fi

echo "[pre-push] 运行 web 质量检查"
(
  cd "$ROOT_DIR/web"
  pnpm lint
  pnpm css
  pnpm test
  pnpm build
)

echo "[pre-push] 运行 server 质量检查"
(
  cd "$ROOT_DIR/server"
  go test ./...
  make build
)

echo "[pre-push] 全部通过"
