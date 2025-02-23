import MonacoBlameGutterWrapper from "./MonacoBlameGutterWrapper.js";
import SNBlameOptions from "./SNBlameOptions.js";
import snBlame from "./snIsolatedBlame.js";
import snListHelper from "./snIsolatedListHelper.js";

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
*/

/** Get Updated Options from the extension popup */
(chrome || browser).runtime.onMessage.addListener(function (msg) {
  if (msg.blameOptions) {
    const blameOptions = new SNBlameOptions();

    Object.keys(msg.blameOptions).forEach((option) => {
      blameOptions.setOption(option, msg.blameOptions[option], false);
    });

    const gutters = new MonacoBlameGutterWrapper();
    gutters.updateGutterOptions();
    return;
  }

  if (msg.action === "sn-blame-bootstrap") {
    window.dispatchEvent(new CustomEvent("sn-blame-start"));
  }
});

snBlame();
snListHelper();