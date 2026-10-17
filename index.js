// Background notification buttons must be registered before the app loads.
import './src/notifications/background';
import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widgets/handler';
import { installWidgetUpdates } from './src/widgets/updates';
import 'expo-router/entry';

// Home-screen widgets (VWidgets): taps and updates run here, even with the app closed.
if (Platform.OS === 'android') {
  registerWidgetTaskHandler(widgetTaskHandler);
  installWidgetUpdates();
}
