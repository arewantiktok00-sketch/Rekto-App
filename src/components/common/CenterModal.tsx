import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

interface CenterModalProps {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  /** Optional: close when tapping the dark overlay. Default true */
  dismissOnOverlay?: boolean;
  /** Use when modal has no text inputs (no keyboard). Default true = use KeyboardAvoidingView */
  keyboardAware?: boolean;
}

/**
 * Centered modal for owner dashboard and elsewhere.
 * Stays centered and moves up with the keyboard when inputs are focused.
 */
export function CenterModal({
  visible,
  onRequestClose,
  children,
  dismissOnOverlay = true,
  keyboardAware = true,
}: CenterModalProps) {
  const content = (
    <View style={styles.overlay}>
      {dismissOnOverlay ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} />
      ) : null}
      <View style={styles.centered} pointerEvents="box-none">
        <Pressable onPress={(e) => e.stopPropagation()}>
          {children}
        </Pressable>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      {keyboardAware ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    marginHorizontal: 20,
  },
});
