import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_STORAGE_KEY = '@kmo-pos/language';
const LanguageContext = createContext(null);
let currentLanguage = 'my';

export function getCurrentLanguage() {
  return currentLanguage;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('my');
  const changeSequence = useRef(0);

  useEffect(() => {
    let active = true;
    const sequenceAtLoad = changeSequence.current;
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((savedLanguage) => {
        if (!active || sequenceAtLoad !== changeSequence.current) return;
        if (savedLanguage === 'my' || savedLanguage === 'en') {
          currentLanguage = savedLanguage;
          setLanguageState(savedLanguage);
        }
      })
      .catch((error) => {
        console.error('Unable to load the saved app language:', error);
      });

    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback(async (nextLanguage) => {
    if (nextLanguage !== 'my' && nextLanguage !== 'en') {
      throw new Error(`Unsupported app language: ${nextLanguage}`);
    }

    const sequence = ++changeSequence.current;
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    if (sequence !== changeSequence.current) return;
    currentLanguage = nextLanguage;
    setLanguageState(nextLanguage);
  }, []);

  const contextValue = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);
  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider.');
  }
  return context;
}
