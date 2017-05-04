//-------------------------------------------------------------------------
/*
Global Variables for teapot
 */
var teaVertexBuffer;
var teaVertexNormalBuffer;
var teaTriIndexBuffer;
var teaVertexColorBuffer;

/**
 * Sets up buffer for teapot
 * @param tea file where we read the model of teapot
 * @author Fanyin Ji
 */
function setupTeapotBuffer(tea)
{
    var vertex = [];
    var face = [];
    num_vertex = 0;
    num_face = 0;
    var color = [];



    var line = tea.split("\n");
    for(var i = 0; i < line.length; i++){
        list = line[i].split(' ');
        if(list[0] == 'v'){
            vertex.push(parseFloat(list[1]));
            vertex.push(parseFloat(list[2]));
            vertex.push(parseFloat(list[3]));
            num_vertex+=1;
        }
        else if(list[0] == 'f'){
            face.push(parseInt(list[2])-1);
            face.push(parseInt(list[3])-1);
            face.push(parseInt(list[4])-1);
            num_face+=1;
        }
    }
    teaVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teaVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertex), gl.STATIC_DRAW);
    teaVertexBuffer.numItems = num_vertex;

    var normal = [];
    for(var i=0; i<num_vertex; i++){
        normal.push(0);
        normal.push(0);
        normal.push(0);
    }

    setNorms(face, vertex, normal);

    // Color the teapot
    for(var i=0; i<num_vertex; i++){
        color.push(1.0);
        color.push(0.0);
        color.push(1.0);
        color.push(1);
    }

    // Combine the buffer and send into WebGL
    teaVertexColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teaVertexColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color), gl.STATIC_DRAW);
    teaVertexColorBuffer.numItems = num_vertex;
    teaVertexColorBuffer.itemSize = 4;

    teaVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teaVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normal), gl.STATIC_DRAW);
    teaVertexNormalBuffer.numItems = num_vertex;
    teaVertexNormalBuffer.itemSize = 3;

    teaTriIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teaTriIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(face), gl.STATIC_DRAW);
    teaTriIndexBuffer.numItems = num_face;
    // Check buffer rendering is finished
    ready = true;

}


//-------------------------------------------------------------------------

/**
 * sets the normals of the new terrian
 * @param faceArray
 * @param vertexArray
 * @param normalArray
 * @returns {normarlArray}
 */
function setNorms(faceArray, vertexArray, normalArray)
{
    for(var i=0; i<faceArray.length;i+=3)
    {
        //find the face normal
        var vertex1 = vec3.fromValues(vertexArray[faceArray[i]*3],vertexArray[faceArray[i]*3+1],vertexArray[faceArray[i]*3+2]);

        var vertex2 = vec3.fromValues(vertexArray[faceArray[i+1]*3],vertexArray[faceArray[i+1]*3+1],vertexArray[faceArray[i+1]*3+2]);

        var vertex3 = vec3.fromValues(vertexArray[faceArray[i+2]*3],vertexArray[faceArray[i+2]*3+1],vertexArray[faceArray[i+2]*3+2]);

        var vect31=vec3.create(), vect21=vec3.create();
        vec3.sub(vect21,vertex2,vertex1);
        vec3.sub(vect31,vertex3,vertex1);
        var v=vec3.create();
        vec3.cross(v,vect21,vect31);

        //add the face normal to all the faces vertices
        normalArray[faceArray[i]*3  ]+=v[0];
        normalArray[faceArray[i]*3+1]+=v[1];
        normalArray[faceArray[i]*3+2]+=v[2];

        normalArray[faceArray[i+1]*3]+=v[0];
        normalArray[faceArray[i+1]*3+1]+=v[1];
        normalArray[faceArray[i+1]*3+2]+=v[2];

        normalArray[faceArray[i+2]*3]+=v[0];
        normalArray[faceArray[i+2]*3+1]+=v[1];
        normalArray[faceArray[i+2]*3+2]+=v[2];

    }

    //normalize each vertex normal
    for(var i=0; i<normalArray.length;i+=3)
    {
        var v = vec3.fromValues(normalArray[i],normalArray[i+1],normalArray[i+2]);
        vec3.normalize(v,v);

        normalArray[i  ]=v[0];
        normalArray[i+1]=v[1];
        normalArray[i+2]=v[2];
    }

    //return the vertex normal
    return normalArray;
}

/**
 * Draw the teapot
 * @author Fanyin Ji
 */
function drawTeapot(){
    isSkybox(0.0);
    uploadViewDirToShader();

    // Send the element amd vertices into WebGL
    gl.bindBuffer(gl.ARRAY_BUFFER, teaVertexColorBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);


    gl.bindBuffer(gl.ARRAY_BUFFER, teaVertexBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, teaVertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);


    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teaTriIndexBuffer);
    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, 6768, gl.UNSIGNED_SHORT, 0);
}

