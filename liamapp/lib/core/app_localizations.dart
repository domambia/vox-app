import 'package:flutter/material.dart';

class AppLocalizations {
  AppLocalizations(this.locale);

  final Locale locale;

  static const LocalizationsDelegate<AppLocalizations> delegate = _AppLocalizationsDelegate();

  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('it'),
    Locale('mt'),
  ];

  static AppLocalizations of(BuildContext context) {
    final localization = Localizations.of<AppLocalizations>(context, AppLocalizations);
    if (localization == null) {
      return AppLocalizations(const Locale('en'));
    }
    return localization;
  }

  static AppLocalizations forLocale(Locale locale) => AppLocalizations(locale);

  String _t(String key) {
    final languageCode = locale.languageCode;
    final values = _localizedValues[languageCode] ?? _localizedValues['en']!;
    return values[key] ?? _localizedValues['en']![key] ?? key;
  }

  String _format(String key, Map<String, String> params) {
    var value = _t(key);
    for (final entry in params.entries) {
      value = value.replaceAll('{${entry.key}}', entry.value);
    }
    return value;
  }

  String phrase(String text) {
    final languageCode = locale.languageCode;
    final values = _phraseLocalizedValues[languageCode] ?? const <String, String>{};
    return values[text] ?? text;
  }

  String get appTitle => _t('appTitle');
  String get sessionExpiredSignIn => _t('sessionExpiredSignIn');
  String get myProfile => _t('myProfile');
  String get notifications => _t('notifications');
  String get settings => _t('settings');
  String get edit => _t('edit');
  String get aboutMe => _t('aboutMe');
  String get voiceBio => _t('voiceBio');
  String get stats => _t('stats');
  String get profileCompleteness => _t('profileCompleteness');
  String interestsCount(int count) => _format('interestsCount', {'count': '$count'});
  String voiceBioStatus(bool hasVoiceBio) =>
      _format('voiceBioStatus', {'value': hasVoiceBio ? _t('yes') : _t('no')});
  String get account => _t('account');
  String get kycVerification => _t('kycVerification');
  String get calls => _t('calls');
  String get logout => _t('logout');
  String get loggedOut => _t('loggedOut');
  String get failedToLoadProfile => _t('failedToLoadProfile');
  String get retry => _t('retry');
  String get createYourProfile => _t('createYourProfile');
  String get completeProfileHint => _t('completeProfileHint');
  String get createProfile => _t('createProfile');
  String get voiceBioSaved => _t('voiceBioSaved');
  String get failedToPlayVoiceBio => _t('failedToPlayVoiceBio');
  String get voiceBioDeleted => _t('voiceBioDeleted');
  String get recording => _t('recording');
  String get stopRecording => _t('stopRecording');
  String get yourVoiceBio => _t('yourVoiceBio');
  String get tapToPlay => _t('tapToPlay');
  String get rerecord => _t('rerecord');
  String get delete => _t('delete');
  String get recordingReady => _t('recordingReady');
  String get saveToUpdateVoiceBio => _t('saveToUpdateVoiceBio');
  String get save => _t('save');
  String get noVoiceBioYet => _t('noVoiceBioYet');
  String get recordVoiceBioHint => _t('recordVoiceBioHint');
  String get startRecording => _t('startRecording');
  String get micPermissionRequired => _t('micPermissionRequired');
  String get recordingUnavailable => _t('recordingUnavailable');
  String get recordingUnavailableAfterPubGet => _t('recordingUnavailableAfterPubGet');
  String get deleteVoiceBioTitle => _t('deleteVoiceBioTitle');
  String get deleteVoiceBioBody => _t('deleteVoiceBioBody');
  String get cancel => _t('cancel');
  String get language => _t('language');
  String get english => _t('english');
  String get italian => _t('italian');
  String get maltese => _t('maltese');
  String get yes => _t('yes');
  String get no => _t('no');

  static const Map<String, Map<String, String>> _localizedValues = {
    'en': {
      'appTitle': 'LiamApp',
      'sessionExpiredSignIn': 'Session expired. Please sign in again.',
      'myProfile': 'My Profile',
      'notifications': 'Notifications',
      'settings': 'Settings',
      'edit': 'Edit',
      'aboutMe': 'About Me',
      'voiceBio': 'Voice Bio',
      'stats': 'Stats',
      'profileCompleteness': 'Profile completeness',
      'interestsCount': 'Interests: {count}',
      'voiceBioStatus': 'Voice bio: {value}',
      'account': 'Account',
      'kycVerification': 'KYC Verification',
      'calls': 'Calls',
      'logout': 'Logout',
      'loggedOut': 'Logged out',
      'failedToLoadProfile': 'Failed to load profile',
      'retry': 'Retry',
      'createYourProfile': 'Create your profile',
      'completeProfileHint': 'Complete your profile to unlock discovery and community features.',
      'createProfile': 'Create profile',
      'voiceBioSaved': 'Voice bio saved.',
      'failedToPlayVoiceBio': 'Failed to play voice bio',
      'voiceBioDeleted': 'Voice bio deleted.',
      'recording': 'Recording...',
      'stopRecording': 'Stop Recording',
      'yourVoiceBio': 'Your Voice Bio',
      'tapToPlay': 'Tap to play',
      'rerecord': 'Re-record',
      'delete': 'Delete',
      'recordingReady': 'Recording Ready',
      'saveToUpdateVoiceBio': 'Save to update your voice bio',
      'save': 'Save',
      'noVoiceBioYet': 'No Voice Bio Yet',
      'recordVoiceBioHint': 'Record a short audio introduction to help others get to know you better.',
      'startRecording': 'Start Recording',
      'micPermissionRequired': 'Microphone permission is required to record a voice bio.',
      'recordingUnavailable': 'Voice recording is not available on this build.',
      'recordingUnavailableAfterPubGet':
          'Voice recording is not available on this build. Please fully restart the app after flutter pub get.',
      'deleteVoiceBioTitle': 'Delete voice bio?',
      'deleteVoiceBioBody': 'This will remove your voice bio from your profile.',
      'cancel': 'Cancel',
      'language': 'Language',
      'english': 'English',
      'italian': 'Italian',
      'maltese': 'Maltese',
      'yes': 'Yes',
      'no': 'No',
    },
    'it': {
      'appTitle': 'LiamApp',
      'sessionExpiredSignIn': 'Sessione scaduta. Accedi di nuovo.',
      'myProfile': 'Il mio profilo',
      'notifications': 'Notifiche',
      'settings': 'Impostazioni',
      'edit': 'Modifica',
      'aboutMe': 'Su di me',
      'voiceBio': 'Bio vocale',
      'stats': 'Statistiche',
      'profileCompleteness': 'Completezza profilo',
      'interestsCount': 'Interessi: {count}',
      'voiceBioStatus': 'Bio vocale: {value}',
      'account': 'Account',
      'kycVerification': 'Verifica KYC',
      'calls': 'Chiamate',
      'logout': 'Disconnetti',
      'loggedOut': 'Disconnesso',
      'failedToLoadProfile': 'Impossibile caricare il profilo',
      'retry': 'Riprova',
      'createYourProfile': 'Crea il tuo profilo',
      'completeProfileHint': 'Completa il tuo profilo per sbloccare funzioni social e community.',
      'createProfile': 'Crea profilo',
      'voiceBioSaved': 'Bio vocale salvata.',
      'failedToPlayVoiceBio': 'Riproduzione bio vocale non riuscita',
      'voiceBioDeleted': 'Bio vocale eliminata.',
      'recording': 'Registrazione...',
      'stopRecording': 'Ferma registrazione',
      'yourVoiceBio': 'La tua bio vocale',
      'tapToPlay': 'Tocca per riprodurre',
      'rerecord': 'Registra di nuovo',
      'delete': 'Elimina',
      'recordingReady': 'Registrazione pronta',
      'saveToUpdateVoiceBio': 'Salva per aggiornare la tua bio vocale',
      'save': 'Salva',
      'noVoiceBioYet': 'Nessuna bio vocale',
      'recordVoiceBioHint': 'Registra una breve introduzione audio per farti conoscere meglio.',
      'startRecording': 'Inizia registrazione',
      'micPermissionRequired': 'Serve il permesso microfono per registrare una bio vocale.',
      'recordingUnavailable': 'La registrazione vocale non e disponibile in questa build.',
      'recordingUnavailableAfterPubGet':
          'La registrazione vocale non e disponibile in questa build. Riavvia completamente l app dopo flutter pub get.',
      'deleteVoiceBioTitle': 'Eliminare la bio vocale?',
      'deleteVoiceBioBody': 'Questo rimuovera la bio vocale dal tuo profilo.',
      'cancel': 'Annulla',
      'language': 'Lingua',
      'english': 'Inglese',
      'italian': 'Italiano',
      'maltese': 'Maltese',
      'yes': 'Si',
      'no': 'No',
    },
    'mt': {
      'appTitle': 'LiamApp',
      'sessionExpiredSignIn': 'Is-sessjoni skadiet. Jekk joghgbok idhol mill-gdid.',
      'myProfile': 'Il-Profil Tieghi',
      'notifications': 'Notifiki',
      'settings': 'Settings',
      'edit': 'Editja',
      'aboutMe': 'Dwari',
      'voiceBio': 'Voice Bio',
      'stats': 'Statistika',
      'profileCompleteness': 'Kumpletezza tal-profil',
      'interestsCount': 'Interessi: {count}',
      'voiceBioStatus': 'Voice bio: {value}',
      'account': 'Kont',
      'kycVerification': 'Verifika KYC',
      'calls': 'Sejhat',
      'logout': 'Ohrug',
      'loggedOut': 'Hrigt',
      'failedToLoadProfile': 'Ma setax jitghabba l-profil',
      'retry': 'Erga pprova',
      'createYourProfile': 'Oloq il-profil tieghek',
      'completeProfileHint': 'Imla l-profil tieghek biex tiftaq karatteristici tal-komunita.',
      'createProfile': 'Oloq profil',
      'voiceBioSaved': 'Voice bio gie salvat.',
      'failedToPlayVoiceBio': 'Ma setghax jindaqq voice bio',
      'voiceBioDeleted': 'Voice bio tnehha.',
      'recording': 'Qed tirrekordja...',
      'stopRecording': 'Waqaf ir-rekording',
      'yourVoiceBio': 'Il-Voice Bio Tieghi',
      'tapToPlay': 'Miss biex idoqq',
      'rerecord': 'Irrekordja mill-gdid',
      'delete': 'Hassar',
      'recordingReady': 'Ir-rekording lest',
      'saveToUpdateVoiceBio': 'Issejvja biex taggorna l-voice bio tieghek',
      'save': 'Issejvja',
      'noVoiceBioYet': 'Ghad mhemmx Voice Bio',
      'recordVoiceBioHint': 'Irrekordja introduzzjoni qasira bl-awdjo biex in-nies jafu aktar dwarek.',
      'startRecording': 'Ibda Ir-Rekording',
      'micPermissionRequired': 'Htiega permess tal-mikrofonu biex tirrekordja voice bio.',
      'recordingUnavailable': 'Voice recording mhux disponibbli f din il-build.',
      'recordingUnavailableAfterPubGet':
          'Voice recording mhux disponibbli f din il-build. Jekk joghgbok erga ibda l-app wara flutter pub get.',
      'deleteVoiceBioTitle': 'Tnehhi voice bio?',
      'deleteVoiceBioBody': 'Dan se jnehhi l-voice bio mill-profil tieghek.',
      'cancel': 'Ikkanella',
      'language': 'Lingwa',
      'english': 'Ingliz',
      'italian': 'Taljan',
      'maltese': 'Malti',
      'yes': 'Iva',
      'no': 'Le',
    },
  };

  static const Map<String, Map<String, String>> _phraseLocalizedValues = {
    'it': {
      'Login': 'Accesso',
      'Sign up': 'Registrati',
      'Password reset': 'Reimposta password',
      'Back': 'Indietro',
      'Send': 'Invia',
      'Cancel': 'Annulla',
      'Save': 'Salva',
      'Retry': 'Riprova',
      'Create': 'Crea',
      'Create event': 'Crea evento',
      'Create group': 'Crea gruppo',
      'New chat': 'Nuova chat',
      'Chats': 'Chat',
      'Discover': 'Scopri',
      'Matches': 'Match',
      'Likes': 'Mi piace',
      'Profile': 'Profilo',
      'Notifications': 'Notifiche',
      'Settings': 'Impostazioni',
      'Logout': 'Disconnetti',
      'Calls': 'Chiamate',
      'KYC Verification': 'Verifica KYC',
      'Upload document': 'Carica documento',
      'Schedule call': 'Pianifica chiamata',
      'Call history': 'Cronologia chiamate',
      'No results': 'Nessun risultato',
      'Loading...': 'Caricamento...',
      'Required': 'Obbligatorio',
      'Username': 'Nome utente',
      'Phone': 'Telefono',
      'Email': 'Email',
      'Password': 'Password',
      'Confirm password': 'Conferma password',
      'Language': 'Lingua',
      'English': 'Inglese',
      'Italian': 'Italiano',
      'Maltese': 'Maltese',
    },
    'mt': {
      'Login': 'Idhol',
      'Sign up': 'Irregistra',
      'Password reset': 'Irrisettja l-password',
      'Back': 'Lura',
      'Send': 'Ibgat',
      'Cancel': 'Ikkanella',
      'Save': 'Issejvja',
      'Retry': 'Erga pprova',
      'Create': 'Oloq',
      'Create event': 'Oloq event',
      'Create group': 'Oloq grupp',
      'New chat': 'Chat gdida',
      'Chats': 'Chats',
      'Discover': 'Skopri',
      'Matches': 'Matches',
      'Likes': 'Likes',
      'Profile': 'Profil',
      'Notifications': 'Notifiki',
      'Settings': 'Settings',
      'Logout': 'Ohrug',
      'Calls': 'Sejhat',
      'KYC Verification': 'Verifika KYC',
      'Upload document': 'Itella dokument',
      'Schedule call': 'Skeda sejha',
      'Call history': 'Storja tas-sejhat',
      'No results': 'L-ebda rizultat',
      'Loading...': 'Qed jitghabba...',
      'Required': 'Mehtieg',
      'Username': 'Username',
      'Phone': 'Telefon',
      'Email': 'Email',
      'Password': 'Password',
      'Confirm password': 'Ikkonferma l-password',
      'Language': 'Lingwa',
      'English': 'Ingliz',
      'Italian': 'Taljan',
      'Maltese': 'Malti',
    },
  };
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) {
    return AppLocalizations.supportedLocales.any(
      (supported) => supported.languageCode == locale.languageCode,
    );
  }

  @override
  Future<AppLocalizations> load(Locale locale) async {
    return AppLocalizations(locale);
  }

  @override
  bool shouldReload(covariant LocalizationsDelegate<AppLocalizations> old) => false;
}

extension AppLocalizationsContext on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);
}
