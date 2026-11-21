import React from 'react';
import {
  KeyboardAvoidingView,
  Modal as NativeModal,
  Platform,
} from 'react-native';

export default function KeyboardAwareModal({ children, ...modalProps }) {
  return (
    <NativeModal {...modalProps}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
        style={{ flex: 1 }}
      >
        {children}
      </KeyboardAvoidingView>
    </NativeModal>
  );
}
