/**
 * Singleton to hold the extension options
 * @class
 */

class SNBlameOptions {

  /**
   * @typedef BlameOptions
   * @type {Object}
   * @property showUser {bolean}: true to show the username on the SNBlame line, false to show the update set/version name
   * @property debugLineNumbers {bolean}: true to show the line number on the blame line
   * @property hideGutterDate {bolean}: true to hide the date on the blame line
   * @property ignoreWhiteSpace {bolean}: true to ignore whitespaces changes when calculating the diffs
   * @property startOnAction {bolean}: true to start the gutter on demand instead of automaticaly
   * @property gutterWidth {number}: width of the gutter
   * @property ignoreTableList {Array<string>}: List of table to not run the blame
   * @property useExtensionIntelisense {boolean}: true to use custom intelisense isntead of servicenow OOTB intelisense
   */
  options = {};
  
  /**@type {Array<string>} */
  #validOptions = [
    "showUser",
    "debugLineNumbers",
    "hideGutterDate",
    "ignoreWhiteSpace",
    "startOnAction",
    "gutterWidth",
    "ignoreTableList",
    "useExtensionIntelisense"
  ];

   /**@type {Array<string>} */
  #defaultIgnoreTableList = ['sys_update', 'sys_update_version'];

  constructor() {
    if (typeof SNBlameOptions.instance === "object")
      return SNBlameOptions.instance;

    SNBlameOptions.instance = this;

    this.reloadOptions();

    return this;
  }

  /**
   * reloads the options form the extension storage
   */
  reloadOptions(){

    this.options.showUser = false;
    this.options.debugLineNumbers = false;
    this.options.hideGutterDate = false;
    this.options.ignoreWhiteSpace = true;
    this.options.startOnAction = false;
    this.options.useExtensionIntelisense = true;
    this.options.gutterWidth = 200;
    this.options.ignoreTableList = [];

    (chrome || browser).storage.sync.get("blameOptions", (data) => {
      try {
        let userOptions = JSON.parse(data.blameOptions);
  
        Object.keys(userOptions).forEach((key => this.options[key] = userOptions[key]));
  
        this.options.ignoreTableList = this.options.ignoreTableList.concat(this.#defaultIgnoreTableList);
        
      } catch (e) {
        
      } finally{
        if(!this.options.startOnAction)
          window.dispatchEvent(new CustomEvent("sn-blame-start", {detail: this.options}));
      }
    });
  }

  /**
   * returns the option with the passed ID
   * @param {string} id id of the option to retrieve 
   * @returns {string | boolean | number}
   */
  getOption(id) {
    return this.options[id];
  }

  /**
   * updates the options with the given ID value
   * 
   * @param {string} id id of the option to update 
   * @param {string | number | boolean} value new value
   * @param {boolean} [update = true] if true it updates the extension storage
   */
  setOption(id, value, update = true) {
    if (this.#validOptions.indexOf(id) !== -1) {
      this.options[id] = value;
      if (update)
        (chrome || browser).storage.sync.set({ blameOptions: JSON.stringify(this.options) });
    }
  }

  /**
   * returns a clone of the current BlameOptions
   * @returns {BlameOptions}
   */
  getAllOptions(){
    return structuredClone(this.options)
  }

}

export default SNBlameOptions;