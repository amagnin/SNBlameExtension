import MonacoBlameGutterWrapper from '../../scripts/src/isolated/blame/MonacoBlameGutterWrapper.js';
import SNBlameOptions from '../../scripts/src/isolated/SNBlameOptions.js';
import MonacoBlameGutter from '../../scripts/src/isolated/blame/MonacoBlameGutter.js';

import { JSDOM } from 'jsdom';

const { window } = new JSDOM(`<!doctype html><html><body></body></html>`);
global.window = window;
global.document = window.document;
global.CustomEvent = window.CustomEvent;

describe('MonacoBlameGutterWrapper', () => {
  let wrapper;
  let field = 'testField';
  const lines = [];

  beforeEach(() => {
    wrapper = new MonacoBlameGutterWrapper();
    const editorElement = document.createElement('div');
    editorElement.innerHTML = '<div class="margin-view-overlays"></div>';

    wrapper.createGutter(field, editorElement, lines);

    spyOn(SNBlameOptions.prototype, 'setOption').and.callThrough();
    spyOn(SNBlameOptions.prototype, 'getOption').and.callFake((option) => {
      const options = {
        showUser: false,
        hideGutterDate: false,
        ignoreWhiteSpace: true,
        debugLineNumbers: false,
      };
      return options[option];
    });
    spyOn(MonacoBlameGutter.prototype, 'scroll').and.callFake(() => null);
    spyOn(MonacoBlameGutter.prototype, 'updateGutter').and.callThrough();
    spyOn(MonacoBlameGutter.prototype, 'updateLines').and.callThrough();
    spyOn(MonacoBlameGutter.prototype, 'updateGutterSize').and.callThrough();
    spyOn(MonacoBlameGutter.prototype, 'destroyGutter').and.callThrough();
  });

  it('should return the same instance', () => {
    const wrapper2 = new MonacoBlameGutterWrapper();
    expect(wrapper).toBe(wrapper2);
  });

  it('should create a gutter', () => {
    const editorElement = document.createElement('div');
    editorElement.innerHTML = '<div class="margin-view-overlays"></div>';

    wrapper.createGutter('newGutter', editorElement, []);

    expect(wrapper.gutterExists('newGutter')).toBeTrue();
  });

  it('should update gutter lines', () => { 
    wrapper.updateGutterLines(field, lines);
    expect(MonacoBlameGutter.prototype.updateLines).toHaveBeenCalled();
  });

  it('should update gutter size', () => {
    wrapper.updateGutterSize(field);
    expect(MonacoBlameGutter.prototype.updateGutterSize).toHaveBeenCalled();
  });

  it('should destroy gutter', () => {
    wrapper.destroyGutter(field);
    expect(MonacoBlameGutter.prototype.destroyGutter).toHaveBeenCalled();
  });

  it('should update gutter options', () => {
    wrapper.updateGutterOptions();
    expect(MonacoBlameGutter.prototype.updateGutter).toHaveBeenCalled();
    expect(MonacoBlameGutter.prototype.updateGutterSize).toHaveBeenCalled();
  });

  it('should handle sn-blame-scroll event', () => {
    const event = new CustomEvent('sn-blame-scroll', {
      detail: { scroll: 100, field: field },
    });
    window.dispatchEvent(event);
    
    expect(MonacoBlameGutter.prototype.scroll).toHaveBeenCalledWith(100);
    expect(MonacoBlameGutter.prototype.updateGutter).toHaveBeenCalled();
  });

  it('should handle sn-blame-toggle-user-update-set event', () => {
    const event = new CustomEvent('sn-blame-toggle-user-update-set');
    window.dispatchEvent(event);

    expect(SNBlameOptions.prototype.setOption).toHaveBeenCalledWith('showUser', true);
    expect(MonacoBlameGutter.prototype.updateGutter).toHaveBeenCalled();
    expect(MonacoBlameGutter.prototype.updateGutterSize).toHaveBeenCalled();
  });

  it('should handle sn-blame-toggle-gutter-date event', () => {
    const event = new CustomEvent('sn-blame-toggle-gutter-date');
    window.dispatchEvent(event);

    expect(SNBlameOptions.prototype.setOption).toHaveBeenCalledWith('hideGutterDate', true);
    expect(MonacoBlameGutter.prototype.updateGutter).toHaveBeenCalled();
    expect(MonacoBlameGutter.prototype.updateGutterSize).toHaveBeenCalled();
  });

  it('should handle sn-blame-toggle-whitespace event', () => {
    const event = new CustomEvent('sn-blame-toggle-whitespace');
    window.dispatchEvent(event);

    expect(SNBlameOptions.prototype.setOption).toHaveBeenCalledWith('ignoreWhiteSpace', false);
    expect(MonacoBlameGutter.prototype.updateGutter).toHaveBeenCalled();
    expect(MonacoBlameGutter.prototype.updateGutterSize).toHaveBeenCalled();
  });

  it('should handle sn-blame-toggle-line-numbers event', () => {
    const event = new CustomEvent('sn-blame-toggle-line-numbers');
   
    window.dispatchEvent(event);
    
    expect(SNBlameOptions.prototype.setOption).toHaveBeenCalledWith('debugLineNumbers', true);
    expect(MonacoBlameGutter.prototype.updateGutter).toHaveBeenCalled();
    expect(MonacoBlameGutter.prototype.updateGutterSize).toHaveBeenCalled();
  });
});