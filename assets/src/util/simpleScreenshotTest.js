/**
 * 最小化测试
 * 先测试文本文件写入，再测试截图
 */

var SimpleScreenshotTest = {
    testScreenshot: function() {
        var results = [];
        results.push("=== 文件系统测试 ===");

        // 第一步：测试文本文件写入
        results.push("\n【测试1：文本文件写入】");

        var testPaths = [
            "/sdcard/test_file.txt",
            "/storage/emulated/0/test_file.txt",
            jsb.fileUtils.getWritablePath() + "test_file.txt"
        ];

        var textSuccessPaths = [];
        for (var i = 0; i < testPaths.length; i++) {
            var path = testPaths[i];
            try {
                jsb.fileUtils.writeStringToFile("test content", path);
                if (jsb.fileUtils.isFileExist(path)) {
                    results.push("✓ " + this._shortenPath(path));
                    textSuccessPaths.push(path);
                } else {
                    results.push("✗ " + this._shortenPath(path));
                }
            } catch (e) {
                results.push("✗ " + this._shortenPath(path) + " (错误)");
            }
        }

        results.push("文本文件成功: " + textSuccessPaths.length + "/3");

        // 第二步：测试截图
        results.push("\n【测试2：截图功能】");

        if (!cc.sys.isNative) {
            results.push("✗ 不是原生平台");
            this._showResults(results);
            return;
        }

        if (typeof cc.RenderTexture === "undefined") {
            results.push("✗ RenderTexture 不可用");
            this._showResults(results);
            return;
        }

        var winSize = cc.winSize;
        var renderTexture;

        try {
            renderTexture = new cc.RenderTexture(winSize.width, winSize.height);
        } catch (e) {
            results.push("✗ 创建RenderTexture失败: " + e.message);
            this._showResults(results);
            return;
        }

        if (!renderTexture) {
            results.push("✗ RenderTexture为null");
            this._showResults(results);
            return;
        }

        results.push("✓ RenderTexture创建成功");

        try {
            var scene = cc.director.getRunningScene();
            renderTexture.begin();
            scene.visit();
            renderTexture.end();
            results.push("✓ 场景渲染成功");
        } catch (e) {
            results.push("✗ 渲染失败: " + e.message);
            this._showResults(results);
            return;
        }

        // 测试saveToFile
        results.push("\n【测试3：saveToFile】");

        if (typeof renderTexture.saveToFile === "undefined") {
            results.push("✗ saveToFile 方法不存在");
            this._showResults(results);
            return;
        }

        results.push("saveToFile 方法: 存在");

        var screenshotPaths = [
            "/sdcard/test_shot.png",
            "/storage/emulated/0/test_shot.png",
            jsb.fileUtils.getWritablePath() + "test_shot.png"
        ];

        var shotSuccessPaths = [];
        for (var i = 0; i < screenshotPaths.length; i++) {
            var path = screenshotPaths[i];
            try {
                // 尝试使用不同的参数格式
                var success = renderTexture.saveToFile(path, cc.IMAGE_FORMAT_PNG);
                results.push("  " + this._shortenPath(path) + ": saveToFile返回=" + success);

                if (jsb.fileUtils.isFileExist(path)) {
                    results.push("  ✓ 文件存在");
                    shotSuccessPaths.push(path);
                } else {
                    results.push("  ✗ 文件不存在");
                }
            } catch (e) {
                results.push("  ✗ 异常: " + e.message);
            }
        }

        results.push("\n截图成功: " + shotSuccessPaths.length + "/3");

        this._showResults(results);
        return {
            textFiles: textSuccessPaths,
            screenshots: shotSuccessPaths
        };
    },

    _shortenPath: function(path) {
        if (path.indexOf("/sdcard/") === 0) {
            return "/sdcard/" + path.split("/").pop();
        }
        if (path.indexOf("/storage/") === 0) {
            return "/storage/.../" + path.split("/").pop();
        }
        if (path.indexOf("/data/data/") === 0) {
            return "私有/" + path.split("/").pop();
        }
        return path;
    },

    _showResults: function(results) {
        var resultText = results.join("\n");
        cc.log(resultText);

        // 使用 DialogBig 显示更多内容
        if (typeof DialogBig !== "undefined") {
            var dialog = new DialogBig({
                title: { title: "测试结果" },
                content: { des: resultText },
                action: { btn_1: { txt: "确定" } }
            });
            dialog.show();
        } else if (typeof DialogTiny !== "undefined") {
            // Fallback 到 DialogTiny
            var dialog = new DialogTiny({
                title: {},
                content: { des: resultText },
                action: { btn_1: { txt: "确定" } }
            });
            dialog.show();
        }
    }
};

if (typeof window !== "undefined") {
    window.SimpleScreenshotTest = SimpleScreenshotTest;
}
