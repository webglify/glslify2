module.exports = {
  src: `#version 300 es

  layout(location=0) in vec2 aPosition;
  
  vec2 getGlyphPosition () {

    vec2 pos = aPosition;
    
    return pos * 2.;
  }

vec2 getGlyphPosition2 () {

  vec2 pos = aPosition;
  
  return pos * 10.;
}

vec2 getGlyphUV () {

  return vec2(0.);
}

`, 
dst: `
#version 300 es

layout(location=0) in vec2 aPosition;

#pragma: import { getGlyphPosition, getGlyphPosition2 } from './src.glsl'
#pragma: import { getGlyphUV } from './src.glsl'

void main () {

  vec2 pos = aPosition;
  pos += getGlyphPosition()

  return pos * 2.;
}


`,

glsl: `#version 300 es


layout(location=0) in vec2 aPosition;
layout(location=1) in vec4 aGlyphBounds;
layout(location=2) in float aGlyphIndex;
layout(location=3) in vec2 aRow;
layout(location=4) in vec2 aRowColumn;
layout(location=5) in float aGlyphShift;
layout(location=6) in vec2 aGlyphPadding;

out vec2 glyphUV;
out vec2 textUV;
out float vChannel;
out vec4 vGlyphBounds;
out float vRowOrder;
out vec2 vGlyphPadding;
out float vYPosShift;

#define FONT_SCALE uFontSize/uResolutionInPx

uniform float uAtlasColumnCount;
uniform vec2 uSDFTextureSize;
uniform float uSdfItemSize;
uniform vec2 uResolution;
uniform vec2 uResolutionInPx;
uniform float uFontSize;
uniform float uDescender;
uniform float uBottomPadding;
uniform float uPaddingLeft;
uniform float uPaddingBottom;
uniform float uTime;
uniform float uProgress;
uniform float uRowHeight;
uniform mediump float uRowCount;

const float leftPadding = 0.;

vec2 getGlyphPosition() {
  
  vec4 gb = aGlyphBounds;

  vec2 pos = aPosition;
  
  pos.x += leftPadding;
  
  float height = gb.w + gb.y;
  float width = gb.z - gb.x;
    
  pos.y += ((gb.w - gb.y) * .5 - .5);
  
  pos.x += width * .5 - .5;
  
  pos *= 2.;
  
  pos.y -= height * .5;
  
  pos.x -= width * .5;
  
  pos.y -= uDescender;
  
  
  pos.x += gb.x;
  pos.x -= 2. * aGlyphShift;
  
  vec2 fontScale = uFontSize / uResolutionInPx;

  pos.y += uPaddingBottom / uResolutionInPx.y;
  
  pos *= fontScale;

  pos.y += aRow.y / uResolutionInPx.y;
  
  return pos;
}

vec2 getGlyphUV() {
  vec4 gb = aGlyphBounds;

  vec2 pos = aPosition;
  
  
  vec2 itemSize = (uSdfItemSize * 2.) / uSDFTextureSize;
  
  float c = floor(aGlyphIndex / 4.);
  float column = mod(c, uAtlasColumnCount) * itemSize.x;
  float row = floor(c / uAtlasColumnCount) * itemSize.y;


  float u = mix(column, column + itemSize.x, pos.x);
  float v = mix(row, row + itemSize.y, pos.y);

  vec2 uv = vec2(u, v);
  return uv;
}




void main() {


  vec2 pos = getGlyphPosition();


  
  
  gl_Position = vec4(mix(vec2(-1.), vec2(1.), pos), 0., 1.);

  glyphUV = getGlyphUV();
  vChannel = mod(aGlyphIndex, 4.);
  vGlyphBounds = aGlyphBounds;
  
  vGlyphPadding = aGlyphPadding;
  
}`,
glslStuct: `
#version 300 es
struct Light {
 vec3 position;
 vec3 color;
 float intensity;
} myLight1, myLight2;

Light myLight3;
Light myLight1 = {vec3(1.), vec3(1.), .1};
myLight3.position = vec3(1.);

Light getLight(Light l) {
  Light myLight4 = {vec3(.5), vec3(.5), .5};
  l.color = myLight4.color;
  return l;
}
`,
glslStuct2: `
struct Light {
 vec3 position;
};
myLight3.position = vec3(1.);
Light myLight1 = {vec3(1.), vec3(1.), .1};



`,
glslConst: `
const float leftPadding = 0.;

`
}