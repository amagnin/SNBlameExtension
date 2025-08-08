import snBlamebootstrap from "./snBlame.js";
import snListHelper from "./snListHelper.js";
import listenerForCacheInvalidation from "./simpleRecordWatcher.js";

/**
 * TODO oonly trigger on forms with script fields
 */
snBlamebootstrap();

snListHelper();
listenerForCacheInvalidation();