import tokenize from 'glsl-tokenizer/string'
import { getForStatement, isForStatement, obtainForCursorScope } from './statements/for'
import { getIfStatement, isIfStatement, obtainIfCursorScope } from './statements/if'
import { getUpdateExpressions, getMemberExpression, MemberExpression } from './expressions'
import { getSwitchStatement, isSwitchStatement, obtainSwitchCursorScope } from './statements/switch'
import { getVariableDeclarations, getVariableDefinition } from './declarations'
import { getWhileStatement, isWhileStatement, obtainWhileCursorScope } from './statements/while'


export class Cursor {
  public indexQueue: number[]
  public pos: number
  
  constructor(indexQueue: number[]){
    this.indexQueue = indexQueue
    this.pos = 0
  }

  get eof() {
    return this.pos >= (this.indexQueue.length)
  }

  get next() {
    if(!this.eof){
      return this.indexQueue[this.pos + 1.];
    } 
  }

  get length () {
    return this.indexQueue.length
  }

  get prev(){
    if(this.pos != 0){
      return this.indexQueue[this.pos - 1.];
    } 
  }  
  getPrev(count:number = 1){
    if(this.pos - count >= 0){
      return this.indexQueue[this.pos - count];
    } 
    
  }

  get current(){
    return this.indexQueue[this.pos]
  }

  forward(count:number = 1){
    if(!this.eof){
      this.pos += count;
      return this
    }
    else {

      throw new Error('queue forward overflow')
    }
  }

  tryForward(count:number = 1){
    try {
      return this.forward(count)
    } catch {
      return this
    }
  }

  moveTo(index) {
    this.pos = this.indexQueue.findIndex((i) => i === index)
  }

  backward(){
    if(!this.atStart()){
      this.pos -= 1.;
      return this
    }
    else {
      throw new Error('queue backward underflow')
    }
  }

  toEnd(){
    this.pos = this.indexQueue.length - 1;
    return this;
  }
  
  toEof(){
    this.pos = this.indexQueue.length;
    return this;
  }

  atStart(){
    return this.pos < 0;
  }

  split(from: number = 0):[Cursor, Cursor] {
    return [
      new Cursor(this.indexQueue.slice(from, this.pos )), 
      new Cursor(this.indexQueue.slice(this.pos ))
    ]
  }
  append(cursor: Cursor): Cursor {
    const indexQueue = [...this.indexQueue, ...cursor.indexQueue]
    return new Cursor(indexQueue)
  }

  clone(){
    const clone = Object.assign( {}, this );
    Object.setPrototypeOf( clone, Cursor.prototype );
    return clone
  }
}


export default ({
  tokens: [],
  cursor: null,
  version: '300 es',
  tokenize(glslCode: string, inlcudePositionData = false){
    this.tokens = tokenize(glslCode, {version: this.version}).map((token) => {
      if(inlcudePositionData) return token
      const {type, data} = token
      return {type, data}
    });

    const indeces = this.tokens
    .map((token, i) => {
      return token.type !== 'whitespace' ? i : undefined
    })
    .filter(i => i)
    
    
    this.cursor = new Cursor(indeces)

    return this
  },
  
  parseProgram(id: ProgramId, type: ProgramType){

    const program = new Program(id, type, this.tokens)
    program.version = this.version

    return parseProgram(program, this.cursor)
  },
  parseBodyTokens(id: ProgramId, type: ProgramType){
    
    const program = new Program(id, type, this.tokens)
    return parseBodyTokens(program, this.cursor, null)
  }

})



type ProgramId = string
type ProgramType = 'vertex' | 'fragment'

export class ProgramAST  {
  version: string
  body: any[]  
  constructor(version, body){
    this.version = version
    this.body = body
  }
}
export class Program {
  id: ProgramId
  type: ProgramType
  version
  tokens
  body = []

  constructor(id: ProgramId, type: ProgramType, tokens, body?){
    this.id = id
    this.type = type
    this.tokens = tokens
    if(body){
      this.body = body
    }
  }

  get ast(): ProgramAST {
    return new ProgramAST(this.version, this.body)
  }

  ct(c: Cursor) {
    return this.tokens[c.current]
  }
  nt(c: Cursor) {
    return this.tokens[c.next]
  }
  pt(c: Cursor) {
    return this.tokens[c.prev]
  }
 
  removeNode(index) {
    this.body.splice(index, 1)
  }

  addNode(node, index?){
    const start = index || this.body.length
    this.body.splice(start, 0, node)
  }

  clone(){
    const p = new Program(this.id, this.type, this.tokens)
    p.version = this.version
    this.body.forEach(d => p.addNode(d))
    return p
  }

  getStructTypes(): string[]{
    return this.body.filter(n => n instanceof StructDeclaration).map(n => n.name)
  }

}

export class ParameterDeclaration {
  dataType
  name
  storageQualifier
  
  constructor(dataType, name, storageQualifier?) {
    this.name = name
    this.dataType = dataType
    if(storageQualifier){
      this.storageQualifier = storageQualifier
    }
  }
}

const obtainVariableDeclarationArgs = (program, cursor) => {
  const ct = program.tokens[cursor.current]
  
  const args = []
  if(['in', 'out'].includes(ct.data)) {
    args.push(ct.data)
    cursor.forward()
  }
  const ct2 = program.tokens[cursor.current]
  args.splice(0, 0, ct2.data)
  
  cursor.forward()
  const ct3 = program.tokens[cursor.current]
  args.splice(1, 0, ct3.data)

  return [args, cursor.forward()]
}
const createParameterDeclaration = (program, cursor) => {
  
  const [args] = obtainVariableDeclarationArgs(program, cursor)

  return new ParameterDeclaration(args[0], args[1], args[2])
}



const getFuncParameters = (program, cursor): false | [c: Cursor, any]  => {

  const currentToken = program.tokens[cursor.current]
  if(currentToken.data !== '(') return false


  const obtainParamsCursors = (indicies: number[][] = [[]], cursors: Cursor[] = []) => {
    cursor.forward()
    
    const ct = program.tokens[cursor.current]
    if(ct.data === '(' || cursor.eof) {
      throw new Error('function paramters signature is not valid')
    }

    if( ct.data === ')') {
      cursors[indicies.length - 1] = new Cursor(indicies[indicies.length - 1])
      return cursors
    }

    
    if( ct.data === ',') {
      cursors[indicies.length - 1] = new Cursor(indicies[indicies.length - 1])
      indicies.push([])
      return obtainParamsCursors(indicies, cursors)
    }

    indicies[indicies.length - 1].push(cursor.current)
    return obtainParamsCursors(indicies, cursors)
    
  }

  const pCursors = obtainParamsCursors().filter(c => c.length>0)
  const parameters = pCursors.map(pCursor => createParameterDeclaration(program, pCursor))

  return [cursor, parameters]
}

const getBody = (program, cursor): false | [c: Cursor, any]  => {

  const ct = program.tokens[cursor.current]
  if(ct.data !== '{') return

  
  const obtainBodyCursor = (cursor2, depth=0) => {

    const ct2 = program.tokens[cursor2.current]
    if(ct2.data === '{'){
      return obtainBodyCursor(cursor2.forward(), depth + 1)
    }
    if(ct2.data === '}'){
      if(depth > 0) {
        return obtainBodyCursor(cursor2.forward(), depth - 1)
      }

      return cursor2.split(cursor.pos)      
    }
    
    return obtainBodyCursor(cursor2.forward(), depth)

  }

  const [c1, c2] = obtainBodyCursor(cursor.forward().clone())

  const stmt = parseBody(program, c1)

  return [c2, stmt]
} 

export class FunctionDeclaration {
  name
  returnType
  parameters: ParameterDeclaration[]
  body

  constructor(name, returnType, parameters, body){
    this.name = name
    this.returnType = returnType
    this.parameters = parameters
    this.body = body
  }

}

const getFunctionDeclaration = (program, cursor): false | [c: Cursor, any]  => {

  const currentToken = program.ct(cursor)
  if(currentToken.type !== 'ident') return false
  const prevToken = program.tokens[cursor.prev]

  const isStruct = program.getStructTypes().includes(prevToken?.data)
  

  if(prevToken?.type !== 'keyword' && !isStruct) return false


  const nextToken = program.tokens[cursor.next]
  if(nextToken?.data !== '(') return false


  const p = getFuncParameters(program, cursor.clone().forward())
  

  if(!p) return false
  const [pCursor, pStmts] = p

  
  const b = getBody(program, pCursor.forward())

  if(!b) return false

  const [bCursor, bStmts] = b

  const fd = new FunctionDeclaration(
    currentToken.data,
    prevToken.data,
    pStmts,
    bStmts
  )

  return [bCursor, fd]


}

type ParseResult = false | [Cursor, any]

const addToProgram = (program, pr: ParseResult) => {
  if(pr) {
    const [_cursor, _stmt] = pr
    program.addNode(_stmt)
    return parseProgram(program, _cursor)
  }
}

export class VariableDeclarator {
  name: string
  dataType: string
  constructor(name, dataType) {
    this.name = name
    this.dataType = dataType
  }
}

type StructType = string
export class StructDeclaration  {
  name: StructType
  fields: VariableDeclarator[]
  declarations: VariableDeclarator[]

  constructor(name, fields, declarations?) {
    this.name = name
    this.fields = fields
    if(declarations) {
      this.declarations = declarations
    }
  }

  setDeclarations (declarations: VariableDeclarator[]){
    this.declarations = declarations
  }
}

const obtainStuctFields = (program, cursor, fields: VariableDeclarator[]) => {
  
  if(cursor.eof) return fields
  
  // get: dataType name;
  const ct = program.tokens[cursor.current]
  const dataType = ct.data
  
  const nt = program.tokens[cursor.next]
  const name = nt.data

  const d = new VariableDeclarator(name, dataType)
  fields.push(d)
  
  return obtainStuctFields(program, cursor.forward(3), fields)
  
}

const obtainStructScopeDeclarations = (program, cursor, dataType, decls: VariableDeclarator[]) => {
  if(cursor.eof) return decls
  
  const ct = program.tokens[cursor.current]
  if(ct.type === 'ident') {
    decls.push(new VariableDeclarator(ct.data, dataType))
  }
  return obtainStructScopeDeclarations(program, cursor.forward(), dataType, decls)
}

const getStructDeclaration = (program, cursor): false | [Cursor, StructDeclaration] => {
  
  const ct = program.tokens[cursor.current]
  if(ct.type !== 'keyword' || ct.data !== 'struct') return false

  const nt = program.tokens[cursor.next]
  if(nt.type !== 'ident') return false

  const name = nt.data

  const [bodyCursor, restCursor] = obtainParenthesesScopeCursor(program, cursor.forward().forward().forward(), [['{'], ['}']])
  
  const fields = obtainStuctFields(program, bodyCursor, [])

  const sd = new StructDeclaration(name, fields)

  const _rc = findTokenCursor(program, restCursor, { type: 'operator', data: ';' })
  if(!_rc) return [restCursor, sd]
  
  const [declCursor, _restCursor] = _rc.split()
  const declarations = obtainStructScopeDeclarations(program, declCursor, sd.name, [])

  sd.setDeclarations(declarations)

  
  return [_restCursor.forward(), sd]
}


// const getStuctVariableDeclaration = (program: Program, cursor): false | [Cursor, VariableDeclaration] => {

//   const ct = program.tokens[cursor.current]
//   if(ct.type !== 'ident') return false
//   const name = ct.data
  

//   const pt = program.pt(cursor)
//   if(pt.type !== 'ident') return false
  
//   const structTypes = program.getStructTypes()
//   const dataType = pt.data

//   if(!structTypes.includes(dataType)) return false
  
  
//    const vCursor = findTokenCursor(program, cursor, { type: 'operator', data: ';' })
//    if(!vCursor) return false
  
//    const [vdCursor, restCursor] = vCursor.split()

//    vdCursor.moveTo(cursor.current)
   
//    getVariableDeclaration(program)

//    const vd = new VariableDeclaration(dataType, name)

//   const vdnt = program.nt(vdCursor)
//   if(vdnt && assignmentOperators.includes(vdnt.data)) {
    
//     const initializer = obtainStuctVariableInitialiser(program, vdCursor.forward(2))
//     vd.setInitializer(initializer)

//   }



//    return [restCursor.forward(), vd]
// }

const getAssignmentExpression = (program, cursor: Cursor) => {
  const ct = program.ct(cursor)
  if(!assignmentOperators.includes(ct.data)) return
  
  const [leftCursor, rightCursor] = cursor.split()

  const vCursor = findPrevTokenCursor(program, leftCursor, { type: 'operator', data: ';' })
  const rCursor = findTokenCursor(program, rightCursor, { type: 'operator', data: ';' })

  if(!vCursor || !rCursor) return false
  
  const leftStmt = parseBodyTokens(program, leftCursor, null)
  const [arCursor, restCursor] = rCursor.split()
  
  const rightStmt = parseBodyTokens(program, arCursor, null)
  
  const ae = new AssignmentExpression(ct.data, leftStmt, rightStmt)

  return [restCursor, ae]
}

const parseProgram = (program:Program, cursor) => {

  if(cursor.eof) return program

  const f = getFunctionDeclaration(program, cursor)
  if(f) {
    const [_cursor, stmt] = f
    program.addNode(stmt)
    return parseProgram(program, _cursor)
  }

  const pi = getPragmaImportDeclaration(program, cursor)
  if(pi) {
    const [_cursor, stmt] = pi
    program.addNode(stmt)
    return parseProgram(program, _cursor)
  }

  const dd = getDefineDeclaration(program, cursor) 
  if(dd) {
    const [_cursor, stmt] = dd
    program.addNode(stmt)
    return parseProgram(program, _cursor)
  }

  const sd = getStructDeclaration(program, cursor)
  if(sd) {
    const [_cursor, stmt] = sd
    program.addNode(stmt)
    return parseProgram(program, _cursor)
  }

  const svd = getVariableDeclarations(program, cursor)
  
  if(svd) {
    const [_cursor, stmt] = svd
    program.addNode(stmt)
    return parseProgram(program, _cursor)
  }

  
  const vld = getVariableDeclarationWithLayoutToken(program, cursor)
  if(vld){
      const [_cursor, _stmt] = vld
      program.addNode(_stmt)

      return parseProgram(program, _cursor)
  }




  const vd = getVariableDeclaration(program, cursor)
  if(vd){
    const [_cursor, _stmt] = vd
    program.addNode(_stmt)

    return parseProgram(program, _cursor)
  }


  const vdef = getVariableDefinition(program, cursor)
  if(vdef) {
    const [_cursor, stmt] = vdef
    program.addNode(stmt)
    return parseProgram(program, _cursor)
  }
  

  const ae = getAssignmentExpression(program, cursor);
  if(ae){
    const [_cursor, _stmt] = ae
    program.addNode(_stmt)

    return parseProgram(program, _cursor)
  }

  const pd = getPrecisionQualifier(program, cursor)
  if(pd) return addToProgram(program, pd)




  return parseProgram(program, cursor.forward())
}

export class ImportDeclaration {
  functionNames
  src
  constructor(functionNames, src){
    this.functionNames = functionNames
    this.src = src
  }
 }



const getPragmaImportDeclaration = (program, cursor): false | [Cursor, ImportDeclaration] => {

  const ct = program.tokens[cursor.current]
  
  if(ct.type !== 'preprocessor') return false

  const importBlock = ct.data.match(/#pragma\:?\s?import\s+(.*)/)

  if(!importBlock || importBlock.length<2) return false
  
  const funcSrcPaar = importBlock[1].match(/\{(.*)\}\s+from\s+(.*)/)
  
  if(!funcSrcPaar && funcSrcPaar.length < 3) return false

  const functionNames = funcSrcPaar[1].split(',').map(f => f.trim())
  const src = funcSrcPaar[2];
  
  
  return [cursor.forward(), new ImportDeclaration(functionNames, src)]
}

export class DefineDeclaration {
  ident: string
  value: string
  constructor(ident, value){
    this.ident = ident
    this.value = value
  }

}

const getDefineDeclaration = (program, cursor): false | [Cursor, DefineDeclaration] => {

  const ct = program.tokens[cursor.current]
  
  if(ct.type !== 'preprocessor') return false

  const defineBlock = ct.data.match(/#define\:?\s(.*)\s+(.*)/)

  if(!defineBlock || defineBlock.length != 3) return false

  const [_, ident, value] = defineBlock

  const d= new DefineDeclaration(ident, value)
  
  return [cursor.forward(), d]
}
export class PrecisionQualifierDeclaration {
  precisionQualifier
  dataType
  constructor(precisionQualifier, dataType) {
    this.precisionQualifier = precisionQualifier
    this.dataType = dataType
  }
}

const precicionKeyowrds = ['mediump', 'highp', 'lowp']


const getPrecisionQualifier = (program, cursor): false | [Cursor, PrecisionQualifierDeclaration] => {
  const ct = program.tokens[cursor.current]
  if(ct.data !== 'precision' && ct.type !== 'keyword') return false
  
  const c2 = cursor.clone().forward()
  const c2t = program.tokens[c2.current]
  if(c2t.type !== 'keyword' || !precicionKeyowrds.includes(c2t.data)) return false

  c2.forward()
  const c3t = program.tokens[c2.current]
  if(c3t.type !== 'keyword') return false
  
  return [c2.forward(), new PrecisionQualifierDeclaration(c2t.data, c3t.data)]


}


export const aggregateCursorGroups = (program, cursor, terminateCB: (cursor: Cursor) => boolean) => {

  const obtainScope = (cursor2, locsCursor: number[][] = [[]], acc: Cursor[] = []) => {
   
    if(terminateCB(cursor2)) return acc

    locsCursor[locsCursor.length - 1].push(cursor2.current)
  
    const currentToken = program.tokens[cursor2.current]
    if(isIfStatement(program, cursor2)) {
      const [ifCursor, restCursor] = obtainIfCursorScope(program, cursor2);
      acc[locsCursor.length - 1] = ifCursor
      locsCursor.push([])
      return obtainScope(restCursor, locsCursor, acc)
    }
    if(isForStatement(program, cursor2)) {
      const [forCursor, restCursor] = obtainForCursorScope(program, cursor2);
      acc[locsCursor.length - 1] = forCursor
      locsCursor.push([])
      return obtainScope(restCursor, locsCursor, acc)
    }
    if(isSwitchStatement(program, cursor2)) {
      const [swithCursor, restCursor] = obtainSwitchCursorScope(program, cursor2);
      acc[locsCursor.length - 1] = swithCursor
      locsCursor.push([])
      return obtainScope(restCursor, locsCursor, acc)
    }
    if(isWhileStatement(program, cursor2)) {
      const [whileCursor, restCursor] = obtainWhileCursorScope(program, cursor2);
      acc[locsCursor.length - 1] = whileCursor
      locsCursor.push([])
      return obtainScope(restCursor, locsCursor, acc)
    }
    if(currentToken.data === ';'){
      
      acc[locsCursor.length - 1] = new Cursor(locsCursor[locsCursor.length - 1])
      locsCursor.push([])
      return obtainScope(cursor2.forward(), locsCursor, acc)
    }
  
    return obtainScope(cursor2.forward(), locsCursor, acc)
  }
  
  return obtainScope(cursor)
  
}


export const parseBody = (program, cursor) => {


  const cursorGroups = aggregateCursorGroups(program, cursor, (cursor) => cursor.eof)

  const stmts = cursorGroups.map(locCursor => parseBodyTokens(program, locCursor, null))
  
  return BlockStatement.from(stmts)
  
}

export const obtainParenthesesScopeCursor = (program, cursor, p = [['('],[')']], debug?) => {
  const obtainScope = (cursor2, depth = 0): [Cursor, Cursor] => {

    const currentToken = program.tokens[cursor2.current]
    //console.log('currentToken', currentToken)
    if (currentToken.data == p[1]){
      if(depth === 0) {
        
        
        const split = cursor2.split(cursor.pos)
        return split
      }
      else return obtainScope(cursor2.forward(), depth - 1)
    }

    if (currentToken.data == p[0]){
      return obtainScope(cursor2.forward(), depth + 1)
    }

    return obtainScope(cursor2.forward(), depth)    
  }

  return obtainScope(cursor.clone())
}




export class BinaryExpression {

  operator
  left
  right
  parentheses?
  
  constructor ({operator, left, right, ...rest}) {
    this.operator = operator
    this.left = left
    this.right = right

    if(rest.parentheses) {
      this.parentheses = true
    }
  }

  static init (operator, left, right) {
    return new BinaryExpression({operator, left, right})
  }

  propagate(operator, right) {
    return new BinaryExpression({
      operator,
      left: this,
      right,
    })
  }

  propagateToRightNode(operator, right) {
    return new BinaryExpression({
      operator: this.operator,
      left: this.left,
      right: new BinaryExpression({
        operator, 
        left: this.right,
        right
      }),
    })
  }
}


const createBinaryExpression = (next, op, prev, bo) => {
  // If there's no existing binary operation or the operation is not multiplication,
  // we can directly create a new BinaryExpression.
  if (!(bo instanceof BinaryExpression) || op.data !== '*') {
    return BinaryExpression.init(op.data, bo || prev, next);
  }

  // At this point, we have an existing binary operation (bo) and the operation is multiplication.

  return bo.parentheses 
  ? bo.propagate(op.data, next) 
  : bo.propagateToRightNode(op.data, next);
};



const getNegativSigned = (program, cursor) : false | [Cursor, Literal|Identifier] => {

  const ct = program.tokens[cursor.current]
  if(ct.data !== '-') return false

  const prev = program.tokens[cursor.prev]  
  const next = program.tokens[cursor.next]
  

  if(((!prev || !['integer', 'float', 'ident'].includes(prev.type)))
  && ['integer', 'float', 'ident'].includes(next.type)
  
  ) {
    if(!prev  || (prev && prev.data !== ')')) {
      
      const t = {...next, data: `${ct.data}${next.data}`}
      //console.log('- op', ct, prev, next, t)
      
      return [cursor.forward().forward(), createLiteralOrIdent(t)]
    }
    
  }

  return false;
}


const addBinaryExpression = (program, cursor, bo) => {

  const prev = program.tokens[cursor.prev]
  const op = program.tokens[cursor.current]
  const next = program.tokens[cursor.next]
  
  
  
  // right operand parenteses
  if(next.data === '(') {
    const [c1, c2] = obtainParenthesesScopeCursor(program, cursor.forward().forward())
    
    const aggr = parseBodyTokens(program, c1, null)
    const nextBO = aggr instanceof BinaryExpression
    ? new BinaryExpression({...aggr, parentheses: true})
    : aggr
    

    const pb = createBinaryExpression(nextBO, op, prev, bo) 

    return [c2, pb]
  }

  if(isFunctionCallToken(program, cursor.clone().forward())){
    const [_cursor, _aggr] = addFunctionCall(program, cursor.forward())
    
    const pb = createBinaryExpression(_aggr, op, prev, bo) 

    return [_cursor, pb]
  }

  const me = getMemberExpression(program, cursor.clone().forward())
  if(me){
    const [_cursor, _aggr] = me
    
    const pb = createBinaryExpression(_aggr, op, prev, bo) 

    return [_cursor, pb]
  }

  const r = getNegativSigned(program, cursor.clone().forward())
  if(r) {
    const [_cursor, _next] = r
    const npb = createBinaryExpression(
      _next, 
      op, 
      prev, 
      bo) 
      return [_cursor, npb]   
  }

  const pb = createBinaryExpression(
    createLiteralOrIdent(next), 
    op, 
    prev, 
    bo) 

  return [cursor.forward().forward(), pb]   
}


export const obtainCommaSeparatedArguments = (program, cursor) => {

  const argsCursor = []

  const split = (groups = [[]], cursor2, depth = 0) => {
    
    if(cursor2.eof)  {
      argsCursor.push(new Cursor(groups[groups.length - 1]))
      return groups
    } 
    
    const currentToken = program.tokens[cursor2.current]
    
    if(currentToken.data === ',' && depth === 0){
      argsCursor.push(new Cursor(groups[groups.length - 1]))
      groups.push([])
      return split(groups, cursor2.forward())
    }

    groups[groups.length - 1].push(cursor2.current)
    
    if(currentToken.data === '('){
      return split(groups, cursor2.forward(), depth + 1)
    }

    if(currentToken.data === ')'){
      return split(groups, cursor2.forward(), depth - 1)
    }
    
    return split(groups, cursor2.forward(), depth)

  }
  
  const groups = split([[]], cursor.clone())

  return argsCursor

}

export class FunctionCall {

  name
  args
  
  constructor (name, args?) {
    this.name = name
    
    this.args = args || []
    
    
  }

  addArgument(arg) {
    this.args.push(arg)
  }
}
export class ConstructorCall extends FunctionCall{}

const isFunctionCallToken = (program, cursor) => {
  const currentToken = program.tokens[cursor.current]
  const nextToken = program.tokens[cursor.next]
  
  return ['builtin', 'keyword', 'ident'].includes(currentToken.type) 
  && nextToken 
  && nextToken.data === '('
  
}
const addFunctionCall = (program, cursor): [Cursor, FunctionCall|ConstructorCall] => {
  
  if(!isFunctionCallToken(program, cursor)){
    throw new Error('not a function call token')
  }
  
  // function arguments
  const currentToken = program.tokens[cursor.current]
  
    const fc = currentToken.type === 'keyword' 
    ? new ConstructorCall(currentToken.data)
    : new FunctionCall(currentToken.data)

    const [c1, c2] = obtainParenthesesScopeCursor(program, cursor.forward().forward())
    const argGroups = obtainCommaSeparatedArguments(program, c1)
    
    argGroups.forEach(argCursor => {
        const arg = parseBodyTokens(program, argCursor, null)
        fc.addArgument(arg)
      })

    return [c2, fc]
  
}





const assignmentOperators = ['=', '+=', '-=', '*=', '/=', '&=', '|=', '^=', '<<=', '>>=']

const isAssignmentExpressionToken = (program, cursor, aggs) => {
  const ct = program.tokens[cursor.current]

  const b = (
    aggs instanceof MemberExpression || 
    aggs instanceof Identifier) && ct && assignmentOperators.includes(ct.data)

  return b

}

export class AssignmentExpression {
  operator
  left
  right

  constructor (operator, left, right) {
    this.operator = operator
    this.left = left
    this.right = right
  }
}

export class CompoundAssignmentExpression extends AssignmentExpression {}

const addAssignmentExpression = (program, cursor, aggs) => {
  if(!isAssignmentExpressionToken(program, cursor, aggs)){
    throw new Error('not a assignment expresson token')
  }

  const ct = program.tokens[cursor.current]
  const left = aggs
  const right = parseBodyTokens(program, cursor.forward(), null)

  const stmt = ct.data === '='
  ? new AssignmentExpression(ct.data, left, right)
  : new CompoundAssignmentExpression(ct.data, left, right)
  return [cursor.toEof(), stmt]

}

interface  StmtNode {}

export class Literal implements StmtNode {
  value
  type
  constructor(value, type){
    this.value = value
    this.type = type
  }
}
export class Identifier implements StmtNode {
  name
  constructor(name){
    this.name = name
  }
}

export const getIdentifier = (program, cursor): false | [Cursor, Identifier] => {

  const ct = program.ct(cursor)

  if(!['ident','builtin'].includes(ct.type)) return false
  
  return [cursor.forward(), new Identifier(ct.data)]

  
}

export const getLiteral = (program, cursor) : false | [Cursor, Literal] => {

  const ct = program.ct(cursor)

  if(!['integer', 'float'].includes(ct.type)) return false
  
  return [cursor.forward(),  new Literal(ct.data, ct.type)]
}

/** akward hack */
const createLiteralOrIdent = (token) => {
  if(['integer', 'float'].includes(token.type)) {
    return new Literal(token.data, token.type)
  }
  else if (['ident', 'builtin'].includes(token.type)) {
    return new Identifier(token.data)
  }
  else {
    throw new Error('token is neither identifier nor literal')
  }
  
}


const isReturnToken = (program, cursor) => {
  
  const ct = program.tokens[cursor.current]
  return ct && ct.type === 'keyword' && ct.data === 'return'
  
}

export class ReturnStatement {
  argument
  constructor(argument){
    this.argument = argument
  }
}

const addReturnStatement = (program, cursor) => {
  const stmt = parseBodyTokens(program, cursor.forward(), null)
  return [cursor.toEnd(), new ReturnStatement(stmt)]
}



export class LayoutQualifier {
  parameter
  constructor (parameter) {
    this.parameter = parameter
  }
}
export class QualifiedVariableDeclaration {
  qualifier?
  
  dataType
  name
  storageQualifier
  precisionQualifier
  initializer

  constructor(dataType, name, storageQualifier, options?) {
    this.name = name
    this.dataType = dataType
    this.storageQualifier = storageQualifier 
    if(options?.qualifier) {
      this.qualifier = options.qualifier
    }
    if(options?.precisionQualifier) {
      this.precisionQualifier = options.precisionQualifier
    }
    if(options?.initializer) {
      this.initializer = options.initializer
    }


  }
}

export class Parameter {
  name
  value?
  constructor(name, value?) {
    this.name = name
    if(value){
      this.value = value
    }
  }
}

const createParameter = (program, cursor) => {
  const ct = program.tokens[cursor.current]
  const name = ct.data
  const nt = program.tokens[cursor.next]
  if(!nt || nt.data !== '=') return new Parameter(name)

  const ct2 = cursor.forward().forward()
  

  const value = program.tokens[ct2.current].data
  
  return new Parameter(name, value)
}

const getVariableDeclarationWithLayoutToken = (program, cursor) : false | [Cursor, QualifiedVariableDeclaration] => {

  const ct = program.tokens[cursor.current]

  if(ct.data !== 'layout') return false

  
  const nt = program.tokens[cursor.next]
  
  if(!nt || nt.data !== '(') return false


  const c2 = cursor.clone().forward().forward()
  const [ct1, ct2] = obtainParenthesesScopeCursor(program, c2)

  const parameter = createParameter(program, ct1)
  const layout = new LayoutQualifier(parameter)
  return getVariableDeclaration(program, ct2.forward(), layout)

}

export const moveToToken = (program,cursor, token): false | Cursor => {
  if(cursor.eof) return false
  const ct = program.tokens[cursor.current]
  if(ct.type == token.type && ct.data == token.data) return cursor
  else return moveToToken(program, cursor.forward(), token)
}

const getExpression = (program, cursor): false | [Cursor, any]=> {
  const rc2 = moveToToken(program, cursor.clone(), {data: ';', type: 'operator'})
  
  if(!rc2) return false

  const [rc2a, rc2b] = rc2.split(cursor.pos)
  const stmt = parseBodyTokens(program, rc2a, null)
  

  return [rc2b, stmt]
  

}

const getVariableDeclaration = (program, cursor, qualifier?) : false | [Cursor, QualifiedVariableDeclaration] => {
  const c2 = cursor.clone()

  const ct = program.tokens[c2.current]


  if(ct.type !== 'keyword' || !['in', 'out', 'uniform', 'const'].includes(ct.data)) return false

  
  const storageQualifier = program.tokens[c2.current].data
  c2.forward()
  
  
  const c2t = program.tokens[c2.current]
  
  if(!c2t || c2t.type !== 'keyword') return false

  let precisionQualifier
  if(precicionKeyowrds.includes(c2t.data)) {
    precisionQualifier = c2t.data
    c2.forward()
    const nt2 = program.tokens[c2.current]
    if(!nt2 || nt2.type !== 'keyword') return false
  }
  
  const dataType = program.tokens[c2.current].data

  c2.forward()
  const c3t = program.tokens[c2.current]
  if(c3t.type !== 'ident') return false

  const name = c3t.data
  
  c2.forward()
  const c4t = program.tokens[c2.current]
  
  let initializer
  let cursorToReturn = c2

  
  if(c4t.data === '=') {
    
    const expr = getExpression(program, c2.forward())

    if(expr) {
      cursorToReturn = expr[0]
      initializer = expr[1]
    }

    
  }

  
  return [cursorToReturn, new QualifiedVariableDeclaration(dataType, name, storageQualifier, {
    qualifier,
    precisionQualifier,
    initializer
  }
  )]

}

export class BlockStatement extends Array {
  
}

export class LogicalExpression {
  operator
  left
  right
  parentheses: boolean

  constructor (operator, left, right, parentheses?){
    this.operator = operator
    this.left = left
    this.right = right
    if(parentheses){
      this.parentheses = parentheses
    }



    // check and fix higher precedence 
    if(operator == '&&') {
        
        if(right.constructor === LogicalExpression && right.operator == '||' && !right.parentheses){
          this.operator = '||'
          this.left = new LogicalExpression('&&', left, right.left)
          this.right = right.right
        }
      
        else if(left.constructor === LogicalExpression && left.operator == '||' && !left.parentheses){
          this.operator = '||'
          this.left = left.left
          this.right = new LogicalExpression('&&', left.right, right)
        }
    }

    
  }
}

const addLogicalExpression = (program, cursor, stmt: any) => {

  const ct = program.tokens[cursor.current]
  if(!['||', '&&'].includes(ct.data)) {
    throw new Error(`not a logical operator ${JSON.stringify(ct)}`)
  }

  const nt = program.tokens[cursor.next]

  // right operand (binary expresson)
  if(['('].includes(nt.data)) {

    const [c1, c2] = obtainParenthesesScopeCursor(program, cursor.forward().forward())
    const right = parseBodyTokens(program, c1, null)
    if([BinaryExpression, LogicalExpression].includes(right.constructor)) {
      right.parentheses = true
    }
    const expr = new LogicalExpression(ct.data, stmt, right)
    return [c2, expr]  
  
  }
  if(isFunctionCallToken(program, cursor.clone().forward())){
    const [_cursor, right] = addFunctionCall(program, cursor.forward())
    // track global cursor pos
    cursor.moveTo(_cursor.current)
    const expr = new LogicalExpression(ct.data, stmt, right)
    
    return [_cursor, expr]
  }

  const me = getMemberExpression(program, cursor.clone().forward())
  if(me){
    const [_cursor, right] = me
    

    
    const expr = new LogicalExpression(ct.data, stmt, right)

    return [_cursor, expr]
  }

  const r = getNegativSigned(program, cursor.clone().forward())
  if(r) {
    const [_cursor, right] = r
    const expr = new LogicalExpression(ct.data, stmt, right)
    return [_cursor, expr]   
  }


  const right = parseBodyTokens(program, cursor.forward(), null)
  const expr = new LogicalExpression(ct.data, stmt, right)

  return [cursor, expr]

} 


export class ConditionalExpression implements StmtNode {
  test: StmtNode
  consequent: StmtNode
  alternate: StmtNode

  constructor (test: StmtNode, consequent: StmtNode, alternate: StmtNode) {
    this.test = test
    this.consequent = consequent
    this.alternate = alternate
  }

}

export const findTokenCursor = (program, cursor, token) : false | Cursor => {
    const _c = cursor.clone()


    while(!_c.eof) {
      const ct = program.tokens[_c.current]
      if(ct.data === token.data && ct.type === token.type){
        return _c
      }
      _c.forward()
    }

    return false

}

const findPrevTokenCursor = (program, cursor, token) : false | Cursor => {
  const _c = cursor.clone()

  _c.toEnd();

  while(!_c.atStart()) {
    const ct = program.ct(_c)
    
    if(ct.data === token.data && ct.type === token.type){
      return _c
    }
    _c.backward()
  }

  return false

}

const getConditionalExpression = (program, cursor, stmt) :  false | [Cursor, ConditionalExpression]  => {

  const ct = program.tokens[cursor.current]
  if(ct.data !== '?') return false
  
  const tokenCursor = findTokenCursor(program, cursor, { type: 'operator', data: ':' })
  if(!tokenCursor) return false

  const [conseq, alter] = tokenCursor.split()
  
  conseq.moveTo(cursor.current)
  
  const conseqStmt = parseBodyTokens(program, conseq, null)
  const alterStmt = parseBodyTokens(program, alter, null)

  const expr = new ConditionalExpression(stmt, conseqStmt, alterStmt)
  

  return [alter, expr]
}

export const parseBodyTokens = (program, cursor, stmt: any) => {

    if(cursor.eof) return stmt

    const currentToken = program.tokens[cursor.current]

    const ue = getUpdateExpressions(program, cursor, stmt);
    if(ue) {
      const [_cursor, _stmt] = ue
      return parseBodyTokens(program, _cursor, _stmt)
    }
    
    const ifStatment = getIfStatement(program, cursor);
    if(ifStatment) {
      const [_cursor, _stmt] = ifStatment
      return parseBodyTokens(program, _cursor, _stmt)
    }

    const switchStmt = getSwitchStatement(program, cursor);
    if(switchStmt) {
      const [_cursor, _stmt] = switchStmt
      return parseBodyTokens(program, _cursor, _stmt)
    }
    const whileStmt = getWhileStatement(program, cursor) 
    if(whileStmt) {
      const [_cursor, _stmt] = whileStmt
      return parseBodyTokens(program, _cursor, _stmt)
    }

    const forStatment = getForStatement(program, cursor);
    if(forStatment) {
      const [_cursor, _stmt] = forStatment
      return parseBodyTokens(program, _cursor, _stmt)
    }

    const condExpr = getConditionalExpression(program, cursor, stmt);
    if(condExpr) {
      const [_cursor, _stmt] = condExpr
      return parseBodyTokens(program, _cursor, _stmt)
    }

    if(isReturnToken(program, cursor)) {
      const [_cursor, _stmt] = addReturnStatement(program, cursor)
      return parseBodyTokens(program, _cursor, _stmt)
    }
    
    if(isFunctionCallToken(program, cursor)){
      const [_cursor, _stmt] = addFunctionCall(program, cursor)
      return parseBodyTokens(program, _cursor, _stmt)
    }



    const me = getMemberExpression(program, cursor)
    if(me) {
      const [_cursor, _stmt] = me
      return parseBodyTokens(program, _cursor, _stmt)
    }

    const vds = getVariableDeclarations(program, cursor)
    if(vds) {
      const [_cursor, _stmt] = vds
      return parseBodyTokens(program, _cursor, _stmt)
    }
    

  
  
  
  if(isAssignmentExpressionToken(program, cursor, stmt)){
    const [_cursor, _stmt] = addAssignmentExpression(program, cursor, stmt)
    return parseBodyTokens(program, _cursor, _stmt)
  }
 
  
    
    // left operand parenteses
    if(['('].includes(currentToken.data)) {

      const [c1, c2] = obtainParenthesesScopeCursor(program, cursor.forward())
      const aggr = parseBodyTokens(program, c1, stmt)
      if([BinaryExpression, LogicalExpression].includes(aggr.constructor)) {
        aggr.parentheses = true      
      } 
      return parseBodyTokens(program, c2, aggr)

    }

    const ns = getNegativSigned(program, cursor)
    if(ns) {
      const [_cursor, _stmt] = ns
      return parseBodyTokens(program, _cursor, _stmt)
    }

    // arithmetic operators
    if(['+', '-', '*', '/'].includes(currentToken.data)) {
      const [_cursor, _stmt] = addBinaryExpression(program, cursor, stmt)
      return parseBodyTokens(program, _cursor, _stmt)
    }
    // relational operators 
    if(['==', '!=', '<', '>', '>=', '<='].includes(currentToken.data)) {
      const [_cursor, _stmt] = addBinaryExpression(program, cursor, stmt)
      return parseBodyTokens(program, _cursor, _stmt)
    }

    // logical operators 
    if(['||', '&&'].includes(currentToken.data)) {
      const [_cursor, _stmt] = addLogicalExpression(program, cursor, stmt)
      return parseBodyTokens(program, _cursor, _stmt)
    }

    const id = getIdentifier(program, cursor)
    if(id) {
      const [_cursor, _stmt] = id

      return parseBodyTokens(program, _cursor, _stmt)
    }
    
    const lit = getLiteral(program, cursor)  
    if(lit) {
      const [_cursor, _stmt] = lit
      return parseBodyTokens(program, _cursor, _stmt)
    }



    return parseBodyTokens(program, cursor.forward(), stmt)
}