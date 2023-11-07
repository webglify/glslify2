
import { ShaderProcessor } from "../src";
import {BinaryOperation, FunctionCall, ConstructorCall} from '../src/index'
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
  {
    string: `
    a * (b + c) + (d*f)
    `,
    expectedAST:   {
      op: { type: 'operator', data: '+'},
      left: new BinaryOperation({
        op: { type: 'operator', data: '*'},
        left: { type: 'ident', data: 'a'},
        right: new BinaryOperation({
          op: { type: 'operator', data: '+'},
          left: { type: 'ident', data: 'b'},
          right: { type: 'ident', data: 'c'},
          parentheses: true
        })
      }),
      right: new BinaryOperation({
        op: { type: 'operator', data: '*' },
        left: { type: 'ident', data: 'd' },
        right: { type: 'ident', data: 'f' },
        parentheses: true
      })
    }
  },
  {
    string: `
      mix(2 * smoothstep(1, 2, a) + b, a + 2, vec2(1.))
    `,
    expectedAST: new FunctionCall(
      {data: 'mix'},
      [
        new BinaryOperation({
          op: { type: 'operator', data: '+' },
          left: new BinaryOperation({
            op: { type: 'operator', data: '*' },
            left: { type: 'integer', data: '2' },
            right: new FunctionCall(
              {data: 'smoothstep'},
              [
                { type: 'integer', data: '1' },
                { type: 'integer', data: '2' },
                { type: 'ident', data: 'a' }
              ])
           
          }),
          right: { type: 'ident', data: 'b' }
        }),
        new BinaryOperation({
          op: { type: 'operator', data: '+' },
          left: { type: 'ident', data: 'a' },
          right: { type: 'integer', data: '2' }
        }),
        new ConstructorCall(
          {data: 'vec2'},
          [{ type: 'float', data: '1.' }]
        )
      ]
    )
  }
]



describe('Shader Processor', () => {
  

  // A helper function to run the common logic
  const runTest = (string, expectedAST) => {
    
    const AST = ShaderProcessor.parse(string);
    //console.log('AST', util.inspect(AST, {showHidden: false, depth: null, colors: false}))

    
    expect(AST).toEqual(expectedAST);

  };

  // Iterate over each test case
  testCases.forEach((testCase, i) => {
    it(testCase.string.trim(), () => {
      runTest(testCase.string, testCase.expectedAST);
    });
  });
  
})



