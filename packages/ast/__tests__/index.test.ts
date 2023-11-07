import { basename } from "path";
import { ShaderProcessor, BinaryOperation } from "../src";
import fs from 'fs'
import path from 'path'


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
]



describe('Shader Processor', () => {
  

  // A helper function to run the common logic
  const runTest = (string, expectedAST) => {
    
    const AST = ShaderProcessor.parse(string);
    expect(AST).toEqual(expectedAST);

  };

  // Iterate over each test case
  testCases.forEach((testCase, i) => {
    it(testCase.string.trim(), () => {
      runTest(testCase.string, testCase.expectedAST);
    });
  });
  
})



