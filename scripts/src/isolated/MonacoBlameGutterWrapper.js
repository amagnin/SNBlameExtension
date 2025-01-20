import MonacoBlameGutter from "./MonacoBlameGutter.js";
import SNBlameOptions from "./SNBlameOptions.js";

/**
 * @typedef {import('./SNBlameMain.js').BlameLine} BlameLine
 */

/**
 * Calass containing the gutter all the Blame gutters on the page.
 * @class
 */
class MonacoBlameGutterWrapper {
    /**@type {Object.<MonacoBlameGutter>}*/
    #fields = {};

    /**@type {SNBlameOptions}*/
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

    /** 
     * creates a blame gutter for the given field/editor combo
     * @param {string} field fieldName for the monaco editor
     * @param {HTMLElement} editorElement html element containin the monaco editor
     * @param {Array<BlameLine>} lines lines object for the field
     * @param {number} [lineHeight = 19] line height of the monaco editor
    */
    createGutter(field, editorElement, lines, lineHeight = 19){
        if(this.#fields[field]){
            this.updateGutterLines(field, lines);
            return;
        } 

        this.#fields[field] = new MonacoBlameGutter(editorElement, lines, lineHeight);
        this.updateGutter(field);
    }

    /** 
     * Updates the blamegutter for the given field
     * @param {string} field fieldName for the monaco editor gutter to update
    */
    updateGutter(field){
        if(!this.#fields[field]) return;
        this.#fields[field].updateGutter();
    }

    /** 
     * Updates the blamegutter for the given field to keep track current changes
     * @param {string} field fieldName for the monaco editor gutter to update
     * @param {Array<BlameLine>} lines new lines to update the gutter with (lines contains the new blame to keep track of local changes)
    */
    updateGutterLines(field, lines){
        if(!this.#fields[field]) return;
        this.#fields[field].updateLines(lines);
    }

    /** 
     * Updates the blamegutter width for the given field
     * @param {string} field fieldName for the monaco editor gutter to update
    */
    updateGutterSize(field){
        if(!this.#fields[field]) return;
        this.#fields[field].updateGutterSize();
    }

    /** 
     * removes the blamegutter for the given field
     * @param {string} field fieldName for the monaco editor gutter to remove
    */
    destroyGutter(field){
        if(!this.#fields[field]) return;
        this.#fields[field].destroyGutter();
    }

    /** 
     * triggers an update on all the blame gutter for the gutter to update with the new options
     * 
    */
    updateGutterOptions(){
        Object.keys(this.#fields).forEach((field) => {
            this.#fields[field].updateGutter();
            this.#fields[field].updateGutterSize();
        });
    }

    /** 
     * returns true if the gutter for the given field exists
     * @param {string} field fieldName for the monaco editor gutter to remove
     * 
     * @return {boolean}
    */
    gutterExists(field){
        return !!this.#fields[field];
    }
    
}

export default MonacoBlameGutterWrapper;