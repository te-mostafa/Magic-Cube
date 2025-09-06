import { ContourApproximationModes, DataTypes, Mat, ObjectType, OpenCV, RetrievalModes } from "react-native-fast-opencv";
import { SharedValue } from "react-native-reanimated";

export function getMeanLAB( lab: Mat, rect: any) {
    'worklet';

    const roi = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8U);
    OpenCV.invoke('crop', lab, roi, OpenCV.createObject(ObjectType.Rect, rect.x, rect.y, rect.width, rect.height));
    const mean = OpenCV.invoke('mean', roi);
    const meanJS = OpenCV.toJSValue(mean);
    const {a, b, c} = meanJS

    return ({a, b, c});
}

function deltaE76(p, q, wL=1.0) {
    'worklet';

    const dL = wL*(p.a - q.a);
    const da = p.b - q.b;
    const db = p.c - q.c;
    return Math.sqrt(dL*dL + da*da + db*db);
}

export function filterContour( frame : Mat ) {
    'worklet';

    const contours = OpenCV.createObject(ObjectType.MatVector);
    OpenCV.invoke('findContours', 
                    frame, 
                    contours, 
                    RetrievalModes.RETR_TREE, 
                    ContourApproximationModes.CHAIN_APPROX_SIMPLE);
    const contoursJS = OpenCV.toJSValue(contours);

    let finalCont: Array<{ x: number, y: number, width: number, height: number }> = [];

    // Find all contours of squarish shape
    for (let i = 0; i < contoursJS.array.length; i++) {
        const cont = OpenCV.copyObjectFromVector(contours, i);

        const { value: perimeter } = OpenCV.invoke('arcLength', cont, true);
        const approx = OpenCV.createObject(ObjectType.PointVector);
        OpenCV.invoke('approxPolyDP', cont, approx, 0.1 * perimeter, true);
        const approxJS = OpenCV.toJSValue(approx);
    
        if (approxJS.array.length === 4) {
          const { value: area } = OpenCV.invoke('contourArea', cont, false);
    
          const rect = OpenCV.invoke('boundingRect', approx);
          const { x, y, width: w, height: h } = OpenCV.toJSValue(rect);
    
          const ratio = w / (h === 0 ? 1 : h);
    
          if (ratio >= 0.8 && ratio <= 1.2 && w <= 60 && area / (w * h) > 0.4) {
            finalCont.push({ x, y, width: w, height: h });
          }
        }
    }

    if (finalCont.length < 9) return [];

    let found = false
    const contourNeighbors: Record<number, Array<{ x:number, y:number, width:number, height:number }>> = {};

    // Find contour with nine neighbours
    for (let i = 0; i < finalCont.length; i++) {
        const { x, y, width: w, height: h } = finalCont[i];
        contourNeighbors[i] = [];

        const centerX = x + w / 2;
        const centerY = y + h / 2;
        const radius = 1.5;

        const neighborPos = [
        [centerX - w * radius, centerY - h * radius], // top left
        [centerX, centerY - h * radius],              // top middle
        [centerX + w * radius, centerY - h * radius], // top right
        [centerX - w * radius, centerY],              // center left
        [centerX, centerY],                           // center
        [centerX + w * radius, centerY],              // center right
        [centerX - w * radius, centerY + h * radius], // bottom left
        [centerX, centerY + h * radius],              // bottom middle
        [centerX + w * radius, centerY + h * radius], // bottom right
        ];

        for (const neighbor of finalCont) {
            const  { x: x2, y: y2, width: w2, height: h2 } = neighbor;

            for (const [x3, y3] of neighborPos) {
                if (x2 < x3 && y2 < y3 && (x2 + w2) > x3 && (y2 + h2) > y3) {
                    contourNeighbors[i].push(neighbor);
                }
            }
        }
    }

    // Find center facelet
    for (const [i, neighbors] of Object.entries(contourNeighbors)) {
        if (neighbors.length === 9) {
            found = true;
            finalCont = neighbors;
            break;
        }
    }

    if (!found) return [];

    // Sort top-left to bottom-right
    const ySorted = [...finalCont].sort((a, b) => b.y - a.y);

    const topRow = ySorted.slice(0, 3).sort((a, b) => a.x - b.x);
    const middleRow = ySorted.slice(3, 6).sort((a, b) => a.x - b.x);
    const bottomRow = ySorted.slice(6, 9).sort((a, b) => a.x - b.x);

    const sortedCont = [...topRow, ...middleRow, ...bottomRow];

    return sortedCont;
}

export function detectColors(lab : Mat, rects : any[], calibrationShared: SharedValue<any> ) : string[] {
    'worklet';

    const colors = [];
    const calib = JSON.parse(JSON.stringify(calibrationShared));
    let roi = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8U);
    
    for (const rect of rects) {
        OpenCV.invoke('crop', lab, roi, OpenCV.createObject(ObjectType.Rect, rect.x, rect.y, rect.width, rect.height));
        const mean = OpenCV.invoke('mean', roi);
        const meanJS = OpenCV.toJSValue(mean)
        let bestColor = null, bestD = Infinity;

        for (const [color, labMean] of Object.entries(calib)) {
            if (labMean == null) continue;

            const d = deltaE76(meanJS, labMean, 0.6);
            if (d < bestD) {
                bestD = d;
                bestColor = color;
            }
        }

        if (bestColor == null) bestColor = 'white';

        colors.push(bestColor);
    }

    return colors;
}
