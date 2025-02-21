import SNRESTFactory from '../../scripts/src/isolated/SNRestFactory.js';

describe('SNRESTFactory', () => {
  let factory;
  let g_ck = 'dummy_token';

  beforeEach(() => {
    factory = SNRESTFactory(g_ck);
  });

  it('should have getVersions method', () => {
    expect(factory.getVersions).toBeDefined();
  });

  it('should have getScriptIncludes method', () => {
    expect(factory.getScriptIncludes).toBeDefined();
  });

  it('should have getRecords method', () => {
    expect(factory.getRecords).toBeDefined();
  });

  it('should have getScope method', () => {
    expect(factory.getScope).toBeDefined();
  });

  it('should have getProperties method', () => {
    expect(factory.getProperties).toBeDefined();
  });

  it('should have getScriptIncludeCache method', () => {
    expect(factory.getScriptIncludeCache).toBeDefined();
  });
});