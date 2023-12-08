import {
  obtainParenthesesScopeCursor,
  BinaryExpression,
  BlockStatement,
  parseBodyTokens,
  parseBody,
  moveToToken,
  Cursor
} from '../'

export class IfStatement  {

  test: BinaryExpression
  consequent: BlockStatement
  alternate: Alternate

  constructor(test, consequent, alternate?) {
    this.test = test
    this.consequent = consequent    
    if(alternate){
      this.alternate = alternate
    }
  }

  setAlternate(alternate: Alternate) {
    this.alternate = alternate
  }
}

export class ElseIfStatement extends IfStatement {}

type Alternate = IfStatement | BlockStatement | ElseIfStatement

export const isIfStatement = (program, cursor): boolean => {

  const ct = program.ct(cursor)
  if(!ct || ct.type !== 'keyword' || ct.data !== 'if') return false
  
  const nt = program.nt(cursor)
  if(nt.data != '(') return false

  return true
}

const isIfElseStatement  = (program, cursor): boolean => {
  const isElse = () => {
    const ct = program.ct(cursor)
    if(!ct || ct.type !== 'keyword' || ct.data !== 'else') return false
  
    const nt = program.nt(cursor)
    if(nt.data != '{' && nt.data != 'if') return false

    return true
  }
  return isIfStatement(program, cursor) || isElse()
}


export const obtainIfCursorScope = (program, cursor, prevCursor: Cursor = new Cursor([])): [Cursor, Cursor] => {

  if(!(isIfElseStatement(program, cursor))) {
    throw new Error(`this is not an if statement`)
  }
  
  const [, c] = cursor.split();

  // cover {} scope
  const bodyCursor = moveToToken(program, cursor, {type:'operator', data: '{'})
  if(!bodyCursor) {
    throw new Error ('this is not a correct for loop scope')
  }
  
  const [scopeCursor,] = obtainParenthesesScopeCursor(program, bodyCursor.forward(), [['{'], ['}']])
  scopeCursor.toEnd()
  c.moveTo(scopeCursor.current)
  c.forward(2)

  const [ifScopeCursor, restCursor] = c.split()

  const aggIfScopeCursor = prevCursor.append(ifScopeCursor)
 

  const rct = program.ct(restCursor);
  if(rct && rct.type == 'keyword' && rct.data == 'else') {
    return obtainIfCursorScope(program, restCursor, aggIfScopeCursor)
  }
  
  
  return  [aggIfScopeCursor, restCursor]
}

export const getIfStatement = (program, cursor, elseif: boolean = false): false | [Cursor, IfStatement] =>  {

  if(!isIfStatement(program, cursor)) return false

  const [c1, c2] = obtainParenthesesScopeCursor(program, cursor.forward().forward())
  const test = parseBodyTokens(program, c1, null)

  const bt = program.tokens[c2.next]
  if(bt.type !== 'operator' && bt.data !== '{') {
    throw new Error('syntax error, if statments need a block {')
  }

  const [b1, b2] = obtainParenthesesScopeCursor(program, c2.forward().forward(), [['{'], ['}']])
  const consequent = parseBody(program, b1)
  

  const STMT = elseif 
  ? new ElseIfStatement(test, consequent)
  : new IfStatement(test, consequent)

  const nit = program.tokens[b2.next]
  
  if(nit && nit.type == 'keyword' && nit.data == 'else') {

    b2.forward()
    const nt = program.tokens[b2.next]
    

    if(nt.type === 'keyword' && nt.data === 'if') {
      // follow up 'else if' statement
      const res = getIfStatement(program, b2.forward(), true)
      if(res) {
      
        const [cursor2, alternate] = res
        STMT.setAlternate(alternate)
        return [cursor2.tryForward(), STMT]
     
      }
    }
    else {
      // close else
      if(nt.type !== 'operator' && nt.data !== '{') {
        throw new Error('syntax error, if statments need a block {')
      }
      const [a1, a2] = obtainParenthesesScopeCursor(program, b2.forward().forward(), [['{'], ['}']])


      const alternate = parseBody(program, a1)
      STMT.setAlternate(alternate)

      return [a2.forward(), STMT]
    }

    
  }
  
  return [b2.forward(), STMT]

} 
