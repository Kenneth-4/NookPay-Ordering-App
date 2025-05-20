import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Path, G, Circle, Line, Text } from 'react-native-svg';
import { Colors } from '../../constants/theme';

interface Props {
  width?: number;
  height?: number;
}

const VouchersIcon: React.FC<Props> = ({ width = 200, height = 200 }) => {
  return (
    <View style={styles.container}>
      <Svg width={width} height={height} viewBox="0 0 200 200">
        {/* Background */}
        <Circle cx="100" cy="100" r="95" fill={Colors.secondary} opacity={0.1} />
        <Circle cx="100" cy="100" r="80" fill={Colors.secondary} opacity={0.15} />
        
        {/* First voucher */}
        <G transform="translate(40, 60) rotate(-15)">
          <Rect
            x="0"
            y="0"
            width="120"
            height="45"
            rx="8"
            ry="8"
            fill={Colors.primary}
          />
          <Rect
            x="0"
            y="0"
            width="120"
            height="45"
            rx="8"
            ry="8"
            fill={Colors.white}
            opacity="0.2"
          />
          <Circle cx="25" cy="22.5" r="10" fill={Colors.white} opacity="0.3" />
          <Line x1="45" y1="15" x2="110" y2="15" stroke={Colors.white} strokeWidth="4" strokeLinecap="round" opacity="0.7" />
          <Line x1="45" y1="30" x2="90" y2="30" stroke={Colors.white} strokeWidth="4" strokeLinecap="round" opacity="0.7" />
        </G>
        
        {/* Second voucher */}
        <G transform="translate(35, 115) rotate(5)">
          <Rect
            x="0"
            y="0"
            width="130"
            height="45"
            rx="8"
            ry="8"
            fill={Colors.secondary}
          />
          <Rect
            x="0"
            y="0"
            width="130"
            height="45"
            rx="8"
            ry="8"
            fill={Colors.white}
            opacity="0.2"
          />
          <Circle cx="25" cy="22.5" r="10" fill={Colors.white} opacity="0.3" />
          <Line x1="45" y1="15" x2="120" y2="15" stroke={Colors.white} strokeWidth="4" strokeLinecap="round" opacity="0.7" />
          <Line x1="45" y1="30" x2="105" y2="30" stroke={Colors.white} strokeWidth="4" strokeLinecap="round" opacity="0.7" />
        </G>
        
        {/* Discount percentage */}
        <G transform="translate(120, 80)">
          <Circle cx="0" cy="0" r="30" fill={Colors.primary} />
          <Circle cx="0" cy="0" r="25" fill={Colors.white} opacity="0.2" />
          <Path 
            d="M-12,10 L12,-10 M-10,-10 L10,10" 
            stroke={Colors.white} 
            strokeWidth="4" 
            strokeLinecap="round"
          />
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

export default VouchersIcon; 