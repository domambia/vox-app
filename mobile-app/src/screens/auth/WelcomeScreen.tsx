import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation.types';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { announceScreenTitle } from '../../services/accessibility/accessibilityUtils';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

interface Props {
    navigation: WelcomeScreenNavigationProp;
}

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
    useEffect(() => {
        announceScreenTitle('Welcome to VOX. A community for blind and visually impaired people.');
    }, []);

    const handleLogin = () => {
        navigation.navigate('Login');
    };

    const handleRegister = () => {
        navigation.navigate('RegisterStepOne');
    };

    const handleHelp = () => {
        navigation.navigate('Help');
    };

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            accessible={true}
            accessibilityLabel="Welcome to VOX"
        >
            <View style={styles.content}>
                <Text
                    style={styles.title}
                    accessibilityRole="header"
                    accessibilityLabel="Welcome to VOX"
                >
                    Welcome to VOX
                </Text>

                <Text
                    style={styles.subtitle}
                    accessibilityRole="text"
                >
                    A community for blind and visually impaired people
                </Text>

                <View style={styles.buttonContainer}>
                    <AccessibleButton
                        label="Log in"
                        onPress={handleLogin}
                        hint="Double tap to log in to your existing account"
                        variant="primary"
                        style={styles.button}
                    />

                    <AccessibleButton
                        label="Create a new account"
                        onPress={handleRegister}
                        hint="Double tap to create a new VOX account"
                        variant="secondary"
                        style={styles.button}
                    />

                    <AccessibleButton
                        label="Help / How VOX works"
                        onPress={handleHelp}
                        hint="Double tap to learn how VOX works"
                        variant="secondary"
                        style={styles.button}
                    />
                </View>
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
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#000',
        textAlign: 'center',
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        textAlign: 'center',
        marginBottom: 48,
    },
    buttonContainer: {
        gap: 16,
    },
    button: {
        width: '100%',
    },
});

export default WelcomeScreen;

