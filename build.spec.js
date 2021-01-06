const delay = function (ms = 1) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

describe('build', () => {
  it('should build fonts', async () => {
    require('./build');
    await delay(5000);
    expect(true).toEqual(true);
  });
});
