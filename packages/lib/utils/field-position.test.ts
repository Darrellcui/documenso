import { describe, expect, it } from 'vitest';

import { restrictFieldPosition } from './field-position';

describe('restrictFieldPosition', () => {
  it('keeps fields fully inside the page', () => {
    expect(
      restrictFieldPosition({
        positionX: 90,
        positionY: 95,
        width: 25,
        height: 10,
      }),
    ).toEqual({
      positionX: 75,
      positionY: 90,
      width: 25,
      height: 10,
    });
  });

  it('clamps negative positions and invalid percentage sizes', () => {
    expect(
      restrictFieldPosition({
        positionX: -5,
        positionY: -10,
        width: 120,
        height: -20,
      }),
    ).toEqual({
      positionX: 0,
      positionY: 0,
      width: 100,
      height: 0,
    });
  });
});
