import fixtureGlsl from './fixture.glsl'
import {Parser, Serializer, Importer} from '../src'
import util from 'util'


describe('Importer', () => {

  it('should build AST with struct and serialize', () => {


    const code = fixtureGlsl.glslStuct
    const AST = Parser.tokenize(code).parseProgram().ast
    
    //console.log('AST', util.inspect(AST, {showHidden: false, depth: null, colors: false}))
    const serializedAST =  Serializer(AST);
    

    const nonNewLineCode = code.split(`\n`).filter(w => w !== "").filter(w => (w !== `  ` && w !== `    `))
    const serializedASTArray = serializedAST.split(`\n`);

    expect(serializedASTArray).toEqual(nonNewLineCode)
  })


  it('should import', () => {


    const srcCode = fixtureGlsl.src
    const srcP = Parser.tokenize(srcCode).parseProgram()
    
    const dstCode = fixtureGlsl.dst
    const dstP = Parser.tokenize(dstCode).parseProgram()

    const AST = Importer.importAST(dstP, srcP).ast
    
    
    console.log('AST', util.inspect(AST, {showHidden: false, depth: null, colors: false}))
    const serializedAST =  Serializer(AST);
    console.log('serialized:', serializedAST)

  })

  it('should parse and serialize', () => {
    const code = fixtureGlsl.glsl
    const AST = Parser.tokenize(code).parseProgram().ast
    const serializedAST =  Serializer(AST);

    const nonNewLineCode = code.split(`\n`).filter(w => w !== "").filter(w => (w !== `  ` && w !== `    `))
    const serializedASTArray = serializedAST.split(`\n`);
    console.log('serializedASTArray', serializedASTArray)

    expect(serializedASTArray).toEqual(nonNewLineCode)
  })


})

