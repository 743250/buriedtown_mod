const fs = require("fs");
const path = require("path");

function getRootDir() {
    return path.resolve(__dirname, "..");
}

function getResDir(rootDir) {
    return path.join(rootDir, "assets", "res");
}

function readText(filePath) {
    return fs.readFileSync(filePath, "utf8");
}

function pathExists(filePath) {
    return fs.existsSync(filePath);
}

function listFiles(dirPath) {
    return fs.readdirSync(dirPath).filter(function (fileName) {
        return fs.statSync(path.join(dirPath, fileName)).isFile();
    }).sort();
}

function listPlists(resDir) {
    return fs.readdirSync(resDir).filter(function (fileName) {
        return fileName.endsWith(".plist");
    }).sort();
}

function parseTextureName(plistText, plistName) {
    var textureMatch = plistText.match(/<key>textureFileName<\/key>\s*<string>([^<]+)<\/string>/);
    if (textureMatch) {
        return textureMatch[1];
    }

    textureMatch = plistText.match(/<key>realTextureFileName<\/key>\s*<string>([^<]+)<\/string>/);
    if (textureMatch) {
        return textureMatch[1];
    }

    return plistName.replace(/\.plist$/i, ".pvr.ccz");
}

function parseFrames(plistText) {
    var frameRegex = /<key>([^<]+)<\/key>\s*<dict>\s*<key>frame<\/key>/g;
    var frames = [];
    var match;

    while ((match = frameRegex.exec(plistText)) !== null) {
        frames.push(match[1]);
    }

    frames.sort();
    return frames;
}

function loadAtlasIndex(rootDir) {
    var resDir = getResDir(rootDir);
    return listPlists(resDir).map(function (plistName) {
        var plistPath = path.join(resDir, plistName);
        var plistText = readText(plistPath);
        var frames = parseFrames(plistText);
        var atlasBaseName = plistName.replace(/\.plist$/i, "");
        var extractedDirPath = path.join(resDir, atlasBaseName);
        var extractedFrames = pathExists(extractedDirPath) ? listFiles(extractedDirPath) : [];
        var frameDiff = compareFrames(frames, extractedFrames);
        return {
            plist: plistName,
            name: atlasBaseName,
            texture: parseTextureName(plistText, plistName),
            frameCount: frames.length,
            frames: frames,
            extractedDir: {
                path: extractedDirPath,
                exists: pathExists(extractedDirPath),
                fileCount: extractedFrames.length,
                files: extractedFrames
            },
            diff: frameDiff
        };
    });
}

function findMissingItems(sourceList, targetList) {
    return sourceList.filter(function (item) {
        return targetList.indexOf(item) === -1;
    });
}

function compareFrames(plistFrames, extractedFrames) {
    return {
        missingFiles: findMissingItems(plistFrames, extractedFrames),
        extraFiles: findMissingItems(extractedFrames, plistFrames)
    };
}

function printHelp() {
    console.log("Usage: node tools/atlas-inventory.js [command] [value]");
    console.log("");
    console.log("Commands:");
    console.log("  summary              Print atlas summary.");
    console.log("  check                Compare plist frames with extracted atlas folders.");
    console.log("  atlas <name>         Print all frames in one atlas (.plist name or base name).");
    console.log("  find <frame>         Find which atlas contains one sprite frame.");
    console.log("  json                 Print the whole atlas index as JSON.");
}

function normalizeAtlasName(name) {
    if (!name) {
        return "";
    }
    return name.endsWith(".plist") ? name : name + ".plist";
}

function printSummary(atlasIndex) {
    var totalFrames = atlasIndex.reduce(function (sum, atlas) {
        return sum + atlas.frameCount;
    }, 0);
    var extractedAtlasCount = atlasIndex.filter(function (atlas) {
        return atlas.extractedDir.exists;
    }).length;
    var extractedFileCount = atlasIndex.reduce(function (sum, atlas) {
        return sum + atlas.extractedDir.fileCount;
    }, 0);

    console.log("Atlas count: " + atlasIndex.length);
    console.log("Frame count: " + totalFrames);
    console.log("Extracted atlas dirs: " + extractedAtlasCount + "/" + atlasIndex.length);
    console.log("Extracted files: " + extractedFileCount);
    atlasIndex.forEach(function (atlas) {
        var extractedInfo = atlas.extractedDir.exists
            ? atlas.extractedDir.fileCount + " extracted files"
            : "dir missing";
        console.log(atlas.plist + " -> " + atlas.texture + " (" + atlas.frameCount + " frames, " + extractedInfo + ")");
    });
}

function printAtlas(atlasIndex, atlasName) {
    var normalizedName = normalizeAtlasName(atlasName);
    var atlas = atlasIndex.find(function (entry) {
        return entry.plist === normalizedName;
    });

    if (!atlas) {
        console.error("Atlas not found: " + atlasName);
        process.exit(1);
    }

    console.log(atlas.plist + " -> " + atlas.texture + " (" + atlas.frameCount + " frames)");
    if (atlas.extractedDir.exists) {
        console.log("Extracted dir: " + atlas.extractedDir.path + " (" + atlas.extractedDir.fileCount + " files)");
    } else {
        console.log("Extracted dir: missing (" + atlas.extractedDir.path + ")");
    }
    if (atlas.diff.missingFiles.length > 0) {
        console.log("Missing extracted files: " + atlas.diff.missingFiles.length);
        atlas.diff.missingFiles.forEach(function (fileName) {
            console.log("  MISSING " + fileName);
        });
    }
    if (atlas.diff.extraFiles.length > 0) {
        console.log("Extra extracted files: " + atlas.diff.extraFiles.length);
        atlas.diff.extraFiles.forEach(function (fileName) {
            console.log("  EXTRA " + fileName);
        });
    }
    atlas.frames.forEach(function (frameName) {
        console.log(frameName);
    });
}

function printFind(atlasIndex, frameName) {
    var matches = atlasIndex.filter(function (atlas) {
        return atlas.frames.indexOf(frameName) !== -1;
    });

    if (matches.length === 0) {
        console.error("Frame not found: " + frameName);
        process.exit(1);
    }

    matches.forEach(function (atlas) {
        console.log(frameName + " -> " + atlas.plist + " -> " + atlas.texture);
    });
}

function printCheck(atlasIndex) {
    var hasIssues = false;

    atlasIndex.forEach(function (atlas) {
        var hasMissingDir = !atlas.extractedDir.exists;
        var hasMissingFiles = atlas.diff.missingFiles.length > 0;
        var hasExtraFiles = atlas.diff.extraFiles.length > 0;

        if (!hasMissingDir && !hasMissingFiles && !hasExtraFiles) {
            console.log("OK " + atlas.plist + " (" + atlas.frameCount + " frames)");
            return;
        }

        hasIssues = true;
        if (hasMissingDir) {
            console.log("MISSING_DIR " + atlas.plist + " -> " + atlas.extractedDir.path);
            return;
        }

        console.log("MISMATCH " + atlas.plist + " plist=" + atlas.frameCount + " extracted=" + atlas.extractedDir.fileCount);
        atlas.diff.missingFiles.forEach(function (fileName) {
            console.log("  missing " + fileName);
        });
        atlas.diff.extraFiles.forEach(function (fileName) {
            console.log("  extra " + fileName);
        });
    });

    if (hasIssues) {
        process.exit(1);
    }
}

function main() {
    var command = process.argv[2] || "summary";
    var value = process.argv[3] || "";
    var rootDir = getRootDir();
    var atlasIndex = loadAtlasIndex(rootDir);

    if (command === "--help" || command === "-h" || command === "help") {
        printHelp();
        return;
    }

    if (command === "summary") {
        printSummary(atlasIndex);
        return;
    }

    if (command === "check") {
        printCheck(atlasIndex);
        return;
    }

    if (command === "atlas") {
        if (!value) {
            console.error("atlas requires one atlas name");
            process.exit(1);
        }
        printAtlas(atlasIndex, value);
        return;
    }

    if (command === "find") {
        if (!value) {
            console.error("find requires one sprite frame name");
            process.exit(1);
        }
        printFind(atlasIndex, value);
        return;
    }

    if (command === "json") {
        console.log(JSON.stringify(atlasIndex, null, 2));
        return;
    }

    console.error("Unknown command: " + command);
    console.error("");
    printHelp();
    process.exit(1);
}

main();
