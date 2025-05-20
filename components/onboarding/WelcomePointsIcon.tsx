import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { Colors } from '../../constants/theme';

interface Props {
  width?: number;
  height?: number;
}

const WelcomePointsIcon: React.FC<Props> = ({ 
  width = Platform.OS === 'web' ? 180 : 200, 
  height = Platform.OS === 'web' ? 180 : 200 
}) => {
  return (
    <View style={styles.container}>
      <Svg 
        width={width} 
        height={height} 
        viewBox="0 0 200 200"
        style={Platform.OS === 'web' ? { transform: 'scale(0.9)' } : undefined}
      >
        <Circle cx="100" cy="100" r="95" fill={Colors.primary} opacity={0.1} />
        <Circle cx="100" cy="100" r="85" fill={Colors.primary} opacity={0.2} />
        <Circle cx="100" cy="100" r="70" fill={Colors.primary} opacity={0.3} />
        
        {/* Coins/points */}
        <G>
          <Circle cx="100" cy="100" r="40" fill={Colors.primary} />
          <Circle cx="100" cy="100" r="35" fill={Colors.white} opacity={0.1} />
          <Path 
            d="M85 100 L115 100 M100 85 L100 115" 
            stroke={Colors.white} 
            strokeWidth="5" 
            strokeLinecap="round"
          />
        </G>
        
        {/* Small coins */}
        <G>
          <Circle cx="140" cy="70" r="25" fill={Colors.primary} />
          <Circle cx="140" cy="70" r="20" fill={Colors.white} opacity={0.1} />
        </G>
        
        <G>
          <Circle cx="60" cy="130" r="20" fill={Colors.primary} />
          <Circle cx="60" cy="130" r="15" fill={Colors.white} opacity={0.1} />
        </G>
        
        <G>
          <Circle cx="120" cy="150" r="15" fill={Colors.primary} />
          <Circle cx="120" cy="150" r="10" fill={Colors.white} opacity={0.1} />
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { overflow: 'hidden' } : {}),
  },
});

export default WelcomePointsIcon; 