import { View, Text, Button } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import styles from './styles';

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    return (
        <View
          style={[
            styles.container,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          <Text style={styles.title}>Welcome to Magic Cube!</Text>
          <Button title="Start Scan" onPress={() => navigation.navigate('Scan')}/>
        </View>

    );
}
