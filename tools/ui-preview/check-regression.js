#!/usr/bin/env node
/**
 * UI回归测试 - 检测意外的UI改动
 *
 * 用途：
 * 1. 保存"黄金标准"UI快照（golden snapshot）
 * 2. 每次改代码后对比当前UI和黄金标准
 * 3. 自动检测：位置偏移、尺寸变化、节点消失、层级错乱
 *
 * 使用：
 *   node tools/ui-preview/check-regression.js \
 *     --golden golden/topframe.json \
 *     --current dist/ui_export.json
 */

const fs = require('fs');
const path = require('path');

function parseArgs() {
    const args = {
        golden: null,
        current: null,
        threshold: 5,  // 坐标容差（px）
        output: null
    };

    for (let i = 2; i < process.argv.length; i++) {
        if (process.argv[i] === '--golden') args.golden = process.argv[++i];
        else if (process.argv[i] === '--current') args.current = process.argv[++i];
        else if (process.argv[i] === '--threshold') args.threshold = Number(process.argv[++i]);
        else if (process.argv[i] === '--output') args.output = process.argv[++i];
    }

    if (!args.golden || !args.current) {
        console.error('Usage: node check-regression.js --golden <path> --current <path>');
        process.exit(1);
    }

    return args;
}

function loadJson(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        console.error('Failed to load ' + filePath + ': ' + e.message);
        process.exit(1);
    }
}

function buildNodeIndex(tree, index, path) {
    index = index || {};
    path = path || [];

    if (!tree) return index;

    const nodePath = path.concat(tree.name || tree.kind).join(' > ');
    index[nodePath] = tree;

    if (tree.children) {
        tree.children.forEach(child => buildNodeIndex(child, index, path.concat(tree.name || tree.kind)));
    }

    return index;
}

function compareNodes(golden, current, threshold) {
    const issues = [];

    // 位置变化
    const dx = Math.abs(golden.x - current.x);
    const dy = Math.abs(golden.y - current.y);
    if (dx > threshold || dy > threshold) {
        issues.push({
            type: 'position_change',
            severity: 'warning',
            message: `Position changed: (${golden.x}, ${golden.y}) → (${current.x}, ${current.y}) (Δ${dx.toFixed(1)}, ${dy.toFixed(1)})`
        });
    }

    // 尺寸变化
    const dw = Math.abs(golden.width - current.width);
    const dh = Math.abs(golden.height - current.height);
    if (dw > threshold || dh > threshold) {
        issues.push({
            type: 'size_change',
            severity: 'warning',
            message: `Size changed: ${golden.width}x${golden.height} → ${current.width}x${current.height}`
        });
    }

    // anchor变化
    if (Math.abs(golden.anchorX - current.anchorX) > 0.01 ||
        Math.abs(golden.anchorY - current.anchorY) > 0.01) {
        issues.push({
            type: 'anchor_change',
            severity: 'error',
            message: `Anchor changed: (${golden.anchorX}, ${golden.anchorY}) → (${current.anchorX}, ${current.anchorY})`
        });
    }

    // 可见性变化
    if (golden.visible !== current.visible) {
        issues.push({
            type: 'visibility_change',
            severity: 'error',
            message: `Visibility changed: ${golden.visible} → ${current.visible}`
        });
    }

    // Label文字变化
    if (golden.kind === 'Label' && golden.text !== current.text) {
        issues.push({
            type: 'text_change',
            severity: 'info',
            message: `Text changed: "${golden.text}" → "${current.text}"`
        });
    }

    // Sprite变化
    if (golden.kind === 'Sprite' && golden.spriteFrameName !== current.spriteFrameName) {
        issues.push({
            type: 'sprite_change',
            severity: 'warning',
            message: `Sprite changed: ${golden.spriteFrameName} → ${current.spriteFrameName}`
        });
    }

    return issues;
}

function runRegression(golden, current, threshold) {
    const goldenIndex = buildNodeIndex(golden.scene);
    const currentIndex = buildNodeIndex(current.scene);

    const report = {
        summary: {
            total: 0,
            errors: 0,
            warnings: 0,
            info: 0
        },
        issues: []
    };

    // 检查现有节点的变化
    for (const nodePath in goldenIndex) {
        if (!currentIndex[nodePath]) {
            report.issues.push({
                nodePath: nodePath,
                type: 'node_removed',
                severity: 'error',
                message: 'Node removed from tree'
            });
            report.summary.errors++;
        } else {
            const issues = compareNodes(goldenIndex[nodePath], currentIndex[nodePath], threshold);
            issues.forEach(issue => {
                report.issues.push({
                    nodePath: nodePath,
                    ...issue
                });
                report.summary[issue.severity === 'error' ? 'errors' : issue.severity === 'warning' ? 'warnings' : 'info']++;
            });
        }
    }

    // 检查新增节点
    for (const nodePath in currentIndex) {
        if (!goldenIndex[nodePath]) {
            report.issues.push({
                nodePath: nodePath,
                type: 'node_added',
                severity: 'info',
                message: 'New node added to tree'
            });
            report.summary.info++;
        }
    }

    report.summary.total = report.issues.length;

    return report;
}

function formatReport(report) {
    const lines = [];

    lines.push('# UI Regression Test Report');
    lines.push('');
    lines.push(`**Summary**: ${report.summary.total} issues (${report.summary.errors} errors, ${report.summary.warnings} warnings, ${report.summary.info} info)`);
    lines.push('');

    if (report.summary.errors > 0) {
        lines.push('## ❌ Errors');
        lines.push('');
        report.issues.filter(i => i.severity === 'error').forEach(issue => {
            lines.push(`- **${issue.nodePath}**`);
            lines.push(`  - ${issue.type}: ${issue.message}`);
        });
        lines.push('');
    }

    if (report.summary.warnings > 0) {
        lines.push('## ⚠️ Warnings');
        lines.push('');
        report.issues.filter(i => i.severity === 'warning').forEach(issue => {
            lines.push(`- **${issue.nodePath}**`);
            lines.push(`  - ${issue.type}: ${issue.message}`);
        });
        lines.push('');
    }

    if (report.summary.info > 0) {
        lines.push('## ℹ️ Info');
        lines.push('');
        report.issues.filter(i => i.severity === 'info').slice(0, 10).forEach(issue => {
            lines.push(`- **${issue.nodePath}**`);
            lines.push(`  - ${issue.type}: ${issue.message}`);
        });
        if (report.issues.filter(i => i.severity === 'info').length > 10) {
            lines.push(`... and ${report.issues.filter(i => i.severity === 'info').length - 10} more`);
        }
        lines.push('');
    }

    return lines.join('\n');
}

function main() {
    const args = parseArgs();
    const golden = loadJson(args.golden);
    const current = loadJson(args.current);

    const report = runRegression(golden, current, args.threshold);
    const formatted = formatReport(report);

    if (args.output) {
        fs.writeFileSync(args.output, formatted, 'utf8');
        console.log('Report written to ' + args.output);
    } else {
        console.log(formatted);
    }

    // 返回退出码
    process.exit(report.summary.errors > 0 ? 1 : 0);
}

main();
