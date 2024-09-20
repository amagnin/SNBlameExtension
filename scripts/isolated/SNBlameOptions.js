class SNBlameOptions {
  options = {};
  #validOptions = [
    "showUser",
    "debugLineNumbers",
    "hideGutterDate",
    "ignoreWhiteSpace",
    "startOnAction",
  ];

  constructor() {
    if (typeof SNBlameOptions.instance === "object")
      return SNBlameOptions.instance;

    SNBlameOptions.instance = this;

    (chrome || browser).storage.sync.get("blameOptions", (data) => {
      try {
        this.options.showUser = false;
        this.options.debugLineNumbers = false;
        this.options.hideGutterDate = false;
        this.options.ignoreWhiteSpace = true;
        this.options.startOnAction = false;

        let userOptions = JSON.parse(data.blameOptions)

        Object.keys(userOptions).forEach((key => this.options[key] = userOptions[key]));

        
      } catch (e) {
        
      } finally{
        if(!this.options.startOnAction)
          window.dispatchEvent(new CustomEvent("sn-blame-start"));
      }
    });

    return this;
  }

  reloadOptions(){
    try {
      this.options.showUser = false;
      this.options.debugLineNumbers = false;
      this.options.hideGutterDate = false;
      this.options.ignoreWhiteSpace = true;
      this.options.startOnAction = false;

      let userOptions = JSON.parse(data.blameOptions)

      Object.keys(userOptions).forEach((key => this.options[key] = userOptions[key]));

      
    } catch (e) {
      
    } finally{
      if(!this.options.startOnAction)
        window.dispatchEvent(new CustomEvent("sn-blame-start"));
    }
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
