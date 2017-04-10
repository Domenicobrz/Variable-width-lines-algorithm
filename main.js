window.addEventListener('load', pageInit);

var projection = mat4.create();
var model = mat4.create();
var view = mat4.create();
var gl;
var zoom = 45;

function pageInit() {
    "use strict";

    var names = ["webgl", "experimental-webgl"];

    var canvas = document.querySelector('canvas');
    canvas.width = innerWidth;
    canvas.height = innerHeight;

    for (var i in names) {
        try {
            gl = canvas.getContext(names[i], {});

            if (gl && typeof gl.getParameter == "function") {
                // WebGL is enabled 
                break;
            }
        } catch (e) { }
    }

    if (gl === null)
        alert("could not initialize WebGL");



    mat4.perspective(projection, 45, innerWidth / innerHeight, 0.1, 100);
    window.camera = new createCamera();
    camera.pos = [0, 0, 30];
    camera.autoCentered = true;
    camera.radius = 30;

    initGui();
    createMainProgram();
    render(0);
}

function createMainProgram() {
    "use strict";

    var vertex_shader =
        "attribute vec3 aPos;" +
        "attribute vec3 aPrevPos;" +
        "attribute vec3 aNextPos;" +
        "attribute float aId;" +
        "" +
        "uniform mat4 uProjection;" +
        "uniform mat4 uView;" +
        "uniform float uRatio;" +

        "uniform float uTime;" +
        "" +
        "void main() {" +

        "     vec3 T = normalize(normalize(aPos - aPrevPos) + normalize(aNextPos - aPos));" +
        "     vec3 N = vec3(-T.y, T.x, 0.0);" +

        "     vec3 lineNormal = vec3(0.0);" +
        "     vec3 lineVector = vec3(0.0);" +
        "     if(aId == 1.0) {" +
        "         lineVector = normalize(aNextPos - aPos);" +
        "         lineNormal = -vec3(-lineVector.y, lineVector.x, 0.0);" +
        "     }" +
        "     if(aId == 2.0) {" +
        "         lineVector = normalize(aNextPos - aPos);" +
        "         lineNormal = vec3(-lineVector.y, lineVector.x, 0.0);" +
        "     }" +
        "     if(aId == 3.0) {" +
        "         lineVector = normalize(aPos - aPrevPos);" +
        "         lineNormal = -vec3(-lineVector.y, lineVector.x, 0.0);" +
        "     }" +
        "     if(aId > 3.0) {" +
        "         lineVector = normalize(aPos - aPrevPos);" +
        "         lineNormal = vec3(-lineVector.y, lineVector.x, 0.0);" +
        "     }" +


        "     float mult = dot(lineNormal, N);" +
        "     N *= 1.0 / mult;" +


        "     vec4 ndcpos; " +
        "     if(abs(mult) > 0.4) " +
        "          ndcpos = uProjection * uView * vec4(aPos + N * 0.07, 1.0);" +
        "     else if(aId < 5.0) {" +
        "          ndcpos = uProjection * uView * vec4(aPos + lineNormal * 0.07, 1.0);" +
        "     } else {" +
        "          vec3 L = normalize(aPos - aPrevPos);" +
        "          vec3 L2 = normalize(aNextPos - aPos); " +
        "          vec3 LN = vec3(-L.y, L.x, 0.0);" +
        "          float leftorright = dot(LN, L2);" +
        "          if(leftorright < 0.0) {" +
        "               if(aId == 5.0) {" +
        "                    ndcpos = uProjection * uView * vec4(aPos - N * 0.07, 1.0);" +
        "               }" +
        "               if(aId == 6.0) {" +
        "                    ndcpos = uProjection * uView * vec4(aPos + lineNormal * 0.07, 1.0);" +
        "               }" +
        "               if(aId == 7.0) {" +
        //next line normal
        "                    vec3 NLN = normalize(vec3(aNextPos - aPos));" +
        "                    NLN = vec3(-NLN.y, NLN.x, 0.0);" +
        "                    ndcpos = uProjection * uView * vec4(aPos + NLN * 0.07, 1.0);" +
        "               }" +
        "          }" +

        "          if(leftorright >= 0.0) {" +
        "               if(aId == 5.0) {" +
        "                    ndcpos = uProjection * uView * vec4(aPos + N * 0.07, 1.0);" +
        "               }" +
        "               if(aId == 6.0) {" +
        "                    ndcpos = uProjection * uView * vec4(aPos - lineNormal * 0.07, 1.0);" +
        "               }" +
        "               if(aId == 7.0) {" +
        "                    vec3 NLN = normalize(vec3(aNextPos - aPos));" +
        "                    NLN = vec3(-NLN.y, NLN.x, 0.0);" +
        "                    ndcpos = uProjection * uView * vec4(aPos - NLN * 0.07, 1.0);" +
        "               }" +
        "          }" +
        "     }" +

        "     gl_Position = ndcpos;" +
        "}";

    var screen_space_vertex_shader =
        "precision highp float;" +

        "attribute vec3 aPos;" +
        "attribute vec3 aPrevPos;" +
        "attribute vec3 aNextPos;" +
        "attribute float aId;" +
        "" +
        "uniform mat4 uProjection;" +
        "uniform mat4 uView;" +
        "uniform float uRatio;" +
        "uniform float uTime;" +


        "varying vec3 Color;" +


        "" +
        "void main() {" +

        "     float expansion = 0.025; " +

        "     vec4 ndcpos     =  uProjection * uView * vec4(aPos,     1.0);" +
        "     vec2 ssaPos     =  vec2(uProjection * uView * vec4(aPos,     1.0));" +
        "     vec2 ssaPrevPos =  vec2(uProjection * uView * vec4(aPrevPos, 1.0));" +
        "     vec2 ssaNextPos =  vec2(uProjection * uView * vec4(aNextPos, 1.0));" +

        "     ssaPos.xy     /= (uProjection * uView * vec4(aPos,     1.0)).w; " +
        "     ssaPrevPos.xy /= (uProjection * uView * vec4(aPrevPos, 1.0)).w; " +
        "     ssaNextPos.xy /= (uProjection * uView * vec4(aNextPos, 1.0)).w; " +

        "     ssaPos.x      *= uRatio;" +
        "     ssaPrevPos.x  *= uRatio;" +
        "     ssaNextPos.x  *= uRatio;" +


        "     vec2 T = normalize(normalize(ssaPos - ssaPrevPos) + normalize(ssaNextPos - ssaPos));" +
        "     vec2 N = vec2(-T.y, T.x);" +

        "     vec2 lineNormal = vec2(0.0);" +
        "     vec2 lineVector = vec2(0.0);" +
        "     if(aId == 1.0) {" +
        "         lineVector = normalize(ssaNextPos - ssaPos);" +
        "         lineNormal = -vec2(-lineVector.y, lineVector.x);" +
        "     }" +
        "     if(aId == 2.0) {" +
        "         lineVector = normalize(ssaNextPos - ssaPos);" +
        "         lineNormal = vec2(-lineVector.y, lineVector.x);" +
        "     }" +
        "     if(aId == 3.0) {" +
        "         lineVector = normalize(ssaPos - ssaPrevPos);" +
        "         lineNormal = -vec2(-lineVector.y, lineVector.x);" +
        "     }" +
        "     if(aId > 3.0) {" +
        "         lineVector = normalize(ssaPos - ssaPrevPos);" +
        "         lineNormal = vec2(-lineVector.y, lineVector.x);" +
        "     }" +


        "     float mult = dot(lineNormal, N);" +
        "     N *= 1.0 / mult;" +


        "     if(abs(mult) > 0.1) " +
        "          ssaPos = (ssaPos + N * expansion);" +
        "     else if(aId < 5.0) {" +
        "          ssaPos = ssaPos + lineNormal * expansion;" +
        "     } else {" +
        "          vec2 L = normalize(ssaPos - ssaPrevPos);" +
        "          vec2 L2 = normalize(ssaNextPos - ssaPos); " +
        "          vec2 LN = vec2(-L.y, L.x);" +
        "          float leftorright = dot(LN, L2);" +

        "          if(leftorright < 0.0) {" +
        "               if(aId == 5.0) {" +
        //                      will be fixed at the intersection point of the two rectangles
        "               }" +
        "               if(aId == 6.0) {" +
        "                    ssaPos = ssaPos + lineNormal * expansion;" +
        "               }" +
        "               if(aId == 7.0) {" +
        //next line normal
        "                    vec2 NLN = normalize(vec2(ssaNextPos - ssaPos));" +
        "                    NLN = vec2(-NLN.y, NLN.x);" +
        "                    ssaPos = ssaPos + NLN * expansion;" +
        "               }" +
        "          }" +

        "          if(leftorright >= 0.0) {" +
        "               if(aId == 5.0) {" +
        //                      will be fixed at the intersection point of the two rectangles        
        "               }" +
        "               if(aId == 6.0) {" +
        "                    ssaPos = ssaPos - lineNormal * expansion;" +
        "               }" +
        "               if(aId == 7.0) {" +
        "                    vec2 NLN = normalize(ssaNextPos - ssaPos);" +
        "                    NLN = vec2(-NLN.y, NLN.x);" +
        "                    ssaPos = ssaPos - NLN * expansion;" +
        "               }" +
        "          }" +
        "     }" +



        "     ndcpos.x  = (1.0 / uRatio) * ssaPos.x;" +
        "     ndcpos.y  = ssaPos.y;" +
        "     ndcpos.z  = ndcpos.z / ndcpos.w;" +
        "     ndcpos.w  = 1.0;" +
        "     gl_Position = ndcpos;" +



        "     Color = vec3(fract(aPos.x * 45678.0), fract(aPos.y * 45678.0), fract(aPos.z * 45678.0));" +

        "}";



    var screen_space_animated_vertex_shader =
        "precision highp float;" +

        "attribute vec3 aPos;" +
        "attribute vec3 aPrevPos;" +
        "attribute vec3 aNextPos;" +
        "attribute float aId;" +
        "" +
        "uniform mat4 uProjection;" +
        "uniform mat4 uView;" +
        "uniform float uRatio;" +
        "uniform float uTime;" +
        "uniform float uExpansion;" +
        "uniform float uDegMultiplier;" +


        "varying vec3 Color;" +


        "" +
        "void main() {" +


        "     float deg1 = sin(uTime) * aPos.y     * uDegMultiplier;" +
        "     float deg2 = sin(uTime) * aPrevPos.y * uDegMultiplier;" +
        "     float deg3 = sin(uTime) * aNextPos.y * uDegMultiplier;" +



        "     mat4 rotMatrix1 = mat4(cos(deg1), 0, -sin(deg1), 0," +
        "                       0, 1, 0, 0," +
        "                       sin(deg1), 0, cos(deg1), 0," +
        "                       0, 0, 0, 1);" +
        "     mat4 rotMatrix2 = mat4(cos(deg2), 0, -sin(deg2), 0," +
        "                       0, 1, 0, 0," +
        "                       sin(deg2), 0, cos(deg2), 0," +
        "                       0, 0, 0, 1);" +
        "     mat4 rotMatrix3 = mat4(cos(deg3), 0, -sin(deg3), 0," +
        "                       0, 1, 0, 0," +
        "                       sin(deg3), 0, cos(deg3), 0," +
        "                       0, 0, 0, 1);" +



        "     vec4 ndcpos     =  uProjection * uView * rotMatrix1 * vec4(aPos,     1.0);" +
        "     vec2 ssaPos     =  vec2(uProjection * uView * rotMatrix1 * vec4(aPos,     1.0));" +
        "     vec2 ssaPrevPos =  vec2(uProjection * uView * rotMatrix2 * vec4(aPrevPos, 1.0));" +
        "     vec2 ssaNextPos =  vec2(uProjection * uView * rotMatrix3 * vec4(aNextPos, 1.0));" +

        "     ssaPos.xy     /= (uProjection * uView * vec4(aPos,     1.0)).w; " +
        "     ssaPrevPos.xy /= (uProjection * uView * vec4(aPrevPos, 1.0)).w; " +
        "     ssaNextPos.xy /= (uProjection * uView * vec4(aNextPos, 1.0)).w; " +

        "     ssaPos.x      *= uRatio;" +
        "     ssaPrevPos.x  *= uRatio;" +
        "     ssaNextPos.x  *= uRatio;" +

      


        "     vec2 T = normalize(normalize(ssaPos - ssaPrevPos) + normalize(ssaNextPos - ssaPos));" +
        "     vec2 N = vec2(-T.y, T.x);" +

        "     vec2 lineNormal = vec2(0.0);" +
        "     vec2 lineVector = vec2(0.0);" +
        "     if(aId == 1.0) {" +
        "         lineVector = normalize(ssaNextPos - ssaPos);" +
        "         lineNormal = -vec2(-lineVector.y, lineVector.x);" +
        "     }" +
        "     if(aId == 2.0) {" +
        "         lineVector = normalize(ssaNextPos - ssaPos);" +
        "         lineNormal = vec2(-lineVector.y, lineVector.x);" +
        "     }" +
        "     if(aId == 3.0) {" +
        "         lineVector = normalize(ssaPos - ssaPrevPos);" +
        "         lineNormal = -vec2(-lineVector.y, lineVector.x);" +
        "     }" +
        "     if(aId > 3.0) {" +
        "         lineVector = normalize(ssaPos - ssaPrevPos);" +
        "         lineNormal = vec2(-lineVector.y, lineVector.x);" +
        "     }" +


        "     float mult = dot(lineNormal, N);" +
        "     N *= 1.0 / mult;" +


        "     if(abs(mult) > 200000000000000000000000000000000.0) " +
        "          ssaPos = (ssaPos + N * uExpansion);" +
        "     else if(aId < 5.0) {" +
        "          ssaPos = ssaPos + lineNormal * uExpansion;" +
        "     } else {" +
        "          vec2 L = normalize(ssaPos - ssaPrevPos);" +
        "          vec2 L2 = normalize(ssaNextPos - ssaPos); " +
        "          vec2 LN = vec2(-L.y, L.x);" +
        "          float leftorright = dot(LN, L2);" +

        "          if(leftorright < 0.0) {" +
        "               if(aId == 5.0) {" +
        //                      will be fixed at the intersection point of the two rectangles
        "               }" +
        "               if(aId == 6.0) {" +
        "                    ssaPos = ssaPos + lineNormal * uExpansion;" +
        "               }" +
        "               if(aId == 7.0) {" +
                             // NLN = next line normal
        "                    vec2 NLN = normalize(vec2(ssaNextPos - ssaPos));" +
        "                    NLN = vec2(-NLN.y, NLN.x);" +
        "                    ssaPos = ssaPos + NLN * uExpansion;" +
        "               }" +
        "          }" +

        "          if(leftorright >= 0.0) {" +
        "               if(aId == 5.0) {" +
        //                      will be fixed at the intersection point of the two rectangles        
        "               }" +
        "               if(aId == 6.0) {" +
        "                    ssaPos = ssaPos - lineNormal * uExpansion;" +
        "               }" +
        "               if(aId == 7.0) {" +
        "                    vec2 NLN = normalize(ssaNextPos - ssaPos);" +
        "                    NLN = vec2(-NLN.y, NLN.x);" +
        "                    ssaPos = ssaPos - NLN * uExpansion;" +
        "               }" +
        "          }" +
        "     }" +



        "     ndcpos.x  = (1.0 / uRatio) * ssaPos.x;" +
        "     ndcpos.y  = ssaPos.y;" +
        "     ndcpos.z  = ndcpos.z / ndcpos.w;" +
        "     ndcpos.w  = 1.0;" +
        "     gl_Position = ndcpos;" +


        "     Color = vec3(0.2 + (aPos.x * 0.03 + 0.6), 0.4, 1.0);" +

        "}";



    var fragment_shader =
        "precision mediump float;" +
        "varying vec3 Color;" +
        "" +
        "void main() {" +
        "    gl_FragColor = vec4(Color, 1.0);" +
        "}";

    var Program = createProgramFromSource(screen_space_animated_vertex_shader, fragment_shader, gl);
    Program.aId = gl.getAttribLocation(Program, "aId");
    Program.aPos = gl.getAttribLocation(Program, "aPos");
    Program.aPrevPos = gl.getAttribLocation(Program, "aPrevPos");
    Program.aNextPos = gl.getAttribLocation(Program, "aNextPos");

    Program.uProjection = gl.getUniformLocation(Program, "uProjection");
    Program.uView = gl.getUniformLocation(Program, "uView");

    Program.uRatio = gl.getUniformLocation(Program, "uRatio");
    Program.uTime = gl.getUniformLocation(Program, "uTime");
    Program.uExpansion = gl.getUniformLocation(Program, "uExpansion");
    Program.uDegMultiplier = gl.getUniformLocation(Program, "uDegMultiplier");

    Program.buffer = gl.createBuffer();
    var vertices = [];



    window.MainProgram = Program;
    // we need main program defined before calling this function
    animateBufferData(0);
}

var then = 0;
var step = Float32Array.BYTES_PER_ELEMENT;
var zRotSpeed = 0;
var waveIncreaserSpeed = 0;
function render(now) {
    requestAnimationFrame(render);

    now *= 0.001;
    var deltatime = now - then;
    then = now;

    zRotSpeed += deltatime * effectController.zRotSpeed;
    waveIncreaserSpeed += deltatime * effectController.nWaveIncreaserSpeed;

    gl.useProgram(window.MainProgram);
    gl.clearColor(0.1, 0.1, 0.1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    gl.bindBuffer(gl.ARRAY_BUFFER, window.MainProgram.buffer);
    gl.enableVertexAttribArray(MainProgram.aPos);
    gl.enableVertexAttribArray(MainProgram.aPrevPos);
    gl.enableVertexAttribArray(MainProgram.aNextPos);
    gl.enableVertexAttribArray(MainProgram.aId);

    gl.vertexAttribPointer(MainProgram.aPos, 3, gl.FLOAT, false, step * 10, step * 0);
    gl.vertexAttribPointer(MainProgram.aPrevPos, 3, gl.FLOAT, false, step * 10, step * 3);
    gl.vertexAttribPointer(MainProgram.aNextPos, 3, gl.FLOAT, false, step * 10, step * 6);
    gl.vertexAttribPointer(MainProgram.aId, 1, gl.FLOAT, false, step * 10, step * 9);

    gl.uniformMatrix4fv(MainProgram.uProjection, false, projection);
    gl.uniformMatrix4fv(MainProgram.uView, false, camera.getViewMatrix(deltatime, 0.3));

    gl.uniform1f(MainProgram.uRatio, innerWidth / innerHeight);
    gl.uniform1f(MainProgram.uTime, zRotSpeed);
    gl.uniform1f(MainProgram.uExpansion, effectController.lineSize);
    gl.uniform1f(MainProgram.uDegMultiplier, effectController.degreeMultiplier);
    
    
    
    
    animateBufferData(waveIncreaserSpeed);

    gl.drawArrays(gl.TRIANGLES, 0, window.nverts);
}


function animateBufferData(now) {
    var vertices = [];
    var steps = Math.floor(effectController.lineNumber);
    var size = 10;
    for (var i = 0; i < steps; i++) {
        var deg1 = i / steps * (Math.PI * 2);
        var deg2 = (i + 1) / steps * (Math.PI * 2);

        var deg3 = i / steps *       (Math.PI * effectController.nWaves * (Math.sin(now) * 0.5 + 0.5));
        var deg4 = (i + 1) / steps * (Math.PI * effectController.nWaves * (Math.sin(now) * 0.5 + 0.5));
        var mult1 = Math.sin(deg3) * 0.15;
        var mult2 = Math.sin(deg4) * 0.15;

        var y1 = Math.sin(deg1) * (size + (size * mult1));
        var x1 = Math.cos(deg1) * (size + (size * mult1));
        var z1 = 0.0;

        var y2 = Math.sin(deg2) * (size + (size * mult2));
        var x2 = Math.cos(deg2) * (size + (size * mult2));
        var z2 = 0.0;

        if (i === steps - 1) {
            x2 = vertices[0];
            y2 = vertices[1];
            z2 = vertices[2];
        }


        vertices.push(x1, y1, z1, x2, y2, z2);
    }



    gl.bindBuffer(gl.ARRAY_BUFFER, MainProgram.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangulateLines(vertices)), gl.STATIC_DRAW);
}


function createProgramFromSource(vertexSource, fragmentSource, ctx) {
    var vs = createShaderFromSource(vertexSource, "vert", ctx);
    var fs = createShaderFromSource(fragmentSource, "frag", ctx);

    var Program = ctx.createProgram();

    ctx.attachShader(Program, vs);
    ctx.attachShader(Program, fs);
    ctx.linkProgram(Program);


    if (!ctx.getProgramParameter(Program, ctx.LINK_STATUS)) {
        alert("Could not initialise shaders");
        return null;
    }

    return Program;
}
function createShaderFromSource(source, type, ctx) {
    var shader;
    if (type == "frag") {
        shader = ctx.createShader(ctx.FRAGMENT_SHADER);
    } else if (type == "vert") {
        shader = ctx.createShader(ctx.VERTEX_SHADER);
    } else {
        return null;
    }
    ctx.shaderSource(shader, source);
    ctx.compileShader(shader);
    if (!ctx.getShaderParameter(shader, ctx.COMPILE_STATUS)) {
        alert(ctx.getShaderInfoLog(shader) + "  " + type);
        return null;
    }
    return shader;
}

function initGui() {
    var gui = new dat.GUI();

    window.effectController = {
        lineNumber: 180,
        lineSize: 0.025,
        degreeMultiplier: 0.5,
        zRotSpeed: 1,
        nWaves: 10,
        nWaveIncreaserSpeed: 1
    };

    gui.add(effectController, "lineNumber", 0, 1000).onChange(fromGui);
    gui.add(effectController, "lineSize", 0.001, 0.15).onChange(fromGui);
    gui.add(effectController, "zRotSpeed", 0.0, 5.0).onChange(fromGui);
    gui.add(effectController, "degreeMultiplier", 0.0, 1.5).onChange(fromGui);
    gui.add(effectController, "nWaves", 0, 50).onChange(fromGui);
    gui.add(effectController, "nWaveIncreaserSpeed", 0.0, 5.0).onChange(fromGui);

    function fromGui() {
        animateBufferData();
    }
}












var reusableBuffer = [0, 0, 0];
function triangulateLines(lines) {
    var buf = [];

    var length = lines.length / 6;

    // iterating over every line
    for (var i = 0; i < length; i++) {
        // first line vertex
        var v1x = lines[i * 6 + 0];
        var v1y = lines[i * 6 + 1];
        var v1z = lines[i * 6 + 2];

        // second line vertex
        var v2x = lines[i * 6 + 3];
        var v2y = lines[i * 6 + 4];
        var v2z = lines[i * 6 + 5];

        var v3x, v3y, v3z, v4x, v4y, v4z;

        // prev line vertex
        if (i === 0) {
            // extending along 1% of the line's length
            reusableBuffer[0] = v1x + (v1x - v2x) * 0.01;
            reusableBuffer[1] = v1y + (v1y - v2y) * 0.01;
            reusableBuffer[2] = v1z + (v1z - v2z) * 0.01;
            v3x = reusableBuffer[0];
            v3y = reusableBuffer[1];
            v3z = reusableBuffer[2];
        } else {
            v3x = lines[(i - 1) * 6 + 0];
            v3y = lines[(i - 1) * 6 + 1];
            v3z = lines[(i - 1) * 6 + 2];
        }

        // next line vertex
        if (i == length - 1) {
            // // extending along 1% of the line's length
            // reusableBuffer[0] = v2x + (v2x - v1x) * 0.01;
            // reusableBuffer[1] = v2y + (v2y - v1y) * 0.01;
            // reusableBuffer[2] = v2z + (v2z - v1z) * 0.01;
            // v4x = reusableBuffer[0];
            // v4y = reusableBuffer[1];
            // v4z = reusableBuffer[2];

            // assigning to the first vertex to close the path
            v4x = lines[3];
            v4y = lines[4];
            v4z = lines[5];
        } else {
            v4x = lines[(i + 1) * 6 + 3];
            v4y = lines[(i + 1) * 6 + 4];
            v4z = lines[(i + 1) * 6 + 5];
        }


        constructTriangles(v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z, v4x, v4y, v4z, buf);
    }

    // how many triangles in buffer ?
    window.nverts = buf.length / 10;
    return buf;
}


function constructTriangles(v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z, v4x, v4y, v4z, buffer) {
    // structure of a vertex is as follow:

    // current vertex - prev vertex - next vertex - ID
    /*
           2 ______________ 4
            |              |
            |______________|
           1                3
     */

    // triangle 1
    // vertex 1 
    buffer.push(v1x, v1y, v1z, v3x, v3y, v3z, v2x, v2y, v2z, 1);
    // vertex 2 
    buffer.push(v1x, v1y, v1z, v3x, v3y, v3z, v2x, v2y, v2z, 2);
    // vertex 3
    buffer.push(v2x, v2y, v2z, v1x, v1y, v1z, v4x, v4y, v4z, 3);


    // triangle 2
    // vertex 3
    buffer.push(v2x, v2y, v2z, v1x, v1y, v1z, v4x, v4y, v4z, 3);
    // vertex 2 
    buffer.push(v1x, v1y, v1z, v3x, v3y, v3z, v2x, v2y, v2z, 2);
    // vertex 4
    buffer.push(v2x, v2y, v2z, v1x, v1y, v1z, v4x, v4y, v4z, 4);


    // third triangle, possible miter join. Vertices are: 3, 4, 4
    buffer.push(v2x, v2y, v2z, v1x, v1y, v1z, v4x, v4y, v4z, 5);
    buffer.push(v2x, v2y, v2z, v1x, v1y, v1z, v4x, v4y, v4z, 6);
    buffer.push(v2x, v2y, v2z, v1x, v1y, v1z, v4x, v4y, v4z, 7);
}