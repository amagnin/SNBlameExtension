class MonacoBlameGutter {
    static SIZE = 200;

    constructor(editorElement, lines, lineHeight = 19) {

        this.editorGutter = editorElement.querySelector('.margin-view-overlays');
        this.lines = lines;

        this.blameGutterContainer = document.createElement('DIV');
        this.blameGutterContainer.style.position = 'absolute';
        this.blameGutterContainer.style.overflow = 'hidden';
        this.blameGutterContainer.style.height = 'calc(100% - 38px)';
        this.blameGutterContainer.style.translate = '-100%';
        this.blameGutterContainer.style.width = `${MonacoBlameGutter.SIZE}px`;

        this.blameGutter = document.createElement('DIV');
        this.blameGutter.style.fontSize = '12px';
        this.blameGutter.style.display = 'flex';
        this.blameGutter.style.flexDirection = 'column';
        this.blameGutter.style.alignItems = 'flex-end';
        this.blameGutter.style.lineHeight = `${lineHeight}px`;
        this.blameGutter.style.position = 'relative';

        this.blameGutterContainer.append(this.blameGutter);

        editorElement.prepend(this.blameGutterContainer);
    }

    getGutterContainer() {
        return this.blameGutterContainer;
    }

    startObserver() {
        this.gutterObserver = new MutationObserver(this.updateGutter.bind(this))
        this.gutterObserver.observe(this.editorGutter, {
            childList : true,
            subtree : true
        });
    }

    disconnectObserver() {
        this.gutterObserver.disconnect();
    }

    updateLines(lines) {
        this.lines = lines;
        this.updateGutter();
    }

    updateGutter() {
        let snBlame = new SNBlameOptions()

        let linesInView = Array.from(this.editorGutter.querySelectorAll('.line-numbers')).reduce((acc, lineInView) => {
            acc[lineInView.innerText] = lineInView.parentElement.style.top;
            return acc;
        }, {});

        this.blameGutter.innerHTML = '';

        this.lines.forEach((line) => {
            if (!linesInView[line.index.toString()])
                return;

            let lineBlame = document.createElement('DIV');
            lineBlame.style.top = linesInView[line.index.toString()];
            lineBlame.style.position = 'absolute';
			lineBlame.style.width = '100%';
			lineBlame.style.display = 'flex';
			lineBlame.style.justifyContent = 'flex-end';
			lineBlame.style.paddingInline = '8px';
			lineBlame.style.whiteSpace = "pre-wrap";

            let displayLabel = snBlame.getOption('showUser') ? line.author : line.sourceName;
            let anchorStyle = 
			`	display: flex;
				gap: 10px;
				text-decoration: none;
				color: white;
				width: 100%;
    			justify-content: space-between;
 			`;

			let labelStyle =
			`
				overflow: hidden; 
				text-overflow: ellipsis; 
				white-space: nowrap; 
				width: 100%; 
				text-align: right;
			`;

			if(line.updateSetNotFound){
				lineBlame.style.backgroundColor = new MonacoBlameColorMap().getColor(line.source.value);
				lineBlame.innerHTML = 
                `<a class="sn-blame-line" href="javascript:void(0)" style="${anchorStyle}">
                    <span class="sn-blame-line" style="${snBlame.getOption('debugLineNumbers') ? "" : "display:none;"} white-space: nowrap;">
                        ${line.index}
                    </span>
                    <span class="sn-blame-date" style="${snBlame.getOption('hideGutterDate') ? "display:none;" : ""} white-space: nowrap;">
                        ${this.#formatDate(line.date)}
                    </span>
                    <span class="sn-blame-label" style="${labelStyle}" title="Update set not found, probably deleted">
                        ${displayLabel}
                    </span>
                </a>
               `
				this.blameGutter.append(lineBlame);
				return
			}

            if (!line.newModel) {
				lineBlame.style.backgroundColor = new MonacoBlameColorMap().getColor(line.source.value);
                lineBlame.innerHTML =
                `<a class="sn-blame-line" href="/sys_update_set.do?sys_id=${line.source.value}" target="_blank" style="${anchorStyle}">
                    <span class="sn-blame-line" style="${snBlame.getOption('debugLineNumbers') ? "" : "display: none; "}white-space: nowrap;">
                        ${line.index}
                    </span>
                    <span class="sn-blame-date" style="${snBlame.getOption('hideGutterDate') ? "display: none; " : ""}white-space: nowrap;">
                        ${this.#formatDate(line.date)}
                    </span>
                    <span class="sn-blame-label" style="${labelStyle}" title="${displayLabel}">
                        ${displayLabel}
                    </span>
                </a>
               `
                
				this.blameGutter.append(lineBlame);
				return
            } 
            

			lineBlame.style.justifyContent = 'start';
			lineBlame.innerHTML = snBlame.getOption('debugLineNumbers') ? line.index : '';
			this.blameGutter.append(lineBlame);
            
        });
    }

    scroll(scroll) {
        if (scroll.scrollHeight)
            this.blameGutter.style.height = `${scroll.scrollHeight}px`;
        
        this.blameGutterContainer.scroll({
            top: scroll.scrollTop,
        });
    }

    #formatDate(unixTimeStamp) {
        let date = new Date(unixTimeStamp);

        return `${date.getFullYear()}/${`0${date.getMonth() + 1}`.slice(-2)}/${`0${date.getDate()}`.slice(-2)}`;
    }
}