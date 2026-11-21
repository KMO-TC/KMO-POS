const DEFAULT_FONT_SIZE = 14;
const BURMESE_LINE_HEIGHT_RATIO = 1.4;

export function getAdaptiveTextStyle(style = {}, fontScale = 1) {
  const scale = Number(fontScale) > 0 ? Number(fontScale) : 1;
  const adaptiveStyle = {
    flexShrink: style.flexShrink === undefined ? 1 : style.flexShrink,
  };

  if (style.fontSize !== undefined) {
    const fontSize = Number(style.fontSize) || DEFAULT_FONT_SIZE;
    const existingLineHeight = (Number(style.lineHeight) || 0) * scale;
    adaptiveStyle.lineHeight = Math.max(
      existingLineHeight,
      Math.ceil(fontSize * BURMESE_LINE_HEIGHT_RATIO * scale),
    );
  } else if (style.lineHeight !== undefined) {
    adaptiveStyle.lineHeight = Number(style.lineHeight) * scale;
  }

  return adaptiveStyle;
}
