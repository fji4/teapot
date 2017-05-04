
var gl;
var canvas;

var shaderProgram;

// Create a place to store the texture coords for the mesh
var cubeTCoordBuffer;

// Create a place to store terrain geometry
var cubeVertexBuffer;

// Create a place to store the triangles
var cubeTriIndexBuffer;

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];

// View parameters
var eyePt = vec3.fromValues(0.0,0.0,10.0);
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);

// Create the normal
var nMatrix = mat3.create();

// Create a place to store the texture

var cubeImage;
var cubeTexture;

// For animation
var then =0;
var modelXRotationRadians = degToRad(0);
var modelYRotationRadians = degToRad(0);

// Check whether the rendering is finished.
ready = false;
cubemap_ready = false;
skybox_ready = false;
shader_switch = false;

/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform,
        false, pMatrix);
}

/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
    mat3.fromMat4(nMatrix,mvMatrix);
    mat4.transpose(nMatrix,nMatrix);
    mat4.invert(nMatrix,nMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}


/**
 * Pass the view direction vector to the shader
 */
function uploadViewDirToShader(){
    gl.uniform3fv(gl.getUniformLocation(shaderProgram, "viewDir"), viewDir);
}

/**
 * pass the rotation matrix to the shader so that the teapot will reflect as it rotating
 * @param rotate
 */
function uploadRotationToShader(rotate){
    gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram,"uRotate"), false, rotate);
}



/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
    var names = ["webgl", "experimental-webgl"];
    var context = null;
    for (var i=0; i < names.length; i++) {
        try {
            context = canvas.getContext(names[i]);
        } catch(e) {}
        if (context) {
            break;
        }
    }
    if (context) {
        context.viewportWidth = canvas.width;
        context.viewportHeight = canvas.height;
    } else {
        alert("Failed to create WebGL context!");
    }
    return context;
}

/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
    var shaderScript = document.getElementById(id);

    // If we don't find an element with the specified id
    // we do an early exit
    if (!shaderScript) {
        return null;
    }

    // Loop through the children for the found DOM element and
    // build up the shader source code as a string
    var shaderSource = "";
    var currentChild = shaderScript.firstChild;
    while (currentChild) {
        if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
            shaderSource += currentChild.textContent;
        }
        currentChild = currentChild.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
    vertexShader = loadShaderFromDOM("shader-vs");
    fragmentShader = loadShaderFromDOM("shader-fs");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Failed to setup shaders");
    }

    gl.useProgram(shaderProgram);


    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);


    //shaderProgram.ucontrol = gl.getUniformLocation(shaderProgram, "control");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");
    shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");
    shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
    shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
}

function uploadLightsToShader(loc,a,d,s) {
    gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
    gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
    gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
    gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

/**
 * Draw a skybox based on buffers.
 */
function drawSkybox(){
    isSkybox(1.0);
    // Draw the cube by binding the array buffer to the cube's vertices
    // array, setting attributes, and pushing it to GL.

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

    // Set the texture coordinates attribute for the vertices.

    // gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer);
    // gl.vertexAttribPointer(shaderProgram.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);

    // Specify the texture to map onto the faces.

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);

    // Draw the cube.

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}

/**
 * Draw call that applies matrix transformations to cube
 */
function draw() {
    var transformVec = vec3.create();

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if(document.getElementById("reflect").checked){
        switchShader(1.0);
    }
    else{
        switchShader(0.0);
    }


    // We'll use perspective
    mat4.perspective(pMatrix,degToRad(90), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);



    // gl.activeTexture(gl.TEXTURE1);
    // gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
    // gl.uniform1i(shaderProgram.uCubeSampler, 1);

    //move to Earth position
    // mvPushMatrix();
     //gl.enableVertexAttribArray(shaderProgram.aVertexTextureCoords);
    // //Draw Earth
    mvPushMatrix();

    var rotate = mat4.create();
    mat4.rotateY(rotate,rotate,modelYRotationRadians);
    uploadRotationToShader(rotate);


    vec3.set(transformVec,0.0,0.0,-10.0);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    setMatrixUniforms();

    // We want to look down -z, so create a lookat point in that direction
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);

    uploadLightsToShader([0,20,0],[1.0,0.5,0.5],[1.0,0.5,0.5],[1.0,0.5,0.5]);
    //drawSkybox();
    drawSkybox();
    if(ready){
        mat4.rotateY(mvMatrix,mvMatrix, modelYRotationRadians);
        drawTeapot();

    }

    mvPopMatrix();
}

/**
 * Animation to be called from tick. Updates global rotation values.
 */
function animate() {
    if (then==0)
    {
        then = Date.now();
    }
    else
    {
        now=Date.now();
        // Convert to seconds
        now *= 0.001;
        // Subtract the previous time from the current time
        var deltaTime = now - then;
        // Remember the current time for the next frame.
        then = now;

        //Animate the rotation
        // modelXRotationRadians += 1.2 * deltaTime;
        // modelYRotationRadians += 0.7 * deltaTime;
    }
}

/**
 * Creates texture for application to skybox.
 */
function setupCubeMap() {
    cubeTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
    //gl.texImage2D(gl.TEXTURE_CUBE_MAP, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_X, cubeTexture, "pos-x.png");
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, cubeTexture, "neg-x.png");
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, cubeTexture, "pos-y.png");
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, cubeTexture, "neg-y.png");
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Z, cubeTexture, "pos-z.png");
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, cubeTexture, "neg-z.png");
    cubemap_ready = true;

}

function loadCubeMapFace(gl, target, texture, url){
    var image = new Image();
    image.onload = function()
    {
        //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
        gl.texImage2D(target,0,gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    }
    image.src = url;

}
/**
 * @param {number} value Value to determine whether it is a power of 2
 * @return {boolean} Boolean of whether value is a power of 2
 */
function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}

/**
 * Texture handling. Generates mipmap and sets texture parameters.
 * @param {Object} image Image for cube application
 * @param {Object} texture Texture for cube application
 */
function handleTextureLoaded(image, texture) {
    console.log("handleTextureLoaded, image = " + image);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
    // Check if the image is a power of 2 in both dimensions.
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
        // Yes, it's a power of 2. Generate mips.
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        console.log("Loaded power of 2 texture");
    } else {
        // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
        gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        console.log("Loaded non-power of 2 texture");
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

/**
 * Sets up buffers for skybox.
 */
function setupSkybox() {


    // Create a buffer for the cube's vertices.

    cubeVertexBuffer = gl.createBuffer();

    // Select the cubeVerticesBuffer as the one to apply vertex
    // operations to from here out.

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);

    // Now create an array of vertices for the cube.

    var vertices = [
        // Front face
        -100.0, -100.0,  100.0,
        100.0, -100.0,  100.0,
        100.0,  100.0,  100.0,
        -100.0,  100.0,  100.0,

        // Back face
        -100.0, -100.0, -100.0,
        -100.0,  100.0, -100.0,
        100.0,  100.0, -100.0,
        100.0, -100.0, -100.0,

        // Top face
        -100.0,  100.0, -100.0,
        -100.0,  100.0,  100.0,
        100.0,  100.0,  100.0,
        100.0,  100.0, -100.0,

        // Bottom face
        -100.0, -100.0, -100.0,
        100.0, -100.0, -100.0,
        100.0, -100.0,  100.0,
        -100.0, -100.0,  100.0,

        // Right face
        100.0, -100.0, -100.0,
        100.0,  100.0, -100.0,
        100.0,  100.0,  100.0,
        100.0, -100.0,  100.0,

        // Left face
        -100.0, -100.0, -100.0,
        -100.0, -100.0,  100.0,
        -100.0,  100.0,  100.0,
        -100.0,  100.0, -100.0
    ];

    // Now pass the list of vertices into WebGL to build the shape. We
    // do this by creating a Float32Array from the JavaScript array,
    // then use it to fill the current vertex buffer.

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);


    cubeTriIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);

    // This array defines each face as two triangles, using the
    // indices into the vertex array to specify each triangle's
    // position.

    var cubeVertexIndices = [
        0,  1,  2,      0,  2,  3,    // front
        4,  5,  6,      4,  6,  7,    // back
        8,  9,  10,     8,  10, 11,   // top
        12, 13, 14,     12, 14, 15,   // bottom
        16, 17, 18,     16, 18, 19,   // right
        20, 21, 22,     20, 22, 23    // left
    ]

    // Now send the element array to GL

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
    skybox_ready = true;
}


/**
 * Startup function called from html code to start program.
 */
function startup() {
    canvas = document.getElementById("myGLCanvas");
    gl = createGLContext(canvas);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
// Event listener
    window.addEventListener('keydown', rotateTeapot, true);
    window.addEventListener('keyup', rotateTeapot, false);
    window.addEventListener('keydown', rotateView, true);
    window.addEventListener('keyup', rotateView, false);
    //window.addEventListener('keydown', toggleShader, true);
    //window.addEventListener('keyup', toggleShader, false);

    setupShaders();
    setupSkybox();
    readTextFile("teapot_0.obj", setupTeapotBuffer);
    setupCubeMap();



    tick();
}

/**
 * Tick called for every animation frame.
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}

/**
 * Gets a file from the server for processing on the client side.
 *
 * @param  file A string that is the name of the file to get
 * @param  callbackFunction The name of function (NOT a string) that will receive a string holding the file
 *         contents.
 *
 */


function readTextFile(file, callbackFunction)
{
    console.log("reading "+ file);
    var rawFile = new XMLHttpRequest();
    var allText = [];
    rawFile.open("GET", file, true);

    rawFile.onreadystatechange = function ()
    {
        if(rawFile.readyState === 4)
        {
            if(rawFile.status === 200 || rawFile.status == 0)
            {
                callbackFunction(rawFile.responseText);
                console.log("Got text file!");

            }
        }
    }
    rawFile.send(null);
}
/**
 *  if true, draw skybox.
 *  if false, draw teapot.
 * @param isCube type -- bool
 * @author Fanyin Ji
 */
function isSkybox(isCube){
    gl.uniform1f(gl.getUniformLocation(shaderProgram, "Skybox"), isCube);
}

/**
 * switch the shader between reflective or not
 * @author Fanyin Ji
 * @param s
 */

function switchShader(s) {
    gl.uniform1f(gl.getUniformLocation(shaderProgram, "shaderSwitch"),s);
}




var globalQuat = quat.create();

/**
 * Rotate the teapot clockwise using "A" key and rotate counterclockwise using "D" key.
 * @param event
 * @author Fanyin Ji
 */
function rotateTeapot(event){
    //D
    if (event.keyCode == 68){
        modelYRotationRadians += 0.05;
    }
    // A
    else if (event.keyCode == 65){
        modelYRotationRadians -= 0.05;
    }
}



/**
 * left key to change the view of teapot around y axis (orbit to left)
 * right key to change the view of teapot around y axis (orbit to right)
 *
 * @param event
 * @author Fanyin Ji
 */
function rotateView(event){
    var origUp = vec3.fromValues(0.0, 1.0, 0.0);
    var origEyePt = vec3.fromValues(0.0,0.0,10.0);

    // left
    if (event.keyCode == 37){


        var tempQuat = quat.create();
        quat.setAxisAngle(tempQuat, origUp, -0.05);
        quat.normalize(tempQuat, tempQuat);

        // apply new rotation to global quaternion
        quat.multiply(globalQuat, tempQuat, globalQuat);
        quat.normalize(globalQuat, globalQuat);


        vec3.transformQuat(eyePt, origEyePt, globalQuat);
        vec3.normalize(viewDir, eyePt);
        vec3.scale(viewDir, viewDir, -1);
    }
    // right
    else if (event.keyCode == 39){

        var tempQuat = quat.create();
        quat.setAxisAngle(tempQuat, origUp, 0.05);
        quat.normalize(tempQuat, tempQuat);


        quat.multiply(globalQuat, tempQuat, globalQuat);
        quat.normalize(globalQuat, globalQuat);

        vec3.transformQuat(eyePt, origEyePt, globalQuat);
        vec3.normalize(viewDir, eyePt);
        vec3.scale(viewDir, viewDir, -1);
    }

}