let model;
let canvas;
let classNames = [];
let coords = [];
let mousePressed = false;
const LINE_THIN = 5;

/*
prepare the drawing canvas 
*/
$(function () {
    canvas = window._canvas = new fabric.Canvas('canvas', {isDrawingMode: true});
    canvas.backgroundColor = '#ffffff';
    canvas.freeDrawingBrush.color = "black";
    canvas.freeDrawingBrush.width = 10;
    canvas.isDrawingMode = 0;
    canvas.freeDrawingCursor = 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAMAAAAolt3jAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAwFBMVEUAAAD///+hoqOorKzj4+Pl5ubk5OTn5+iqq6uurrL////g4ODGx8itrrDu7u60tbZ3enx4eny0trbu7+/z8/Okpaejpaby8vP///+1trfg4OF3enx4e33g4uLFxsjGyMmtr7Ctr7Cur7HHyMnh4eJ4e33g4eG1trikpqekpafz8/Lv7++0trd4en20trfv7/Df4ODGx8jf3+BVWFtLT1FVWVtTVlk6PkE7P0JTV1k8QENLTlFLT1JVWVxTV1oAAABkRxW0AAAAM3RSTlMAAAAAAAAAAAAAEViVuS+r7/CsLi7Kyi4Qq1jw8FiVlbi5uJRY71eqyskuLqvvqi1XlFfwBlS2AAAAAWJLR0QAiAUdSAAAAAlwSFlzAAAN1wAADdcBQiibeAAAAAd0SU1FB+MEBAcVE5CiQ1QAAACRSURBVAjXTc5nD4IwFIXhU7dQxIFaFAX3nrS0dfD/f5YNSvB+e5KbnBcAsWzqONS2CAxKLbcdcy463V6ZoOL1EymVklIPhlUwV8tHdjLxGUbjn4yDCaZxQRHCeaqc6hVhxv84BxXF83uBZVBwtQbz03xIbxhq3lZ/M9Ldvg7SOBxPwkQG50szq2ZXGkW3OzP4AEA8H1WamC2AAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDE5LTA0LTA0VDExOjIxOjE5LTA0OjAwHnWHYQAAACV0RVh0ZGF0ZTptb2RpZnkAMjAxOS0wNC0wNFQxMToyMToxOS0wNDowMG8oP90AAAAZdEVYdFNvZnR3YXJlAHd3dy5pbmtzY2FwZS5vcmeb7jwaAAAAAElFTkSuQmCC) 7 7, crosshair';
    canvas.renderAll();
    //setup listeners 
    canvas.on('mouse:up', function (e) {
        getFrame();
        mousePressed = false
    });
    canvas.on('mouse:down', function (e) {
        $('#eraserButton').removeClass('goog-toolbar-button-selected');
        console.log("sdf", $('#laserButton').hasClass("goog-toolbar-button-selected"))
        if ($('#laserButton').hasClass("goog-toolbar-button-selected")) {
            $('#drawingButton').removeClass('jam-action-toolbar-menu-button-selected');
        } else {
            $('#drawingButton').addClass('jam-action-toolbar-menu-button-selected');
            $('#laserButton').removeClass('goog-toolbar-button-selected');
        }

        mousePressed = true
    });
    canvas.on('mouse:move', function (e) {
        recordCoor(e)
    });
})

/*
set the table of the predictions 
*/
function setTable(top5, probs) {
    //loop over the predictions 
    for (let i = 0; i < top5.length; i++) {
        let sym = document.getElementById('sym' + (i + 1))
        let prob = document.getElementById('prob' + (i + 1))
        sym.innerHTML = top5[i]
        prob.innerHTML = Math.round(probs[i] * 100)
    }
    //create the pie 
    createPie(".pieID.legend", ".pieID.pie");
}

/*
record the current drawing coordinates
*/
function recordCoor(event) {
    let pointer = canvas.getPointer(event.e);
    let posX = pointer.x;
    let posY = pointer.y;

    if (posX >= 0 && posY >= 0 && mousePressed) {
        coords.push(pointer)
    }
}

/*
get the best bounding box by trimming around the drawing
*/
function getMinBox() {
    //get coordinates 
    let coorX = coords.map(function (p) {
        return p.x
    });
    let coorY = coords.map(function (p) {
        return p.y
    });

    //find top left and bottom right corners 
    let min_coords = {
        x: Math.min.apply(null, coorX),
        y: Math.min.apply(null, coorY)
    }
    let max_coords = {
        x: Math.max.apply(null, coorX),
        y: Math.max.apply(null, coorY)
    }

    //return as strucut 
    return {
        min: min_coords,
        max: max_coords
    }
}

/*
get the current image data 
*/
function getImageData() {
    //get the minimum bounding box around the drawing 
    const mbb = getMinBox()
    console.log(mbb);

    //get image data according to dpi
    const dpi = window.devicePixelRatio
    console.log("mbb", mbb, "dpi", dpi);
    const imgData = canvas.contextContainer.getImageData(mbb.min.x * dpi, mbb.min.y * dpi,
        (mbb.max.x - mbb.min.x) * dpi, (mbb.max.y - mbb.min.y) * dpi);
    return imgData
}

/*
get the prediction 
*/
function getFrame() {
    //make sure we have at least two recorded coordinates 
    if (coords.length >= 2) {

        //get the image data from the canvas 
        const imgData = getImageData()
        console.log("imgData", imgData);

        //get the prediction 
        const pred = model.predict(preprocess(imgData)).dataSync()

        //find the top 5 predictions 
        const indices = findIndicesOfMax(pred, 5)
        const probs = findTopValues(pred, 5)
        const names = getClassNames(indices)

        //set the table 
        setTable(names, probs)
    }

}

/*
get the the class names 
*/
function getClassNames(indices) {
    let outp = []
    for (let i = 0; i < indices.length; i++)
        outp[i] = classNames[indices[i]]
    return outp
}

/*
load the class names 
*/
async function loadDict() {
    await $.ajax({
        url: 'model2/class_names_vn.txt',
        dataType: 'text',
    }).done(success);
}

/*
load the class names
*/
function success(data) {
    const lst = data.split(/\n/)
    for (let i = 0; i < lst.length - 1; i++) {
        let symbol = lst[i]
        classNames[i] = symbol
    }
}

/*
get indices of the top probs
*/
function findIndicesOfMax(inp, count) {
    let outp = [];
    for (let i = 0; i < inp.length; i++) {
        outp.push(i); // add index to output array
        if (outp.length > count) {
            outp.sort(function (a, b) {
                return inp[b] - inp[a];
            }); // descending sort the output array
            outp.pop(); // remove the last index (index of smallest element in output array)
        }
    }
    return outp;
}

/*
find the top 5 predictions
*/
function findTopValues(inp, count) {
    let outp = [];
    let indices = findIndicesOfMax(inp, count)
    // show 5 greatest scores
    for (let i = 0; i < indices.length; i++)
        outp[i] = inp[indices[i]]
    return outp
}

/*
preprocess the data
*/
function preprocess(imgData) {
    return tf.tidy(() => {
        // convert to a tensor 
        let tensor = tf.browser.fromPixels(imgData, numChannels = 1)

        // resize 
        const resized = tf.image.resizeBilinear(tensor, [28, 28]).toFloat()

        // normalize 
        const offset = tf.scalar(255.0);
        const normalized = tf.scalar(1.0).sub(resized.div(offset));

        // We a                dd a dimension to get a batch shape
        const batched = normalized.expandDims(0)
        return batched
    })
}

/*
load the model
*/
async function start() {
    //load the model 
    model = await tf.loadLayersModel('model2/model.json')

    //warm up 
    model.predict(tf.zeros([1, 28, 28, 1]))

    //allow drawing on the canvas 
    allowDrawing()

    //load the class names
    await loadDict()
}

function allowDrawing() {
    // console.log("canvas.isDrawingMode", canvas.isDrawingMode);
    // console.log("1", canvas.isDrawingMode === null, "2", canvas.isDrawingMode === undefined, "3", canvas.isDrawingMode === 0)
    if (canvas.isDrawingMode === 0) {
        canvas.isDrawingMode = 1;
    }else if (canvas.isDrawingMode === null || canvas.isDrawingMode === undefined){

    }
    canvas.freeDrawingBrush.width = LINE_THIN;
}

function disallowDrawing() {
    canvas.isDrawingMode = 0;
}

function erase() {
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    coords = [];
}