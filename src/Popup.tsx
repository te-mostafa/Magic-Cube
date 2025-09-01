import { Modal, Text, Pressable, View, ModalProps} from 'react-native';
import styles from './styles';

type PROPS = ModalProps & {
    isOpen: boolean
    message: string
    //buttons: Button[]
    onClose: Function
}

export default function Popup({isOpen, message, buttons, onClose}: PROPS) {
    return(
    <Modal
        animationType='fade'
        visible={isOpen}
        transparent={true}
        onRequestClose={() => onClose()}
    >
        <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
            <View style={styles.modalView}>
                <Text style={styles.text}>{message}</Text>
                <View style={styles.horizontalContainer}>

                    {buttons.map((btn, index) => (
                        <Pressable
                            key={index}
                            onPress={() => {
                                btn.onPress?.();
                                onClose();
                            }}
                        >
                            <Text style={{fontWeight:'bold', color:'#629af5'}}>{btn.label}</Text>
                        </Pressable>
                    ))}
                    
                </View>
            </View>
        </View>
    </Modal>
    )
}