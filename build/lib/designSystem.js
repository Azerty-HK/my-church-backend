"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typography = exports.shadows = exports.fontSize = exports.borderRadius = exports.spacing = exports.colors = void 0;
// Design System - Modern & Minimal
exports.colors = {
    // Primary gradient
    primary: '#667eea',
    primaryDark: '#764ba2',
    // Neutrals
    background: '#f8f9fa',
    surface: '#ffffff',
    border: '#e9ecef',
    // Text
    text: '#212529',
    textSecondary: '#6c757d',
    textLight: '#adb5bd',
    // Status
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    // Overlays
    overlay: 'rgba(0, 0, 0, 0.5)',
};
exports.spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};
exports.borderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 999,
};
exports.fontSize = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    xxxl: 42,
};
exports.shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 6,
    },
};
exports.typography = {
    h1: {
        fontSize: exports.fontSize.xxxl,
        fontWeight: '700',
        letterSpacing: -1.5,
        color: exports.colors.text,
    },
    h2: {
        fontSize: exports.fontSize.xxl,
        fontWeight: '700',
        letterSpacing: -1,
        color: exports.colors.text,
    },
    h3: {
        fontSize: exports.fontSize.xl,
        fontWeight: '600',
        letterSpacing: -0.5,
        color: exports.colors.text,
    },
    body: {
        fontSize: exports.fontSize.md,
        fontWeight: '400',
        color: exports.colors.text,
    },
    caption: {
        fontSize: exports.fontSize.sm,
        fontWeight: '400',
        color: exports.colors.textSecondary,
    },
    small: {
        fontSize: exports.fontSize.xs,
        fontWeight: '400',
        color: exports.colors.textLight,
    },
};
