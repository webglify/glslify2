import fixtureGlsl from './fixture.glsl'
import {Parser, Serializer, Importer} from '../src'
import util from 'util'


describe('Importer', () => {

  it('should import', () => {


    const srcCode = fixtureGlsl.src
    const srcAST = Parser.tokenize(srcCode).parseProgram()
    
    const dstCode = fixtureGlsl.dst
    const dstAST = Parser.tokenize(dstCode).parseProgram()

    const AST = Importer.importAST(dstAST, srcAST)
    
    
    console.log('AST', util.inspect(AST, {showHidden: false, depth: null, colors: false}))
    const serializedAST =  Serializer(AST);
    console.log('serialized:', serializedAST)

    // const nonNewLineCode = code.split(`\n`).filter(w => w !== "").filter(w => (w !== `  ` && w !== `    `))
    // console.log('nonNewLineCode', nonNewLineCode)
    // const serializedASTArray = serializedAST.split(`\n`);

    // expect(serializedASTArray).toEqual(nonNewLineCode)
  })


})

