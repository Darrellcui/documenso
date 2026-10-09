type FieldPosition = {
  positionX: number;
  positionY: number;
  width: number;
  height: number;
};

const clampPercentage = (value: number) => Math.max(0, Math.min(100, value));

/**
 * Keeps the complete field inside its page, rather than only clamping each
 * percentage independently.
 */
export const restrictFieldPosition = (field: FieldPosition): FieldPosition => {
  const width = clampPercentage(field.width);
  const height = clampPercentage(field.height);

  return {
    positionX: Math.max(0, Math.min(100 - width, field.positionX)),
    positionY: Math.max(0, Math.min(100 - height, field.positionY)),
    width,
    height,
  };
};
