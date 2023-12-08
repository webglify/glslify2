import { BlockStatement, Cursor, Program, moveToToken, obtainParenthesesScopeCursor, parseBody, parseBodyTokens } from ".."



export class WhileStatement {
  test
  body: BlockStatement
  constructor(test, body) {
    this.test = test
    this.body = body
  }
}

export const isWhileStatement = (program: Program, cursor: Cursor): boolean => {
  
  const ct = program.ct(cursor)
    
  if(!ct || ct.data !== 'while' || ct.type !== 'keyword') return false
  
  return true
}
export const obtainWhileCursorScope =  (program: Program, cursor: Cursor) : [Cursor, Cursor] =>  {
  
  if(!isWhileStatement(program, cursor)) {
    throw new Error ('this is not a while scope')
  }

  // take only upcoming tokens
  const [, c] = cursor.split()
  
  // cover {} scope
  const bodyCursor = moveToToken(program, cursor, {type:'operator', data: '{'})
  if(!bodyCursor) {
    throw new Error ('this is not a correct while scope')
  }
  
  const [scopeCursor, _] = obtainParenthesesScopeCursor(program, bodyCursor.forward(), [['{'], ['}']])
  
  console.log('scopeCursor', scopeCursor, _)
  // move cursor to the end of the scope
  c.moveTo(scopeCursor.toEnd().current)
  // move out of scope
  c.forward(2)
  //and split
  const [whileCursor, restCursor] = c.split()
  
  return [whileCursor, restCursor]
}


export const getWhileStatement = (program: Program, cursor: Cursor): false | [Cursor, WhileStatement] =>  {
  
  if(!isWhileStatement(program, cursor)) return false

  const [argCursor, _bodyCursor] = obtainParenthesesScopeCursor(program, cursor.forward(2))
  const test = parseBodyTokens(program, argCursor, null)
  
  console.log('test', test)
  
  
  const [bodyCursor, restCursor] = obtainParenthesesScopeCursor(program, _bodyCursor.forward(2), [['{'], ['}']])


  const body = parseBody(program, bodyCursor)
  
  const ws = new WhileStatement(test, body)
  
  return [restCursor.forward(), ws]
}
