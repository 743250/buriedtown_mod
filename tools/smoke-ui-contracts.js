const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");

function readFile(relativePath) {
    return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function createNodeClass() {
    function Node() {
        this._children = [];
        this._contentSize = { width: 0, height: 0 };
        this._anchorPoint = { x: 0.5, y: 0.5 };
        this._position = { x: 0, y: 0 };
        this._visible = true;
        this._scaleX = 1;
        this._scaleY = 1;
        this.name = null;
    }

    Node.prototype.addChild = function (child) {
        if (!child) {
            return child;
        }
        this._children.push(child);
        child._parent = this;
        return child;
    };
    Node.prototype.getParent = function () {
        return this._parent || null;
    };
    Node.prototype.removeChildByName = function (name) {
        this._children = this._children.filter(function (child) {
            return !(child && typeof child.getName === "function" && child.getName() === name);
        });
    };
    Node.prototype.getChildByName = function (name) {
        for (let index = 0; index < this._children.length; index++) {
            const child = this._children[index];
            if (child && typeof child.getName === "function" && child.getName() === name) {
                return child;
            }
        }
        return null;
    };
    Node.prototype.setContentSize = function (width, height) {
        if (typeof width === "object") {
            this._contentSize = {
                width: Number(width.width) || 0,
                height: Number(width.height) || 0
            };
        } else {
            this._contentSize = {
                width: Number(width) || 0,
                height: Number(height) || 0
            };
        }
        this.width = this._contentSize.width;
        this.height = this._contentSize.height;
    };
    Node.prototype.getContentSize = function () {
        return {
            width: this._contentSize.width,
            height: this._contentSize.height
        };
    };
    Node.prototype.setAnchorPoint = function (x, y) {
        this._anchorPoint = { x: x, y: y };
    };
    Node.prototype.getAnchorPoint = function () {
        return {
            x: this._anchorPoint.x,
            y: this._anchorPoint.y
        };
    };
    Node.prototype.setPosition = function (x, y) {
        if (typeof x === "object") {
            this._position = { x: Number(x.x) || 0, y: Number(x.y) || 0 };
        } else {
            this._position = { x: Number(x) || 0, y: Number(y) || 0 };
        }
        this.x = this._position.x;
        this.y = this._position.y;
    };
    Node.prototype.getPositionX = function () {
        return this._position.x;
    };
    Node.prototype.getPositionY = function () {
        return this._position.y;
    };
    Node.prototype.setVisible = function (visible) {
        this._visible = !!visible;
    };
    Node.prototype.isVisible = function () {
        return this._visible;
    };
    Node.prototype.setName = function (name) {
        this.name = name;
    };
    Node.prototype.getName = function () {
        return this.name;
    };
    Node.prototype.setColor = function (color) {
        this.color = color;
    };
    Node.prototype.setOpacity = function (opacity) {
        this.opacity = opacity;
    };
    Node.prototype.setScale = function (scaleX, scaleY) {
        this._scaleX = Number(scaleX) || 1;
        this._scaleY = scaleY === undefined ? this._scaleX : (Number(scaleY) || 1);
    };
    Node.prototype.getScaleX = function () {
        return this._scaleX;
    };
    Node.prototype.getScaleY = function () {
        return this._scaleY;
    };

    return Node;
}

function createLabelTTFClass(Node) {
    function LabelTTF(text, fontFamily, fontSize, dimensions) {
        if (!(this instanceof LabelTTF)) {
            return new LabelTTF(text, fontFamily, fontSize, dimensions);
        }
        Node.call(this);
        this._text = text || "";
        this.fontFamily = fontFamily || "";
        this.fontSize = fontSize || 0;
        this._dimensions = dimensions || { width: 0, height: 0 };
        this.setContentSize(this._dimensions.width || 160, this._dimensions.height || Math.max(24, this.fontSize || 24));
    }

    LabelTTF.prototype = Object.create(Node.prototype);
    LabelTTF.prototype.constructor = LabelTTF;
    LabelTTF.prototype.setString = function (text) {
        this._text = text || "";
    };
    LabelTTF.prototype.getString = function () {
        return this._text;
    };
    LabelTTF.prototype.setDimensions = function (size) {
        this._dimensions = size || { width: 0, height: 0 };
        this.setContentSize(this._dimensions.width || 160, this._dimensions.height || Math.max(24, this.fontSize || 24));
    };
    LabelTTF.prototype.setHorizontalAlignment = function () {};
    LabelTTF.prototype.setVerticalAlignment = function () {};
    LabelTTF.prototype.enableStroke = function () {};

    return LabelTTF;
}

function createButtonStubClass(Node) {
    function ButtonStub() {
        Node.call(this);
        this._title = "";
        this._enabled = true;
        this.setContentSize(150, 44);
    }

    ButtonStub.prototype = Object.create(Node.prototype);
    ButtonStub.prototype.constructor = ButtonStub;
    ButtonStub.prototype.setTitleForState = function (title) {
        this._title = title || "";
    };
    ButtonStub.prototype.setTitleColorForState = function () {};
    ButtonStub.prototype.setEnabled = function (enabled) {
        this._enabled = !!enabled;
    };
    ButtonStub.prototype.isEnabled = function () {
        return this._enabled;
    };

    return ButtonStub;
}

function createProgressTimerClass(Node) {
    function ProgressTimer(sprite) {
        if (!(this instanceof ProgressTimer)) {
            return new ProgressTimer(sprite);
        }
        Node.call(this);
        this.sprite = sprite || null;
        this._percentage = 0;
    }

    ProgressTimer.prototype = Object.create(Node.prototype);
    ProgressTimer.prototype.constructor = ProgressTimer;
    ProgressTimer.prototype.setPercentage = function (percentage) {
        this._percentage = percentage;
    };
    ProgressTimer.prototype.getPercentage = function () {
        return this._percentage;
    };
    ProgressTimer.TYPE_BAR = "bar";

    return ProgressTimer;
}

function createItemRichTextClass(Node) {
    function ItemRichText(items, width) {
        Node.call(this);
        this.itemInfos = items || [];
        this.width = width || 0;
        this.setContentSize(width || 180, 32);
    }

    ItemRichText.prototype = Object.create(Node.prototype);
    ItemRichText.prototype.constructor = ItemRichText;
    ItemRichText.prototype.updateView = function (items) {
        this.itemInfos = items || [];
    };

    return ItemRichText;
}

function createButtonWithPressedClass(Node) {
    function ButtonWithPressed(size) {
        Node.call(this);
        this.setContentSize(size || { width: 0, height: 0 });
    }

    ButtonWithPressed.prototype = Object.create(Node.prototype);
    ButtonWithPressed.prototype.constructor = ButtonWithPressed;
    ButtonWithPressed.prototype.setClickListener = function (target, cb) {
        this.target = target;
        this.cb = cb;
    };

    return ButtonWithPressed;
}

function createSandbox() {
    const Node = createNodeClass();
    const LabelTTF = createLabelTTFClass(Node);
    const ButtonStub = createButtonStubClass(Node);
    const ProgressTimer = createProgressTimerClass(Node);
    const ItemRichText = createItemRichTextClass(Node);
    const ButtonWithPressed = createButtonWithPressedClass(Node);

    const sandbox = {
        console: console,
        require: require,
        module: { exports: {} },
        exports: {},
        UITheme: {
            colors: {
                WHITE: "white",
                TEXT_TITLE: "text_title",
                GRAY: "gray"
            }
        },
        ResourceFallback: {
            DEFAULT_SPRITES: {}
        },
        autoSpriteFrameController: {
            getSpriteFromSpriteName: function () {
                const sprite = new Node();
                sprite.setContentSize(120, 12);
                return sprite;
            }
        },
        ItemRichText: ItemRichText,
        ButtonWithPressed: ButtonWithPressed,
        cc: {
            Node: Node,
            LabelTTF: LabelTTF,
            ProgressTimer: ProgressTimer,
            CONTROL_STATE_NORMAL: 0,
            CONTROL_STATE_DISABLED: 1,
            sys: {
                isNative: false,
                LANGUAGE_CHINESE: "zh",
                LANGUAGE_ENGLISH: "en",
                localStorage: {
                    getItem: function () {
                        return "zh";
                    }
                },
                isObjectValid: function (value) {
                    return !!value;
                }
            },
            size: function (width, height) {
                return { width: width, height: height };
            },
            p: function (x, y) {
                return { x: x, y: y };
            },
            color: function () {
                return Array.prototype.slice.call(arguments);
            }
        },
        globalThis: null
    };

    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(readFile("assets/src/ui/uiUtil.js"), sandbox, { filename: "assets/src/ui/uiUtil.js" });

    sandbox.uiUtil.createSpriteBtn = function () {
        return new ButtonStub();
    };
    sandbox.uiUtil.getSpriteByNameSafe = function () {
        const sprite = new Node();
        sprite.setContentSize(32, 32);
        return sprite;
    };
    sandbox.uiUtil.showItemListDialog = function () {};

    return sandbox;
}

function runCommonListItemContractSmoke() {
    const sandbox = createSandbox();
    const uiUtil = sandbox.uiUtil;

    assert(typeof uiUtil.createCommonListItem === "function", "uiUtil.createCommonListItem must exist");

    const displayOnlyItem = uiUtil.createCommonListItem({
        target: null,
        cb: function () {}
    });

    displayOnlyItem.updateView({
        iconName: "#build_action_fix.png",
        hint: "status-only row",
        percentage: 42
    });

    assert(displayOnlyItem.getChildByName("action1") === null, "display-only list item should not create action1 button");
    assert(displayOnlyItem.getChildByName("pb").getPercentage() === 42, "display-only list item should still update progress");

    const actionItem = uiUtil.createCommonListItem(
        {
            target: null,
            cb: function () {}
        },
        {
            target: null,
            cb: function () {}
        },
        {
            target: null,
            cb: function () {}
        }
    );

    actionItem.updateView({
        iconName: "#build_action_fix.png",
        hint: "action row",
        items: [{ itemId: 1102063, num: 1 }],
        action1: "Primary",
        action2: "Secondary",
        actionLayout: "stacked",
        percentage: 88
    });

    const action1 = actionItem.getChildByName("action1");
    const action2 = actionItem.getChildByName("action2");
    assert(action1 && action1.isVisible(), "action row should expose action1");
    assert(action2 && action2.isVisible(), "action row should expose action2");
    assert(actionItem.getChildByName("pb").getPercentage() === 88, "action row should update progress");
    assert(actionItem.getChildByName("richText"), "action row should render item rich text");

    return {
        name: "common-list-item",
        ok: true,
        detail: "validated display-only and two-action list item contracts"
    };
}

function main() {
    const results = [
        runCommonListItemContractSmoke()
    ];

    console.log("UI contract smoke checks passed:");
    results.forEach(function (result) {
        console.log("- " + result.name + ": " + result.detail);
    });
}

try {
    main();
} catch (error) {
    console.error("UI contract smoke checks failed:");
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
}
