import * as Util from './util'

describe('Utility: encodeUriParameters', () => {
  it('{ "a key" : "a value" } => "a%20key=a%20value"', () => {
    expect(Util.encodeUriParameters({ "a key": "a value" })).toEqual("a%20key=a%20value");
  });

  it('{ } => ""', () => {
    expect(Util.encodeUriParameters({})).toEqual("");
  });
});

describe('Utility: isValidResourceId', () => {
  it('identifies valid IDs', () => {
    expect(Util.isValidResourceId("00000000-1111-2222-3333-444444444444")).toEqual(true);
    expect(Util.isValidResourceId("AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE")).toEqual(true);
    expect(Util.isValidResourceId("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")).toEqual(true);

    expect(Util.isValidResourceId("4f1f31c8-4ea3-42bd-9ba3-76a4c1d459b0")).toEqual(true);
    expect(Util.isValidResourceId("4F1F31C8-4EA3-42BD-9BA3-76A4C1D459B0")).toEqual(true);
  });

  it('identifies invalid IDs', () => {
    expect(Util.isValidResourceId("00000000111122223333444444444444")).toEqual(false);
    expect(Util.isValidResourceId("AAAAAAAABBBBCCCCDDDDEEEEEEEEEEEE")).toEqual(false);
  });
});

describe('Utility: arrayEqual', () => {
  it('with empty arrays', () => {
    expect(Util.arrayEqual([], [])).toBeTruthy();
    expect(Util.arrayEqual([1], [])).toBeFalsy();
    expect(Util.arrayEqual([], [1])).toBeFalsy();
  });

  it('with non arrays', () => {
    expect(Util.arrayEqual([], undefined)).toBeFalsy();
    expect(Util.arrayEqual([], null)).toBeFalsy();
    expect(Util.arrayEqual([], "" as any)).toBeFalsy();
    expect(Util.arrayEqual([], 1 as any)).toBeFalsy();

    expect(Util.arrayEqual(undefined, [])).toBeFalsy();
    expect(Util.arrayEqual(null, [])).toBeFalsy();
    expect(Util.arrayEqual("" as any, [])).toBeFalsy();
    expect(Util.arrayEqual(1 as any, [])).toBeFalsy();
  });

  it('Flat arrays', () => {
    expect(Util.arrayEqual([1, 2], [1, 2])).toBeTruthy();
    expect(Util.arrayEqual([2, 1], [2, 1])).toBeTruthy();

    expect(Util.arrayEqual([2, 2], [2, 1])).toBeFalsy();
    expect(Util.arrayEqual([2, 1], [2, 2])).toBeFalsy();

    expect(Util.arrayEqual([2, 2, 2], [2, 2])).toBeFalsy();
    expect(Util.arrayEqual([2, 2], [2, 2, 2])).toBeFalsy();
  })

  it('Nested arrays', () => {
    expect(Util.arrayEqual([[1, 2]], [[1, 2]])).toBeTruthy();
    expect(Util.arrayEqual([[2, 1]], [[2, 1]])).toBeTruthy();

    expect(Util.arrayEqual([[2, 1]], [[]])).toBeFalsy();
    expect(Util.arrayEqual([[2, 1]], [])).toBeFalsy();
  })
});
