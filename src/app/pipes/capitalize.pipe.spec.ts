import { CapitalizePipe } from './capitalize.pipe';

describe('CapitalizePipe', () => {
  it('should create an instance', () => {
    const pipe = new CapitalizePipe();
    expect(pipe).toBeTruthy();
  });

  it('should capitalize', () => {
    const pipe = new CapitalizePipe();
    expect(pipe.transform("test")).toEqual("Test");
  });
});
