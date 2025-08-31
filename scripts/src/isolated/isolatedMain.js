import MonacoBlameGutterWrapper from "./blame/MonacoBlameGutterWrapper.js";
import SNBlameOptions from "./SNBlameOptions.js";
import snBlame from "./blame/snIsolatedBlame.js";
import snListHelper from "./listHelper/snIsolatedListHelper.js";
import CacheManager from "./CacheManager.js";
import snRESTFactory from "./snRESTFactory.js";

/**
 * @typedef BlameLine
 * @type {Object}
 * @property onlyWhiteSpace: {boolean} true if the line contains only whitespace
 * @property index: {number} index of the line
 * @property author: {string} user_name of the author
 * @property versionID: {string} sys_id of the version that updated the line
 * @property source: {string} sys_id of the source (usualy update set, can also be a patch)
 * @property date: {Date} Date when line was updated
 * @property line: {string} line content
 * @property sourceName: {string} name of the source, it can be a update set or a version if part of patch
 * @property updateSetNotFound: {boolean} true if the update set can't be found, usualy is due to a deletion
 */

/** 
 * @module SNBlameMain
 * @fires sn-list-helper-response
 * @fires sn-blame-start
 * @fires sn-list-helper-start
 * @fires sn-blame-option-update
 * 
 * @listens focus
 * @listens load
 * @listens sn-blame-validate-cache
 * @listens sn-blame-invalidate-cache
 * 
*/

/**
 * helper response.
 *
 * @event sn-list-helper-response
 * @type {Event}
 * @property {Array} parsedScripts 
 * @property {Array} parsedScriptIncludes 
 */

/**
 * blame start.
 *
 * @event sn-blame-start
 * @type {Event}
 * @property {Object} options 
 */

/**
 * list helper start.
 *
 * @event sn-list-helper-start
 * @type {Event}
 * @property {Object} options 
 */

/**
 * event options updated 
 *
 * @event sn-blame-option-update
 * @type {Event}
 * @property {Object} options 
 */

/**@type {SNBlameOptions} */
const blameOptions = new SNBlameOptions();
blameOptions.reloadOptions().then((options)=>{
  if(!options.startOnAction)
    window.dispatchEvent(new CustomEvent("sn-blame-start", {detail: options}));

  if(options.listHelper)
    window.dispatchEvent(new CustomEvent("sn-list-helper-start", {detail: options}));
});

/** Get Updated Options from the extension popup */
(chrome || browser).runtime.onMessage.addListener(function (msg) {
  if (msg.blameOptions) {
    Object.keys(msg.blameOptions).forEach((option) => {
      blameOptions.setOption(option, msg.blameOptions[option], false);
    });

    const gutters = new MonacoBlameGutterWrapper();
    gutters.updateGutterOptions();

    window.dispatchEvent(new CustomEvent("sn-blame-option-update", {detail : blameOptions.getAllOptions()}));
    return;
  }

  if (msg.action === "sn-blame-bootstrap") {
    window.dispatchEvent(new CustomEvent("sn-blame-start", {detail : blameOptions.getAllOptions()}));
    window.dispatchEvent(new CustomEvent("sn-list-helper-start", {detail : blameOptions.getAllOptions()}));
  }

  if (msg.action === "sn-blame-clear-cache") {
    new CacheManager().conectDB().then(result => result.clearScriptIncludeCache());
  }
});

/**
 * @type {Object}
 * @property focus {function} - function for the focus event,
 * starts the blame when the page is in focus if was not started yet and the delayStart is false, for when the page is loaded out of focus
 * @property load {function} - function for the load event
 * @property sn-blame-validate-cache {function}
 * @property sn-blame-invalidate-cache {function}
 */
const LISTENERS = {
  focus: () => {
      const options = new SNBlameOptions().getAllOptions();
      const delayStart = new SNBlameOptions().getOption("startOnAction");
      const listHelper = new SNBlameOptions().getOption("listHelper")
      if (!delayStart)
        window.dispatchEvent(new CustomEvent("sn-blame-start"), {detail: options});

      if(listHelper)
        window.dispatchEvent(new CustomEvent("sn-list-helper-start"), {detail: options})
    },
  load: () => {
    const options = new SNBlameOptions();

    window.dispatchEvent(
      new CustomEvent("sn-blame-options", { detail: options.getAllOptions() })
    );
  },
  'sn-blame-validate-cache': (event)=>{
    const { g_ck } = event.detail;
    new CacheManager().conectDB().then(result => result.validateScriptIncludeCache(snRESTFactory(g_ck)))
  },
  'sn-blame-invalidate-cache': (event)=>{
  const { sys_id, action, scriptChange, table} = event.detail
  
  if(!sys_id) 
    return

  if(action === 'insert') 
    return

  if(action === 'update' && !scriptChange) 
    return

  new CacheManager().conectDB().then(result => result.invalidateScriptIncludeCache(sys_id));
 }
}

Object.keys(LISTENERS).forEach((key) => {
  window.addEventListener(key, LISTENERS[key]);
});

snBlame();
snListHelper();


