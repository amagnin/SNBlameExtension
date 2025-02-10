import SNBlameOptions from '../../scripts/src/isolated/SNBlameOptions.js';

describe('SNBlameOptions', () => {
  let blameOptions;

  beforeEach(() => {
    blameOptions = new SNBlameOptions();
    spyOn((chrome || browser).storage.sync, 'set');
  });

  it('should return the same instance', () => {
    const blameOptions2 = new SNBlameOptions();
    expect(blameOptions).toBe(blameOptions2);
  });

  it('should update a valid option', () => {
    blameOptions.setOption('showUser', true);
    expect(blameOptions.getOption('showUser')).toBe(true);
  });

  it('should not call sync.set when updating with update false', () => {
    blameOptions.setOption('showUser', true, false);
    expect((chrome || browser).storage.sync.set).not.toHaveBeenCalled();
  });

  it('should not update an invalid option', () => {
    blameOptions.setOption('invalidOption', true);
    expect(blameOptions.getOption('invalidOption')).toBeUndefined();
  });

  it('should not update storage when update is false', () => {
    blameOptions.setOption('showUser', true, false);
    expect((chrome || browser).storage.sync.set).not.toHaveBeenCalled();
  });

  it('should update storage when update is true', () => {
    blameOptions.setOption('showUser', true, true);
    expect((chrome || browser).storage.sync.set).toHaveBeenCalledWith({ blameOptions: JSON.stringify(blameOptions.options) });
  });

  if('should reload options', () => {
    blameOptions.setOption('showUser', true);

    expect(blameOptions.getOption('showUser')).toBe(true);
    blameOptions.reloadOptions();
    
    expect(blameOptions.getOption('showUser')).toBe(false);
  });
});