import {Cursor, obtainCommaSeparatedArguments, obtainParenthesesScopeCursor, parseBodyTokens} from './'



export class VariableDeclaration {
  dataType
  name
  initializer

  constructor (dataType, name, initializer?) {
    this.dataType = dataType
    this.name = name
    if(initializer) {
      this.initializer = initializer
    }
    
  }

  setInitializer(initializer){
    this.initializer = initializer
  }
}

export class VariableDeclarations extends Array<VariableDeclaration> {}

const isVariableDefinitionToken  = (program, cursor) => {
  const currentToken = program.tokens[cursor.current]
  const prevToken = program.tokens[cursor.prev]
  const nextToken = program.tokens[cursor.next]
  
  const isStruct = program.getStructTypes().includes(prevToken?.data)
  
  return currentToken.type === 'ident' 
  && prevToken && (prevToken.type === 'keyword' || isStruct)
  && nextToken && nextToken.data === ';'
}

const isVariableDeclarationToken = (program, cursor) => {
  const currentToken = program.tokens[cursor.current]
  const prevToken = program.tokens[cursor.prev]
  const nextToken = program.tokens[cursor.next]
  
  const isStruct = program.getStructTypes().includes(prevToken?.data)
  
  return currentToken.type === 'ident' 
  && prevToken && (prevToken.type === 'keyword' || isStruct)
  && nextToken && nextToken.data === '='
}


export const getVariableDeclarations = (program, cursor): false | [Cursor, VariableDeclarations] => {
  
  if(!isVariableDeclarationToken(program, cursor)) return false

  const dataType = program.tokens[cursor.prev].data
  const identifier = program.tokens[cursor.current].data

  const isStruct = program.getStructTypes().includes(dataType);
  
  // jump over '=' to token of interest
  cursor.forward(2)

  if(isStruct){
  
    const [_cursor, init] = obtainStuctVariableInitialiser(program, cursor)
    return [_cursor, VariableDeclarations.from([
      new VariableDeclaration(dataType, identifier, init)
    ])]
  
  } else {

    // to cover case like: int i = 0, j = 1;
    const ofa = obtainCommaSeparatedArguments(program,cursor)
    const vds = ofa.map((c, i) => {
      const name = i == 0 ? identifier : program.ct(c).data
      const _c = i == 0 ?  c : c.forward(2)
      const initializer = parseBodyTokens(program, _c, null)
      const vd = new VariableDeclaration(dataType, name, initializer)
      return vd
    })

    return [cursor.toEof(), VariableDeclarations.from(vds)]
  }


  
}

export const getVariableDefinition = (program, cursor): false | [Cursor, VariableDeclaration] => {
  
  if(!isVariableDefinitionToken(program, cursor)) return false

  const dataType = program.tokens[cursor.prev].data
  const identifier = program.tokens[cursor.current].data
  
  return [cursor.forward(), new VariableDeclaration(dataType, identifier)]
  
}

export class StructInitializer extends Array {}



const obtainStuctVariableInitialiser = (program, cursor): [Cursor, StructInitializer] => {

  const [bodyCursor, restCursor] = obtainParenthesesScopeCursor(program, cursor.forward(), [['{'], ['}']], true)
  const argGroups = obtainCommaSeparatedArguments(program, bodyCursor)
    
  const si = new StructInitializer()
  argGroups.forEach(argCursor => {
      const arg = parseBodyTokens(program, argCursor, null)
      si.push(arg)

    })

  return [restCursor.forward(), si]
}
