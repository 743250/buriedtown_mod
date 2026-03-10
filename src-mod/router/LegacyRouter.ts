import { getGlobalScope } from "../shared/global";

export class LegacyScreenFactory {
    private createCtorInstance(ctorName: string, args: any[] = []): any {
        const globalScope = getGlobalScope();
        const Ctor = globalScope[ctorName];
        if (typeof Ctor !== "function") {
            return null;
        }
        return new (Function.prototype.bind.apply(Ctor, [null].concat(args)))();
    }

    createScene(sceneName: string, args: any[] = []): any {
        return this.createCtorInstance(sceneName, args);
    }

    createNode(nodeName: string, userData?: any): any {
        return this.createCtorInstance(nodeName, [userData]);
    }

    getCtor(ctorName: string): any {
        return getGlobalScope()[ctorName] || null;
    }

    createCurrentNode(): any {
        const globalScope = getGlobalScope();
        if (!globalScope.Navigation || typeof globalScope.Navigation.current !== "function") {
            return null;
        }
        return globalScope.Navigation.current();
    }
}

export class LegacyMusicPolicy {
    stopCurrentMusic(): void {
        const globalScope = getGlobalScope();
        if (globalScope.Navigation && typeof globalScope.Navigation.stopMusic === "function") {
            globalScope.Navigation.stopMusic();
        }
    }

    getCurrentMusic(): any {
        const globalScope = getGlobalScope();
        return globalScope.Navigation ? globalScope.Navigation.currentMusic : null;
    }
}

export class LegacyRouter {
    screenFactory: LegacyScreenFactory;
    musicPolicy: LegacyMusicPolicy;

    constructor(screenFactory: LegacyScreenFactory, musicPolicy: LegacyMusicPolicy) {
        this.screenFactory = screenFactory;
        this.musicPolicy = musicPolicy;
    }

    forward(nodeName: string, userData?: any): any {
        const globalScope = getGlobalScope();
        return globalScope.Navigation && typeof globalScope.Navigation.forward === "function"
            ? globalScope.Navigation.forward(nodeName, userData)
            : null;
    }

    back(): any {
        const globalScope = getGlobalScope();
        return globalScope.Navigation && typeof globalScope.Navigation.back === "function"
            ? globalScope.Navigation.back()
            : null;
    }

    root(nodeName: string, userData?: any): any {
        const globalScope = getGlobalScope();
        return globalScope.Navigation && typeof globalScope.Navigation.root === "function"
            ? globalScope.Navigation.root(nodeName, userData)
            : null;
    }

    replace(nodeName: string, userData?: any): any {
        const globalScope = getGlobalScope();
        return globalScope.Navigation && typeof globalScope.Navigation.replace === "function"
            ? globalScope.Navigation.replace(nodeName, userData)
            : null;
    }

    runScene(sceneName: string, args: any[] = []): any {
        const globalScope = getGlobalScope();
        const scene = this.screenFactory.createScene(sceneName, args);
        if (scene && globalScope.cc && globalScope.cc.director) {
            globalScope.cc.director.runScene(scene);
        }
        return scene;
    }
}
