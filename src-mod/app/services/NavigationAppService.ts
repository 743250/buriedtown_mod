import { LegacyMusicPolicy, LegacyScreenFactory } from "../../router/LegacyRouter";
import { getGlobalScope } from "../../shared/global";

type NavigationEntry = {
    nodeName: string;
    userData?: any;
};

export class NavigationAppService {
    private screenFactory: LegacyScreenFactory;
    private musicPolicy: LegacyMusicPolicy;
    private nodeNames: Record<string, string>;
    private stack: NavigationEntry[];
    private currentMusic: any;
    private siteMusic: any;

    constructor(screenFactory: LegacyScreenFactory, musicPolicy: LegacyMusicPolicy, nodeNames?: Record<string, string>) {
        this.screenFactory = screenFactory;
        this.musicPolicy = musicPolicy;
        this.nodeNames = nodeNames || {};
        this.stack = [];
        this.currentMusic = null;
        this.siteMusic = null;
    }

    private getGlobalNavigation(): any {
        return getGlobalScope().Navigation || null;
    }

    private syncFacade(): void {
        const navigationFacade = this.getGlobalNavigation();
        if (!navigationFacade) {
            return;
        }
        navigationFacade._array = this.stack.slice();
        navigationFacade.currentMusic = this.currentMusic;
        navigationFacade.siteMusic = this.siteMusic;
    }

    private ensureStack(): void {
        if (!Array.isArray(this.stack)) {
            this.stack = [];
        }
    }

    private logNavigationError(message: string): void {
        const globalScope = getGlobalScope();
        if (globalScope.cc && typeof globalScope.cc.error === "function") {
            globalScope.cc.error("[Navigation] " + message);
        }
    }

    private createNodeForEntry(nodeInfo: NavigationEntry | null): any {
        if (!nodeInfo || !nodeInfo.nodeName) {
            return null;
        }

        const node = this.screenFactory.createNode(nodeInfo.nodeName, nodeInfo.userData);
        if (!node) {
            this.logNavigationError("node ctor unavailable: " + nodeInfo.nodeName);
            return null;
        }
        if (typeof node.setName === "function") {
            node.setName("bottom");
        }
        return node;
    }

    private commitCurrentNode(nodeInfo: NavigationEntry, node: any): any {
        this.applyMusic(nodeInfo.nodeName);
        this.save();

        if (typeof node.afterInit === "function") {
            node.afterInit();
        }

        return node;
    }

    private renderCurrentNode(pruneInvalidEntries: boolean): any {
        this.ensureStack();
        if (this.stack.length === 0) {
            return this.forward(this.nodeNames.HOME_NODE);
        }

        let nodeInfo = this.stack[this.stack.length - 1];
        let node = this.createNodeForEntry(nodeInfo);
        while (!node && pruneInvalidEntries && this.stack.length > 1) {
            this.stack.pop();
            this.syncFacade();
            nodeInfo = this.stack[this.stack.length - 1];
            node = this.createNodeForEntry(nodeInfo);
        }
        if (!node) {
            return null;
        }

        return this.commitCurrentNode(nodeInfo, node);
    }

    private withStackMutation(mutator: () => void): any {
        const previousStack = this.stack.slice();
        mutator();

        const node = this.renderCurrentNode(false);
        if (node) {
            return node;
        }

        this.stack = previousStack.slice();
        this.syncFacade();

        if (this.stack.length === 0) {
            return null;
        }

        return this.current();
    }

    private resolveMusicName(nodeName: string): any {
        const globalScope = getGlobalScope();
        const audioManager = globalScope.audioManager;
        if (!audioManager || !audioManager.music) {
            return null;
        }

        switch (nodeName) {
            case this.nodeNames.HOME_NODE:
            case this.nodeNames.BUILD_NODE:
            case this.nodeNames.STORAGE_NODE:
            case this.nodeNames.GATE_NODE:
            case this.nodeNames.RADIO_NODE:
            case this.nodeNames.GATE_OUT_NODE:
                return audioManager.music.HOME;
            case this.nodeNames.DEATH_NODE:
                this.changeSiteMusic();
                return audioManager.music.DEATH;
            case this.nodeNames.MAP_NODE:
                this.changeSiteMusic();
                return audioManager.music.MAP;
            case this.nodeNames.NPC_NODE:
            case this.nodeNames.NPC_STORAGE_NODE:
                return audioManager.music.NPC;
            case this.nodeNames.SITE_NODE:
            case this.nodeNames.AD_SITE_NODE:
            case this.nodeNames.WORK_SITE_NODE:
            case this.nodeNames.BOSS_SITE_NODE:
            case this.nodeNames.SITE_STORAGE_NODE:
            case this.nodeNames.BATTLE_AND_WORK_NODE:
            case this.nodeNames.WORK_ROOM_STORAGE_NODE:
                return this.getSiteMusic();
            default:
                return null;
        }
    }

    private applyMusic(nodeName: string): void {
        const globalScope = getGlobalScope();
        const audioManager = globalScope.audioManager;
        const musicName = this.resolveMusicName(nodeName);
        if (!audioManager || !musicName || musicName === this.currentMusic) {
            this.syncFacade();
            return;
        }

        if (this.currentMusic) {
            audioManager.stopMusic(this.currentMusic);
        }
        this.currentMusic = musicName;
        audioManager.playMusic(this.currentMusic, true);
        this.syncFacade();
    }

    init(): NavigationAppService {
        this.stack = [];
        this.currentMusic = null;
        this.siteMusic = null;
        this.restore();
        this.syncFacade();
        return this;
    }

    forward(nodeName: string, userData?: any): any {
        this.ensureStack();
        return this.withStackMutation(() => {
            this.stack.push({
                nodeName: nodeName,
                userData: userData
            });
        });
    }

    back(): any {
        this.ensureStack();
        return this.withStackMutation(() => {
            if (this.stack.length > 0) {
                this.stack.pop();
            }
        });
    }

    current(): any {
        return this.renderCurrentNode(true);
    }

    getSiteMusic(): any {
        const globalScope = getGlobalScope();
        const audioManager = globalScope.audioManager;
        if (!audioManager || !audioManager.music) {
            return null;
        }

        if (!this.siteMusic) {
            const musicPool = [audioManager.music.SITE_1, audioManager.music.SITE_2, audioManager.music.SITE_3];
            const utils = globalScope.utils;
            const randomIndex = utils && typeof utils.getRandomInt === "function"
                ? utils.getRandomInt(0, musicPool.length - 1)
                : 0;
            this.siteMusic = musicPool[randomIndex];
        }
        this.syncFacade();
        return this.siteMusic;
    }

    changeSiteMusic(): void {
        this.siteMusic = null;
        this.syncFacade();
    }

    stopMusic(): void {
        const globalScope = getGlobalScope();
        if (this.currentMusic && globalScope.audioManager) {
            globalScope.audioManager.stopMusic(this.currentMusic);
        }
        this.syncFacade();
    }

    root(nodeName: string, userData?: any): any {
        this.ensureStack();
        return this.withStackMutation(() => {
            this.stack = [{
                nodeName: nodeName,
                userData: userData
            }];
            this.syncFacade();
        });
    }

    replace(nodeName: string, userData?: any): any {
        this.ensureStack();
        return this.withStackMutation(() => {
            if (this.stack.length > 0) {
                this.stack.pop();
            }
            this.stack.push({
                nodeName: nodeName,
                userData: userData
            });
        });
    }

    getClz(nodeName: string): any {
        return this.screenFactory.getCtor(nodeName);
    }

    gotoDeathNode(): any {
        const globalScope = getGlobalScope();
        const runningScene = globalScope.cc && globalScope.cc.director && typeof globalScope.cc.director.getRunningScene === "function"
            ? globalScope.cc.director.getRunningScene()
            : null;
        if (!runningScene) {
            return null;
        }

        if (typeof runningScene.removeChildByName === "function") {
            runningScene.removeChildByName("dialog");
        }
        const layer = typeof runningScene.getChildByName === "function" ? runningScene.getChildByName("main") : null;
        if (!layer) {
            return null;
        }
        if (typeof layer.removeChildByName === "function") {
            layer.removeChildByName("bottom");
        }
        const deathNode = this.root(this.nodeNames.DEATH_NODE);
        if (deathNode && typeof layer.addChild === "function") {
            layer.addChild(deathNode);
        }
        return deathNode;
    }

    save(): void {
        const globalScope = getGlobalScope();
        if (!globalScope.Record || typeof globalScope.Record.save !== "function") {
            return;
        }

        globalScope.Record.save("navigation", {
            _array: this.stack.slice()
        });
        if (typeof globalScope.Record.saveAll === "function") {
            globalScope.Record.saveAll();
        }
        this.syncFacade();
    }

    restore(): NavigationEntry[] {
        const globalScope = getGlobalScope();
        if (!globalScope.Record || typeof globalScope.Record.restore !== "function") {
            this.stack = [];
            this.syncFacade();
            return this.stack;
        }

        const saveObj = globalScope.Record.restore("navigation");
        this.stack = saveObj && Array.isArray(saveObj._array) ? saveObj._array.slice() : [];
        this.syncFacade();
        return this.stack;
    }

    getCurrentMusic(): any {
        return this.currentMusic;
    }
}
