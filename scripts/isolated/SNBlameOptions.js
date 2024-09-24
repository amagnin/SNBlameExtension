class SNBlameOptions {
  options = {};
  #validOptions = [
    "showUser",
    "debugLineNumbers",
    "hideGutterDate",
    "ignoreWhiteSpace",
    "startOnAction",
    "gutterWidth",
    "ignoreTableList"
  ];

  #defaultIgnoreTableList = ['sys_update', 'sys_update_version'];

  constructor() {
    if (typeof SNBlameOptions.instance === "object")
      return SNBlameOptions.instance;

    SNBlameOptions.instance = this;

    this.reloadOptions()

    return this;
  }

  reloadOptions(){
    (chrome || browser).storage.sync.get("blameOptions", (data) => {
      try {
        this.options.showUser = false;
        this.options.debugLineNumbers = false;
        this.options.hideGutterDate = false;
        this.options.ignoreWhiteSpace = true;
        this.options.startOnAction = false;
        this.options.gutterWidth = 200;
        this.options.ignoreTableList = [];
  
        let userOptions = JSON.parse(data.blameOptions)
  
        Object.keys(userOptions).forEach((key => this.options[key] = userOptions[key]));
  
        this.options.ignoreTableList = this.options.ignoreTableList.concat(this.#defaultIgnoreTableList);
        
      } catch (e) {
        
      } finally{
        if(!this.options.startOnAction)
          window.dispatchEvent(new CustomEvent("sn-blame-start"));
      }
    });
  }

  getOption(id) {
    return this.options[id];
  }

  setOption(id, value, update = true) {
    if (this.#validOptions.indexOf(id) !== -1) {
      this.options[id] = value;
      if (update)
        (chrome || browser).storage.sync.set({ blameOptions: JSON.stringify(this.options) });
    }
  }

  async #getStoredOptions() {}
}
