import {
  BinaryExpression, 
  Program, 
  FunctionCall, 
  ConstructorCall, 
  VariableDeclaration, 
  AssignmentExpression, 
  CompoundAssignmentExpression, 
  IfStatement,
  ElseIfStatement,
  BlockStatement,
  Literal, 
  Identifier, 
  ReturnStatement, 
  ParameterDeclaration, 
  FunctionDeclaration,
  MemberExpression,
  LayoutQualifier,
  QualifiedVariableDeclaration,
  Parameter,
  PrecisionQualifierDeclaration
} from '../src/parser'


const generateGLSL = (ast) => {
  if (!ast) return '';

  switch (ast.constructor) {
    case Program:
      console.log('ast', ast)
      return `#version ${ast.version}\n${ast.body.map(generateGLSL).join('\n')}`;
    case IfStatement:
    case ElseIfStatement:
      const {test, consequent, alternate} = ast
      const start = `if(${generateGLSL(test)}) ${generateGLSL(consequent)}`
      const prefix = alternate && `else ` || ''
      
      return `${start} ${prefix}${generateGLSL(alternate)}`
    case BlockStatement: 

      return `{\n ${ast.map(s => generateGLSL(s))}\n}`

    case 'LayoutQualifier':
      return `layout(location=${ast.location}) ${ast.qualifier} ${ast.dataType} ${ast.name};`;
    case FunctionDeclaration:
      const params = ast.parameters.map(param => `${param.dataType} ${param.name}`).join(', ');
      const body = ast.body.map(generateGLSL).join('\n  ');
      return `${ast.returnType} ${ast.name}(${params}) {\n  ${body}\n}`;
    case ParameterDeclaration:
      return `${ast.dataType} ${ast.name}`;
    case VariableDeclaration:
      const initializer = generateGLSL(ast.initializer);
      return `${ast.dataType} ${ast.name} = ${initializer};`;
    case QualifiedVariableDeclaration:
      const qualifier = ast.qualifier ? `${generateGLSL(ast.qualifier)} ` : ``
      const pQualifier = ast.precisionQualifier? `${ast.precisionQualifier} ` : ``
      const _initializer = ast.initializer ? ` = ${generateGLSL(ast.initializer)}` : ``
      return `${qualifier}${ast.storageQualifier} ${pQualifier}${ast.dataType} ${ast.name}${_initializer};`;
    case PrecisionQualifierDeclaration:
      return `precision ${ast.precisionQualifier} ${ast.dataType};`
    case ConstructorCall:
    case FunctionCall:
      const args = ast.args.map(arg => generateGLSL(arg)).join(', ');
      return `${ast.name}(${args})`
    case AssignmentExpression:
    case CompoundAssignmentExpression:
        const aleft = generateGLSL(ast.left);
        const aright = generateGLSL(ast.right);
        return `${aleft} ${ast.operator} ${aright};`;
    case BinaryExpression:
      const left = generateGLSL(ast.left);
      const right = generateGLSL(ast.right);
      const p = ast.parentheses ? ['(', ')']: ['','']
      return `${p[0]}${left} ${ast.operator} ${right}${p[1]}`;
    case MemberExpression:
      if(!ast.computed) return `${generateGLSL(ast.object)}.${generateGLSL(ast.property)}`
      else return `${generateGLSL(ast.object)}[${generateGLSL(ast.property)}]`
    case LayoutQualifier:
      return `layout(${generateGLSL(ast.parameter)})`
    case Parameter:
      return `${ast.name}${ast.value ? `=${ast.value}`:``}`
    case Identifier:
      return ast.name;
    case Literal:
        return `${ast.value}`;
    case ReturnStatement:
      const argument = generateGLSL(ast.argument);
      return `return ${argument};`;
    default:
      return '';
  }
}


export default generateGLSL