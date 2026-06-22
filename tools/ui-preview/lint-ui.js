#!/usr/bin/env node
/**
 * UI规范检查器 - 自动检查UI是否符合设计规范
 *
 * 检查项：
 * - 按钮最小尺寸（可点击区域）
 * - 字体最小字号
 * - 节点越界（超出屏幕）
 * - 文本溢出（超出容器）
 * - 层级过深（影响性能）
 *
 * 使用：
 *   node tools/ui-preview/lint-ui.js \
 *     --in dist/ui_export.json \
 *     --out lint_report.md
 */

const fs = require('fs');
const path = require('path');

const RULES = {
    // 按钮最小宽度
    buttonMinWidth: {
        enabled: true,
        threshold: 80,
        severity: 'warning',
        message: '按钮宽度不足'
    },
    // 按钮最小高度
    buttonMinHeight: {
        enabled: true,
        threshold: 40,
        severity: 'warning',
        message: '按钮高度不足'
    },
    // Label最小字号
    labelMinFontSize: {
        enabled: true,
        threshold: 14,
        severity: 'warning',
        message: '字号过小'
    },
    // 节点越界检查
    nodeOutOfBounds: {
        enabled: true,
        severity: 'error',
        message: '节点超出屏幕'
    },
    // 树深度检查
    treeDepthLimit: {
        enabled: true,
        threshold: 15,
        severity: 'warning',
        message: '节点层级过深'
    },
    // 节点总数检查
    nodeTotalLimit: {
        enabled: true,
        threshold: 400,
        severity: 'warning',
        message: '节点总数过多'
    }
};

function parseArgs() {
    const args = {
        input: null,
        output: null,
        config: null
    };

    for (let i = 2; i < process.argv.length; i++) {
        if (process.argv[i] === '--in') args.input = process.argv[++i];
        else if (process.argv[i] === '--out') args.output = process.argv[++i];
        else if (process.argv[i] === '--config') args.config = process.argv[++i];
    }

    if (!args.input) {
        console.error('Usage: node lint-ui.js --in <path> [--out <path>]');
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

function walkTree(node, callback, depth, path, parentOrigin, parentScale) {
    depth = depth || 0;
    path = path || [];
    // Cocos2d-x bl origin = parent's bl origin + (node.x, node.y) * parentScale,
    // offset by node's own anchor. inspect.js uses the same scheme — lint-ui
    // must match it or every ScrollView child will look out-of-bounds.
    parentOrigin = parentOrigin || { x: 0, y: 0 };
    parentScale = parentScale || { x: 1, y: 1 };

    if (!node) return;

    const nodePath = path.concat(node.name || node.kind).join(' > ');
    const sx = parentScale.x * (node.scaleX === undefined ? 1 : Number(node.scaleX) || 1);
    const sy = parentScale.y * (node.scaleY === undefined ? 1 : Number(node.scaleY) || 1);
    const w = (Number(node.width) || 0) * sx;
    const h = (Number(node.height) || 0) * sy;
    const ax = node.ignoreAnchor ? 0 : (node.anchorX === undefined ? 0 : Number(node.anchorX) || 0);
    const ay = node.ignoreAnchor ? 0 : (node.anchorY === undefined ? 0 : Number(node.anchorY) || 0);
    const anchorX = parentOrigin.x + (Number(node.x) || 0) * parentScale.x;
    const anchorY = parentOrigin.y + (Number(node.y) || 0) * parentScale.y;
    const blX = anchorX - w * ax;
    const blY = anchorY - h * ay;
    const worldRect = { left: blX, right: blX + w, bottom: blY, top: blY + h };
    const childOrigin = { x: blX, y: blY };
    const childScale = { x: sx, y: sy };

    callback(node, depth, nodePath, worldRect);

    if (node.children) {
        node.children.forEach(child => {
            walkTree(child, callback, depth + 1, path.concat(node.name || node.kind), childOrigin, childScale);
        });
    }
}

function checkButtonSize(node, path, winSize) {
    const issues = [];

    if (node.kind && (node.kind.includes('Button') || node.kind === 'StatusButton' || node.kind === 'AttrButton')) {
        if (RULES.buttonMinWidth.enabled && node.width < RULES.buttonMinWidth.threshold) {
            issues.push({
                rule: 'buttonMinWidth',
                severity: RULES.buttonMinWidth.severity,
                nodePath: path,
                message: `${RULES.buttonMinWidth.message}: ${node.width}px < ${RULES.buttonMinWidth.threshold}px`
            });
        }

        if (RULES.buttonMinHeight.enabled && node.height < RULES.buttonMinHeight.threshold) {
            issues.push({
                rule: 'buttonMinHeight',
                severity: RULES.buttonMinHeight.severity,
                nodePath: path,
                message: `${RULES.buttonMinHeight.message}: ${node.height}px < ${RULES.buttonMinHeight.threshold}px`
            });
        }
    }

    return issues;
}

function checkLabelFontSize(node, path) {
    const issues = [];

    if (node.kind === 'Label' && node.fontSize && RULES.labelMinFontSize.enabled) {
        if (node.fontSize < RULES.labelMinFontSize.threshold) {
            issues.push({
                rule: 'labelMinFontSize',
                severity: RULES.labelMinFontSize.severity,
                nodePath: path,
                message: `${RULES.labelMinFontSize.message}: ${node.fontSize}px < ${RULES.labelMinFontSize.threshold}px (text: "${node.text}")`
            });
        }
    }

    return issues;
}

function checkNodeBounds(node, path, winSize, worldRect) {
    const issues = [];

    if (!RULES.nodeOutOfBounds.enabled) return issues;
    if (node.visible === false) return issues;
    if (node.width <= 0 || node.height <= 0) return issues;

    // 滚动容器内的子节点本来就允许在容器外（滚动内容超出视口部分）。
    // ScrollView/TableView 自身已在 inspect.js 的 outOfBounds 里排除，
    // 这里排除它们的整棵子树，避免对每个滚动列表项报假阳性。
    if (node.kind === 'TableView' || node.kind === 'ScrollView' ||
        path.indexOf('ScrollView') >= 0 || path.indexOf('TableView') >= 0 ||
        path.indexOf('innerContainer') >= 0) {
        return issues;
    }

    const left = worldRect.left;
    const right = worldRect.right;
    const bottom = worldRect.bottom;
    const top = worldRect.top;

    const margin = 2;
    if (right < -margin || left > winSize.width + margin ||
        top < -margin || bottom > winSize.height + margin) {
        issues.push({
            rule: 'nodeOutOfBounds',
            severity: RULES.nodeOutOfBounds.severity,
            nodePath: path,
            message: `${RULES.nodeOutOfBounds.message}: bounds=(${left.toFixed(0)}, ${bottom.toFixed(0)}, ${right.toFixed(0)}, ${top.toFixed(0)}), screen=(0, 0, ${winSize.width}, ${winSize.height})`
        });
    }

    return issues;
}

function checkTreeDepth(maxDepth) {
    const issues = [];

    if (RULES.treeDepthLimit.enabled && maxDepth > RULES.treeDepthLimit.threshold) {
        issues.push({
            rule: 'treeDepthLimit',
            severity: RULES.treeDepthLimit.severity,
            nodePath: '(global)',
            message: `${RULES.treeDepthLimit.message}: ${maxDepth} > ${RULES.treeDepthLimit.threshold}`
        });
    }

    return issues;
}

function checkNodeTotal(total) {
    const issues = [];

    if (RULES.nodeTotalLimit.enabled && total > RULES.nodeTotalLimit.threshold) {
        issues.push({
            rule: 'nodeTotalLimit',
            severity: RULES.nodeTotalLimit.severity,
            nodePath: '(global)',
            message: `${RULES.nodeTotalLimit.message}: ${total} > ${RULES.nodeTotalLimit.threshold}`
        });
    }

    return issues;
}

function lint(data) {
    const winSize = data.winSize || {width: 640, height: 1136};
    const issues = [];
    let maxDepth = 0;
    let totalNodes = 0;

    walkTree(data.scene, (node, depth, path, worldRect) => {
        totalNodes++;
        maxDepth = Math.max(maxDepth, depth);

        issues.push(...checkButtonSize(node, path, winSize));
        issues.push(...checkLabelFontSize(node, path));
        issues.push(...checkNodeBounds(node, path, winSize, worldRect));
    });

    issues.push(...checkTreeDepth(maxDepth));
    issues.push(...checkNodeTotal(totalNodes));

    const report = {
        summary: {
            total: issues.length,
            errors: issues.filter(i => i.severity === 'error').length,
            warnings: issues.filter(i => i.severity === 'warning').length,
            totalNodes: totalNodes,
            maxDepth: maxDepth
        },
        issues: issues
    };

    return report;
}

function formatReport(report) {
    const lines = [];

    lines.push('# UI Lint Report');
    lines.push('');
    lines.push(`**Summary**: ${report.summary.total} issues (${report.summary.errors} errors, ${report.summary.warnings} warnings)`);
    lines.push(`- Total nodes: ${report.summary.totalNodes}`);
    lines.push(`- Max depth: ${report.summary.maxDepth}`);
    lines.push('');

    if (report.summary.errors > 0) {
        lines.push('## ❌ Errors');
        lines.push('');
        report.issues.filter(i => i.severity === 'error').forEach(issue => {
            lines.push(`- **${issue.nodePath}**`);
            lines.push(`  - [${issue.rule}] ${issue.message}`);
        });
        lines.push('');
    }

    if (report.summary.warnings > 0) {
        lines.push('## ⚠️ Warnings');
        lines.push('');
        report.issues.filter(i => i.severity === 'warning').forEach(issue => {
            lines.push(`- **${issue.nodePath}**`);
            lines.push(`  - [${issue.rule}] ${issue.message}`);
        });
        lines.push('');
    }

    if (report.summary.total === 0) {
        lines.push('✅ No issues found!');
        lines.push('');
    }

    return lines.join('\n');
}

function main() {
    const args = parseArgs();
    const data = loadJson(args.input);

    const report = lint(data);
    const hasIssues = report.summary.total > 0;

    // 只在有问题时才写文件；0 issues 不生成 lint_report_*.md，避免 dist 堆积空报告。
    if (args.output && hasIssues) {
        fs.writeFileSync(args.output, formatReport(report), 'utf8');
        console.log('Lint report written to ' + args.output);
    } else if (!args.output) {
        console.log(formatReport(report));
    }

    process.exit(report.summary.errors > 0 ? 1 : 0);
}

main();
