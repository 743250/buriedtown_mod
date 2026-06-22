/*
 * cc-stub.js — Cocos2d-JS engine stub for AI-driven UI unit tests.
 *
 * Loads real UI source files (assets/src/ui/*.js) in a Node vm context,
 * mimicking the Cocos2d-x C++ engine defaults precisely so that node
 * trees built here match what the device renders.
 *
 * Defaults are sourced from cocos2d-x C++ (CCNode.cpp / CCLayer.cpp /
 * CCScene.cpp / CCSprite.cpp / CCLabelTTF.cpp / CCMenu.cpp / CCMenuItem.cpp).
 * Do NOT guess defaults here — if you are unsure, check the C++ source or
 * document the uncertainty inline.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

// =============================================================================
// Factory helpers (cc.p / cc.size / cc.rect / cc.color)
// =============================================================================

function ccPoint(x, y) {
    if (typeof x === "object" && x !== null) return { x: x.x || 0, y: x.y || 0 };
    return { x: Number(x) || 0, y: Number(y) || 0 };
}

function ccSize(w, h) {
    if (typeof w === "object" && w !== null) return { width: w.width || 0, height: w.height || 0 };
    return { width: Number(w) || 0, height: Number(h) || 0 };
}

function ccRect(x, y, w, h) {
    if (typeof x === "object" && x !== null) {
        if (x.width !== undefined) return { x: x.x || 0, y: x.y || 0, width: x.width || 0, height: x.height || 0 };
        return { x: 0, y: 0, width: x.width || 0, height: x.height || 0 };
    }
    return { x: Number(x) || 0, y: Number(y) || 0, width: Number(w) || 0, height: Number(h) || 0 };
}

function ccColor(r, g, b, a) {
    if (typeof r === "object" && r !== null) {
        return { r: r.r || 0, g: r.g || 0, b: r.b || 0, a: r.a === undefined ? 255 : r.a };
    }
    return { r: Number(r) || 0, g: Number(g) || 0, b: Number(b) || 0, a: a === undefined ? 255 : Number(a) };
}

// =============================================================================
// CCNode — base class. C++ defaults (CCNode.cpp init):
//   _anchorPoint(0, 0), _contentSize(0,0), _position(0,0),
//   _scaleX=1, _scaleY=1, _rotation=0, _opacity=255, _visible=true,
//   _localZOrder=0, _color=WHITE, _ignoreAnchorPointForPosition=false
// =============================================================================

const NODE_DEFAULTS = {
    anchorX: 0,
    anchorY: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 255,
    visible: true,
    zOrder: 0,
    colorR: 255,
    colorG: 255,
    colorB: 255,
    ignoreAnchor: false
};

function CCNode() {
    this._anchorPoint = { x: 0, y: 0 };
    this._contentSize = { width: 0, height: 0 };
    this._position = { x: 0, y: 0 };
    this._scaleX = 1;
    this._scaleY = 1;
    this._rotation = 0;
    this._opacity = 255;
    this._visible = true;
    this._localZOrder = 0;
    this._color = { r: 255, g: 255, b: 255 };
    this._ignoreAnchorPointForPosition = false;
    this._parent = null;
    this._children = [];
    this._name = "";
    this._tag = 0;
    this._userData = null;
    this._running = false;
    this._explicitSize = false; // true once setContentSize called explicitly
    this._clickListeners = []; // touch/mouse/keyboard listeners
    this._actions = [];
    this._spriteFrame = null;
    this._texture = null;
    this._text = "";
    this._fontName = "";
    this._fontSize = 16;
    this._dimensions = { width: 0, height: 0 };
    this._hAlignment = 0; // cc.TEXT_ALIGNMENT_LEFT = 0
    this._vAlignment = 0; // cc.VERTICAL_TEXT_ALIGNMENT_TOP = 0
    this._strokeEnabled = false;
    this._strokeColor = null;
    this._strokeSize = 0;
    this._className = "Node";
}

CCNode.prototype = {
    constructor: CCNode,

    // --- anchor point ---
    setAnchorPoint: function (x, y) {
        if (typeof x === "object") { y = x.y; x = x.x; }
        this._anchorPoint = { x: Number(x) || 0, y: Number(y) || 0 };
    },
    getAnchorPoint: function () {
        return { x: this._anchorPoint.x, y: this._anchorPoint.y };
    },
    getAnchorPointInPoints: function () {
        return {
            x: this._contentSize.width * this._anchorPoint.x,
            y: this._contentSize.height * this._anchorPoint.y
        };
    },
    // Cocos2d-x JS exposes anchorX/anchorY/scaleX/scaleY/rotation/opacity/
    // visible as settable properties. Game code uses both the property form
    // (`btn6.anchorX = 0`) and the setter form (`setAnchorPoint(x, y)`); both
    // must update the same backing store so uiExporter sees consistent state.
    get anchorX() { return this._anchorPoint.x; },
    get anchorY() { return this._anchorPoint.y; },
    set anchorX(v) { this._anchorPoint.x = Number(v) || 0; },
    set anchorY(v) { this._anchorPoint.y = Number(v) || 0; },
    ignoreAnchorPointForPosition: function (v) {
        this._ignoreAnchorPointForPosition = !!v;
    },
    isIgnoreAnchorPointForPosition: function () {
        return this._ignoreAnchorPointForPosition;
    },

    // --- content size ---
    setContentSize: function (w, h) {
        if (typeof w === "object") {
            this._contentSize = { width: w.width || 0, height: w.height || 0 };
        } else {
            this._contentSize = { width: Number(w) || 0, height: Number(h) || 0 };
        }
        this._explicitSize = true;
    },
    getContentSize: function () {
        return { width: this._contentSize.width, height: this._contentSize.height };
    },
    get width() { return this._contentSize.width; },
    get height() { return this._contentSize.height; },
    set width(v) { this._contentSize.width = Number(v) || 0; this._explicitSize = true; },
    set height(v) { this._contentSize.height = Number(v) || 0; this._explicitSize = true; },

    // --- position ---
    // Cocos2d-x JS exposes node.x / node.y as aliases for _position.x/y.
    // Real game code uses both `bg.x = 320` and `bg.setPosition(320, 568)` —
    // they must update the same backing store so uiExporter.getPosition()
    // sees the value set via either path.
    get x() { return this._position.x; },
    get y() { return this._position.y; },
    set x(v) { this._position.x = Number(v) || 0; },
    set y(v) { this._position.y = Number(v) || 0; },

    setPosition: function (x, y) {
        if (typeof x === "object") { y = x.y; x = x.x; }
        this._position = { x: Number(x) || 0, y: Number(y) || 0 };
    },
    getPosition: function () {
        return { x: this._position.x, y: this._position.y };
    },
    getPositionX: function () { return this._position.x; },
    getPositionY: function () { return this._position.y; },
    setPositionX: function (x) { this._position.x = Number(x) || 0; },
    setPositionY: function (y) { this._position.y = Number(y) || 0; },
    getX: function () { return this._position.x; },
    getY: function () { return this._position.y; },
    setX: function (x) { this._position.x = Number(x) || 0; },
    setY: function (y) { this._position.y = Number(y) || 0; },

    // --- scale ---
    setScale: function (sx, sy) {
        if (sy === undefined) sy = sx;
        this._scaleX = Number(sx) || 0;
        this._scaleY = Number(sy) || 0;
    },
    getScale: function () { return this._scaleX; },
    setScaleX: function (sx) { this._scaleX = Number(sx) || 0; },
    setScaleY: function (sy) { this._scaleY = Number(sy) || 0; },
    getScaleX: function () { return this._scaleX; },
    getScaleY: function () { return this._scaleY; },
    get scaleX() { return this._scaleX; },
    get scaleY() { return this._scaleY; },
    set scaleX(v) { this._scaleX = Number(v) || 0; },
    set scaleY(v) { this._scaleY = Number(v) || 0; },
    get scale() { return this._scaleX; },
    set scale(v) { var n = Number(v) || 0; this._scaleX = n; this._scaleY = n; },

    // --- rotation ---
    setRotation: function (r) { this._rotation = Number(r) || 0; },
    getRotation: function () { return this._rotation; },
    get rotation() { return this._rotation; },
    set rotation(v) { this._rotation = Number(v) || 0; },

    // --- opacity / visible / color ---
    setOpacity: function (o) { this._opacity = Number(o) || 0; },
    getOpacity: function () { return this._opacity; },
    get opacity() { return this._opacity; },
    set opacity(v) { this._opacity = Number(v) || 0; },
    setVisible: function (v) { this._visible = !!v; },
    isVisible: function () { return this._visible; },
    get visible() { return this._visible; },
    set visible(v) { this._visible = !!v; },
    setColor: function (c) {
        if (typeof c === "object") {
            this._color = { r: c.r || 0, g: c.g || 0, b: c.b || 0 };
        }
    },
    getColor: function () {
        return { r: this._color.r, g: this._color.g, b: this._color.b, a: this._opacity };
    },
    get color() { return this.getColor(); },
    set color(v) { this.setColor(v); },
    getDisplayedColor: function () { return this.getColor(); },
    getDisplayedOpacity: function () { return this._opacity; },
    updateDisplayedColor: function () {},
    updateDisplayedOpacity: function () {},

    // --- z order ---
    setLocalZOrder: function (z) { this._localZOrder = Number(z) || 0; },
    getLocalZOrder: function () { return this._localZOrder; },
    setZOrder: function (z) { this._localZOrder = Number(z) || 0; },
    getZOrder: function () { return this._localZOrder; },

    // --- tree ---
    addChild: function (child, zOrder, tag) {
        if (!child) return;
        if (zOrder !== undefined) child._localZOrder = Number(zOrder) || 0;
        if (tag !== undefined) child._tag = tag;
        child._parent = this;
        this._children.push(child);
        child.onEnter && child.onEnter();
    },
    removeChild: function (child, cleanup) {
        const i = this._children.indexOf(child);
        if (i >= 0) {
            child._parent = null;
            this._children.splice(i, 1);
            child.onExit && child.onExit();
        }
    },
    removeChildByName: function (name) {
        const c = this.getChildByName(name);
        if (c) this.removeChild(c);
    },
    removeAllChildren: function (cleanup) {
        this._children.forEach(function (c) { c._parent = null; c.onExit && c.onExit(); });
        this._children = [];
    },
    cleanup: function () {
        this._actions = [];
        this._children.forEach(function (c) {
            if (c && typeof c.cleanup === "function") c.cleanup();
        });
    },
    getChildByName: function (name) {
        for (let i = 0; i < this._children.length; i++) {
            if (this._children[i]._name === name) return this._children[i];
        }
        return null;
    },
    getChildByTag: function (tag) {
        for (let i = 0; i < this._children.length; i++) {
            if (this._children[i]._tag === tag) return this._children[i];
        }
        return null;
    },
    getChildren: function () { return this._children; },
    getChildrenCount: function () { return this._children.length; },
    // jsb exposes _children as a `children` property — uiExporter reads it directly.
    // Define as getter so it stays in sync with _children mutations.
    // (Defined on prototype via Object.defineProperty below.)
    getParent: function () { return this._parent; },
    removeFromParent: function (cleanup) {
        if (this._parent) this._parent.removeChild(this, cleanup);
    },
    getChildByPath: function () { return null; },

    // --- name / tag ---
    setName: function (n) { this._name = String(n || ""); },
    getName: function () { return this._name; },
    setTag: function (t) { this._tag = Number(t) || 0; },
    getTag: function () { return this._tag; },

    // --- bounding box (uses parent if any) ---
    getBoundingBoxToWorld: function () {
        let x = 0, y = 0;
        let sx = 1, sy = 1;
        let n = this;
        while (n) {
            x += n._position.x * sx;
            y += n._position.y * sy;
            sx *= n._scaleX;
            sy *= n._scaleY;
            n = n._parent;
        }
        const w = this._contentSize.width * sx;
        const h = this._contentSize.height * sy;
        const ax = this._ignoreAnchorPointForPosition ? 0 : this._anchorPoint.x;
        const ay = this._ignoreAnchorPointForPosition ? 0 : this._anchorPoint.y;
        return { x: x - w * ax, y: y - h * ay, width: w, height: h };
    },

    // --- actions (layout-irrelevant, no-op) ---
    runAction: function (action) {
        this._actions.push(action);
        if (action && action.startWithTarget) action.startWithTarget(this);
        return action;
    },
    stopAction: function (a) {
        const i = this._actions.indexOf(a);
        if (i >= 0) this._actions.splice(i, 1);
    },
    stopAllActions: function () { this._actions = []; },
    numberOfRunningActions: function () { return this._actions.length; },

    // --- schedule (no-op, just record) ---
    schedule: function () {},
    scheduleOnce: function (fn, delay) {
        // For UI dump purposes, we run scheduled-once callbacks immediately
        // so the post-callback layout is captured.
        if (typeof fn === "function") {
            try { fn.call(this); } catch (e) { /* swallow */ }
        }
    },
    unschedule: function () {},
    unscheduleAllCallbacks: function () {},

    // --- lifecycle (no-op) ---
    onEnter: function () { this._running = true; },
    onExit: function () { this._running = false; },
    onEnterTransitionDidFinish: function () {},
    onExitTransitionDidStart: function () {},

    // --- sort ---
    sortAllChildren: function () {
        this._children.sort(function (a, b) {
            return (a._localZOrder || 0) - (b._localZOrder || 0);
        });
    },

    // --- visitor (no-op) ---
    visit: function () {},
    draw: function () {},

    _super: function () {}
};

// jsb exposes _children as `children` and _parent as `parent` on the JS side.
// uiExporter reads node.children / node.parent directly, so define getters.
Object.defineProperty(CCNode.prototype, "children", {
    get: function () { return this._children; },
    configurable: true
});
Object.defineProperty(CCNode.prototype, "parent", {
    get: function () { return this._parent; },
    configurable: true
});

// Class inheritance (cc.Node.extend / cc.Layer.extend / cc.ScrollView.extend ...)
// Cocos convention:
//   - `new Child()` invokes props.ctor if present, with the args passed to new.
//   - Inside any method (including ctor), `this._super(...)` calls the parent
//     class's same-named method.
// We wrap every method so that _super is temporarily bound to the parent's
// same-named method for the duration of the call.
CCNode.extend = function (props) {
    const Parent = this;
    const parentProto = Parent.prototype;

    function Child() {
        const args = Array.prototype.slice.call(arguments);
        // Use the wrapped ctor (Child.prototype.ctor) so this._super resolves
        // correctly through the wrapMethod chain. If no ctor was defined,
        // fall back to Parent.apply to run the parent's field initialization.
        if (Child.prototype.ctor && Child.prototype.ctor !== parentProto.ctor) {
            Child.prototype.ctor.apply(this, args);
        } else {
            Parent.apply(this, args);
        }
    }
    Child.prototype = Object.create(parentProto);
    Child.prototype.constructor = Child;

    // Wrap each method so this._super points to the parent's same-named
    // method during the call. ctor is also wrapped (so this._super inside
    // ctor calls Parent.prototype.ctor or Parent itself).
    function wrapMethod(key, fn) {
        return function () {
            const callArgs = Array.prototype.slice.call(arguments);
            const savedSuper = this._super;
            // Resolve parent method: parentProto[key] if it exists,
            // else Parent itself for ctor, else no-op.
            let parentMethod;
            if (key === "ctor") {
                parentMethod = parentProto.ctor || Parent;
            } else if (typeof parentProto[key] === "function") {
                parentMethod = parentProto[key];
            } else {
                parentMethod = function () {};
            }
            this._super = function () {
                const sArgs = Array.prototype.slice.call(arguments);
                parentMethod.apply(this, sArgs.length ? sArgs : callArgs);
            };
            try {
                return fn.apply(this, callArgs);
            } finally {
                this._super = savedSuper || CCNode.prototype._super;
            }
        };
    }

    for (const k in props) {
        if (k === "ctor") {
            Child.prototype.ctor = wrapMethod("ctor", props.ctor);
        } else if (typeof props[k] === "function") {
            Child.prototype[k] = wrapMethod(k, props[k]);
        } else {
            Child.prototype[k] = props[k];
        }
    }

    // Inherit the public class name from parent — so a cc.ScrollView.extend
    // subclass still reports kind="ScrollView" via uiExporter._getNodeKind.
    try {
        Object.defineProperty(Child, "name", { value: Parent.name, configurable: true });
    } catch (e) { /* name read-only on some engines */ }
    Child.extend = CCNode.extend;
    return Child;
};

// =============================================================================
// CCLayer — anchorPoint(0,0), ignoreAnchor=true, contentSize=winSize
// =============================================================================

function CCLayer() {
    CCNode.call(this);
    this._anchorPoint = { x: 0, y: 0 };
    this._ignoreAnchorPointForPosition = true;
    this._contentSize = { width: CC.winSize.width, height: CC.winSize.height };
    this._className = "Layer";
}
CCLayer.prototype = Object.create(CCNode.prototype);
CCLayer.prototype.constructor = CCLayer;
CCLayer.extend = CCNode.extend;

// =============================================================================
// CCLayerColor — inherits Layer defaults; ctor(color, w, h)
//   C++: LayerColor::initWithColor(color, w, h); w/h default to winSize
// =============================================================================

function CCLayerColor(color, w, h) {
    CCLayer.call(this);
    if (color !== undefined) {
        this._color = { r: color.r || 0, g: color.g || 0, b: color.b || 0 };
        this._opacity = color.a === undefined ? 255 : color.a;
    }
    if (w !== undefined && h !== undefined) {
        this._contentSize = { width: Number(w) || 0, height: Number(h) || 0 };
        this._explicitSize = true;
    }
    this._className = "LayerColor";
}
CCLayerColor.prototype = Object.create(CCLayer.prototype);
CCLayerColor.prototype.constructor = CCLayerColor;
CCLayerColor.extend = CCNode.extend;

// =============================================================================
// CCScene — same defaults as Layer
// =============================================================================

function CCScene() {
    CCNode.call(this);
    this._anchorPoint = { x: 0, y: 0 };
    this._ignoreAnchorPointForPosition = true;
    this._contentSize = { width: CC.winSize.width, height: CC.winSize.height };
    this._className = "Scene";
}
CCScene.prototype = Object.create(CCNode.prototype);
CCScene.prototype.constructor = CCScene;
CCScene.extend = CCNode.extend;

// =============================================================================
// CCSprite — anchorPoint(0.5,0.5), contentSize=texture size, ignoreAnchor=false
//   ctor(fileName, rect):
//     - undefined → init()
//     - "#xxx"   → initWithSpriteFrameName
//     - string   → initWithFile(fileName, rect)
//     - Texture2D→ initWithTexture(texture, rect)
//     - SpriteFrame → initWithSpriteFrame(frame)
// =============================================================================

function CCSprite(fileName, rect) {
    CCNode.call(this);
    this._anchorPoint = { x: 0.5, y: 0.5 };
    this._className = "Sprite";
    this._spriteFrameName = null;
    this._textureFilename = null;
    this._rect = null;
    this._spriteFrame = null;

    if (fileName === undefined || fileName === null) {
        // init() — no-op
    } else if (typeof fileName === "string") {
        if (fileName.charAt(0) === "#") {
            this.initWithSpriteFrameName(fileName.substring(1));
        } else {
            this.initWithFile(fileName, rect);
        }
    } else if (fileName && fileName._isSpriteFrame) {
        this.initWithSpriteFrame(fileName);
    } else if (fileName && fileName._isTexture) {
        this.initWithTexture(fileName, rect);
    }
}
CCSprite.prototype = Object.create(CCNode.prototype);
CCSprite.prototype.constructor = CCSprite;
CCSprite.extend = CCNode.extend;

CCSprite.prototype.initWithFile = function (filename, rect) {
    this._textureFilename = filename;
    const size = CC._lookupTextureSize(filename);
    if (size) {
        this._contentSize = { width: size.width, height: size.height };
        this._explicitSize = false; // texture-driven, not user-set
    }
    return true;
};

CCSprite.prototype.initWithSpriteFrameName = function (name) {
    this._spriteFrameName = name;
    const frame = CC.spriteFrameCache.getSpriteFrame(name);
    if (frame) {
        this.initWithSpriteFrame(frame);
    } else {
        // Unknown frame — record the name so downstream can flag it
        this._spriteFrameName = name;
    }
    return true;
};

CCSprite.prototype.initWithSpriteFrame = function (frame) {
    this._spriteFrame = frame;
    this._spriteFrameName = frame && frame._name ? frame._name : this._spriteFrameName;
    if (frame && frame._originalSize) {
        this._contentSize = { width: frame._originalSize.width, height: frame._originalSize.height };
    }
    return true;
};

CCSprite.prototype.initWithTexture = function (texture, rect) {
    this._texture = texture;
    if (texture && texture._size) {
        this._contentSize = { width: texture._size.width, height: texture._size.height };
    }
    if (rect) this._rect = rect;
    return true;
};

CCSprite.prototype.setSpriteFrame = function (frame) {
    if (typeof frame === "string") {
        this.initWithSpriteFrameName(frame);
    } else {
        this.initWithSpriteFrame(frame);
    }
};
CCSprite.prototype.getSpriteFrame = function () { return this._spriteFrame; };
CCSprite.prototype.setDisplayFrame = function (frame) { this.setSpriteFrame(frame); };
CCSprite.prototype.getDisplayFrame = function () { return this._spriteFrame; };
CCSprite.prototype.setSpriteFrameName = function (n) { this._spriteFrameName = n; };
Object.defineProperty(CCSprite.prototype, "spriteFrameName", {
    get: function () { return this._spriteFrameName; },
    set: function (n) { this._spriteFrameName = n; },
    configurable: true
});
Object.defineProperty(CCSprite.prototype, "spriteFrame", {
    get: function () { return this._spriteFrame; },
    configurable: true
});
CCSprite.prototype.setTexture = function (tex) {
    if (typeof tex === "string") {
        this.initWithFile(tex);
    } else {
        this.initWithTexture(tex);
    }
};
CCSprite.prototype.getTexture = function () { return this._texture; };

// =============================================================================
// CCLabelTTF — anchorPoint(0.5,0.5), contentSize auto-adapts to text
//   ctor(text, fontName, fontSize, dimensions, hAlignment, vAlignment)
//   C++ defaults: text="", fontName="", fontSize=16, dimensions=(0,0),
//                 hAlignment=LEFT (ctor) / CENTER (create), vAlignment=TOP
// =============================================================================

function CCLabelTTF(text, fontName, fontSize, dimensions, hAlignment, vAlignment) {
    if (!(this instanceof CCLabelTTF)) {
        // uiUtil wraps cc.LabelTTF as a factory (no `new`). Cocos2d-x JS allows
        // this — the native constructor returns an instance even when called
        // as a function. Mirror that behavior here so the wrapper works.
        return new CCLabelTTF(text, fontName, fontSize, dimensions, hAlignment, vAlignment);
    }
    CCNode.call(this);
    this._anchorPoint = { x: 0.5, y: 0.5 };
    this._className = "Label";
    this._text = text === undefined ? "" : String(text);
    this._fontName = fontName || "";
    this._fontSize = fontSize === undefined ? 16 : Number(fontSize) || 16;
    this._dimensions = dimensions ? { width: dimensions.width || 0, height: dimensions.height || 0 } : { width: 0, height: 0 };
    this._hAlignment = hAlignment === undefined ? 0 : Number(hAlignment) || 0; // LEFT
    this._vAlignment = vAlignment === undefined ? 0 : Number(vAlignment) || 0; // TOP
    this._strokeEnabled = false;
    this._strokeColor = null;
    this._strokeSize = 0;
    this._updateContentSize();
}
CCLabelTTF.prototype = Object.create(CCNode.prototype);
CCLabelTTF.prototype.constructor = CCLabelTTF;
CCLabelTTF.extend = CCNode.extend;

CCLabelTTF.create = function (text, fontName, fontSize, dimensions, hAlign, vAlign) {
    // cc.LabelTTF.create uses CENTER as default hAlignment (differs from ctor)
    if (hAlign === undefined) hAlign = 1; // CENTER
    return new CCLabelTTF(text, fontName, fontSize, dimensions, hAlign, vAlign);
};

CCLabelTTF.prototype._updateContentSize = function () {
    if (this._explicitSize) return; // respect user-set contentSize
    if (this._dimensions.width > 0) {
        const metrics = CC._measureWrappedText(this._text, this._fontName, this._fontSize, this._dimensions.width);
        this._contentSize = {
            width: this._dimensions.width,
            height: this._dimensions.height > 0 ? this._dimensions.height : metrics.height
        };
    } else if (this._dimensions.height > 0) {
        const metrics = CC._measureText(this._text, this._fontName, this._fontSize);
        this._contentSize = { width: metrics.width, height: this._dimensions.height };
    } else {
        const metrics = CC._measureText(this._text, this._fontName, this._fontSize);
        this._contentSize = { width: metrics.width, height: metrics.height };
    }
};

CCLabelTTF.prototype.setString = function (s) {
    this._text = s === undefined ? "" : String(s);
    this._updateContentSize();
};
CCLabelTTF.prototype.getString = function () { return this._text; };
CCLabelTTF.prototype._getString = function () { return this._text; };

CCLabelTTF.prototype.setFontName = function (n) { this._fontName = String(n || ""); this._updateContentSize(); };
CCLabelTTF.prototype.getfontName = function () { return this._fontName; };
CCLabelTTF.prototype.setFontSize = function (s) { this._fontSize = Number(s) || 16; this._updateContentSize(); };
CCLabelTTF.prototype.getFontSize = function () { return this._fontSize; };
CCLabelTTF.prototype.setSystemFontSize = function (s) { this.setFontSize(s); };

CCLabelTTF.prototype.setDimensions = function (w, h) {
    if (typeof w === "object") {
        this._dimensions = { width: w.width || 0, height: w.height || 0 };
    } else {
        this._dimensions = { width: Number(w) || 0, height: Number(h) || 0 };
    }
    this._updateContentSize();
};
CCLabelTTF.prototype.getDimensions = function () { return { width: this._dimensions.width, height: this._dimensions.height }; };

CCLabelTTF.prototype.setHorizontalAlignment = function (a) { this._hAlignment = Number(a) || 0; };
CCLabelTTF.prototype.setVerticalAlignment = function (a) { this._vAlignment = Number(a) || 0; };
CCLabelTTF.prototype.getHorizontalAlignment = function () { return this._hAlignment; };
CCLabelTTF.prototype.getVerticalAlignment = function () { return this._vAlignment; };

CCLabelTTF.prototype.enableStroke = function (color, size) {
    this._strokeEnabled = true;
    this._strokeColor = color;
    this._strokeSize = Number(size) || 0;
};
CCLabelTTF.prototype.disableStroke = function () { this._strokeEnabled = false; };

// Override setContentSize to flip explicitSize
const _labelSetContentSize = CCLabelTTF.prototype.setContentSize;
CCLabelTTF.prototype.setContentSize = function (w, h) {
    _labelSetContentSize.call(this, w, h);
    this._explicitSize = true;
};

// =============================================================================
// CCMenu — anchorPoint(0,0), ignoreAnchor=true (like Layer)
// =============================================================================

function CCMenu(items) {
    CCLayer.call(this);
    this._className = "Menu";
    const arr = Array.prototype.slice.call(arguments);
    const flat = [];
    arr.forEach(function (a) {
        if (Array.isArray(a)) flat.push.apply(flat, a);
        else if (a) flat.push(a);
    });
    this._menuItems = flat;
    const self = this;
    flat.forEach(function (item) { self.addChild(item); });
}
CCMenu.prototype = Object.create(CCLayer.prototype);
CCMenu.prototype.constructor = CCMenu;
CCMenu.extend = CCNode.extend;
CCMenu.create = function () {
    return new CCMenu(Array.prototype.slice.call(arguments));
};

// =============================================================================
// CCMenuItem family — anchorPoint(0.5,0.5)
// =============================================================================

function CCMenuItem(callback, target) {
    CCNode.call(this);
    this._className = "MenuItem";
    this._callback = callback;
    this._target = target;
    this._enabled = true;
    this._selected = false;
    if (callback && target) this._callback = callback.bind(target);
}
CCMenuItem.prototype = Object.create(CCNode.prototype);
CCMenuItem.prototype.constructor = CCMenuItem;
CCMenuItem.extend = CCNode.extend;

CCMenuItem.prototype.setEnabled = function (e) { this._enabled = !!e; };
CCMenuItem.prototype.isEnabled = function () { return this._enabled; };
CCMenuItem.prototype.selected = function () { this._selected = true; };
CCMenuItem.prototype.unselected = function () { this._selected = false; };
CCMenuItem.prototype.activate = function () {
    if (this._enabled && this._callback) this._callback(this);
};

function CCMenuItemLabel(label, callback, target) {
    CCMenuItem.call(this, callback, target);
    this._className = "MenuItemLabel";
    this._label = label;
    if (label) {
        this.addChild(label);
        const size = label.getContentSize();
        this.setContentSize(size.width, size.height);
    }
}
CCMenuItemLabel.prototype = Object.create(CCMenuItem.prototype);
CCMenuItemLabel.prototype.constructor = CCMenuItemLabel;
CCMenuItemLabel.extend = CCNode.extend;
CCMenuItemLabel.create = function (label, callback, target) { return new CCMenuItemLabel(label, callback, target); };

function CCMenuItemSprite(normalSprite, selectedSprite, three, four, five) {
    CCMenuItem.call(this);
    this._className = "MenuItemSprite";
    this._normalSprite = normalSprite;
    this._selectedSprite = selectedSprite;
    // 3-arg: callback; 4-arg: target; 5-arg: (none) — cocos2d-js variant
    // Actually js signature: (normal, selected, disabled, callback, target)
    // but commonly called as (normal, selected, callback, target)
    if (typeof three === "function") {
        this._callback = four ? three.bind(four) : three;
        this._disabledSprite = normalSprite;
    } else {
        this._disabledSprite = three || normalSprite;
        if (typeof four === "function") {
            this._callback = five ? four.bind(five) : four;
        }
    }
    if (normalSprite) {
        this.addChild(normalSprite);
        const size = normalSprite.getContentSize();
        this.setContentSize(size.width, size.height);
    }
}
CCMenuItemSprite.prototype = Object.create(CCMenuItem.prototype);
CCMenuItemSprite.prototype.constructor = CCMenuItemSprite;
CCMenuItemSprite.extend = CCNode.extend;
CCMenuItemSprite.create = function () {
    return new CCMenuItemSprite(Array.prototype.slice.call(arguments));
};

// =============================================================================
// CCDrawNode — anchorPoint(0.5,0.5)
// =============================================================================

function CCDrawNode() {
    CCNode.call(this);
    this._className = "DrawNode";
    this._drawColor = { r: 255, g: 255, b: 255, a: 255 };
    this._lineWidth = 1;
    this._drawOps = [];
}
CCDrawNode.prototype = Object.create(CCNode.prototype);
CCDrawNode.prototype.constructor = CCDrawNode;
CCDrawNode.extend = CCNode.extend;

CCDrawNode.prototype.drawPoly = function (points, fillColor, width, borderColor) {
    this._drawOps.push({ op: "poly", points: points, fill: fillColor, width: width, border: borderColor });
};
CCDrawNode.prototype.drawRect = function (origin, destination, fillColor, lineWidth, borderColor) {
    this._drawOps.push({ op: "rect", origin: origin, dest: destination, fill: fillColor, width: lineWidth, border: borderColor });
    const w = Math.abs(destination.x - origin.x);
    const h = Math.abs(destination.y - origin.y);
    this.setContentSize(w, h);
};
CCDrawNode.prototype.drawDot = function (pos, radius, color) {
    this._drawOps.push({ op: "dot", pos: pos, radius: radius, color: color });
    this.setContentSize(radius * 2, radius * 2);
};
CCDrawNode.prototype.drawSegment = function (from, to, lineWidth, color) {
    this._drawOps.push({ op: "segment", from: from, to: to, width: lineWidth, color: color });
};
CCDrawNode.prototype.drawCircle = function () {};
CCDrawNode.prototype.clear = function () { this._drawOps = []; };

// =============================================================================
// CCScrollView — inherits Layer defaults (anchor 0,0, ignoreAnchor=true)
// =============================================================================

function CCScrollView(size, container) {
    CCLayer.call(this);
    this._className = "ScrollView";
    this._container = container || null;
    this._viewSize = size ? { width: size.width, height: size.height } : this._contentSize;
    if (size) {
        this.setContentSize(size.width, size.height);
    }
    this._contentOffset = { x: 0, y: 0 };
    this._direction = 2; // both
    this._touchEnabled = true;
    if (container) this.addChild(container);
}
CCScrollView.prototype = Object.create(CCLayer.prototype);
CCScrollView.prototype.constructor = CCScrollView;
CCScrollView.extend = CCNode.extend;

CCScrollView.create = function (size, container) { return new CCScrollView(size, container); };
CCScrollView.prototype.setContainer = function (c) {
    if (this._container) this.removeChild(this._container);
    this._container = c;
    if (c) this.addChild(c);
};

// =============================================================================
// CCTableView — minimal stub for cc.TableView used by ChooseScene and other
// list UIs. Real Cocos TableView is a ScrollView with data-source callbacks.
// For UI dump purposes we only need: ctor(dataSource, size), setDirection,
// setVerticalFillOrder, setDelegate, setBounceable, reloadData, setPosition,
// addChild (inherited). We don't actually render cells — the delegate's
// tableCellSizeForIndex / tableCellAtIndex are called via reloadData so the
// cell tree is populated.
// =============================================================================
function CCTableView(dataSource, size) {
    CCScrollView.call(this, size);
    this._className = "TableView";
    this._dataSource = dataSource || null;
    this._delegate = null;
    this._cells = [];
    this._direction = 2;
    this._verticalFillOrder = 0; // TOPDOWN
    this._container = new CCNode();
    this._container.setName("container");
    this._container.ignoreAnchorPointForPosition(true);
    this._container.setContentSize(this._contentSize.width, this._contentSize.height);
    CCNode.prototype.addChild.call(this, this._container);
}
CCTableView.prototype = Object.create(CCScrollView.prototype);
CCTableView.prototype.constructor = CCTableView;
CCTableView.extend = CCNode.extend;

CCTableView.prototype.setDataSource = function (ds) { this._dataSource = ds; };
CCTableView.prototype.setDelegate = function (d) { this._delegate = d; };
CCTableView.prototype.setDirection = function (dir) { this._direction = dir; };
CCTableView.prototype.setVerticalFillOrder = function (order) { this._verticalFillOrder = order; };
CCTableView.prototype.setBounceable = function () {};
CCTableView.prototype.reloadData = function () {
    // Remove existing cells from the table's internal scroll container.
    for (const c of this._cells) {
        if (c && c.getParent && c.getParent()) this._container.removeChild(c);
    }
    this._cells = [];
    if (!this._dataSource) return;
    const count = (typeof this._dataSource.numberOfCellsInTableView === "function")
        ? this._dataSource.numberOfCellsInTableView(this) : 0;
    let cursorX = 0;
    let cursorY = 0;
    let maxW = this._contentSize.width;
    let maxH = this._contentSize.height;
    for (let i = 0; i < count; i++) {
        let cell = null;
        let cellSize = { width: 0, height: 0 };
        if (typeof this._dataSource.tableCellSizeForIndex === "function") {
            cellSize = this._dataSource.tableCellSizeForIndex(this, i) || cellSize;
        }
        if (typeof this._dataSource.tableCellAtIndex === "function") {
            cell = this._dataSource.tableCellAtIndex(this, i);
        }
        if (cell) {
            const cw = Number(cellSize.width) || cell.width || 0;
            const ch = Number(cellSize.height) || cell.height || 0;
            if (typeof cell.setIdx === "function") cell.setIdx(i);
            cell.setContentSize(cw, ch);
            if (this._direction === CC.SCROLLVIEW_DIRECTION_HORIZONTAL) {
                cell.setPosition(cursorX, 0);
                cursorX += cw;
                maxW = Math.max(maxW, cursorX);
                maxH = Math.max(maxH, ch);
            } else {
                const y = this._verticalFillOrder === CC.TABLEVIEW_FILL_TOPDOWN
                    ? this._contentSize.height - cursorY - ch
                    : cursorY;
                cell.setPosition(0, y);
                cursorY += ch;
                maxW = Math.max(maxW, cw);
                maxH = Math.max(maxH, cursorY);
            }
            this._cells.push(cell);
            CCNode.prototype.addChild.call(this._container, cell);
        }
    }
    this._container.setContentSize(maxW, maxH);
    this.setContentOffset(this._contentOffset);
};
CCTableView.prototype.getContainer = function () { return this._container; };
CCTableView.prototype.setContentOffset = function (offset, animated) {
    this._contentOffset = { x: offset.x || 0, y: offset.y || 0 };
    if (this._container) this._container.setPosition(this._contentOffset.x, this._contentOffset.y);
};
CCTableView.prototype.getContentOffset = function () {
    return { x: this._contentOffset.x, y: this._contentOffset.y };
};
CCTableView.prototype.minContainerOffset = function () { return { x: 0, y: 0 }; };
CCTableView.prototype.maxContainerOffset = function () { return { x: 0, y: 0 }; };
// dequeueCell returns a recycled cell or null. We keep a simple free pool.
CCTableView.prototype.dequeueCell = function () {
    if (this._freeCells && this._freeCells.length) return this._freeCells.shift();
    return null;
};

// =============================================================================
// CCTableViewCell — a Node subclass acting as a reusable cell container.
// =============================================================================
function CCTableViewCell() {
    CCNode.call(this);
    this._className = "TableViewCell";
    this._idx = 0;
}
CCTableViewCell.prototype = Object.create(CCNode.prototype);
CCTableViewCell.prototype.constructor = CCTableViewCell;
CCTableViewCell.extend = CCNode.extend;
CCTableViewCell.prototype.getIdx = function () { return this._idx; };
CCTableViewCell.prototype.setIdx = function (i) { this._idx = i; };

// =============================================================================
// CCScale9Sprite — 9-slice sprite stub. Real Cocos rescales a 9-region sprite;
// for UI dump we just act like a Sprite with an _insetRect field. initWithFile
// / initWithSpriteFrame / setContentSize all delegate to the Sprite behavior.
// =============================================================================
function CCScale9Sprite(spriteFrame, rect) {
    CCSprite.call(this);
    this._className = "Scale9Sprite";
    this._insetRect = rect || { x: 0, y: 0, width: 0, height: 0 };
    if (spriteFrame !== undefined && spriteFrame !== null) {
        if (typeof spriteFrame === "string") {
            if (spriteFrame.charAt(0) === "#") {
                this.initWithSpriteFrameName(spriteFrame.substring(1));
            } else {
                this.initWithFile(spriteFrame);
            }
        } else if (spriteFrame && spriteFrame._isSpriteFrame) {
            this.initWithSpriteFrame(spriteFrame);
        }
    }
}
CCScale9Sprite.prototype = Object.create(CCSprite.prototype);
CCScale9Sprite.prototype.constructor = CCScale9Sprite;
CCScale9Sprite.extend = CCSprite.extend;

CCScale9Sprite.prototype.initWithFile = function (filename) {
    return CCSprite.prototype.initWithFile.call(this, filename);
};
CCScale9Sprite.prototype.initWithSpriteFrameName = function (name) {
    return CCSprite.prototype.initWithSpriteFrameName.call(this, name);
};
CCScale9Sprite.prototype.initWithSpriteFrame = function (sf) {
    return CCSprite.prototype.initWithSpriteFrame.call(this, sf);
};
CCScale9Sprite.prototype.setInsetLeft = function (v) { this._insetRect.x = v; };
CCScale9Sprite.prototype.setInsetRight = function (v) { this._insetRect.width = v; };
CCScale9Sprite.prototype.setInsetTop = function (v) { this._insetRect.y = v; };
CCScale9Sprite.prototype.setInsetBottom = function (v) { this._insetRect.height = v; };
CCScale9Sprite.prototype.getInsetLeft = function () { return this._insetRect.x; };
CCScale9Sprite.prototype.getInsetRight = function () { return this._insetRect.width; };
CCScale9Sprite.prototype.getInsetTop = function () { return this._insetRect.y; };
CCScale9Sprite.prototype.getInsetBottom = function () { return this._insetRect.height; };
// Real Scale9Sprite wraps an inner Sprite accessible via getSprite().
// We lazily create a backing Sprite so callers can query its content size.
CCScale9Sprite.prototype.getSprite = function () {
    if (!this._backingSprite) {
        this._backingSprite = new CCSprite();
        this._backingSprite._className = "Sprite";
        const sz = this.getContentSize();
        this._backingSprite.setContentSize(sz.width, sz.height);
    }
    return this._backingSprite;
};

// =============================================================================
// CCControlButton — button stub that accepts a label and optional background
// sprite. For UI dump we just need it to be a Node that can host children
// (label/sprites) and respond to setEnabled / setPosition / addChild.
// =============================================================================
function CCControlButton(label, sprite, disableSprite) {
    CCNode.call(this);
    this._anchorPoint = { x: 0.5, y: 0.5 };
    this._className = "ControlButton";
    this._enabled = true;
    this._label = null;
    this._background = null;
    if (sprite) this.setBackgroundSprite(sprite);
    if (label) this.setTitleLabel(label);
}
CCControlButton.prototype = Object.create(CCNode.prototype);
CCControlButton.prototype.constructor = CCControlButton;
CCControlButton.extend = CCNode.extend;

CCControlButton.prototype.setEnabled = function (v) { this._enabled = !!v; };
CCControlButton.prototype.isEnabled = function () { return this._enabled; };
CCControlButton.prototype.setTouchEnabled = function (v) { this._touchEnabled = !!v; };
CCControlButton.prototype._layoutControlChildren = function () {
    const cx = this.width / 2;
    const cy = this.height / 2;
    if (this._background && this._background.setPosition) {
        this._background.setAnchorPoint && this._background.setAnchorPoint(0.5, 0.5);
        this._background.setPosition(cx, cy);
    }
    if (this._label && this._label.setPosition) {
        this._label.setAnchorPoint && this._label.setAnchorPoint(0.5, 0.5);
        this._label.setPosition(cx, cy);
    }
};
CCControlButton.prototype.setContentSize = function (w, h) {
    CCNode.prototype.setContentSize.call(this, w, h);
    this._layoutControlChildren();
};
CCControlButton.prototype.setTitleLabel = function (l) {
    if (this._label && this._label.getParent && this._label.getParent()) this.removeChild(this._label);
    this._label = l;
    if (l) {
        l.setAnchorPoint && l.setAnchorPoint(0.5, 0.5);
        CCNode.prototype.addChild.call(this, l);
        this._layoutControlChildren();
    }
};
CCControlButton.prototype.getTitleLabel = function () { return this._label; };
CCControlButton.prototype.setBackgroundSprite = function (s) {
    if (this._background && this._background.getParent && this._background.getParent()) this.removeChild(this._background);
    this._background = s;
    if (s && this.width <= 0 && this.height <= 0 && s.getContentSize) {
        const size = s.getContentSize();
        this.setContentSize(size.width, size.height);
    }
    if (s) {
        this.addChild(s, -1);
        this._layoutControlChildren();
    }
};
CCControlButton.prototype.setBackgroundSpriteForState = function (s, state) {
    if (state === 1 && s) this.setBackgroundSprite(s);
};
CCControlButton.prototype.setTitleColorForState = function (color, state) {
    if (state === undefined || state === CC.CONTROL_STATE_NORMAL || state === 0) {
        this._titleColor = color;
        if (this._label && typeof this._label.setColor === "function") {
            this._label.setColor(color);
        }
    }
};
CCControlButton.prototype.setPreferredSize = function (w, h) {
    this.setContentSize(w, h);
    if (this._background) this._background.setContentSize(w, h);
    this._layoutControlChildren();
};
CCControlButton.prototype.setAdjustBackgroundImage = function () {};
CCControlButton.prototype.setZoomOnTouchDown = function () {};
// Touch-event registration stubs. Real Cocos registers callbacks per state;
// for UI dump we just need the chain to not crash. Store the handler so a
// later click simulation could fire it, but no-op otherwise.
CCControlButton.prototype.addTargetWithActionForControlEvents = function (target, action, states) {
    let handler = null;
    if (typeof action === "function") handler = action;
    else if (target && typeof action === "string" && typeof target[action] === "function") handler = target[action].bind(target);
    if (!handler) return;
    this._touchAction = handler;
    this._clickListeners.push({
        type: "ControlButton",
        target: target || null,
        handler: handler,
        events: states === undefined ? CC.CONTROL_EVENT_TOUCH_UP_INSIDE : states
    });
};
CCControlButton.prototype.removeTargetWithActionForControlEvents = function () {};
CCScrollView.prototype.getContainer = function () { return this._container; };
CCScrollView.prototype.setContentOffset = function (o, animated) {
    this._contentOffset = { x: o.x, y: o.y };
    if (this._container && typeof this._container.setPosition === "function") {
        this._container.setPosition(this._contentOffset.x, this._contentOffset.y);
    }
};
CCScrollView.prototype.getContentOffset = function () { return { x: this._contentOffset.x, y: this._contentOffset.y }; };
CCScrollView.prototype.setViewSize = function (s) {
    this._viewSize = { width: s.width, height: s.height };
    this.setContentSize(s.width, s.height);
};
CCScrollView.prototype.setDirection = function (d) { this._direction = Number(d) || 0; };
CCScrollView.prototype.getDirection = function () { return this._direction; };
CCScrollView.prototype.setBounceable = function (b) { this._bounceable = !!b; };
CCScrollView.prototype.isBounceable = function () { return !!this._bounceable; };
CCScrollView.prototype.setClippingToBounds = function (c) { this._clippingToBounds = !!c; };
CCScrollView.prototype.isClippingToBounds = function () { return !!this._clippingToBounds; };
CCScrollView.prototype.setDelegate = function (d) { this._delegate = d; };
CCScrollView.prototype.getDelegate = function () { return this._delegate; };
CCScrollView.prototype.getViewSize = function () {
    return { width: this._viewSize.width, height: this._viewSize.height };
};
CCScrollView.prototype.setContentOffsetRatio = function () {};
CCScrollView.prototype.minContainerOffset = function () {
    return { x: 0, y: 0 };
};
CCScrollView.prototype.maxContainerOffset = function () {
    return { x: 0, y: Math.max(0, (this._viewSize.height || 0) - (this._contentSize.height || 0)) };
};
CCScrollView.prototype.updateContentSize = function () {};
CCScrollView.prototype.setContentOffset = function (o, animated) {
    this._contentOffset = { x: o.x, y: o.y };
    if (this._container && typeof this._container.setPosition === "function") {
        this._container.setPosition(this._contentOffset.x, this._contentOffset.y);
    }
};

// =============================================================================
// SpriteFrame + SpriteFrameCache
// =============================================================================

function CCSpriteFrame() {
    this._name = "";
    this._originalSize = { width: 0, height: 0 };
    this._rect = { x: 0, y: 0, width: 0, height: 0 };
    this._offset = { x: 0, y: 0 };
    this._isSpriteFrame = true;
}
CCSpriteFrame.prototype = {
    setOriginalSize: function (s) { this._originalSize = { width: s.width, height: s.height }; },
    getOriginalSize: function () { return { width: this._originalSize.width, height: this._originalSize.height }; },
    getRect: function () { return this._rect; },
    setName: function (n) { this._name = n; },
    _isSpriteFrame: true
};
CCSpriteFrame.create = function () {
    const f = new CCSpriteFrame();
    return f;
};

function CCSpriteFrameCache() {
    this._frames = {};
}
CCSpriteFrameCache.prototype = {
    addSpriteFramesWithFile: function (plist) {
        CC._loadAtlasPlist(plist, this._frames);
    },
    addSpriteFrames: function (plist) { this.addSpriteFramesWithFile(plist); },
    addSpriteFrame: function (frame, name) {
        frame._name = name;
        this._frames[name] = frame;
    },
    getSpriteFrame: function (name) {
        return this._frames[name] || null;
    },
    removeSpriteFrames: function () { this._frames = {}; },
    removeSpriteFrameByName: function (n) { delete this._frames[n]; },
    removeSpriteFramesFromFile: function (plist) {}
};

// =============================================================================
// Action system — no-op for layout (fadeIn/sequence/repeatForever etc.)
// =============================================================================

function makeNoOpAction(name) {
    return function () {
        const action = { _name: name, _done: false };
        action.startWithTarget = function (t) { this._target = t; };
        action.reverse = function () { return action; };
        action.clone = function () { return action; };
        action.step = function () { this._done = true; };
        action.update = function () {};
        action.isDone = function () { return true; };
        return action;
    };
}

const ccActionFns = {
    fadeIn: makeNoOpAction("fadeIn"),
    fadeOut: makeNoOpAction("fadeOut"),
    moveTo: makeNoOpAction("moveTo"),
    moveBy: makeNoOpAction("moveBy"),
    scaleTo: makeNoOpAction("scaleTo"),
    scaleBy: makeNoOpAction("scaleBy"),
    rotateTo: makeNoOpAction("rotateTo"),
    rotateBy: makeNoOpAction("rotateBy"),
    delayTime: makeNoOpAction("delayTime"),
    callFunc: function (fn, target) {
        const a = { _name: "callFunc", _fn: fn, _target: target };
        a.startWithTarget = function (t) {
            this._target = t;
            // Run immediately so post-callback layout is captured
            try { (fn || function () {})(t); } catch (e) { /* swallow */ }
        };
        a.isDone = function () { return true; };
        a.update = function () {};
        a.step = function () {};
        a.reverse = function () { return a; };
        return a;
    },
    sequence: function () {
        const items = Array.prototype.slice.call(arguments);
        if (items.length === 1 && Array.isArray(items[0])) items = items[0];
        const a = { _name: "sequence", _items: items };
        a.startWithTarget = function (t) {
            items.forEach(function (it) {
                if (it && it.startWithTarget) it.startWithTarget(t);
            });
        };
        a.isDone = function () { return true; };
        a.update = function () {};
        a.step = function () {};
        a.clone = function () { return a; };
        a.reverse = function () { return a; };
        return a;
    },
    spawn: function () {
        const items = Array.prototype.slice.call(arguments);
        if (items.length === 1 && Array.isArray(items[0])) items = items[0];
        const a = { _name: "spawn", _items: items };
        a.startWithTarget = function (t) {
            items.forEach(function (it) {
                if (it && it.startWithTarget) it.startWithTarget(t);
            });
        };
        a.isDone = function () { return true; };
        a.update = function () {};
        a.step = function () {};
        return a;
    },
    repeatForever: function (action) {
        const a = { _name: "repeatForever", _inner: action };
        a.startWithTarget = function (t) {
            // Do NOT run forever; skip
        };
        a.isDone = function () { return false; };
        a.update = function () {};
        a.step = function () {};
        return a;
    },
    animate: makeNoOpAction("animate"),
    blink: makeNoOpAction("blink"),
    tintTo: makeNoOpAction("tintTo"),
    easeIn: function (a) { return a; },
    easeOut: function (a) { return a; },
    easeInOut: function (a) { return a; },
    easeBackIn: function (a) { return a; },
    easeBackOut: function (a) { return a; }
};

// =============================================================================
// Event system — record listeners so inspect.js can mark hasClick
// =============================================================================

const CCEventManager = {
    _listeners: [],

    addListener: function (config, priority) {
        // config: { event: cc.EventListener.TOUCH_ONE_BY_ONE, swallowTouches, onTouchBegan, ... }
        if (config && config.event) {
            const rec = {
                type: config.event,
                handler: config.onTouchBegan || config.onMouseDown || config.onKeyReleased || config.onKeyPressed,
                config: config
            };
            this._listeners.push(rec);
            // JSB addListener(listener, node) attaches a scene-graph listener
            // to that node. The preview exporter uses this to mark touchable
            // regions; priority listeners are recorded globally only.
            if (priority && typeof priority === "object" && priority._clickListeners && rec.handler) {
                priority._clickListeners.push(rec);
            } else if (CC._captureTarget && rec.handler) {
                CC._captureTarget._clickListeners.push(rec);
            }
            return rec;
        }
        return null;
    },
    removeListener: function (l) {
        const i = this._listeners.indexOf(l);
        if (i >= 0) this._listeners.splice(i, 1);
    },
    pauseTarget: function () {},
    resumeTarget: function () {},
    removeAllListeners: function () { this._listeners = []; },
    dispatchEvent: function () {},
    // Custom (string-named) event listeners — EnvironmentConfig.js registers
    // one for cc.game.EVENT_HIDE at load time. No-op is fine for UI dump.
    addCustomListener: function (evtName, cb) {
        const rec = { eventName: evtName, handler: cb };
        this._listeners.push(rec);
        return rec;
    },
    removeCustomListeners: function () {}
};

const CCEventListener = {
    UNKNOWN: 0,
    TOUCH_ONE_BY_ONE: 1,
    TOUCH_ALL_AT_ONCE: 2,
    KEYBOARD: 3,
    MOUSE: 4,
    ACCELERATION: 5,
    FOCUS: 6,
    CUSTOM: 8,
    create: function (config) {
        return config;
    }
};

// =============================================================================
// cc namespace
// =============================================================================

const CC = {
    // --- constants ---
    TEXT_ALIGNMENT_LEFT: 0,
    TEXT_ALIGNMENT_CENTER: 1,
    TEXT_ALIGNMENT_RIGHT: 2,
    VERTICAL_TEXT_ALIGNMENT_TOP: 0,
    VERTICAL_TEXT_ALIGNMENT_CENTER: 1,
    VERTICAL_TEXT_ALIGNMENT_BOTTOM: 2,
    SCROLLVIEW_DIRECTION_NONE: 0,
    SCROLLVIEW_DIRECTION_HORIZONTAL: 1,
    SCROLLVIEW_DIRECTION_VERTICAL: 2,
    SCROLLVIEW_DIRECTION_BOTH: 3,
    TABLEVIEW_FILL_TOPDOWN: 0,
    TABLEVIEW_FILL_BOTTOMUP: 1,
    CONTROL_STATE_NORMAL: 1,
    CONTROL_STATE_HIGHLIGHTED: 2,
    CONTROL_STATE_DISABLED: 4,
    CONTROL_STATE_SELECTED: 8,
    CONTROL_EVENT_TOUCH_DOWN: 1,
    CONTROL_EVENT_TOUCH_DRAG_INSIDE: 2,
    CONTROL_EVENT_TOUCH_DRAG_OUTSIDE: 4,
    CONTROL_EVENT_TOUCH_DRAG_ENTER: 8,
    CONTROL_EVENT_TOUCH_DRAG_EXIT: 16,
    CONTROL_EVENT_TOUCH_UP_INSIDE: 32,
    CONTROL_EVENT_TOUCH_UP_OUTSIDE: 64,
    CONTROL_EVENT_TOUCH_CANCEL: 128,
    CONTROL_EVENT_VALUECHANGED: 256,
    KEY: {
        back: 6,
        menu: 18,
        esc: 27,
        space: 32,
        left: 37,
        up: 38,
        right: 39,
        down: 40,
        A: 65, B: 66, C: 67, D: 68, E: 69, F: 70, G: 71, H: 72, I: 73,
        J: 74, K: 75, L: 76, M: 77, N: 78, O: 79, P: 80, Q: 81, R: 82,
        S: 83, T: 84, U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 90
    },
    IMAGE_FORMAT_PNG: 0,
    IMAGE_FORMAT_JPEG: 1,
    RED: { r: 255, g: 0, b: 0, a: 255 },
    GREEN: { r: 0, g: 255, b: 0, a: 255 },
    BLUE: { r: 0, g: 0, b: 255, a: 255 },
    WHITE: { r: 255, g: 255, b: 255, a: 255 },
    BLACK: { r: 0, g: 0, b: 0, a: 255 },
    YELLOW: { r: 255, g: 255, b: 0, a: 255 },
    GRAY: { r: 128, g: 128, b: 128, a: 255 },
    ORANGE: { r: 255, g: 165, b: 0, a: 255 },

    // --- classes ---
    Node: CCNode,
    Layer: CCLayer,
    LayerColor: CCLayerColor,
    Scene: CCScene,
    Sprite: CCSprite,
    LabelTTF: CCLabelTTF,
    Menu: CCMenu,
    MenuItem: CCMenuItem,
    MenuItemLabel: CCMenuItemLabel,
    MenuItemSprite: CCMenuItemSprite,
    DrawNode: CCDrawNode,
    ScrollView: CCScrollView,
    TableView: CCTableView,
    TableViewCell: CCTableViewCell,
    Scale9Sprite: CCScale9Sprite,
    ControlButton: CCControlButton,
    SpriteFrame: CCSpriteFrame,
    SpriteFrameCache: CCSpriteFrameCache,
    ProgressTimer: CCProgressTimer,

    // --- singletons ---
    spriteFrameCache: new CCSpriteFrameCache(),
    eventManager: CCEventManager,
    director: null, // set below
    sys: {
        platform: 1000, // BROWSER_TYPE (don't care)
        os: "linux",
        osVersion: "stub",
        language: "zh",
        LANGUAGE_CHINESE: 0,
        LANGUAGE_ENGLISH: 1,
        isNative: false,
        capabilities: {},
        browserType: "stub",
        // Real Cocos uses isObjectValid to check whether a native handle is
        // still alive. Our stub nodes are plain JS objects — always valid.
        isObjectValid: function (obj) { return !!obj; },
        // In-memory localStorage stub. Real Cocos exposes cc.sys.localStorage
        // backed by native prefs; for UI dump we only need it to return null
        // for missing keys so first-run paths don't crash.
        localStorage: {
            _data: {},
            getItem: function (k) { return Object.prototype.hasOwnProperty.call(this._data, k) ? this._data[k] : null; },
            setItem: function (k, v) { this._data[k] = String(v); },
            removeItem: function (k) { delete this._data[k]; },
            clear: function () { this._data = {}; }
        }
    },
    loader: {
        // XHR stub — networkUtil/purchaseTask/MenuScene call open/send/etc.
        // No network in UI dump; callbacks are no-ops so init-time sendLog
        // paths don't throw. Keep readyState=0 so onreadystatechange cb
        // (if any) sees "not done" and skips.
        getXMLHttpRequest: function () {
            return {
                readyState: 0,
                status: 0,
                responseText: "",
                open: function () { this.readyState = 1; },
                setRequestHeader: function () {},
                send: function () { this.readyState = 4; this.status = 200; if (this.onreadystatechange) this.onreadystatechange(); },
                abort: function () {},
                onreadystatechange: null,
                onerror: null,
                ontimeout: null
            };
        },
        // Real Cocos returns the loaded plist valueMap (parsed). For UI dump
        // we delegate to cc-stub-extras, which parses real .plist files on
        // disk and returns {frames: {spriteName: SpriteFrame-like}}.
        getRes: function (plist) {
            if (CC._extrasGetPlistFrames) {
                const frames = CC._extrasGetPlistFrames(plist);
                if (frames) return { frames: frames };
            }
            return null;
        }
    },
    timer: { getDeltaTime: function () { return 0.016; } },

    // Cocos game lifecycle constants — EnvironmentConfig.js registers custom
    // listeners for EVENT_HIDE / EVENT_SHOW at load time, before real game.js
    // runs. game.js later overwrites cc.game with a richer object, but these
    // string constants must exist first.
    game: {
        EVENT_HIDE: "game_hide",
        EVENT_SHOW: "game_show",
        initApp: function () {},
        onPause: function () {},
        onResume: function () {},
        restart: function () {},
        end: function () {}
    },

    // --- factory helpers ---
    p: ccPoint,
    size: ccSize,
    rect: ccRect,
    color: ccColor,

    // --- scalar math ---
    clampf: function (v, lo, hi) {
        v = Number(v) || 0;
        lo = Number(lo);
        hi = Number(hi);
        if (lo > hi) { const t = lo; lo = hi; hi = t; }
        return v < lo ? lo : (v > hi ? hi : v);
    },
    clamp: function (v, lo, hi) { return CC.clampf(v, lo, hi); },

    // --- math ---
    pAdd: function (a, b) { return { x: a.x + b.x, y: a.y + b.y }; },
    pSub: function (a, b) { return { x: a.x - b.x, y: a.y - b.y }; },
    pMult: function (a, s) { return { x: a.x * s, y: a.y * s }; },
    pLength: function (a) { return Math.sqrt(a.x * a.x + a.y * a.y); },
    pDistanceSQ: function (a, b) { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; },
    pDistance: function (a, b) { return Math.sqrt(CC.pDistanceSQ(a, b)); },
    pClamp: function (p, min, max) {
        return {
            x: Math.max(min.x, Math.min(max.x, p.x)),
            y: Math.max(min.y, Math.min(max.y, p.y))
        };
    },
    pAngle: function (a, b) { return Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x); },
    pNormalize: function (a) {
        const l = CC.pLength(a) || 1;
        return { x: a.x / l, y: a.y / l };
    },
    rectContainsPoint: function (r, p) {
        return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
    },
    rectIntersection: function (a, b) {
        const x1 = Math.max(a.x, b.x);
        const y1 = Math.max(a.y, b.y);
        const x2 = Math.min(a.x + a.width, b.x + b.width);
        const y2 = Math.min(a.y + a.height, b.y + b.height);
        return { x: x1, y: y1, width: Math.max(0, x2 - x1), height: Math.max(0, y2 - y1) };
    },
    rectEquals: function (a, b) {
        return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
    },

    // --- winSize (Cocos default design resolution 640x1136 for this game) ---
    winSize: { width: 640, height: 1136 },
    visibleRect: { width: 640, height: 1136, x: 0, y: 0, top: 1136, bottom: 0, left: 0, right: 640 },

    // --- log helpers ---
    log: function () { console.log.apply(console, ["[cc]"].concat(Array.prototype.slice.call(arguments))); },
    warn: function () { console.warn.apply(console, ["[cc]"].concat(Array.prototype.slice.call(arguments))); },
    error: function () { console.error.apply(console, ["[cc]"].concat(Array.prototype.slice.call(arguments))); },
    assert: function (cond, msg) { if (!cond) console.warn("[cc.assert]", msg); },
    formatStr: function () {
        const args = Array.prototype.slice.call(arguments);
        if (args.length === 0) return "";
        if (args.length === 1) return String(args[0]);
        const fmt = String(args[0]);
        return fmt.replace(/%[sdif]/g, function () {
            return args.length > 1 ? String(args.shift().toString().slice(0)) : "";
        }).replace(/^%[sdif]/, args[1] || "");
    },

    // --- action factories ---
    fadeIn: ccActionFns.fadeIn,
    fadeOut: ccActionFns.fadeOut,
    moveTo: ccActionFns.moveTo,
    moveBy: ccActionFns.moveBy,
    scaleTo: ccActionFns.scaleTo,
    scaleBy: ccActionFns.scaleBy,
    rotateTo: ccActionFns.rotateTo,
    rotateBy: ccActionFns.rotateBy,
    delayTime: ccActionFns.delayTime,
    callFunc: ccActionFns.callFunc,
    sequence: ccActionFns.sequence,
    spawn: ccActionFns.spawn,
    repeatForever: ccActionFns.repeatForever,
    animate: ccActionFns.animate,
    blink: ccActionFns.blink,
    tintTo: ccActionFns.tintTo,
    easeIn: ccActionFns.easeIn,
    easeOut: ccActionFns.easeOut,
    easeInOut: ccActionFns.easeInOut,
    easeBackIn: ccActionFns.easeBackIn,
    easeBackOut: ccActionFns.easeBackOut,

    // --- class extend shim (for cc.Class / cc.Layer.extend) ---
    Class: (function () {
        // Minimal cc.Class — callable as cc.Class(props) or cc.Class.extend(props).
        // Both return a constructor whose prototype inherits from CCNode and
        // whose instances get props' methods. Subclassing via .extend chains
        // through CCNode.extend so _super works.
        function ccClass(props) {
            return ccClass.extend(props);
        }
        ccClass.prototype = Object.create(CCNode.prototype);
        ccClass.prototype.constructor = ccClass;
        ccClass.extend = function (props) {
            const Ctor = CCNode.extend.call(this, props);
            return Ctor;
        };
        return ccClass;
    })(),

    // --- event listener ---
    EventListener: CCEventListener,

    // =============================================================================
    // Stub-private services (called by extras/runtime to wire up state)
    // =============================================================================

    _captureTarget: null, // current node whose listeners we're capturing

    _lookupTextureSize: function (filename) {
        return CC._textureSizes && CC._textureSizes[filename] || null;
    },

    _textureSizes: {}, // filename → {width, height}

    _measureText: function (text, fontName, fontSize) {
        // Stub text metrics — return a rough estimate based on character count.
        // render.py will override with real PIL font metrics downstream
        // (see render.py: real_sprite_size for sprites, font.getlength for labels).
        const s = String(text || "");
        // For Latin: ~0.55em per char; for CJK: ~1.0em per char
        let width = 0;
        for (let i = 0; i < s.length; i++) {
            const code = s.charCodeAt(i);
            if (code >= 0x4e00 && code <= 0x9fff) {
                width += fontSize * 1.0;
            } else if (code >= 0x3000 && code <= 0x30ff) {
                width += fontSize * 1.0;
            } else {
                width += fontSize * 0.55;
            }
        }
        const height = Math.ceil(fontSize * 1.25);
        return { width: Math.ceil(width), height: height };
    },

    _measureWrappedText: function (text, fontName, fontSize, maxWidth) {
        const s = String(text || "");
        const lineHeight = Math.ceil(fontSize * 1.25);
        if (!maxWidth || maxWidth <= 0 || !s.length) {
            return { width: 0, height: lineHeight };
        }
        let lines = 1;
        let currentWidth = 0;
        for (let i = 0; i < s.length; i++) {
            const ch = s.charAt(i);
            if (ch === "\n") {
                lines++;
                currentWidth = 0;
                continue;
            }
            const chWidth = CC._measureText(ch, fontName, fontSize).width;
            if (currentWidth > 0 && currentWidth + chWidth > maxWidth) {
                lines++;
                currentWidth = chWidth;
            } else {
                currentWidth += chWidth;
            }
        }
        return { width: maxWidth, height: Math.max(lineHeight, lines * lineHeight) };
    },

    _loadAtlasPlist: function (plistPath, framesMap) {
        // Delegated to cc-stub-extras.js (needs fs/plist parsing)
        if (CC._extrasLoadAtlasPlist) {
            CC._extrasLoadAtlasPlist(plistPath, framesMap);
        }
    }
};

// Director
CC.director = {
    getRunningScene: function () { return CC._runningScene || null; },
    runScene: function (scene) { CC._runningScene = scene; },
    getWinSize: function () { return { width: CC.winSize.width, height: CC.winSize.height }; },
    getVisibleSize: function () { return { width: CC.winSize.width, height: CC.winSize.height }; },
    getVisibleOrigin: function () { return { x: 0, y: 0 }; },
    getScheduler: function () { return CC._scheduler || (CC._scheduler = { schedule: function () {}, unschedule: function () {}, scheduleCallbackForTarget: function () {}, scheduleUpdateForTarget: function () {}, unscheduleCallbackForTarget: function () {}, unscheduleUpdateForTarget: function () {}, pauseAllTargets: function () {}, resumeAllTargets: function () {} }); },
    getActionManager: function () { return CC._actionMgr || (CC._actionMgr = { addAction: function () {}, removeAllActions: function () {} }); },
    end: function () {},
    pause: function () {},
    resume: function () {},
    pushScene: function () {},
    popScene: function () {}
};

// Audio engine — audioManager.stopMusic/playMusic/playEffect/stopEffect.
// No actual audio in UI dump; return dummy id for playEffect/playMusic so
// callers that store it don't crash on stop.
CC.audioEngine = {
    playMusic: function () { return 1; },
    stopMusic: function () {},
    pauseMusic: function () {},
    resumeMusic: function () {},
    rewindMusic: function () {},
    willPlayMusic: function () { return false; },
    isMusicPlaying: function () { return false; },
    playEffect: function () { return 2; },
    stopEffect: function () {},
    pauseEffect: function () {},
    resumeEffect: function () {},
    stopAllEffects: function () {},
    setVolume: function () {},
    end: function () {}
};

// RenderTexture stub (not used by local dump path, kept for compatibility)
CC.RenderTexture = function () {};
CC.RenderTexture.prototype.begin = function () {};
CC.RenderTexture.prototype.end = function () {};
CC.RenderTexture.prototype.saveToFile = function () { return true; };

// ProgressTimer stub
function CCProgressTimer() {
    CCNode.call(this);
    this._className = "ProgressTimer";
    this._percentage = 0;
    this._type = 0;
    this._midpoint = { x: 0.5, y: 0.5 };
    this._barChangeRate = { x: 1, y: 0 };
    this._sprite = null;
}
CCProgressTimer.prototype = Object.create(CCNode.prototype);
CCProgressTimer.prototype.constructor = CCProgressTimer;
CCProgressTimer.extend = CCNode.extend;
CCProgressTimer.create = function (sprite) { const p = new CCProgressTimer(); p._sprite = sprite; if (sprite) p.addChild(sprite); return p; };
CCProgressTimer.prototype.setPercentage = function (p) { this._percentage = Number(p) || 0; };
CCProgressTimer.prototype.getPercentage = function () { return this._percentage; };
CCProgressTimer.prototype.setType = function (t) { this._type = Number(t) || 0; };
CCProgressTimer.prototype.setMidpoint = function (m) { this._midpoint = { x: m.x, y: m.y }; };
CCProgressTimer.prototype.setBarChangeRate = function (r) { this._barChangeRate = { x: r.x, y: r.y }; };
CCProgressTimer.prototype.setSprite = function (s) {
    if (this._sprite) this.removeChild(this._sprite);
    this._sprite = s;
    if (s) this.addChild(s);
};
CCProgressTimer.prototype.getSprite = function () { return this._sprite; };
CC.ProgressTimer = CCProgressTimer;

// Rename class functions so uiExporter._getNodeKind (which reads
// constructor.name and strips "cc." prefix) returns "Scene"/"Sprite"/etc.
// In real jsb, these classes are cc.Scene / cc.Sprite / ... — our internal
// CC* names are an implementation detail.
function renameClass(fn, publicName) {
    try {
        Object.defineProperty(fn, "name", { value: publicName, configurable: true });
    } catch (e) { /* older engines: name is read-only */ }
}
renameClass(CCNode, "Node");
renameClass(CCLayer, "Layer");
renameClass(CCLayerColor, "LayerColor");
renameClass(CCScene, "Scene");
renameClass(CCSprite, "Sprite");
renameClass(CCLabelTTF, "Label");
renameClass(CCMenu, "Menu");
renameClass(CCMenuItem, "MenuItem");
renameClass(CCMenuItemLabel, "MenuItemLabel");
renameClass(CCMenuItemSprite, "MenuItemSprite");
renameClass(CCDrawNode, "DrawNode");
renameClass(CCScrollView, "ScrollView");
renameClass(CCScale9Sprite, "Scale9Sprite");
renameClass(CCSpriteFrame, "SpriteFrame");
renameClass(CCSpriteFrameCache, "SpriteFrameCache");
renameClass(CCProgressTimer, "ProgressTimer");

// Export
module.exports = CC;
