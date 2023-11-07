import tokenize from 'glsl-tokenizer/string'
import {of, from, combineLatest, Subject} from 'rxjs'
import {filter, map, scan, mergeMap, toArray, buffer, takeUntil, reduce, endWith, last} from 'rxjs/operators'
import {Token} from './grammar'
import util from 'util'
import { group } from 'console'

const typeMap = {
  'layout': 'LayoutDeclaration',
  'uniform': 'UniformDeclaration',
  'function': 'FunctionDeclaration',
}

const StorageQualifier = ['in', 'out']

const obtainStorageQualifier = (token?: Token) => {
  
  if(!token || token.type!=='keyword' || !StorageQualifier.includes(token.data))
    return
  
  return token.data
}

const getVariableDeclaration = (tokens, cursor) => {


  const currentToken = tokens[cursor.current]
  if(currentToken.type !== 'ident')
    return

  const leftIndex = cursor.left().current;
  const prevToken = tokens[leftIndex]

  if(prevToken.type !== 'keyword' || prevToken.data === 'return')
    return
  
  const left2Index = cursor.left(2).current;

  const storageQualifier = obtainStorageQualifier(tokens[left2Index])
  
  return {
      identifier: currentToken.data,
      type: prevToken.data,
      storageQualifier,
      leftIndex: storageQualifier ? left2Index : leftIndex
  }
  
}

const getParameterDeclaration = (tokens, cursor) => {

  const currentToken = tokens[cursor.current]
  
  if(!tokensEqual(s(currentToken), ['operator', ')'])) return
    
  const variables = []
  const obtainParameterVariables = (cursor) => {
    const variable = getVariableDeclaration(tokens, cursor.left())
    variable && variables.unshift(variable)

    const beforeDeclCursor = cursor.left(3);
    const beforeDeclIndex = beforeDeclCursor.current;
    const beforeDeclToken = tokens[beforeDeclIndex];
    
    if(beforeDeclToken.type === 'operator' && beforeDeclToken.data === ','){
      return obtainParameterVariables(beforeDeclCursor)
    }
    
    if(beforeDeclToken.type === 'operator' && beforeDeclToken.data === '('){
      return {
        variables,
        leftIndex: beforeDeclIndex
      }
    }
    
    // for empty parameter list
    const openIndex = cursor.left().current
    const openToken = tokens[openIndex];
    if(openToken.type === 'operator' && openToken.data === '('){
      return {
        variables,
        leftIndex: openIndex
      }
    }
  }

  return obtainParameterVariables(cursor)

}



const lookUpForToken = (tokens, cursor, [type, data], [t_type, t_data]) => {

  const lookUp = (cursor) => {
    if(cursor.isEmpty()) return 
  
    const currentToken = tokens[cursor.current]
    if(currentToken.type === type && currentToken.data === data){
      return cursor
    }
    
    // terminate
    if(currentToken.type === t_type && currentToken.data === t_data) {
      return
    }
    else return lookUp(cursor.left())
  }

  return lookUp(cursor)
}

const verifyTokenSequence = (tokens, cursor, sequence, terminateToken) => {
  const fs = sequence.reverse().filter((token, i) => lookUpForToken(tokens, cursor, token, sequence[i+1] || terminateToken))
  return fs.length === sequence.length
}

const obtainLocation = (tokens, cursor) => {
  const currentToken = tokens[cursor.current]
  if(currentToken.type !== 'operator' || currentToken.data !== ')')
    return false

  const c = verifyTokenSequence(
    tokens, 
    cursor, 
    [['ident', 'location'], ['operator', '=']],
    ['operator', '('])
  
  if(!c) return
  
  const location = tokens[cursor.left().current]

  if(!location || !location.data)
    return

  return location.data

}

const getLayoutDecl = (tokens, cursor) => {
    
    const currentToken = tokens[cursor.current]
    if(!currentToken || currentToken.type !== 'operator' || currentToken.data !== ';')       
      return


    const leftCursor = cursor.left()
    
    const layoutCursor = lookUpForToken(tokens, leftCursor, ['keyword', 'layout'], ['operator', ';'])
    if(!layoutCursor) return 

    const variablDecl = getVariableDeclaration(tokens, leftCursor)
    const cursor2 = cursor.leftTo(variablDecl.leftIndex).left()

    const location = obtainLocation(tokens, cursor2)
    if(!location) return 

    return {
      ...variablDecl,
      location,
      leftIndex: layoutCursor.current
    }
}

const getUniformDecl = (tokens, cursor) => {

  const currentToken = tokens[cursor.current]
  if(!currentToken || currentToken.type !== 'operator' || currentToken.data !== ';') 
    return

  const leftCursor = cursor.left()
  const uCursor = lookUpForToken(tokens, leftCursor, ['keyword', 'uniform'], ['operator', ';'])
  if(!uCursor) return 

  const variableDecl = getVariableDeclaration(tokens, leftCursor);
  if(!variableDecl) return

  
  return {
    ...variableDecl,
    leftIndex: uCursor.current
  }
}

const getFunctionHeadDecl = (tokens, cursor) => {
  
  const paramters = getParameterDeclaration(tokens, cursor.left())
  
  if (!paramters) return

  const cursor2 = cursor.leftTo(paramters.leftIndex).left()
  const identity = getVariableDeclaration(tokens, cursor2)
  
  if(!identity) return

  return {
    identity,
    paramters
  }
}

const getCallHead = (tokens, cursor) => {
  const currentToken = tokens[cursor.current]

  if(!currentToken) return

  if(!['builtin', 'keyword'].includes(currentToken.type)) return

  const [type, name] = s(currentToken)
  
  if(type === 'builtin'){
    return {FunctionCall: {name}}
  }
  return {ConstructorCall: {name}}
}


const tokensSplitBy = (tokens, cursor, splitToken, leftBorder) => {
  
  const getGroups = (leftTimes = 1, groups = [[]]) => {
    const index = cursor.left(leftTimes).current;
    const token = tokens[index]
    if(!token) return groups
    
    const nextLeftTimes = leftTimes + 1;

    if(tokensEqual(s(token), splitToken)){
      groups.push([])
      return getGroups(nextLeftTimes, groups)
    }
    groups[groups.length - 1.].push(token)
    if(leftBorder < cursor.left(nextLeftTimes).current) {
      return getGroups(nextLeftTimes, groups)
    }else {
      return groups
    } 
  } 
  
  const groups = getGroups()

  // reverse since we read from right to left
  return groups.reverse().map(([g]) => s(g))

}

const getCallArgs = (tokens, cursor, leftBorder) => {
    const args = tokensSplitBy(tokens, cursor, ['operator', ','], leftBorder)
    return args
}

const getCallDecl = (tokens, cursor) => {
  const openCursor = lookUpForToken(tokens, cursor.left(), ['operator', '('], ['operator', ')'])

  if(!openCursor) return

  const functionCallHead = getCallHead(tokens, openCursor.left());
  if(!functionCallHead) return
  
  const functionCallArgs = getCallArgs(tokens, cursor, openCursor.current);

  return {
    head: functionCallHead,
    args: functionCallArgs
  }
  
}

const getExpressionDecl = (exprTokens) => {

  const exprCursor = new Cursor()
  const declarations = []
  
  exprTokens.forEach((token, i) => {
    if(token.type === 'whitespace') return
    exprCursor.right(i)

    if(tokensEqual(s(token), ['operator', ')'])) {
      const callDecl = getCallDecl(exprTokens, exprCursor);
      if(callDecl) {
        declarations.push(callDecl)
      }
     
    }
  })

  return declarations

}

const getAssignmentDecl = (tokens, cursor) => {
  const eqCurosor = lookUpForToken(tokens, cursor.left(), ['operator', '='], ['operator', ';'])
  if(!eqCurosor) return
  
  const variablDecl = getVariableDeclaration(tokens, eqCurosor.left())
  if(!variablDecl) return

  // get right operand without =, so + 1
  const exprTokens = tokens.slice(eqCurosor.current + 1, cursor.current)

  const exprDecls = getExpressionDecl(exprTokens)
  

  return {AssigmentStatement: {
    VariableDeclaration: variablDecl, 
    Expression: exprDecls
  }}
}

const getJumpDecl = (tokens, cursor) => {

  return ''
}

const getFunctionBodyDecl = (bodyTokens) => {

  const bodyCursor = new Cursor()
  const declarations = []
  bodyTokens.forEach((token, i) => {
    if(token.type === 'whitespace') return
    bodyCursor.right(i)

    let decl;
    if(tokensEqual(s(token), ['operator', ';'])) {
      if(decl = getAssignmentDecl(bodyTokens, bodyCursor)) {
        declarations.push(decl)
      }
      if(decl = getJumpDecl(bodyTokens, bodyCursor)) {
        declarations.push(decl)
      }
    }

  })

  //console.log('function decl', declarations)
  console.log(util.inspect(declarations, {showHidden: false, depth: null, colors: false}))

  return declarations;
}

const tokensEqual = (tokenA, tokenB) => {
  return tokenA && tokenB 
  && tokenA[0] === tokenB[0]
  && tokenA[1] === tokenB[1]
}

const s = (token?: Token): [string, string] => token && ([token.type, token.data]) || undefined
const p = (value) => ({
  value,
  n(cb){
    console.log('value', !this.value)

    if(!this.value){
      return this
    }
    this.value = cb(this.value)
    return this
  }
})

const lookUpForBlock = (tokens, cursor, tokenOpen, tokenClose) => {

  const currentToken = tokens[cursor.current]
  
  if(!tokensEqual(s(currentToken), tokenClose)) return
  
  let closeTokenCount = 1.;
  let openTokenCount = 0.;
  let leftCount = 0;
  
  while(openTokenCount !== closeTokenCount || cursor.left(leftCount).isEmpty()){

    const token = tokens[cursor.left(++leftCount).current]
    tokensEqual(s(token), tokenOpen) && openTokenCount++
    tokensEqual(s(token), tokenClose) && closeTokenCount++

  }
  
  // take cursor within a block, so -1
  return cursor.left(leftCount - 1)

}

const getFunctionDecl = (tokens, cursor) => {

  const currentToken = tokens[cursor.current]
  if(!(currentToken.type === 'operator' && currentToken.data === '}')) return

  const blockCursor = lookUpForBlock(tokens, cursor, ['operator', '{'], ['operator', '}'])

   if(blockCursor.isEmpty()) return
  
  const functionHead = getFunctionHeadDecl(tokens, blockCursor.left())
  if(!functionHead) return

  const bodyTokens = tokens.slice(blockCursor.current, cursor.current)

  const functionBody = getFunctionBodyDecl(bodyTokens)

  // return {
  //   head: functionHead
  // }

  return ''
}

const VariablesDeclarationsStack: any[] = []
const FunctionDeclarationsStack: any[] = []
const ParameterDeclarationsSrack: any[] = []


class Cursor {
  public indexQueue: number[]
  constructor(indexQueue: number[] = []){
    this.indexQueue = indexQueue
  }

  isEmpty(){
    return this.indexQueue.length === 0;
  }

  next(){
    this.current
  }

  right(index){
    this.indexQueue.push(index)
  }

  left(times: number = 1){
    return times <= 0 
    ? this
    : new Cursor(this.indexQueue.slice(0, -times))
  }

  leftTo(index: number){
    return new Cursor(this.indexQueue.filter(i => i <= index))
  }

  get current(): number | null {
    return !this.isEmpty() ? this.indexQueue[this.indexQueue.length - 1] : null;
  }
  
}

class Cursor2 {
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

  get prev(){
    if(this.pos != 0){
      return this.indexQueue[this.pos - 1.];
    } else {
      throw new Error('queue underflow')
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

  split(cursor2: Cursor2, from: number = 0):[Cursor2, Cursor2] {
    const pos2 = cursor2.pos
    return [
      new Cursor2(this.indexQueue.slice(from, pos2 )), 
      new Cursor2(this.indexQueue.slice(pos2 ))
    ]
  }



  clone(){
    const clone = Object.assign( {}, this );
    Object.setPrototypeOf( clone, Cursor2.prototype );
    return clone
  }
}

export const ShaderProcessor = ({
  parse(glslCode: string){

    const string = `
    a + (b + (c + d + f));
    `
    const string0 = `
    a * (b + c);
    `
    const string2 = `
    v + d * (c + a)
    `

    const string3 = `
    (a + b) * c * d * n * (f + q * w)
    `
    
    const inlcudePositionData = false
    const tokens = tokenize(glslCode, {version: '300 es'}).map((token) => {
      if(inlcudePositionData) return token
      const {type, data} = token
      return {type, data}
    });


    const indecies = tokens
    .map((token, i) => {
      return token.type !== 'whitespace' ? i : undefined
    })
    .filter(i => i)
    
    
    const cursor = new Cursor2(indecies)

    const declarations = parseTokens3(tokens, cursor, null)

    
    return declarations



  }
})

const obtainParenthesesScopeCursor = (tokens, cursor) => {
  const obtainScope = (cursor2, depth = 0): [Cursor2, Cursor2] => {
    cursor2.forward()
    const currentToken = tokens[cursor2.current]
    if (currentToken.data == ')'){
      if(depth === 0) {
        
        const split = cursor.split(cursor2, cursor.pos)
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




export class BinaryOperation {

  op
  left
  right
  parentheses?
  
  constructor ({op, left, right, ...rest}) {
    this.op = op
    this.left = left
    this.right = right

    if(rest.parentheses) {
      this.parentheses = true
    }
  }

  static init (op, left, right) {
    return new BinaryOperation({op, left, right})
  }

  propagate(op, right) {
    return new BinaryOperation({
      op,
      left: this,
      right,
    })
  }

  propagateToRightNode(op, right) {
    return new BinaryOperation({
      op: this.op,
      left: this.left,
      right: new BinaryOperation({
        op, 
        left: this.right,
        right
      }),
    })
  }



}


const createBinaryOperation = (next, op, prev, bo) => {
  // If there's no existing binary operation or the operation is not multiplication,
  // we can directly create a new BinaryOperation.
  if (!bo || op.data !== '*') {
    return BinaryOperation.init(op, bo || prev, next);
  }

  // At this point, we have an existing binary operation (bo) and the operation is multiplication.
  return bo.parentheses 
  ? bo.propagate(op, next) 
  : bo.propagateToRightNode(op, next);
};



const addBinaryOperation = (tokens, cursor, bo) => {
  
  const op = tokens[cursor.current]
  const prev = tokens[cursor.prev]
  const next = tokens[cursor.next]
  
  // right operand parenteses
  if(next.data === '(') {
    const [c1, c2] = obtainParenthesesScopeCursor(tokens, cursor.forward().forward())
    const aggr = parseTokens3(tokens, c1.forward(), null)
    const nextBO =  new BinaryOperation({...aggr, parentheses: true})

    const pb = createBinaryOperation(nextBO, op, prev, bo) 

    return [c2, pb]
  }

  const pb = createBinaryOperation(next, op, prev, bo) 

  return [cursor, pb]   
}


const parseTokens3 = (tokens, cursor, aggs: any) => {

    if(cursor.eof) return aggs

    const currentToken = tokens[cursor.current]
    
    // left operand parenteses
    if(['('].includes(currentToken.data)) {

      const [c1, c2] = obtainParenthesesScopeCursor(tokens, cursor.forward())
      const aggr = parseTokens3(tokens, c1.forward(), null)
      const b = new BinaryOperation({...aggr, parentheses: true})      
      return parseTokens3(tokens, c2, b)


    }

    if(['+', '-', '*', '/'].includes(currentToken.data)) {
      const [_cursor, _agg] = addBinaryOperation(tokens, cursor, aggs)
      
      return parseTokens3(tokens, _cursor.forward(), _agg)
    }

    return parseTokens3(tokens, cursor.forward(), aggs)
}