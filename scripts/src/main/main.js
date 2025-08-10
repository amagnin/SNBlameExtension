import snBlamebootstrap from "./snBlame.js";
import snListHelper from "./snListHelper.js";
import listenerForCacheInvalidation from "./simpleRecordWatcher.js";

/**
 * TODO oonly trigger on forms with script fields
 */
snBlamebootstrap();

snListHelper();
listenerForCacheInvalidation();


window.dispatchEvent(
    new CustomEvent("sn-blame-validate-cache", {
        detail: {
            g_ck,
        },
    })
);