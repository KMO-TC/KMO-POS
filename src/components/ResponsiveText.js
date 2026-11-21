import React, { forwardRef } from 'react';
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput, useWindowDimensions } from 'react-native';
import { getAdaptiveTextStyle } from '../theme/typography';
import { useLanguage } from '../i18n/LanguageContext';
import { translateText } from '../i18n/translations';

function localizeChildren(children, language) {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') return translateText(child, language);
    if (!React.isValidElement(child) || child.props.children === undefined) return child;
    return React.cloneElement(child, undefined, localizeChildren(child.props.children, language));
  });
}

export const ResponsiveText = forwardRef(({
  allowFontScaling = true,
  maxFontSizeMultiplier,
  style,
  children,
  ...props
}, ref) => {
  const { fontScale } = useWindowDimensions();
  const { language } = useLanguage();
  const flattenedStyle = StyleSheet.flatten(style) || {};
  let effectiveFontScale = allowFontScaling ? fontScale : 1;
  if (allowFontScaling && maxFontSizeMultiplier > 0) {
    effectiveFontScale = Math.min(effectiveFontScale, maxFontSizeMultiplier);
  }
  const adaptiveStyle = getAdaptiveTextStyle(flattenedStyle, effectiveFontScale);

  return (
    <NativeText
      ref={ref}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      {...props}
      style={[style, adaptiveStyle]}
    >
      {localizeChildren(children, language)}
    </NativeText>
  );
});

ResponsiveText.displayName = 'ResponsiveText';

export const LocalizedTextInput = React.forwardRef(({
  placeholder,
  multiline = false,
  submitBehavior,
  textAlignVertical,
  ...props
}, ref) => {
  const { language } = useLanguage();
  return (
    <NativeTextInput
      ref={ref}
      placeholder={translateText(placeholder, language)}
      multiline={multiline}
      submitBehavior={submitBehavior || (multiline ? 'newline' : undefined)}
      textAlignVertical={textAlignVertical || (multiline ? 'top' : undefined)}
      {...props}
    />
  );
});

LocalizedTextInput.displayName = 'LocalizedTextInput';
