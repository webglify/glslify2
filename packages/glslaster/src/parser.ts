import tokenize from 'glsl-tokenizer/string'
import {Token} from './grammar'


const tokensEqual = (tokenA, tokenB) => {
  return tokenA && tokenB 
  && tokenA[0] === tokenB[0]
  && tokenA[1] === tokenB[1]
}

const s = (token?: Token): [string, string] => token && ([token.type, token.data]) || undefined

class Cursor {
  public indexQueue: number[]
  public pos: number
  
  constructor(indexQueue: number[]){
    this.indexQueue = indexQueue
    this.pos = 0
  }

  get eof() {
    return this.pos == (this.indexQueue.length)
  }

  get next() {
    if(!this.eof){
      return this.indexQueue[this.pos + 1.];
    } else {
      throw new Error('queue overflow')
    }
  }

  get length () {
    return this.indexQueue.length
  }

  get prev(){
    if(this.pos != 0){
      return this.indexQueue[this.pos - 1.];
    } else {
      return undefined
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

  forward(){
    if(!this.eof){
      this.pos += 1.;
      return this
    }
    else {

      throw new Error('queue forward overflow')
    }
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

  atStart(){
    return this.pos === 0;
  }

  split(from: number = 0):[Cursor, Cursor] {
    return [
      new Cursor(this.indexQueue.slice(from, this.pos )), 
      new Cursor(this.indexQueue.slice(this.pos ))
    ]
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
  tokenize(glslCode: string, inlcudePositionData = false){
    this.tokens = tokenize(glslCode, {version: '300 es'}).map((token) => {
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
  
  parseProgramm(){
    return parseProgramm(this.tokens, this.cursor, new Program())
  },
  parseTokens(){
    return parseTokens(this.tokens, this.cursor, null)
  }

})

export class Program {
  body
  nodes

  constructor(body?){
    
    this.body = body ?? []
    
  }

  addNode(node){
    this.body.push(node)
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

const createParameterDeclaration = (tokens, cursor) => {
  const ct = tokens[cursor.current]
  const args = []
  if(['in', 'out'].includes(ct.data)) {
    args.push(ct.data)
    cursor.forward()
  }
  const ct2 = tokens[cursor.current]
  args.splice(0, 0, ct2.data)
  
  cursor.forward()
  const ct3 = tokens[cursor.current]
  args.splice(1, 0, ct3.data)

  return new ParameterDeclaration(args[0], args[1], args[2])
}



const getFuncParameters = (tokens, cursor): false | [c: Cursor, any]  => {

  const currentToken = tokens[cursor.current]
  if(currentToken.data !== '(') return false


  const obtainParamsCursors = (indicies: number[][] = [[]], cursors: Cursor[] = []) => {
    cursor.forward()
    
    const ct = tokens[cursor.current]
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

  const pCursors = obtainParamsCursors()
  const parameters = pCursors.map(pCursor => createParameterDeclaration(tokens, pCursor))

  return [cursor, parameters]
}

const getBody = (tokens, cursor): false | [c: Cursor, any]  => {

  const ct = tokens[cursor.current]
  if(ct.data !== '{') return

  
  const obtainBodyCursor = (cursor2, depth=0) => {

    const ct2 = tokens[cursor2.current]
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

  const stmt = parseBody(tokens, c1)

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

const getFunctionDeclaration = (tokens, cursor): false | [c: Cursor, any]  => {

  const currentToken = tokens[cursor.current]
  if(currentToken.type !== 'ident') return false

  const prevToken = tokens[cursor.prev]
  if(prevToken?.type !== 'keyword') return false

  const nextToken = tokens[cursor.next]
  if(nextToken?.data !== '(') return false

  const p = getFuncParameters(tokens, cursor.clone().forward())
  if(!p) return false
  const [pCursor, pStmts] = p
  
  const b = getBody(tokens, pCursor.forward())
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

const parseProgramm = (tokens, cursor, p: Program) => {

  if(cursor.eof) return p

  const f = getFunctionDeclaration(tokens, cursor)
  if(f) {
    const [_cursor, stmt] = f
    p.addNode(stmt)
    return parseProgramm(tokens, _cursor, p)
  }


  return parseProgramm(tokens, cursor.forward(), p)



}



const parseBody = (tokens, cursor) => {

  const obtainScope = (cursor2, locsCursor: number[][] = [[]], acc: Cursor[] = []) => {

    if(cursor2.eof){      
      return acc
    }
    
    locsCursor[locsCursor.length - 1].push(cursor2.current)

    const currentToken = tokens[cursor2.current]

    if(currentToken.data === ';'){
      
      acc[locsCursor.length - 1] = new Cursor(locsCursor[locsCursor.length - 1])
      locsCursor.push([])
      return obtainScope(cursor2.forward(), locsCursor, acc)
    }

    return obtainScope(cursor2.forward(), locsCursor, acc)
  }

  const locsC = obtainScope(cursor)

  const stmts = locsC.map(locCursor => parseTokens(tokens, locCursor, null))
  console.log('stmts', locsC)

  return stmts
  

}

const obtainParenthesesScopeCursor = (tokens, cursor) => {
  const obtainScope = (cursor2, depth = 0): [Cursor, Cursor] => {
    cursor2.forward()
    const currentToken = tokens[cursor2.current]
    if (currentToken.data == ')'){
      if(depth === 0) {
        
        const split = cursor2.split(cursor.pos)
        return split
      }
      else return obtainScope(cursor2, depth - 1)
    }

    if (currentToken.data == '('){
      return obtainScope(cursor2, depth + 1)
    }

    return obtainScope(cursor2, depth)    
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
  ? bo.propagate(op, next) 
  : bo.propagateToRightNode(op, next);
};



const addBinaryExpression = (tokens, cursor, bo) => {
  
  const op = tokens[cursor.current]
  const prev = tokens[cursor.prev]
  const next = tokens[cursor.next]
  
  // right operand parenteses
  if(next.data === '(') {
    const [c1, c2] = obtainParenthesesScopeCursor(tokens, cursor.forward().forward())
    const aggr = parseTokens(tokens, c1, null)
    const nextBO =  new BinaryExpression({...aggr, parentheses: true})

    const pb = createBinaryExpression(nextBO, op, prev, bo) 

    return [c2, pb]
  }

  if(isFunctionCallToken(tokens, cursor.clone().forward())){
    const [_cursor, _aggr] = addFunctionCall(tokens, cursor.forward())
    
    const pb = createBinaryExpression(_aggr, op, prev, bo) 

    return [_cursor, pb]
  }

  const pb = createBinaryExpression(
    createLiteralOrIdent(next), 
    op, 
    prev, 
    bo) 

  return [cursor.forward(), pb]   
}


const obtainFunctionArguments = (tokens, cursor) => {

  const argsCursor = []

  const split = (groups = [[]], cursor2, depth = 0) => {
    
    if(cursor2.eof)  {
      argsCursor.push(new Cursor(groups[groups.length - 1]))
      return groups
    } 
    
    const currentToken = tokens[cursor2.current]
    
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
  
  constructor (token, args = []) {
    this.name = token.data
    this.args = args
  }

  addArgument(arg) {
    this.args.push(arg)
  }
}
export class ConstructorCall extends FunctionCall{}

const isFunctionCallToken = (tokens, cursor) => {
  const currentToken = tokens[cursor.current]
  const nextToken = tokens[cursor.next]
  
  return ['builtin', 'keyword', 'ident'].includes(currentToken.type) 
  && nextToken 
  && nextToken.data === '('
  
}
const addFunctionCall = (tokens, cursor) => {
  
  if(!isFunctionCallToken(tokens, cursor)){
    throw new Error('not a function call token')
  }
  
  // function arguments
  const currentToken = tokens[cursor.current]
  
    const fc = currentToken.type === 'keyword' 
    ? new ConstructorCall(currentToken)
    : new FunctionCall(currentToken)

    const [c1, c2] = obtainParenthesesScopeCursor(tokens, cursor.forward().forward())
    const argGroups = obtainFunctionArguments(tokens, c1)
    
    argGroups.forEach(argCursor => {
        const arg = parseTokens(tokens, argCursor, null)
        fc.addArgument(arg)
      })

    return [c2, fc]
  
}

export class VariableDeclaration {
  dataType
  name
  initializer

  constructor (dataType, identifier, initializer) {
    this.dataType = dataType.data
    this.name = identifier.data
    this.initializer = initializer
  }
}

const isVariableDeclarationToken = (tokens, cursor) => {
  const currentToken = tokens[cursor.current]
  const prevToken = tokens[cursor.prev]
  const nextToken = tokens[cursor.next]

  return currentToken.type === 'ident' 
  && prevToken && prevToken.type === 'keyword'
  && nextToken && nextToken.data === '='
}

const addVariableDeclaration = (tokens, cursor) => {
  if(!isVariableDeclarationToken(tokens, cursor)){
    throw new Error('token is not a variable declaration')
  }

  const dataType = tokens[cursor.prev]
  const identifier = tokens[cursor.current]

  const initializer = parseTokens(tokens, cursor.forward(), null)
  const vd = new VariableDeclaration(dataType, identifier, initializer)
  return [cursor.toEnd(), vd]
  
}

const assignmentOperators = ['=', '+=', '-=', '*=', '/=']

const isAssignmentExpressionToken = (tokens, cursor) => {
  const currentToken = tokens[cursor.current]
  const nextToken = tokens[cursor.next]

  return currentToken.type === 'ident' && nextToken && assignmentOperators.includes(nextToken.data)

}

export class AssignmentExpression {
  operator
  left
  right

  constructor (operator, left, right) {
    this.operator = operator.data
    this.left = left
    this.right = right
  }
}

export class CompoundAssignmentExpression extends AssignmentExpression {}

const addAssignmentExpression = (tokens, cursor) => {
  if(!isAssignmentExpressionToken(tokens, cursor)){
    throw new Error('not a assignment expresson token')
  }

  const currentToken = tokens[cursor.current]
  const nextToken = tokens[cursor.next]
  const left = new Identifier(currentToken.data)
  const right = parseTokens(tokens, cursor.forward().forward(), null)


  const stmt = nextToken.data === '='
  ? new AssignmentExpression(nextToken, left, right)
  : new CompoundAssignmentExpression(nextToken, left, right)
  return [cursor.toEnd(), stmt]

}

export class Literal {
  value
  type
  constructor(value, type){
    this.value = value
    this.type = type
  }
}
export class Identifier {
  name
  constructor(name){
    this.name = name
  }
}

const createLiteralOrIdent = ({type, data}) => {

  if(!['ident', 'integer', 'float'].includes(type)) {
    throw new Error(`token is not Literal nor Identifier: ${type}, ${data}`)
  }
  return type === 'ident'
  ? new Identifier(data)
  : new Literal(data, type)
}

const addLiteralIdent = (tokens, cursor) => {
 
  return [cursor, createLiteralOrIdent(tokens[cursor.current])]
}


const isReturnToken = (tokens, cursor) => {
  
  return tokensEqual(s(tokens[cursor.current]), ['keyword', 'return'])
  
}

export class ReturnStatement {
  argument
  constructor(argument){
    this.argument = argument
  }
}

const addReturnStatement = (tokens, cursor) => {
  const stmt = parseTokens(tokens, cursor.forward(), null)
  return [cursor.toEnd(), new ReturnStatement(stmt)]
}

const parseTokens = (tokens, cursor, stmt: any) => {

    if(cursor.eof) return stmt

    const currentToken = tokens[cursor.current]

    if(isReturnToken(tokens, cursor)) {
      const [_cursor, _stmt] = addReturnStatement(tokens, cursor)
      return parseTokens(tokens, _cursor, _stmt)
    }
    
    if(isFunctionCallToken(tokens, cursor)){
      const [_cursor, _stmt] = addFunctionCall(tokens, cursor)
      return parseTokens(tokens, _cursor, _stmt)
    }

    if(isVariableDeclarationToken(tokens, cursor)){
      const [_cursor, _stmt] = addVariableDeclaration(tokens, cursor)
      console.log('_stmt', _stmt, _cursor)
      return parseTokens(tokens, _cursor, _stmt)
    }

    if(isAssignmentExpressionToken(tokens, cursor)){
      const [_cursor, _stmt] = addAssignmentExpression(tokens, cursor)
      return parseTokens(tokens, _cursor, _stmt)
    }
    
    // left operand parenteses
    if(['('].includes(currentToken.data)) {

      const [c1, c2] = obtainParenthesesScopeCursor(tokens, cursor.forward())
      const aggr = parseTokens(tokens, c1, null)
      
      const stmt = new BinaryExpression({...aggr, parentheses: true})      
      return parseTokens(tokens, c2, stmt)

    }

    if(['+', '-', '*', '/'].includes(currentToken.data)) {
      const [_cursor, _stmt] = addBinaryExpression(tokens, cursor, stmt)
      
      return parseTokens(tokens, _cursor.forward(), _stmt)
    }

    if(['integer', 'ident', 'float'].includes(currentToken.type)){
      const [_cursor, _stmt] = addLiteralIdent(tokens, cursor)
      return parseTokens(tokens, _cursor.forward(), _stmt)
    }


    return parseTokens(tokens, cursor.forward(), stmt)
}