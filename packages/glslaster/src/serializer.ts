import {
  BinaryExpression, 
  ProgramAST, 
  FunctionCall, 
  ConstructorCall, 
  
  AssignmentExpression, 
  CompoundAssignmentExpression, 
  BlockStatement,
  Literal, 
  Identifier, 
  ReturnStatement, 
  ParameterDeclaration, 
  FunctionDeclaration,
  LayoutQualifier,
  QualifiedVariableDeclaration,
  Parameter,
  PrecisionQualifierDeclaration,
  LogicalExpression,
  DefineDeclaration,
  ConditionalExpression,
  
  StructDeclaration,
  VariableDeclarator
} from './parser'

import {
  StructInitializer,
  VariableDeclaration,
  VariableDeclarations
} from './parser/declarations'



import {  MemberExpression, UpdateExpressions } from './parser/expressions'
import { ForStatement } from './parser/statements/for';
import {  IfStatement,  ElseIfStatement} from './parser/statements/if'
import { BreakStatement, SwitchStatement } from './parser/statements/switch';
import { WhileStatement } from './parser/statements/while';

const generateGLSL = (ast) => {
  if (!ast) return '';

  switch (ast.constructor) {
    case ProgramAST:      
      return `#version ${ast.version}\n${ast.body.map(generateGLSL).join('\n')}`;
    case DefineDeclaration:
      return `#define ${ast.ident} ${ast.value}`
    case IfStatement:
    case ElseIfStatement:
      const {test, consequent, alternate} = ast
      const start = `if(${generateGLSL(test)}) ${generateGLSL(consequent)}`
      const prefix = alternate && ` else ` || ''
      
      return `${start}${prefix}${generateGLSL(alternate)}`
    case ForStatement:
      const for_init = `${generateGLSL(ast.init).replace(';', '')}`
      const for_test = `${generateGLSL(ast.test)}`
      const for_update = `${generateGLSL(ast.update)}`.replace(';', '')
      return `for (${for_init}; ${for_test}; ${for_update}) ${generateGLSL(ast.body)}`
    case SwitchStatement:

      return `switch (${generateGLSL(ast.discriminant)}) {\n${ast.cases.map(c => {
        const p = c.test ? `case ${generateGLSL(c.test)}:`:`default:`
        const cons = c.consequent.map(s => ` ${generateGLSL(s)}`).join('\n')
        return `${p}\n${cons}`
      }).join('\n')}\n}`
    case WhileStatement:
      return `while (${generateGLSL(ast.test)}) ${generateGLSL(ast.body)}`
    case BlockStatement:
      return `{\n ${ast.map(s => generateGLSL(s)).join('\n')}\n}`

    case StructInitializer:
      return `{${ast.map((s, i) => generateGLSL(s)).join(', ')}}`
    case StructDeclaration:
      
      const declarations = ast.declarations.length && ` ${ast.declarations.map(d => d.name).join(', ')}` || ``;
      const res = `struct ${ast.name} {\n ${ast.fields.map(v => generateGLSL(v)).join('\n ')}\n}${declarations};`
      
      return res;
    case VariableDeclarator:
      return `${ast.dataType} ${ast.name};`
    case ConditionalExpression:

      return `${generateGLSL(ast.test)} ? ${generateGLSL(ast.consequent)} : ${generateGLSL(ast.alternate)}`
      
    case LogicalExpression:
      let expr = `${generateGLSL(ast.left)} ${ast.operator} ${generateGLSL(ast.right)}`
      return ast.parentheses ? `(${expr})` : expr
    case FunctionDeclaration:
      const params = ast.parameters.map(param => `${param.dataType} ${param.name}`).join(', ');
      const body = ast.body.map(generateGLSL).join('\n  ');
      return `${ast.returnType} ${ast.name}(${params}) {\n  ${body}\n}`;
    case ParameterDeclaration:
      return `${ast.dataType} ${ast.name}`;
    case VariableDeclarations:
      return `${ast.map((d,i) => {
        return i == 0
        ? `${d.dataType} ${d.name} = ${generateGLSL(d.initializer)}`
        : `${d.name} = ${generateGLSL(d.initializer)}`
      }).join(', ')};`

    case VariableDeclaration:
      const initializer = ast.initializer ? ` = ${generateGLSL(ast.initializer)}`: '' ;
      return `${ast.dataType} ${ast.name}${initializer};`;
    case UpdateExpressions:
      return `${ast.map((d,i) => {
        return d.prefix 
        ? `${d.operator}${generateGLSL(d.arg)}`
        : `${generateGLSL(d.arg)}${d.operator}`
      }).join(', ')};`

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
    case BreakStatement:
        return `${ast}`
    case ReturnStatement:
      const argument = generateGLSL(ast.argument);
      return `return ${argument};`;
    default:
      return '';
  }
}


export default generateGLSL