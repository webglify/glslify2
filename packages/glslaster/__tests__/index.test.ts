
import {Parser, Serializer} from "../src";
import {BinaryExpression, FunctionCall, ConstructorCall, VariableDeclaration, AssignmentExpression, CompoundAssignmentExpression, Literal, Identifier, ReturnStatement, ParameterDeclaration, FunctionDeclaration, Program} from '../src/parser'
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

const locTestCases = [
  
  {
    string: `
    a * (b + c) + (d * f)
    `,
    shouldAST: new BinaryExpression({
      operator:'+',
      left: new BinaryExpression({
        operator:'*',
        left: new Identifier('a'),
        right: new BinaryExpression({
          operator:'+',
          left: new Identifier('b'),
          right: new Identifier('c'),
          parentheses: true
        })
      }),
      right: new BinaryExpression({
        operator:'*',
        left: new Identifier('d'),
        right: new Identifier('f'),
        parentheses: true
      })
    })
  },
  {
    string: `
      mix(2 * fn(1, 2, a) + b, a + 2, vec2(1.))
    `,
    shouldAST: new FunctionCall(
      {data: 'mix'},
      [
        new BinaryExpression({
          operator: '+',
          left: new BinaryExpression({
            operator: '*',
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
          operator: '+',
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
      vec2 b = c + mix(1, 2, a);
    `,
    shouldAST: new VariableDeclaration(
      {data: 'vec2'},
      {data: 'b'},
      new BinaryExpression({
        operator: '+',
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
      b = fn(1, a);
    `,
    shouldAST: new AssignmentExpression(
      {data: '='},
      new Identifier('b'),
      new FunctionCall({data: 'fn'}, [new Literal('1', 'integer'), new Identifier('a')])
    )
  },
  {
    string: `
      b *= 1;
    `,
    shouldAST: new CompoundAssignmentExpression(
      {data: '*='},
      new Identifier('b'),
      new Literal('1', 'integer')
    )
  },
 
]

const completeTestCases = [
  {
    string: `
vec2 fnName(float a, vec2 b) {
  vec2 d = a;
  return d;
}
    `,
    shouldAST: new Program([new FunctionDeclaration(
      "fnName", 
      "vec2",
      [
        new ParameterDeclaration("float", "a"),
        new ParameterDeclaration("vec2", "b"),
      ],
      [
      new VariableDeclaration(
        {data: 'vec2'},
        {data: 'd'},
        new Identifier('a')
      ),
      new ReturnStatement(new Identifier('d'))
    ])])
  }
]



describe('Shader Processor', () => {
  

  // A helper function to run the common logic
  const runProgramTest = (string, shouldAST) => {
    
    const AST = Parser.tokenize(string).parseProgramm();
    console.log('AST', util.inspect(AST, {showHidden: false, depth: null, colors: false}))

    
    expect(AST).toEqual(shouldAST);

  };

  const runLocTest = (string, shouldAST) => {
    
    const AST = Parser.tokenize(string).parseTokens();
    console.log('AST', util.inspect(AST, {showHidden: false, depth: null, colors: false}))

    
    expect(AST).toEqual(shouldAST);

  };

  const runSerializeTest = (shouldString, shouldAST) => {
    console.log('shouldAST', util.inspect(shouldAST, {showHidden: false, depth: null, colors: false}))

    const string = Serializer(shouldAST)
    console.log('string', string)

    
    expect(string).toEqual(shouldString.trim());

  };


  // Iterate over each test case

  locTestCases.forEach((testCase, i) => {
    it(testCase.string.trim(), () => {
      runLocTest(testCase.string, testCase.shouldAST);
    });
  });
  completeTestCases.forEach((testCase, i) => {
    it(testCase.string.trim(), () => {
      runProgramTest(testCase.string, testCase.shouldAST);
    });
  });

  [...locTestCases, ...completeTestCases].forEach((testCase, i) => {
    it(testCase.string.trim(), () => {
      runSerializeTest(testCase.string, testCase.shouldAST);
    });
  });


  
})



