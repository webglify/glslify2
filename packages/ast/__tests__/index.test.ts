
import { ShaderProcessor } from "../src";
import {BinaryExpression, FunctionCall, ConstructorCall, VariableDeclaration, AssignmentExpression, CompoundAssignmentExpression, Literal, Identifier} from '../src/index'
import util from 'util'
// const string = `
  // a + (b + (c + d + f));
  // `
  // const string0 = `
  // a * (b + c);
  // `
  // const string2 = `
  // v + d * (c + a)
  // `

  // const string3 = `
  // (a + b) * c * d * n * (f + q * w)
  // `

const testCases = [
  // {
  //   string: `
  //     a * b
  //   `,
  //   expectedAST: null
  // },
  {
    string: `
    a * (b + c) + (d*f)
    `,
    expectedAST:   {
      op: { type: 'operator', data: '+'},
      left: new BinaryExpression({
        op: { type: 'operator', data: '*'},
        left: new Identifier('a'),
        right: new BinaryExpression({
          op: { type: 'operator', data: '+'},
          left: new Identifier('b'),
          right: new Identifier('c'),
          parentheses: true
        })
      }),
      right: new BinaryExpression({
        op: { type: 'operator', data: '*' },
        left: new Identifier('d'),
        right: new Identifier('f'),
        parentheses: true
      })
    }
  },
  {
    string: `
      mix(2 * fn(1, 2, a) + b, a + 2, vec2(1.))
    `,
    expectedAST: new FunctionCall(
      {data: 'mix'},
      [
        new BinaryExpression({
          op: { type: 'operator', data: '+' },
          left: new BinaryExpression({
            op: { type: 'operator', data: '*' },
            left: new Literal('2', 'integer'),
            right: new FunctionCall(
              {data: 'fn'},
              [
                new Literal('1' , 'integer'),
                new Literal('2' , 'integer'),
                new Identifier('a')
              ])
           
          }),
          right: new Identifier('b')
        }),
        new BinaryExpression({
          op: { type: 'operator', data: '+' },
          left: new Identifier('a'),
          right: new Literal('2' , 'integer')}
        ),
        new ConstructorCall(
          {data: 'vec2'},
          [new Literal('1.', 'float')]
        )
      ]
    )
  },
  {
    string: `
      vec2 b = c + mix(1,2,a)
    `,
    expectedAST: new VariableDeclaration(
      {data: 'vec2'},
      {data: 'b'},
      new BinaryExpression({
        op: { type: 'operator', data: '+' },
        left: new Identifier('c'),
        right: new FunctionCall(
          {data: 'mix'},
          [
            new Literal('1', 'integer'),
            new Literal('2', 'integer'),
            new Identifier('a')
          ])
        }
        )
      )
  },
  {
    string: `
      b = fn(1, a)
    `,
    expectedAST: new AssignmentExpression(
      {data: '='},
      {data: 'b', type: 'ident'},
      new FunctionCall({data: 'fn'}, [new Literal('1', 'integer'), new Identifier('a')])
    )
  },
  {
    string: `
      b *= 1
    `,
    expectedAST: new CompoundAssignmentExpression(
      {data: '*='},
      {data: 'b', type: 'ident'},
      new Literal('1', 'integer')
    )
  }
]



describe('Shader Processor', () => {
  

  // A helper function to run the common logic
  const runTest = (string, expectedAST) => {
    
    const AST = ShaderProcessor.parse(string);
    console.log('AST', util.inspect(AST, {showHidden: false, depth: null, colors: false}))

    
    expect(AST).toEqual(expectedAST);

  };

  // Iterate over each test case
  testCases.forEach((testCase, i) => {
    it(testCase.string.trim(), () => {
      runTest(testCase.string, testCase.expectedAST);
    });
  });
  
})



