import MonacoBlameGutter from "./MonacoBlameGutter.js";
import SNBlameOptions from "./SNBlameOptions.js";

/**
 * object containing the gutter.
 * @constructor
 */
export default class MonacoBlameGutterWrapper {
    #fields = {};
    #options;

    constructor() {
		if(typeof MonacoBlameGutterWrapper.instance === 'object' )
			return MonacoBlameGutterWrapper.instance;

		MonacoBlameGutterWrapper.instance = this;

        this.#options = new SNBlameOptions();

        window.addEventListener("sn-blame-scroll", event => {
            const { scroll, field } = event.detail;
            if (!this.#fields[field]) return;
          
            this.#fields[field].scroll(scroll);
            this.#fields[field].updateGutter();
        }, false);

        window.addEventListener("sn-blame-toggle-user-update-set", () => {
            this.#options.setOption("showUser", !this.#options.getOption("showUser"));
            this.updateGutterOptions();
        }, false);
        
        window.addEventListener("sn-blame-toggle-gutter-date", () => {
            this.#options.setOption("hideGutterDate", !this.#options.getOption("hideGutterDate"));
            this.updateGutterOptions();
        }, false);

        window.addEventListener("sn-blame-toggle-whitespace", () => {
            this.#options.setOption("ignoreWhiteSpace", !this.#options.getOption("ignoreWhiteSpace"));
            this.updateGutterOptions();
        }, false);
        
        window.addEventListener("sn-blame-toggle-line-numbers", () => {
            this.#options.setOption("debugLineNumbers", !this.#options.getOption("debugLineNumbers"));
            this.updateGutterOptions();
        }, false);

		return this;
    }

    createGutter(field, editorElement, lines, lineHeight = 19){
        if(this.#fields[field]){
            this.updateGutterLines(field, lines);
            return;
        } 

        this.#fields[field] = new MonacoBlameGutter(editorElement, lines, lineHeight);
        this.updateGutter(field);
    }

    updateGutter(field){
        if(!this.#fields[field]) return;
        this.#fields[field].updateGutter();
    }

    updateGutterLines(field, lines){
        if(!this.#fields[field]) return;
        this.#fields[field].updateLines(lines);
    }

    updateGutterSize(field){
        if(!this.#fields[field]) return;
        this.#fields[field].updateGutterSize();
    }

    destroyGutter(field){
        if(!this.#fields[field]) return;
        this.#fields[field].destroyGutter();
    }

    updateGutterOptions(){
        Object.keys(this.#fields).forEach((field) => {
            this.#fields[field].updateGutter();
            this.#fields[field].updateGutterSize();
        });
    }

    gutterExists(field){
        return !!this.#fields[field];
    }
    
}