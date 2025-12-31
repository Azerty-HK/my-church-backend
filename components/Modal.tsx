import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors, spacing, borderRadius, shadows, typography } from '../lib/designSystem';

const { height } = Dimensions.get('window');

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'full';
  showCloseButton?: boolean;
  footer?: React.ReactNode;
}

export function Modal({
  visible,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
  footer,
}: ModalProps) {
  const getModalWidth = () => {
    switch (size) {
      case 'small':
        return '80%';
      case 'medium':
        return '90%';
      case 'large':
        return '95%';
      case 'full':
        return '100%';
      default:
        return '90%';
    }
  };

  const getModalHeight = () => {
    if (size === 'full') return height;
    return undefined;
  };

  return (
    <RNModal
      visible={visible}
      transparent={size !== 'full'}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, size === 'full' && styles.fullOverlay]}>
        <View
          style={[
            styles.modal,
            { width: getModalWidth(), maxHeight: getModalHeight() || height * 0.9 },
            size === 'full' && styles.fullModal,
            shadows.lg,
          ]}
        >
          {(title || showCloseButton) && (
            <View style={styles.header}>
              {title && <Text style={styles.title}>{title}</Text>}
              {showCloseButton && (
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              )}
            </View>
          )}

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {children}
          </ScrollView>

          {footer && <View style={styles.footer}>{footer}</View>}
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  fullOverlay: {
    padding: 0,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  fullModal: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h3,
    flex: 1,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
