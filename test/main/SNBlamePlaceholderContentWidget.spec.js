import SNBlamePlaceholderContentWidget from '../../scripts/src/main/SNBlamePlaceholderContentWidget.js';

global.monaco = {
    editor: {
        ContentWidgetPositionPreference: {
            EXACT: 'EXACT',
        },
    }
}

describe('SNBlamePlaceholderContentWidget', () => {
  let editor;
  let widget;
  let diff;

  beforeEach(() => {
    editor = {
      onDidChangeCursorPosition: jasmine.createSpy('onDidChangeCursorPosition').and.callFake((callback) => {
        callback();
      }),
      getPosition: jasmine.createSpy('getPosition').and.returnValue({ lineNumber: 1 }),
      getModel: jasmine.createSpy('getModel').and.returnValue({
        getLineContent: jasmine.createSpy('getLineContent').and.returnValue('line content')
      }),
      removeContentWidget: jasmine.createSpy('removeContentWidget').and.callFake((callback) => null),
      addContentWidget: jasmine.createSpy('addContentWidget').and.callFake((callback) => null),
      applyFontInfo: jasmine.createSpy('applyFontInfo').and.callFake((callback) => null)
    };

    widget = new SNBlamePlaceholderContentWidget(editor);
    diff = [{ index: 1, author: 'author', sourceName: 'source', date: new Date(), onlyWhiteSpace: false, newModel: false }];
  });

  it('should create an instance', () => {
    expect(widget).toBeDefined();
  });

  it('should have a static ID', () => {
    expect(SNBlamePlaceholderContentWidget.ID).toBe('editor.widget.placeholderHint');
  });

  it('should update diff', () => {
    widget.updateDiff(diff);
    expect(widget.diff).toBe(diff);
  });

  it('should handle cursor change', () => {
    widget.updateDiff(diff);
    widget.onCursorChange();
    expect(widget.domNode.textContent).toContain('SN BLAME: author@source');
    expect(editor.removeContentWidget).toHaveBeenCalledWith(widget);
    expect(editor.addContentWidget).toHaveBeenCalledWith(widget);
  });

  it('should return ID', () => {
    expect(widget.getId()).toBe(SNBlamePlaceholderContentWidget.ID);
  });

  it('should return DOM node', () => {
    const domNode = widget.getDomNode();
    expect(domNode).toBeDefined();
    expect(domNode.style.opacity).toBe('0.5');
  });

  it('should return position', () => {
    const position = widget.getPosition();
    expect(position.position.lineNumber).toBe(1);
    expect(position.position.column).toBe(13);
    expect(position.preference).toEqual([monaco.editor.ContentWidgetPositionPreference.EXACT]);
  });

  it('should dispose widget', () => {
    widget.dispose();
    expect(editor.removeContentWidget).toHaveBeenCalledWith(widget);
  });
});