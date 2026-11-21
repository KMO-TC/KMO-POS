import {
  Alert as NativeAlert,
  Platform,
} from 'react-native';
import { getCurrentLanguage } from '../i18n/LanguageContext';
import { translateText } from '../i18n/translations';

function localizeButtons(buttons) {
  return buttons?.map((button) => ({
    ...button,
    text: translateText(button.text, getCurrentLanguage()),
  }));
}

export const Alert = {
  alert(title, message, buttons, options) {
    const language = getCurrentLanguage();
    const localizedTitle = translateText(title, language);
    const localizedMessage = translateText(message, language);
    const localizedButtons = localizeButtons(buttons);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const content = [localizedTitle, localizedMessage].filter(Boolean).join('\n');
      if (localizedButtons?.length > 1) {
        const cancelButton = localizedButtons.find((button) => button.style === 'cancel');
        const confirmButton = localizedButtons.find((button) => button.style !== 'cancel');
        if (window.confirm(content)) confirmButton?.onPress?.();
        else cancelButton?.onPress?.();
      } else {
        window.alert(content);
        localizedButtons?.[0]?.onPress?.();
      }
      return;
    }

    NativeAlert.alert(localizedTitle, localizedMessage, localizedButtons, options);
  },

  prompt(title, message, buttons, type, defaultValue) {
    const language = getCurrentLanguage();
    const localizedTitle = translateText(title, language);
    const localizedMessage = translateText(message, language);
    const localizedButtons = localizeButtons(buttons);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const value = window.prompt([localizedTitle, localizedMessage].filter(Boolean).join('\n'), defaultValue);
      if (value !== null) {
        const submitButton = localizedButtons?.find((button) => button.style !== 'cancel');
        submitButton?.onPress?.(value);
      }
      return;
    }

    NativeAlert.prompt(localizedTitle, localizedMessage, localizedButtons, type, defaultValue);
  },
};
