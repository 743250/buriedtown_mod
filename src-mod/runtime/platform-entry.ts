import { getGlobalScope } from "../shared/global";
import { PlatformFacade } from "../platform/PlatformFacade";

const globalScope = getGlobalScope();
globalScope.BuriedTownPlatform = new PlatformFacade();
