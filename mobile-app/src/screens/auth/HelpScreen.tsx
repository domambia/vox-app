import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation.types';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { announceScreenTitle } from '../../services/accessibility/accessibilityUtils';

type HelpScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Help'>;

interface Props {
    navigation: HelpScreenNavigationProp;
}

const HelpScreen: React.FC<Props> = ({ navigation }) => {
    useEffect(() => {
        announceScreenTitle('How VOX works');
    }, []);

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            accessible={true}
            accessibilityLabel="How VOX works"
        >
            <View style={styles.content}>
                <Text
                    style={styles.title}
                    accessibilityRole="header"
                    accessibilityLabel="How VOX works"
                >
                    How VOX Works
                </Text>

                <View style={styles.section}>
                    <Text
                        style={styles.sectionTitle}
                        accessibilityRole="header"
                    >
                        Welcome to VOX
                    </Text>
                    <Text
                        style={styles.sectionText}
                        accessibilityRole="text"
                    >
                        VOX is a community platform exclusively designed for blind and visually impaired people.
                        Connect with others through community, not technology.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text
                        style={styles.sectionTitle}
                        accessibilityRole="header"
                    >
                        Accessibility First
                    </Text>
                    <Text
                        style={styles.sectionText}
                        accessibilityRole="text"
                    >
                        Every feature in VOX is designed to work with screen readers from day one.
                        All screens are fully accessible with VoiceOver on iOS and TalkBack on Android.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text
                        style={styles.sectionTitle}
                        accessibilityRole="header"
                    >
                        Getting Started
                    </Text>
                    <Text
                        style={styles.sectionText}
                        accessibilityRole="text"
                    >
                        Create an account, complete your profile, and start discovering people in your community.
                        You can find friends, dates, hobby partners, or all of the above.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text
                        style={styles.sectionTitle}
                        accessibilityRole="header"
                    >
                        Features
                    </Text>
                    <Text
                        style={styles.sectionText}
                        accessibilityRole="text"
                    >
                        • Discover and match with people{'\n'}
                        • Send text and voice messages{'\n'}
                        • Join groups and attend events{'\n'}
                        • Make voice calls{'\n'}
                        • All features work offline when possible
                    </Text>
                </View>

                <AccessibleButton
                    label="Back"
                    onPress={() => navigation.goBack()}
                    hint="Double tap to go back"
                    variant="secondary"
                    style={styles.backButton}
                />
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        padding: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 32,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#000',
        marginBottom: 8,
    },
    sectionText: {
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
    },
    backButton: {
        width: '100%',
        marginTop: 24,
    },
});

export default HelpScreen;

