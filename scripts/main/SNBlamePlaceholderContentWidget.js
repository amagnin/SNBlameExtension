class SNBlamePlaceholderContentWidget {
    static ID = 'editor.widget.placeholderHint';

    constructor(editor) {
		this.editor = editor;
		
        editor.onDidChangeCursorPosition(() => this.onCursorChange());
		this.getDomNode();
        this.onCursorChange();
    }

	updateDiff(diff){
		this.diff = diff;
	}

    onCursorChange() {
        if(!this.diff)
            return;

		let {lineNumber} = this.editor.getPosition();
		let line = this.diff.find(line => line.index === lineNumber)
		if(line && !line.onlyWhiteSpace && !line.newModel)
			this.domNode.textContent = `SN BLAME: ${(line.author + '@' + line.sourceName)} : ${SNBlameDateUtils.timeAgo(line.date)}`;
		else
		    this.domNode.textContent = '';

        this.editor.addContentWidget(this);
    }

    getId() {
        return SNBlamePlaceholderContentWidget.ID;
    }

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

    getPosition() {
        let { lineNumber } = this.editor.getPosition();
        let column = this.editor.getModel().getLineContent(lineNumber).length + 1;
        return {
            position: {lineNumber: lineNumber, column: column },
            preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
        };
    }

    dispose() {
        this.editor.removeContentWidget(this);
    }
}