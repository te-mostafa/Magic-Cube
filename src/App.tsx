
import { StatusBar, useColorScheme } from 'react-native';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import {createStaticNavigation} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import HomeScreen from './Home';
import ScanScreen from './Scan';
import CubeScreen from './Cube';

const RootStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: HomeScreen
    },
    Scan: {
      screen: ScanScreen
    },
    Cube: {
      screen: CubeScreen
    }
  }
})

const Navigation = createStaticNavigation(RootStack)

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <Navigation/>
    </SafeAreaProvider>
  );
}

export default App;
