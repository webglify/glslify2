import { basename } from "path";
import { ShaderProcessor } from "../src";
import fs from 'fs'
import path from 'path'

describe('Shader Processor', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });


  it('obtians glsl ast and concantinate it back', () => {

      const glslCode = 
`
layout(location=0) in vec2 aPosition;
layout(location=1) in float aIndex;
uniform mat4 mvpProjection;
vec4 project(vec2 pos, vec2 rest){
  vec4 p = mvpProjection * vec4(pos, rest);
  return p;
}
void main () {
  vec2 rest = vec2(0., mix(0., 1., uv.x);
  gl_Position = project(aPosition, rest));
}
`



const glslCode2 = 
`void main () {
  vec2 d = vec2(1., mix(.9, .1, uv.x));
}`

      //ShaderProcessor.parse(glslCode2)
      //ShaderProcessor.dummyParse()
      ShaderProcessor.dummyParseBinary()
  })
  
  
//   it('injects required function', () => {

// // const sourceGLSL = `
// // float maskSDF (vec2 uv) {
// //   float d = distance(uv);
// //   return d;
// // }

// // #pragma glslify2: export(maskSDF) 
// // `



// //const sourceGLSL = `float maskSDF(vec2 uv){return .1;}`

// //const sourceGLSL = `layout(location=0) in vec2 aPosition;`
// const sourceGLSL = `
// #version 300 es

// in vec2 vUV;
// `

// //const sourceGLSL = fs.readFileSync('./__tests__/fixture.glsl').toString()

//     const destinationGLSL = `
// #pragma glslify2: maskSdf = require('./source.glsl')

// void main () {
//   float sdf = maskSdf(vec2(0.));
// }`

//     const resultGLSL = `
// float maskSDF (vec2 uv) {
//   return .1;
// }

// void main () {
//   float sdf = maskSdf(vec2(0.));
// }
// `
//     jest.spyOn(ShaderProcessor, 'loadFile').mockImplementation((path) => {
//       if (path === './source.glsl') {
//         return sourceGLSL;
//       }
//       return ''
//     });
    

//     const processedShader = ShaderProcessor.processShader(destinationGLSL);

//     expect(processedShader).toContain(resultGLSL);



//   })


})