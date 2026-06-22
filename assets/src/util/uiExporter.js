/**
 * UI导出工具 - 从真实游戏运行时导出场景树
 *
 * 用途：生成准确的UI布局数据（JSON），供AI分析或渲染工具使用
 *
 * 使用方式：
 *   1. 在游戏里调用 window.exportCurrentScene()
 *   2. JSON会写到 jsb.fileUtils.getWritablePath() + "ui_export.json"
 *   3. 用 adb pull 拉取到电脑
 */

var UiExporter = {
    /**
     * 导出当前运行的场景
     * @param {string} [outputName] - 可选的输出文件名，默认 "ui_export.json"
     * @returns {object} 导出的JSON对象
     */
    exportCurrentScene: function(outputName) {
        try {
            var scene = cc.director.getRunningScene();
            if (!scene) {
                cc.error("[UiExporter] No running scene found");
                return null;
            }

            var tree = this._dumpNode(scene);
            var payload = {
                winSize: {
                    width: cc.winSize.width,
                    height: cc.winSize.height
                },
                timestamp: new Date().toISOString(),
                deviceInfo: this._getDeviceInfo(),
                scene: tree
            };

            // 写文件
            var fileName = outputName || "ui_export.json";
            var success = this._writeToFile(fileName, payload);

            if (success) {
                cc.log("[UiExporter] Exported to: " + fileName);
                return payload;
            } else {
                cc.error("[UiExporter] Failed to write file");
                return null;
            }
        } catch (e) {
            cc.error("[UiExporter] Export failed: " + e.message);
            cc.error(e.stack);
            return null;
        }
    },

    /**
     * 递归导出节点树
     * @private
     */
    _dumpNode: function(node) {
        if (!node) return null;

        // 基础属性
        var pos = node.getPosition ? node.getPosition() : {x: 0, y: 0};
        var anchor = node.getAnchorPoint ? node.getAnchorPoint() : {x: 0, y: 0};
        var size = node.getContentSize ? node.getContentSize() : {width: 0, height: 0};
        var scale = node.getScale ? node.getScale() : 1;
        var scaleX = node.getScaleX ? node.getScaleX() : scale;
        var scaleY = node.getScaleY ? node.getScaleY() : scale;
        var ignoreAnchor = node.isIgnoreAnchorPointForPosition
            ? node.isIgnoreAnchorPointForPosition()
            : false;
        var opacity = node.getOpacity ? node.getOpacity() : 255;
        var nodeColor = node.getColor ? node.getColor() : null;
        var result = {
            kind: this._getNodeKind(node),
            name: node.getName ? node.getName() : "",
            x: pos.x,
            y: pos.y,
            anchorX: anchor.x,
            anchorY: anchor.y,
            width: size.width,
            height: size.height,
            scaleX: scaleX,
            scaleY: scaleY,
            rotation: node.getRotation ? node.getRotation() : 0,
            ignoreAnchor: ignoreAnchor,
            visible: node.isVisible ? node.isVisible() : true,
            opacity: opacity,
            zOrder: node.getLocalZOrder ? node.getLocalZOrder() : 0,
            hasClick: this._hasClickListener(node)
        };
        if (nodeColor) {
            result.color = {
                r: nodeColor.r,
                g: nodeColor.g,
                b: nodeColor.b,
                a: opacity
            };
        }

        // Sprite 特有属性
        if (node instanceof cc.Sprite || result.kind === "Sprite") {
            result.spriteFrameName = this._getSpriteFrameName(node);
        }

        // Label 特有属性
        if (node instanceof cc.LabelTTF || result.kind === "Label") {
            result.text = node.getString ? node.getString() : "";
            result.fontSize = node._fontSize || node.getFontSize ? node.getFontSize() : null;
            result.fontFamily = node._fontName || null;
            var dimensions = node.getDimensions ? node.getDimensions() : null;
            if (dimensions) {
                result.dimensions = {width: dimensions.width, height: dimensions.height};
            }
            if (node.getHorizontalAlignment) {
                result.hAlignment = node.getHorizontalAlignment();
            }
            if (node.getVerticalAlignment) {
                result.vAlignment = node.getVerticalAlignment();
            }
            if (node._strokeEnabled) {
                result.stroke = {
                    enabled: true,
                    color: node._strokeColor || {r: 0, g: 0, b: 0, a: 255},
                    size: node._strokeSize || 0
                };
            }
        }

        // LayerColor 特有属性
        if (node instanceof cc.LayerColor || result.kind === "LayerColor") {
            var color = nodeColor;
            if (color) {
                result.color = {
                    r: color.r,
                    g: color.g,
                    b: color.b,
                    a: opacity
                };
            }
        }

        // 递归子节点
        if (node.children && node.children.length > 0) {
            result.children = [];
            for (var i = 0; i < node.children.length; i++) {
                var child = this._dumpNode(node.children[i]);
                if (child) {
                    result.children.push(child);
                }
            }
        }

        return result;
    },

    /**
     * 获取节点类型
     * @private
     */
    _getNodeKind: function(node) {
        if (!node) return "Node";

        // 优先使用构造函数名
        var ctorName = node.constructor ? node.constructor.name : "";
        if (ctorName && ctorName !== "Object" && ctorName !== "Function") {
            // 去掉 "cc." 前缀
            return ctorName.replace(/^cc\./, "");
        }

        // 回退到类型检查
        if (node instanceof cc.Sprite) return "Sprite";
        if (node instanceof cc.LabelTTF) return "Label";
        if (node instanceof cc.LayerColor) return "LayerColor";
        if (node instanceof cc.Layer) return "Layer";
        if (node instanceof cc.Scene) return "Scene";

        // 检查自定义类型
        if (node.kind) return node.kind;

        return "Node";
    },

    /**
     * 导出节点是否有真实点击/触摸入口。
     *
     * 真机里点击能力来自两类通用路径：
     * - 自定义 Button 通过 cc.eventManager.addListener(listener, node)
     * - cc.ControlButton 通过 addTargetWithActionForControlEvents()
     *
     * 这里不判断具体业务回调，只导出“节点是否注册了交互入口”，供报告识别
     * 点击区域是否存在。
     * @private
     */
    _hasClickListener: function(node) {
        if (!node) return false;
        if (node._clickListeners && node._clickListeners.length > 0) return true;
        if (node._touchAction) return true;
        if (node._enabled !== undefined && node._touchEnabled !== false) {
            var kind = this._getNodeKind(node);
            if (kind === "ControlButton") return true;
        }
        return false;
    },

    /**
     * 获取 Sprite 的 frame 名称
     * @private
     */
    _getSpriteFrameName: function(sprite) {
        if (!sprite) return null;

        // 尝试多种方式获取 sprite frame 名称
        if (sprite._spriteFrame && sprite._spriteFrame._name) {
            return sprite._spriteFrame._name;
        }
        if (sprite.spriteFrame && sprite.spriteFrame._name) {
            return sprite.spriteFrame._name;
        }
        if (sprite._textureFilename) {
            return sprite._textureFilename;
        }

        return null;
    },

    /**
     * 获取设备信息
     * @private
     */
    _getDeviceInfo: function() {
        return {
            platform: cc.sys.platform,
            os: cc.sys.os,
            osVersion: cc.sys.osVersion || "unknown",
            language: cc.sys.language,
            isNative: cc.sys.isNative
        };
    },

    /**
     * 写入文件
     * @private
     */
    _writeToFile: function(fileName, data) {
        var json = JSON.stringify(data, null, 2);

        if (cc.sys.isNative && jsb && jsb.fileUtils) {
            // 尝试多个可能的共享存储路径
            var possiblePaths = [
                "/sdcard/buriedtown_ui/",
                "/storage/emulated/0/buriedtown_ui/",
                "/mnt/sdcard/buriedtown_ui/"
            ];

            var success = false;
            var usedPath = null;

            for (var i = 0; i < possiblePaths.length; i++) {
                var outputDir = possiblePaths[i];
                var fullPath = outputDir + fileName;

                try {
                    // 尝试创建目录
                    if (!jsb.fileUtils.isDirectoryExist(outputDir)) {
                        jsb.fileUtils.createDirectory(outputDir);
                    }

                    // 尝试写入
                    jsb.fileUtils.writeStringToFile(json, fullPath);

                    // 验证文件是否真的写入成功
                    if (jsb.fileUtils.isFileExist(fullPath)) {
                        cc.log("[UiExporter] File written to: " + fullPath);
                        success = true;
                        usedPath = fullPath;
                        break;
                    }
                } catch (e) {
                    cc.warn("[UiExporter] Failed to write to " + outputDir + ": " + e.message);
                }
            }

            if (!success) {
                cc.error("[UiExporter] All paths failed, trying game private directory as fallback");
                // Fallback：使用游戏私有目录
                var writablePath = jsb.fileUtils.getWritablePath();
                var fallbackPath = writablePath + fileName;
                try {
                    jsb.fileUtils.writeStringToFile(json, fallbackPath);
                    cc.log("[UiExporter] File written to fallback: " + fallbackPath);
                    cc.warn("[UiExporter] Note: File is in private directory, need adb to access");
                    return true;
                } catch (e) {
                    cc.error("[UiExporter] Fallback also failed: " + e.message);
                    return false;
                }
            }

            return success;
        } else {
            // 非Native环境（浏览器），输出到控制台
            cc.log("[UiExporter] JSON output (copy this):");
            cc.log(json);
            return true;
        }
    }
};

// 全局接口
if (typeof window !== "undefined") {
    window.UiExporter = UiExporter;
    window.exportCurrentScene = function(name) {
        return UiExporter.exportCurrentScene(name);
    };
}
