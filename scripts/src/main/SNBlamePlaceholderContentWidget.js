import SNBlameDateUtils from "./SNBlameDateUtils.js";

/**
 * @typedef {import('../isolated/SNBlameMain.js').BlameLine} BlameLine
 */

/**
 * Class passed to the Monaco editor to show the placeholder next to the current cursor line
 * @class
 * 
 * @param {MonacoEditor} editor Monaco editor to render the placeholder text
 */
class SNBlamePlaceholderContentWidget {
    static ID = 'editor.widget.placeholderHint';

    constructor(editor) {
		this.editor = editor;
		
        editor.onDidChangeCursorPosition(() => this.onCursorChange());
		this.getDomNode();
        this.onCursorChange();
    }

    /**
     * Updates the line diff stored on the class to display the last update of the line
     * @param {Array<BlameLine>} diff new arary of lines with blame history
     */
	updateDiff(diff){
		this.diff = diff;
	}

    /**
     * called on cursor position change, to change the position and re-render the widget with the correct line blame so its allways next to the cursor
     * 
     */
    onCursorChange() {
        if(!this.diff)
            return;

		let {lineNumber} = this.editor.getPosition();
		let line = this.diff.find(line => line.index === lineNumber)
		if(line && !line.onlyWhiteSpace && !line.newModel)
			this.domNode.textContent = `SN BLAME: ${(line.author + '@' + line.sourceName)} : ${SNBlameDateUtils.timeAgo(line.date)}`;
		else
		    this.domNode.textContent = '';
        
        this.editor.removeContentWidget(this);
        this.editor.addContentWidget(this);
    }

    /**
     * required by Monaco, returns an ID to track the widget
     * @returns {string}
     */
    getId() {
        return SNBlamePlaceholderContentWidget.ID;
    }

    /**
     * required by Monaco, returns a HTML element to render the widget
     * @returns {HTMLElement}
     */
    getDomNode() {
        if (!this.domNode) {
            this.domNode = document.createElement('div');
            this.domNode.style.width = 'max-content';
            
            this.domNode.style.fontStyle = 'italic';
            this.domNode.style.color = 'rgb(204, 204, 204);';
			this.domNode.style.opacity = '0.5';
            this.domNode.style.marginLeft = "30px";
            this.domNode.style.whiteSpace = "nowrap";
            this.editor.applyFontInfo(this.domNode);
        }

        return this.domNode;
    }

    /**
     * required by Monaco, returns the position to where to render the widget
     * @returns {Object}
     */
    getPosition() {
        let { lineNumber } = this.editor.getPosition();
        let column = this.editor.getModel().getLineContent(lineNumber).length + 1;
        return {
            position: {lineNumber: lineNumber, column: column },
            preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
        };
    }

    /**
     * called to remove the widget from monaco
     */
    dispose() {
        this.editor.removeContentWidget(this);
    }
}

export default SNBlamePlaceholderContentWidget;