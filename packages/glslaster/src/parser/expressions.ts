import { Cursor, Identifier, Literal, obtainParenthesesScopeCursor, Program, parseBodyTokens, getIdentifier } from "."

export class MemberExpression {
  object: Identifier
  property: Identifier | Literal
  computed: boolean

  constructor(object, property, computed) {
    this.object = object
    this.property = property
    this.computed = computed
  }

}
export const getMemberExpression = (program, cursor): false | [Cursor, MemberExpression] => {
  const ct = program.tokens[cursor.current]
  if(ct.type !== 'ident') return  false
  
  const nt = program.tokens[cursor.next]
  if(!nt || !['.', '['].includes(nt.data)) return false

  const c2 = cursor.clone().forward().forward()
  const c2t = program.tokens[c2.current]
  if(!c2t || !['ident','integer', 'float'].includes(c2t.type)) return  false

  // computed false
  if(nt.data === '.') return [
    c2.forward(), 
    new MemberExpression(
      new Identifier(ct.data),
      new Identifier(c2t.data),
      false)
  ]
  
  // computed true
  const [pc1, pc2] = obtainParenthesesScopeCursor(program, c2, [['['], [']']])
  const property = parseBodyTokens(program, pc1, null)
  return [
    pc2.forward(), 
    new MemberExpression(
      new Identifier(ct.data),
      property,
      true)
  ]
}


type UpdateOperator = '--' | '++'
type Arg = MemberExpression | Identifier

export class  UpdateExpression {
  operator: UpdateOperator
  arg: Arg
  prefix: boolean
  constructor (operator, arg, prefix) {
    this.operator = operator
    this.arg = arg
    this.prefix = prefix
  }
}
export class UpdateExpressions extends Array<UpdateExpression> {

}

class UpdateExpressionError extends Error {}

const getUpdateExpression = (program: Program, cursor: Cursor, arg): false | [Cursor, UpdateExpression] => {
  
  const ct = program.ct(cursor)

  if(!['++', '--'].includes(ct.data)) return false
  
  const isValidArg = arg && [MemberExpression, Identifier].includes(arg.constructor)

  cursor.forward()
  
  if(isValidArg) return [cursor, new UpdateExpression(ct.data, arg, false)]

  const cArg = getMemberExpression(program, cursor) || getIdentifier(program, cursor)
  if(!cArg) {
      throw new UpdateExpressionError('update expression have be applied to member expression or identifier')
    } 
  
  const [_cursor, _arg] = cArg
  const ue = new UpdateExpression(ct.data, _arg, true)
  return [_cursor, ue]     

  
}

export const getUpdateExpressions = (program: Program, cursor: Cursor, arg) : false | [Cursor, UpdateExpression[]] => {
  
  const parseUpdateExpreesion = (program, cursor, arg, ues: UpdateExpressions) => {
    try {      
      
      const ue = getUpdateExpression(program, cursor, arg)

      if(ue) {
        const [_cursor, _ue] = ue
        ues.push(_ue)

        const ct = program.ct(_cursor)
        if(ct.data === ',') {
          _cursor.forward()

          const cArg = getMemberExpression(program, _cursor) || getIdentifier(program, _cursor)
          const arg = cArg ? cArg[1] : null
          return parseUpdateExpreesion(program, _cursor, arg, ues)
        }
        return [_cursor, ues]
      }else {
        return [cursor, ues]
      } 

    }  
    catch (e) {
      return [cursor, ues]
    }
  }
  const [_cursor, _ues] = parseUpdateExpreesion(program, cursor.clone(), arg, new UpdateExpressions())


  
  return _ues.length > 0
  ? [_cursor, _ues]
  : false

}
