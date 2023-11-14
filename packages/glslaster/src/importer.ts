import {Program, ImportDeclaration, FunctionDeclaration} from './parser'

const Importer = ({
  importAST(dstAST: Program, srcAST: Program){

    const resultAST = dstAST.clone()

    const importDecls: [ImportDeclaration, number][] = 
    resultAST.body.reduce((acc, d, i) => {
      if(d instanceof ImportDeclaration) {
        return [...acc, [d, i]]
      }
      return acc

    }, [])

    importDecls.reduce((orderShift, d) => {

      const [decl, declIndex] = d

      const functionNames = decl.functionNames
      const srcFuncs = srcAST.body.filter(d => d instanceof FunctionDeclaration && functionNames.includes(d.name))
  
      resultAST.removeNode(declIndex + orderShift)
      srcFuncs.forEach((f, i) => resultAST.addNode(f, declIndex + i + orderShift))

      // there could be a few functions injected pro single import, so track it
      return orderShift + (srcFuncs.length - 1)
  
     }, 0)
    
    return resultAST
  }
})


export default Importer