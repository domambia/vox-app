import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { AppColors } from '../../constants/theme';

interface SkeletonItemProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: any;
}

/**
 * Skeleton Loader Component
 * Provides accessible loading placeholders
 */
export const SkeletonItem: React.FC<SkeletonItemProps> = ({
    width = '100%',
    height = 20,
    borderRadius = 4,
    style,
}) => {
    const animatedValue = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [animatedValue]);

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: AppColors.border,
                    opacity,
                },
                style,
            ]}
            accessibilityLabel="Loading"
            accessibilityRole="none"
        />
    );
};

interface LoadingSkeletonProps {
    type?: 'list' | 'card' | 'profile';
}

/**
 * Pre-configured skeleton loaders for common layouts
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ type = 'list' }) => {
    if (type === 'list') {
        return (
            <View style={styles.listContainer} accessibilityLabel="Loading content">
                {[1, 2, 3, 4, 5].map((item) => (
                    <View key={item} style={styles.listItem}>
                        <SkeletonItem width={56} height={56} borderRadius={28} />
                        <View style={styles.listContent}>
                            <SkeletonItem width="60%" height={16} style={styles.marginBottom} />
                            <SkeletonItem width="80%" height={14} />
                        </View>
                    </View>
                ))}
            </View>
        );
    }

    if (type === 'card') {
        return (
            <View style={styles.cardContainer} accessibilityLabel="Loading content">
                <SkeletonItem width={120} height={120} borderRadius={60} style={styles.center} />
                <SkeletonItem width="70%" height={24} style={[styles.center, styles.marginTop]} />
                <SkeletonItem width="90%" height={16} style={[styles.center, styles.marginTop]} />
                <SkeletonItem width="90%" height={16} style={[styles.center, styles.marginTop]} />
            </View>
        );
    }

    return (
        <View style={styles.profileContainer} accessibilityLabel="Loading content">
            <SkeletonItem width={80} height={80} borderRadius={40} />
            <SkeletonItem width="60%" height={20} style={styles.marginTop} />
            <SkeletonItem width="80%" height={16} style={styles.marginTop} />
        </View>
    );
};

const styles = StyleSheet.create({
    listContainer: {
        padding: 16,
    },
    listItem: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: AppColors.border,
    },
    listContent: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    cardContainer: {
        padding: 20,
        alignItems: 'center',
    },
    profileContainer: {
        padding: 16,
    },
    center: {
        alignSelf: 'center',
    },
    marginTop: {
        marginTop: 12,
    },
    marginBottom: {
        marginBottom: 8,
    },
});

