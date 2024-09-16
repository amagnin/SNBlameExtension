class SNBlameOptions {
  options = {};
  #validOptions = [
    "showUser",
    "debugLineNumbers",
    "hideGutterDate",
    "ignoreWhiteSpace",
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
        this.options = JSON.parse(data.blameOptions);
      } catch (e) {}
    });

    return this;
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
