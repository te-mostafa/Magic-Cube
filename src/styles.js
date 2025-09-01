
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    title: {
        margin: 20,
        textAlign:'center',
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
    },
    circleButton: {
        borderRadius: 50,
        position: 'absolute',
        bottom: 50,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center'
    },
    text: {
        textAlign: 'center',
        paddingBottom: 10,
    },
    overlay: {
        position: "absolute",
        top: 50,
        left: 0,
        right: 0,
        alignItems: "center",
    },
    overlayText: {
        color: "white",
        fontSize: 22,
        fontWeight: "bold",
        backgroundColor: "rgba(0,0,0,0.6)",
        padding: 10,
        borderRadius: 10,
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    horizontalContainer: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 50,
        padding: 10,
    }
});

export default styles;