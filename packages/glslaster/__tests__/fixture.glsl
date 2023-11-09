#version 300 es

layout(location=0) in vec2 aPosition;
layout(location=1) in vec4 aGlyphBounds;
layout(location=2) in float aGlyphIndex;
layout(location=3) in vec2 aRow;
layout(location=4) in vec2 aRowColumn;
layout(location=5) in float aGlyphShift;
layout(location=6) in vec2 aGlyphPadding;


vec2 getGlyphUV () {
  
  vec4 gb = aGlyphBounds;

  vec2 pos = aPosition;
  
  
  vec2 itemSize = (uSdfItemSize * 2.)/ uSDFTextureSize;
  
  float c = floor(aGlyphIndex/4.);
  float column = mod(c, uAtlasColumnCount) * itemSize.x;
  float row = floor(c/uAtlasColumnCount) * itemSize.y;


  float u = mix(column, column + itemSize.x, pos.x);
  float v = mix(row, row + itemSize.y, pos.y);

  vec2 uv = vec2(u,v);
  return uv;
}