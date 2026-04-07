
import { Canvas, PaintStyle, Rect, Skia } from '@shopify/react-native-skia';
import { Camera, useCameraDevice, useCameraPermission, useSkiaFrameProcessor } from 'react-native-vision-camera';
import { View, Text, StyleSheet, Animated, Pressable, Image } from 'react-native';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useEffect, useRef, useState } from 'react';
import { BorderTypes, ColorConversionCodes, DataTypes, MorphShapes, ObjectType, OpenCV } from 'react-native-fast-opencv';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSharedValue } from 'react-native-worklets-core';
import { useIsFocused, useNavigation } from '@react-navigation/native';

import { filterContour, detectColors, getMeanLAB } from './CV';
import Popup from './Popup';
import styles from './styles';

const paint = Skia.Paint();
paint.setStrokeWidth(5);

// Consts for drawing grid
const RECT_SIZE = 25;
const GRID_GAP = 3;

const gridPositions = [
    [3, 87],
    [87, 87],
    [171, 87],
    [255, 87],
    [255, 3],
    [255, 171],
];

const colorList = {
    'red': '#FA4339',
    'orange': '#FF963B',
    'yellow': '#FAF043',
    'green': '#48E076',
    'blue': '#39A5FA',
    'white': '#FFFFFF',
};

const defaultCalibration = {
    red: null,
    orange: null,
    yellow: null,
    green: null,
    blue: null,
    white: null,
};

export default function ScanScreen() {
    const navigation = useNavigation();

    const { hasPermission, requestPermission } = useCameraPermission();
    const device = useCameraDevice('back');
    const isFocused = useIsFocused();

    const calibList = useRef<any>({...defaultCalibration});
    const calibrationShared = useSharedValue(calibList.current);
    const [calibrate, setCalibrate] = useState<boolean>(true);
    const [currentColor, setCurrentColor] = useState<string>(Object.keys(colorList)[0]);

    const [scanText, setScanText] = useState<string>('Scan any face to being. Press button to confirm');

    const [firstModal, setFirstModal] = useState<boolean>(calibrate);
    const [recalModal, setRecalModal] = useState<boolean>(false);

    const opacity = useRef(new Animated.Value(1)).current;

    let centreFace = useSharedValue<object | undefined>({});
    let activeFace = useSharedValue<string[]>([]);
    const [scannedFaces, setScannedFaces] = useState<string[][]>([]);

    const { resize } = useResizePlugin();

    useEffect(() => {
        if (calibrate) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(opacity, { toValue: 0, duration: 750, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
                ])
            ).start();
        }
    }, [calibrate, currentColor]);

    // Load calibration file
    useEffect(() => {
        (async () => {
          const loaded = await loadCalibration();
          calibList.current = loaded;
          calibrationShared.value = calibList.current;
        })();
    }, []);

    useEffect(() => {
        requestPermission();
    }, [requestPermission]);

    async function saveCalibration(data: any) {
        try {
          const merged = { ...defaultCalibration, ...data };
          await AsyncStorage.setItem('calibration', JSON.stringify(merged));
        } catch (err) {
          console.error('Failed to save calibration:', err);
        }
    }

    async function loadCalibration() {
        try {
          const saved = await AsyncStorage.getItem('calibration');
          if (saved) {
            setCalibrate(false);
            setFirstModal(false);
            return { ...defaultCalibration, ...JSON.parse(saved) };
          }
        } catch (err) {
          console.error('Failed to load calibration:', err);
        }
        // Fallback if nothing saved
        return { ...defaultCalibration };
    }

    const frameProcessor = useSkiaFrameProcessor((frame) => {
        'worklet';

        const height = frame.height / 2;
        const width = frame.width / 2;

        const resized = resize(frame, {
          scale: {
            width: width,
            height: height,
          },
          pixelFormat: 'bgr',
          dataType: 'uint8',
        });

        const src = OpenCV.bufferToMat('uint8', height, width, 3, resized);

        const lab = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8U);
        const gray = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8U);

        const kernel3 = OpenCV.createObject(ObjectType.Size, 3, 3);
        const kernel9 = OpenCV.invoke( 'getStructuringElement',
                                        MorphShapes.MORPH_RECT,
                                        OpenCV.createObject(ObjectType.Size, 9, 9));
        const point = OpenCV.createObject(ObjectType.Point, -1, -1);

        OpenCV.invoke('cvtColor', src, lab, ColorConversionCodes.COLOR_BGR2Lab);

        // Process gray frame for contour detection
        OpenCV.invoke('cvtColor', src, gray, ColorConversionCodes.COLOR_BGR2GRAY);
        OpenCV.invoke('blur', gray, gray, kernel3, point, BorderTypes.BORDER_DEFAULT);
        OpenCV.invoke('Canny', gray, gray, 30, 60);
        OpenCV.invoke('dilate', gray, gray, kernel9,
                    OpenCV.createObject(ObjectType.Point, -1, -1),
                    1,
                    BorderTypes.BORDER_DEFAULT,
                    OpenCV.createObject(ObjectType.Scalar, 0, 0, 0, 0)
        );

        const contours = filterContour(gray);

        frame.render();

        if (contours.length === 9) {
            const colors = detectColors(lab, contours, calibrationShared.value);
            activeFace.value = [...colors];
            centreFace.value = getMeanLAB(lab, contours[4]);
            for (const [i, rect] of contours.entries()) {
                paint.setColor(Skia.Color(colorList[colors[i]]));

                // Draw outline
                paint.setAlphaf(1);
                paint.setStyle(PaintStyle.Stroke);
                frame.drawRect(
                    {
                        height: rect.height * 2,
                        width: rect.width * 2,
                        x: rect.x * 2,
                        y: rect.y * 2,
                    },
                    paint
                );

                if (calibrate) { continue; }

                // Draw filled square
                paint.setStyle(PaintStyle.Fill);
                paint.setAlphaf(0.5);
                frame.drawRect(
                    {
                        height: rect.height * 2,
                        width: rect.width * 2,
                        x: rect.x * 2,
                        y: rect.y * 2,
                    },
                    paint
                );
            }
        } else {
            centreFace.value = undefined;
        }

        OpenCV.clearBuffers();

    }, []);

    async function handleCalibrationPress() {
        const updated = {...calibList.current, [currentColor]: centreFace.value};
        calibList.current = updated;

        const idx = Object.keys(colorList).indexOf(currentColor);
        setCurrentColor(Object.keys(colorList)[idx + 1]);

        if (idx == Object.keys(colorList).length - 1) {
            const finalCalib = { ...updated };
            calibList.current = finalCalib;
            calibrationShared.value = finalCalib;
            setCalibrate(false);
            setFirstModal(false);
            await saveCalibration(finalCalib);
        }
    }

    function handleRecalibrationRequest() {
        if (calibrate) { return; }

        setRecalModal(true);
    }

    useEffect(() => {
        if (scannedFaces.length === 6) {
            navigation.navigate('Cube', { faces: scannedFaces });
        }
    }, [scannedFaces, navigation]);

    function handleScannedFacePress() {
        setScannedFaces(prevFaces => {
            const newFaces = [...prevFaces, Object.values(activeFace.value)];
            if (newFaces.length <= 3) {
                setScanText('Turn right');
            } else if (newFaces.length === 4) {
                setScanText('Turn up');
            } else {
                setScanText('Turn down');
            }

            return newFaces;
        });
    }

    if (!hasPermission) {
        return <Text style={styles.text}>Magic Cube needs permissions to access your camera</Text>;
    }

    if (device == null) {
        return <View />;
    }

    return (
        <View style={styles.container}>

            <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isFocused}
                frameProcessor={frameProcessor}
            />

            <Canvas style={{ width: 1000, height: 1000 }}>
                {scannedFaces.map((face, faceIndex) => (
                face.map((color, j) => {
                    const [baseX, baseY] = gridPositions[faceIndex];
                    const x = baseX + (RECT_SIZE + GRID_GAP) * Math.floor(j / 3);
                    const y = baseY + (RECT_SIZE + GRID_GAP) * (j % 3);

                    return (
                    <Rect
                        key={`${faceIndex}-${j}`}
                        x={x}
                        y={y}
                        width={RECT_SIZE}
                        height={RECT_SIZE}
                        color={colorList[color]}
                    />
                    );
                })
                ))}
            </Canvas>

            {calibrate && (
                <Animated.View style={[styles.overlay, {opacity}]}>
                    <Text style={styles.overlayText}>
                        Scan the face with {currentColor} centre
                    </Text>
                </Animated.View>
            )}

            {!calibrate && (
                <Animated.View style={[styles.overlay, {opacity}]}>
                    <Text style={styles.overlayText}>
                        {scanText}
                    </Text>
                </Animated.View>
            )}

            {firstModal && <Popup
                isOpen={firstModal}
                onClose={() => setFirstModal(false)}
                message={'Color calibration has not been set. Would you like to calibrate your cube?'}
                buttons = {[
                    {label: 'OK'},
                ]}
             />}

            {recalModal && <Popup
                isOpen={recalModal}
                onClose={() => setRecalModal(false)}
                message={'Do you want to recalibrate your cube?'}
                buttons = {[
                    {label: 'YES', onPress: () => {
                        setCalibrate(true);
                        setCurrentColor('red');
                        setScannedFaces([]);
                    }},
                    {label: 'NO'},
                ]}
                 />}

            <Pressable
                style={({pressed}) => [ styles.circleButton,
                                        {backgroundColor: pressed ? '#b32b22' : '#eb3b2f'},
                                        { width:100, height: 100 }]}
                onPress={ () => {
                    if (centreFace.value == undefined) {return;}

                    if (calibrate) {
                        handleCalibrationPress();
                    } else {
                        handleScannedFacePress();
                    }
                }}
                >
                <Image
                    source={require('../res/capture-512.png')}
                    style={{ width:80, height:80, tintColor:'#ffffff'}}
                />
            </Pressable>

            {!calibrate && <Pressable
                style={({pressed}) => [ styles.circleButton,
                                        {right:20, bottom: 0, top: 50},
                                        {backgroundColor: pressed ? '#b32b22' : '#eb3b2f'},
                                        { width: 50, height: 50}]}
                onPress={ handleRecalibrationRequest }
            >
                <Image
                    source={require('../res/refreshing-svgrepo-com.png')}
                    style={{ width:30, height:30, tintColor:'#ffffff'}}
                />
            </Pressable>}

        </View>
    );
}
