import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Path, G, Circle, Line } from 'react-native-svg';
import { Colors } from '../../constants/theme';

interface Props {
  width?: number;
  height?: number;
}

const HowToOrderIcon: React.FC<Props> = ({ width = 200, height = 200 }) => {
  return (
    <View style={styles.container}>
      <Svg width={width} height={height} viewBox="0 0 200 200">
        {/* Background */}
        <Circle cx="100" cy="100" r="95" fill={Colors.primary} opacity={0.1} />
        <Circle cx="100" cy="100" r="80" fill={Colors.primary} opacity={0.15} />
        
        {/* Phone outline */}
        <G>
          <Rect
            x="60"
            y="40"
            width="80"
            height="140"
            rx="15"
            ry="15"
            fill={Colors.secondary}
          />
          <Rect
            x="65"
            y="50"
            width="70"
            height="110"
            rx="5"
            ry="5"
            fill={Colors.white}
            opacity="0.9"
          />
          <Circle cx="100" cy="170" r="8" fill={Colors.white} opacity="0.5" />
        </G>
        
        {/* Menu items */}
        <G>
          <Rect x="75" y="60" width="50" height="8" rx="2" ry="2" fill={Colors.primary} opacity="0.8" />
          <Rect x="75" y="75" width="35" height="6" rx="2" ry="2" fill={Colors.secondary} opacity="0.5" />
          
          {/* Food item 1 */}
          <Rect x="75" y="90" width="50" height="12" rx="2" ry="2" fill={Colors.primary} opacity="0.2" />
          <Circle cx="80" cy="96" r="3" fill={Colors.primary} />
          <Line x1="85" y1="96" x2="115" y2="96" stroke={Colors.secondary} strokeWidth="1" opacity="0.5" />
          
          {/* Food item 2 */}
          <Rect x="75" y="110" width="50" height="12" rx="2" ry="2" fill={Colors.primary} opacity="0.2" />
          <Circle cx="80" cy="116" r="3" fill={Colors.primary} />
          <Line x1="85" y1="116" x2="115" y2="116" stroke={Colors.secondary} strokeWidth="1" opacity="0.5" />
          
          {/* Cart button */}
          <Rect x="75" y="130" width="50" height="20" rx="10" ry="10" fill={Colors.primary} />
          
          {/* Cart icon */}
          <G transform="translate(98, 140) scale(0.5)">
            <Path
              d="M-15,-5 L-8,-5 L-4,8 L10,8 L15,-2 L-2,-2"
              stroke={Colors.white}
              strokeWidth="2"
              fill="none"
            />
            <Circle cx="-2" cy="12" r="3" fill={Colors.white} />
            <Circle cx="8" cy="12" r="3" fill={Colors.white} />
          </G>
        </G>
        
        {/* Delivery icon */}
        <G transform="translate(140, 70) scale(0.7)">
          <Circle cx="0" cy="0" r="25" fill={Colors.secondary} />
          <Circle cx="0" cy="0" r="20" fill={Colors.white} opacity="0.2" />
          <G transform="translate(0, 0) scale(0.7)">
            <Path
              d="M-15,-5 L15,-5 L15,5 L-15,5 Z"
              fill={Colors.white}
              opacity="0.9"
            />
            <Circle cx="-10" cy="5" r="5" fill={Colors.white} />
            <Circle cx="10" cy="5" r="5" fill={Colors.white} />
          </G>
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HowToOrderIcon; 