import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ResponsiveText } from './ResponsiveText';
import { Alert } from './LocalizedAlert';
import { useLanguage } from '../i18n/LanguageContext';

export default function LanguageSwitcher({ style }) {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = async () => {
    try {
      await setLanguage(language === 'my' ? 'en' : 'my');
    } catch (error) {
      console.error('Unable to save the selected app language:', error);
      Alert.alert(
        'Language change failed',
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={language === 'my' ? 'Switch language to English' : 'Switch language to Myanmar'}
      onPress={toggleLanguage}
      style={[styles.button, style]}
    >
      <ResponsiveText style={styles.label}>
        {language === 'my' ? 'EN' : 'မြန်မာ'}
      </ResponsiveText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 48,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#eef3ff',
    borderWidth: 1,
    borderColor: '#d8e2ff',
  },
  label: {
    color: '#2457a7',
    fontSize: 13,
    fontWeight: '700',
  },
});
