import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, TouchableOpacityProps } from 'react-native';

interface AccessibleCardProps extends TouchableOpacityProps {
    children: React.ReactNode;
    onPress?: () => void;
    style?: ViewStyle;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    accessibilityRole?: 'button' | 'none';
}

export const AccessibleCard: React.FC<AccessibleCardProps> = ({
    children,
    onPress,
    style,
    accessibilityLabel,
    accessibilityHint,
    accessibilityRole = onPress ? 'button' : 'none',
    ...touchableProps
}) => {
    const cardStyle = [styles.card, style];

    if (onPress) {
        return (
            <TouchableOpacity
                style={cardStyle}
                onPress={onPress}
                accessibilityRole={accessibilityRole}
                accessibilityLabel={accessibilityLabel}
                accessibilityHint={accessibilityHint}
                activeOpacity={0.7}
                {...touchableProps}
            >
                {children}
            </TouchableOpacity>
        );
    }

    return (
        <View
            style={cardStyle}
            accessibilityRole={accessibilityRole}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
        >
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
});

