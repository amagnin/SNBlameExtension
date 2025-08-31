import MonacoBlameGutter from '../../scripts/src/isolated/blame/MonacoBlameGutter.js';
import SNBlameOptions from '../../scripts/src/isolated/SNBlameOptions.js';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM(`<!doctype html><html><body></body></html>`);
global.document = window.document;

global.chrome={};
global.chrome['storage'] = {
    sync: {
        set: async (kvp) => {throw new Error('Unimplemented')},
        get: async (key) => {throw new Error('Unimplemented')}
    }
};

describe("MonacoBlameGutter", function () {
    let editorElement = document.createElement('DIV');
    let lines;

    beforeEach(() => {
        lines = [
            { index: 1, author: 'Author1', sourceName: 'Source1', date: 1620000000000, source: { value: '1' }, updateSetNotFound: false, newModel: false },
            { index: 2, author: 'Author2', sourceName: 'Source2', date: 1620000000000, source: { value: '2' }, updateSetNotFound: false, newModel: false }
        ];
        editorElement.innerHTML = '<div class="margin-view-overlays"></div>';
    });

    it("should initialize the gutter correctly", function () {
        const gutter = new MonacoBlameGutter(editorElement, lines);
        expect(gutter.blameGutterContainer).toBeDefined();
        expect(gutter.blameGutter).toBeDefined();
    });

    it("should create the gutter correctly", function () {
        const gutter = new MonacoBlameGutter(editorElement, lines);
        expect(editorElement.querySelector('.margin-view-overlays')).toBeDefined();
        expect(gutter.blameGutterContainer.style.width).toBe(`${MonacoBlameGutter.SIZE}px`);
    });

    it("should update lines correctly", function () {
        const gutter = new MonacoBlameGutter(editorElement, lines);
        const newLines = [
            { index: 3, author: 'Author3', sourceName: 'Source3', date: 1620000000000, source: { value: '3' }, updateSetNotFound: false, newModel: false }
        ];
        gutter.updateLines(newLines);
        expect(gutter.lines).toBe(newLines);
    });

    it("should update gutter size correctly", function () {
        const gutter = new MonacoBlameGutter(editorElement, lines);
        spyOn(SNBlameOptions.prototype, 'getOption').and.returnValue(300);
        gutter.updateGutterSize();
        expect(gutter.blameGutterContainer.style.width).toBe('300px');
    });

    it("should destroy the gutter correctly", function () {
        const gutter = new MonacoBlameGutter(editorElement, lines);
        gutter.destroyGutter();
        expect(editorElement.querySelector('.margin-view-overlays').childElementCount).toBe(0);
    });   
});