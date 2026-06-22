#!/bin/bash
# AI 自测全链：generate-all -> render -> inspect -> lint
# 全程本地，无真机，无用户操作。
#
# 产物分层：
#   .work/  中间产物（capture_*.json、log、render txt）
#   dist/   最终交付：render_*.png（模拟图）+ 报告（runtime_report.md、lint_report_*.md）

set -u
cd "$(dirname "$0")/../.."

UI_PREVIEW="tools/ui-preview"
WORK="$UI_PREVIEW/.work"
DIST="$UI_PREVIEW/dist"
GEN="$UI_PREVIEW/runtime/generate-all.js"
RENDER="$UI_PREVIEW/runtime/render.py"
INSPECT="$UI_PREVIEW/runtime/inspect.js"
LINT="$UI_PREVIEW/lint-ui.js"
LOCAL_STORAGE_JSON="$UI_PREVIEW/localStorage.json"
STORAGE_ARGS=()
if [ -f "$LOCAL_STORAGE_JSON" ]; then
    STORAGE_ARGS=(--local-storage-json "$LOCAL_STORAGE_JSON")
fi

# scene list: name|target|instantiate|after-js
# 只保留用户会改的 UI 按钮密集场景。启动画面 / 剧情 / 结局 / 日志不在迭代范围。
SCENES=(
    "MenuScene|src/ui/MenuScene.js|MenuScene|"
    "ChooseScene|src/ui/ChooseScene.js|ChooseScene|"
    "MainScene|src/ui/MainScene.js|MainScene|"
    "MainScene_roleTalentDialog|src/ui/MainScene.js|MainScene|RoleTalentUiHelper.showRoleTalentDialog(__previewInstance);"
    "medalScene|src/ui/medalLayer.js|medalScene|"
    "shopScene|src/ui/shopScene.js|ShopScene|"
    "rankScene|src/ui/rankScene.js|RankScene|"
    "rankFamousScene|src/ui/rankFamousScene.js|RankFamousScene|"
)

mkdir -p "$WORK" "$DIST"
rm -f "$WORK"/* 2>/dev/null
rm -f "$DIST"/render_*.png "$DIST"/lint_report_*.md "$DIST"/runtime_report.md 2>/dev/null

status=0

echo "=== [1/4] generate captures ==="
for entry in "${SCENES[@]}"; do
    IFS='|' read -r name target inst after_js <<< "$entry"
    echo "  -> $name"
    AFTER_ARGS=()
    if [ -n "${after_js:-}" ]; then
        AFTER_ARGS=(--after-js "$after_js")
    fi
    if ! node "$GEN" --target "$target" --instantiate "$inst" --name "$name" \
        "${STORAGE_ARGS[@]}" \
        "${AFTER_ARGS[@]}" \
        --out-dir "$WORK" \
        > "$WORK/log_${name}.txt" 2>&1; then
        echo "     FAIL (generate failed, see $WORK/log_${name}.txt)"
        status=1
        continue
    fi
    if [ ! -f "$WORK/capture_${name}.json" ]; then
        echo "     FAIL (no capture, see $WORK/log_${name}.txt)"
        status=1
    fi
done

echo "=== [2/4] render PNGs ==="
shopt -s nullglob
captures=("$WORK"/capture_*.json)
if [ ${#captures[@]} -eq 0 ]; then
    echo "  FAIL (no captures generated)"
    status=1
fi
for f in "${captures[@]}"; do
    name=$(basename "$f" .json | sed 's/capture_//')
    if ! python3 "$RENDER" --in "$f" --out "$DIST/render_device_${name}.png" --player-view \
        > "$WORK/render_device_${name}.txt" 2>&1; then
        echo "  FAIL render $name (see $WORK/render_device_${name}.txt)"
        status=1
    fi
done

echo "=== [3/4] inspect ==="
if ! node "$INSPECT" > "$WORK/inspect_stdout.txt" 2>&1; then
    echo "  FAIL inspect (see $WORK/inspect_stdout.txt)"
    status=1
fi

echo "=== [4/4] lint ==="
for f in "${captures[@]}"; do
    name=$(basename "$f" .json | sed 's/capture_//')
    if ! node "$LINT" --in "$f" --out "$DIST/lint_report_${name}.md" \
        > "$WORK/lint_${name}.txt" 2>&1; then
        echo "  FAIL lint $name (see $WORK/lint_${name}.txt)"
        status=1
    fi
done

# summary
echo ""
echo "=== summary ==="
ls -1 "$WORK"/capture_*.json 2>/dev/null | wc -l | xargs echo "captures (.work/):"
find "$DIST" -maxdepth 1 -name 'render_device_*.png' 2>/dev/null | wc -l | xargs echo "device renders (dist/):"
find "$DIST" -maxdepth 1 -name 'lint_report_*.md' 2>/dev/null | wc -l | xargs echo "lint reports (dist/):"
echo "runtime report: $DIST/runtime_report.md"
exit "$status"
