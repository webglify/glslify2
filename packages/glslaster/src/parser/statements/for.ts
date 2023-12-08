import { Program, BlockStatement, Cursor, obtainParenthesesScopeCursor, parseBodyTokens, parseBody, moveToToken } from "..";

export class ForStatement {
  init
  test
  update
  body
  constructor(init, test, update, body){
    this.init = init
    this.test = test
    this.update = update
    this.body = body
  }

}

const obtainForArguments = (program, cursor) => {

  const argsCursor = []

  const split = (groups = [[]], cursor2) => {
    
    if(cursor2.eof)  {
      argsCursor.push(new Cursor(groups[groups.length - 1]))
      return groups
    } 
    
    const currentToken = program.ct(cursor2)
    
    if(currentToken.data === ';'){
      argsCursor.push(new Cursor(groups[groups.length - 1]))
      groups.push([])
      return split(groups, cursor2.forward())
    }

    groups[groups.length - 1].push(cursor2.current)
    
    return split(groups, cursor2.forward())

  }
  
  split([[]], cursor.clone())

  return argsCursor

}

export const isForStatement = (program: Program, cursor: Cursor) : boolean =>  {
  const ct = program.ct(cursor)
  const nt = program.nt(cursor)

  if(ct.type != 'keyword' || ct.data !== 'for') return false
  if(nt.data != '(') return false
 
  return true
}

export const obtainForCursorScope =  (program: Program, cursor: Cursor) : [Cursor, Cursor] =>  {
  
  if(!isForStatement(program, cursor)) {
    throw new Error ('this is not a for loop scope')
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

export const getForStatement = (program: Program, cursor: Cursor) : false | [Cursor, ForStatement] =>  {
  
  if(!isForStatement(program, cursor)) return false


  const [argsCursor, _bodyCursor] = obtainParenthesesScopeCursor(program, cursor.forward(2))
  
  const argsC = obtainForArguments(program, argsCursor)
  if(argsC.length !== 3){
    throw new Error('for has to have 3 arguments')
  }
  const [initC, testC, updateC] = argsC

  const init = parseBodyTokens(program, initC, null)

  const test = parseBodyTokens(program, testC, null)
  const update = parseBodyTokens(program, updateC, null)

  // go inside body
  const [bodyCursor, restCursor] = obtainParenthesesScopeCursor(program, _bodyCursor.forward(2), [['{'], ['}']])

  const body = parseBody(program, bodyCursor)

  const fs = new ForStatement(init, test, update, body)
  
  return [restCursor, fs]

}