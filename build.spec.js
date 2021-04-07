const svgtofont = require('svgtofont');
jest.mock('svgtofont');

describe('build', () => {
  it('should build fonts', (done) => {
    const builder = require('./build');
    builder.main().then(() => {
      expect(svgtofont).toHaveBeenCalled();
      done();
    });
  });
});
