#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const STUB = path.join(__dirname, "runtime", "cc-stub.js");

function read(rel) {
    return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function check(name, ok, detail) {
    return { name: name, ok: !!ok, detail: detail || "" };
}

function has(text, pattern) {
    if (pattern instanceof RegExp) return pattern.test(text);
    return text.indexOf(pattern) !== -1;
}

const jsbCocos = read("assets/script/jsb_cocos2d.js");
const constants = read("assets/script/jsb_cocos2d_constants.js");
const props = read("assets/script/jsb_property_apis.js");
const extCreate = read("assets/script/extension/jsb_ext_create_apis.js");
const extProps = read("assets/script/extension/jsb_ext_property_apis.js");
const ext = read("assets/script/extension/jsb_cocos2d_extension.js");
const stub = fs.readFileSync(STUB, "utf8");

const checks = [
    check("engine version is Cocos2d-JS v3.6", has(jsbCocos, 'cc.ENGINE_VERSION = "Cocos2d-JS v3.6"')),
    check("alignment constants match JSB",
        has(constants, /cc\.TEXT_ALIGNMENT_LEFT\s*=\s*0/)
        && has(constants, /cc\.TEXT_ALIGNMENT_CENTER\s*=\s*1/)
        && has(constants, /cc\.TEXT_ALIGNMENT_RIGHT\s*=\s*2/)
        && has(constants, /cc\.VERTICAL_TEXT_ALIGNMENT_TOP\s*=\s*(0|0x0)/)
        && has(constants, /cc\.VERTICAL_TEXT_ALIGNMENT_CENTER\s*=\s*(1|0x1)/)
        && has(constants, /cc\.VERTICAL_TEXT_ALIGNMENT_BOTTOM\s*=\s*(2|0x2)/)),
    check("stub EventListener TOUCH_ONE_BY_ONE matches JSB", has(stub, "TOUCH_ONE_BY_ONE: 1")),
    check("stub EventListener KEYBOARD matches JSB", has(stub, "KEYBOARD: 3")),
    check("stub Control event TOUCH_UP_INSIDE matches extension", has(ext, "cc.CONTROL_EVENT_TOUCH_UP_INSIDE = 1 << 5") && has(stub, "CONTROL_EVENT_TOUCH_UP_INSIDE: 32")),
    check("Node property aliases exist in JSB", has(props, 'cc.defineGetterSetter(_proto, "x"') && has(props, 'cc.defineGetterSetter(_proto, "anchorX"')),
    check("stub implements Node x/y properties", has(stub, "get x()") && has(stub, "set x(v)") && has(stub, "get y()") && has(stub, "set y(v)")),
    check("stub implements Node anchor properties", has(stub, "get anchorX()") && has(stub, "set anchorX(v)") && has(stub, "get anchorY()") && has(stub, "set anchorY(v)")),
    check("LabelTTF dimensions overload exists in JSB and stub", has(jsbCocos, "LabelTTF setDimensions support two parameters") && has(stub, "CCLabelTTF.prototype.setDimensions")),
    check("ControlButton constructor overload exists in JSB", has(extCreate, "cc.ControlButton.prototype._ctor")),
    check("ControlButton preferredSize property exists in JSB and stub", has(extProps, '"preferredSize"') && has(stub, "CCControlButton.prototype.setPreferredSize")),
    check("ControlButton event registration is exported as click listener", has(stub, "addTargetWithActionForControlEvents") && has(stub, "_clickListeners.push")),
    check("Scale9Sprite is sprite-like in stub", has(stub, "CCScale9Sprite.prototype = Object.create(CCSprite.prototype)")),
    check("ScrollView direction property exists in JSB and stub", has(extProps, '"direction"') && has(stub, "CCScrollView.prototype.setDirection"))
];

let failed = 0;
checks.forEach(function (item) {
    const mark = item.ok ? "ok" : "FAIL";
    console.log(mark + " - " + item.name + (item.detail ? " - " + item.detail : ""));
    if (!item.ok) failed++;
});

if (failed) {
    console.error("\n" + failed + " engine semantics checks failed.");
    process.exit(1);
}

console.log("\nAll engine semantics checks passed.");
