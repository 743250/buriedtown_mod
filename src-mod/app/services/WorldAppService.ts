import { getGlobalScope } from "../../shared/global";

export class WorldAppService {
    getPlayer(): any {
        return getGlobalScope().player || null;
    }

    supportsZiplineFramework(): boolean {
        const globalScope = getGlobalScope();
        return !!(globalScope.RoleRuntimeService
            && typeof globalScope.RoleRuntimeService.isZiplineFrameworkAvailable === "function"
            && globalScope.player
            && globalScope.RoleRuntimeService.isZiplineFrameworkAvailable(globalScope.player));
    }

    enterWorldMap(): void {
        const player = this.getPlayer();
        if (player && typeof player.enterWorldMap === "function") {
            player.enterWorldMap();
        }
    }

    enterSite(siteId: number): void {
        const player = this.getPlayer();
        if (player && typeof player.enterSite === "function") {
            player.enterSite(siteId);
        }
    }
}

