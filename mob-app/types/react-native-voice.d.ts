declare module 'react-native-voice' {
  interface SpeechErrorEvent {
    error: {
      code: string;
      message: string;
    };
  }

  interface SpeechResultsEvent {
    value: string[];
  }

  interface SpeechStartEvent {
    error?: boolean;
  }

  interface SpeechEndEvent {
    error?: boolean;
  }

  interface SpeechPartialResultsEvent {
    value: string[];
  }

  class Voice {
    static onSpeechStart: (e: SpeechStartEvent) => void;
    static onSpeechEnd: (e: SpeechEndEvent) => void;
    static onSpeechError: (e: SpeechErrorEvent) => void;
    static onSpeechResults: (e: SpeechResultsEvent) => void;
    static onSpeechPartialResults: (e: SpeechPartialResultsEvent) => void;
    static start(locale?: string): Promise<void>;
    static stop(): Promise<void>;
    static cancel(): Promise<void>;
    static destroy(): Promise<void>;
    static isAvailable(): Promise<boolean>;
    static getSpeechRecognitionServices(): Promise<string[]>;
  }

  export default Voice;
}

