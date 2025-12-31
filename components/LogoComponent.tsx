import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';

interface LogoComponentProps {
  size?: number;
  style?: ViewStyle;
  showText?: boolean;
}

export function LogoComponent({ size = 100, style, showText = true }: LogoComponentProps) {
  return (
    <View style={[styles.container, style]}>
      <Svg width={size} height={size} viewBox="0 0 1024 1024">
        <Defs>
          <SvgLinearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#1e88e5" stopOpacity="1" />
            <Stop offset="50%" stopColor="#7e57c2" stopOpacity="1" />
            <Stop offset="100%" stopColor="#e53935" stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>

        {/* Cercle avec gradient */}
        <Circle cx="512" cy="512" r="512" fill="url(#logoGradient)" />

        {/* Croix blanche */}
        <Path
          d="M 640 192
             C 640 174.327 625.673 160 608 160
             L 416 160
             C 398.327 160 384 174.327 384 192
             L 384 384
             L 192 384
             C 174.327 384 160 398.327 160 416
             L 160 608
             C 160 625.673 174.327 640 192 640
             L 384 640
             L 384 832
             C 384 849.673 398.327 864 416 864
             L 608 864
             C 625.673 864 640 849.673 640 832
             L 640 640
             L 832 640
             C 849.673 640 864 625.673 864 608
             L 864 416
             C 864 398.327 849.673 384 832 384
             L 640 384
             Z"
          fill="white"
        />
      </Svg>
      {showText && <Text style={styles.logoName}>myChurch</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 8,
  },
});
