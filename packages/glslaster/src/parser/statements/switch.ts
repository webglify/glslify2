import {  findTokenCursor, Cursor, getLiteral, obtainParenthesesScopeCursor, parseBodyTokens, moveToToken } from ".."
import { isForStatement, obtainForCursorScope } from "./for";
import { isIfStatement, obtainIfCursorScope } from "./if";
import { isWhileStatement, obtainWhileCursorScope } from "./while";

export class BreakStatement extends String {
  constructor() {
    super('break;');
    Object.setPrototypeOf(this, BreakStatement.prototype);
  }
}


export class SwitchCase {
  test
  consequent
  constructor (test, consequent) {
    this.test = test
    this.consequent = consequent
  }
}

export class SwitchStatement {
  discriminant
  cases: SwitchCases

  constructor(discriminant, cases) {
    this.discriminant = discriminant
    this.cases = cases
  }
}

export class SwitchConsequent extends Array {}
export class SwitchCases extends Array {}


export const isSwitchStatement = (program, cursor): boolean => {
  const ct = program.ct(cursor)
  
  if(!ct || ct.data !== 'switch' || ct.type !== 'keyword') return false
  
  const nt = program.nt(cursor)
  if(nt.data !== '(' || nt.type !== 'operator') return false
  
  return true
}

export const obtainSwitchCursorScope = (program, cursor): [Cursor, Cursor] => {
  if(!isSwitchStatement(program, cursor)){
    throw new Error('this is not a switch statement')
  }
  
  // take only upcoming tokens
  const [, c] = cursor.split()

  // cover {} scope
  const bodyCursor = moveToToken(program, cursor, {type:'operator', data: '{'})
  if(!bodyCursor) {
    throw new Error ('this is not a correct for loop scope')
  }
  
  const [scopeCursor, _] = obtainParenthesesScopeCursor(program, bodyCursor.forward(), [['{'], ['}']])
  
  // move cursor to the end of the scope
  c.moveTo(scopeCursor.toEnd().current)
  // move out of scope
  c.forward(2)
  //and split
  const [forCursor, restCursor] = c.split()
  
  return [forCursor, restCursor]
  
}

const findExprScopeCursor = (program, cursor) => {


  if(isSwitchStatement(program, cursor)) {
    return obtainSwitchCursorScope(program, cursor);
  }
  if(isWhileStatement(program, cursor)) {

    const [w1, w2] = obtainWhileCursorScope(program, cursor);    
    
    return [w1, w2];
  }
    
  if(isForStatement(program, cursor)) {
    const [f1, f2] = obtainForCursorScope(program, cursor);
    
    return [f1, f2]
  }
   if(isIfStatement(program, cursor)) {
    return obtainIfCursorScope(program, cursor);
   }

  const ec = findTokenCursor(program, cursor, {type: 'operator', data: ';'})
  if(!ec) {
    throw new Error('syntax error for switch case')
  }
  
  const [exprCursor, restCursor] = ec.split()
  
  
  return [exprCursor, restCursor.tryForward()]
}

const obtainConsequent = (program, cursor, consequent: any[] = new SwitchConsequent() ): [Cursor, SwitchConsequent] => {
  
  
  const ct = program.ct(cursor)
  // next token from other case
  if(!ct || ['case', 'default'].includes(ct.data)) {
    return [cursor, consequent]
  }

  if(ct.data == 'break') {
    consequent.push(new BreakStatement())
    return [cursor.forward(2), consequent] 
  }
  
  const [exprCursor, restCursor] = findExprScopeCursor(program, cursor.clone())

  const expr = parseBodyTokens(program, exprCursor, null)
  consequent.push(expr)

  return obtainConsequent(program, restCursor, consequent)
}

const aggregateSwitchCases = (program, cursor, cases: SwitchCases = SwitchCases.from<SwitchCase>([]) ) : SwitchCases => {
  const ct = program.ct(cursor)
  let test = null
  if(ct.data == 'case'){
    test = getLiteral(program, cursor.forward())[1]
  }else if(ct.data == 'default') {
    cursor.forward()
  }
  // go over ':'
  cursor.forward()

  console.log('cursor b', cursor, program.tokens[7])

  const [caseCursor, consequent] = obtainConsequent(program, cursor);
  const _case = new SwitchCase(test, consequent);
  cases.push(_case);

  const nct = program.ct(caseCursor)

  if(nct && ['case', 'default'].includes(nct.data)) {
    return aggregateSwitchCases(program, caseCursor, cases)
  }

  return cases
}

export const getSwitchStatement = (program, cursor): false | [Cursor, SwitchStatement] =>  {
  
  if(!isSwitchStatement(program, cursor)) return false

  const [argCursor, _bodyCursor] = obtainParenthesesScopeCursor(program, cursor.forward(2))
  const discriminant = parseBodyTokens(program, argCursor, null)

  const [scopeCursor, restCursor] = obtainParenthesesScopeCursor(program, _bodyCursor.forward(2), [['{'], ['}']])
  
  const cases = aggregateSwitchCases(program, scopeCursor)

  const ss = new SwitchStatement(discriminant, cases)


  return [restCursor.forward(), ss]
}
