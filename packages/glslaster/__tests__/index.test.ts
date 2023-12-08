
import {Parser, Serializer} from "../src";
import {BinaryExpression, FunctionCall, ConstructorCall, AssignmentExpression, CompoundAssignmentExpression, Literal, Identifier, ReturnStatement, ParameterDeclaration, FunctionDeclaration, Program, 
  LayoutQualifier,
  QualifiedVariableDeclaration,
  Parameter,
  PrecisionQualifierDeclaration,
  
  BlockStatement,
  LogicalExpression,
  ConditionalExpression
} from '../src/parser'
import { MemberExpression, UpdateExpression, UpdateExpressions } from "../src/parser/expressions";
import {VariableDeclarations, VariableDeclaration} from "../src/parser/declarations"
import util from 'util'
import { ForStatement } from "../src/parser/statements/for";
import {IfStatement,
  ElseIfStatement} from '../src/parser/statements/if'
import { SwitchCases, SwitchStatement, SwitchCase, SwitchConsequent, BreakStatement } from "../src/parser/statements/switch";
import { WhileStatement } from "../src/parser/statements/while";


const locTestCases = [
  
  {
    string: `
    a * (b + c) - (d * f)
    `,
    shouldAST: new BinaryExpression({
      operator:'-',
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
      mix(2 * fn(1, 2, a) - b, a + 2, vec2(1.))
    `,
    shouldAST: new FunctionCall(
      'mix',
      [
        new BinaryExpression({
          operator: '-',
          left: new BinaryExpression({
            operator: '*',
            left: new Literal('2', 'integer'),
            right: new FunctionCall(
              'fn',
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
          'vec2',
          [new Literal('1.', 'float')]
        )
      ]
    )
  },
  {
    string: `
      vec2 b = c + mix(1, 2, a);
    `,
    shouldAST:VariableDeclarations.from([new VariableDeclaration(
      'vec2',
      'b',
      new BinaryExpression({
        operator: '+',
        left: new Identifier('c'),
        right: new FunctionCall(
          'mix',
          [
            new Literal('1', 'integer'),
            new Literal('2', 'integer'),
            new Identifier('a')
          ])
        }
        )
      )])
  },
  {
    string: `
      b = fn(1, a);
    `,
    shouldAST: new AssignmentExpression(      
      '=',
      new Identifier('b'),
      new FunctionCall('fn', [new Literal('1', 'integer'), new Identifier('a')])
    )
  },
  {
    string: `
      b *= 1;
    `,
    shouldAST: new CompoundAssignmentExpression(
      '*=',
      new Identifier('b'),
      new Literal('1', 'integer')
    )
  },
  {
    string: `
    a.x = a[1. + c[i] + b.x];
  `, 
  shouldAST: new AssignmentExpression(
    '=',
    new MemberExpression(
      new Identifier('a'),
      new Identifier('x'),
      false
    ),
    new MemberExpression(
      new Identifier('a'),
      new BinaryExpression({
        operator: '+',
        left: new BinaryExpression({
          operator: '+',
          left: new Literal('1.', 'float'),
          right: new MemberExpression(
            new Identifier('c'),
            new Identifier('i'),
            true
          )
        }),
        right: new MemberExpression(
            new Identifier('b'),
            new Identifier('x'),
            false
          )
        }
      ),
      true

      )
    )
  
  },
  {
    string: `
      ((a + (b)) * c)
    `,
    sString: `
      ((a + b) * c)
    `,
    shouldAST: new BinaryExpression({
      operator: '*',
      left: new BinaryExpression({
        operator: '+',
        left: new Identifier('a'),
        right: new Identifier('b'),
        parentheses: true
      }),
      right: new Identifier('c'),
      parentheses: true
    })
  },
  {
    string: `  
    gl_Position = vec4(-1.) * -b;    
    `,
    shouldAST: new AssignmentExpression(
      '=',
      new Identifier('gl_Position'),
      new BinaryExpression({
        left: new ConstructorCall('vec4', [new Literal('-1.', 'float')]),
        right: new Identifier('-b'),
        operator: '*'
      })
    )

  },
  {
    string: `
if(a >= 0.) {
 if(t >= 0.) {
 b = 1.;
} else if(t == 1.) {
 b = 2.;
} else {
 c = 1.;
}
}`,
    shouldAST: new IfStatement(
      new BinaryExpression({operator: '>=', left: new Identifier('a'), right: new Literal('0.', 'float')}),
      BlockStatement.from([new IfStatement(
        new BinaryExpression({operator: '>=', left: new Identifier('t'), right: new Literal('0.', 'float')}),
        BlockStatement.from([new AssignmentExpression('=', new Identifier('b'), new Literal('1.', 'float'))]),
        new ElseIfStatement(
          new BinaryExpression({operator: '==', left: new Identifier('t'), right: new Literal('1.', 'float')}),
          BlockStatement.from([new AssignmentExpression('=', new Identifier('b'), new Literal('2.', 'float'))]),
          BlockStatement.from([new AssignmentExpression('=', new Identifier('c'), new Literal('1.', 'float'))])
        )
      )])
    )

  },
  {
    string: `
 (a.y || b && abs(e)) && s
`, shouldAST: new LogicalExpression('&&', 
      new LogicalExpression(
          '||', 
          new MemberExpression(new Identifier('a'), new Identifier('y'), false), 
          new LogicalExpression('&&', new Identifier('b'), new FunctionCall('abs', [new Identifier('e')])),
          true
        ),
      new Identifier('s')
      
      )
  },
  {
    string: `
      a = b ? abs(c) : d;
    `,
    shouldAST: new AssignmentExpression(
      '=', 
      new Identifier('a'), 
      new ConditionalExpression(
        new Identifier('b'),
        new FunctionCall('abs', [new Identifier('c')]),
        new Identifier('d')
      ))
  },
  {
    string: `
for (int i = 0, j = 10; i < j; i++, --j) {
 k++;
for (; ; ) {
 j -= t;
}
}`,
    shouldAST: new ForStatement(
      VariableDeclarations.from([
        new VariableDeclaration('int', 'i', new Literal('0', 'integer')),
        new VariableDeclaration('int', 'j', new Literal('10', 'integer'))
      ]),
      new BinaryExpression({operator: '<', left: new Identifier('i'), right: new Identifier('j')}),
      UpdateExpressions.from([
        new UpdateExpression('++', new Identifier('i'), false),
        new UpdateExpression('--', new Identifier('j'), true),
      ]),
      BlockStatement.from([
        UpdateExpressions.from([
          new UpdateExpression('++', new Identifier('k'), false)
        ]),
        new ForStatement(null, null, null, BlockStatement.from([
          new CompoundAssignmentExpression('-=', new Identifier('j'), new Identifier('t'))
        ]))
      
      ])
    )
  },
  {
    string: `
switch (a) {
default:
 a++;
 switch (value) {
case 0:
 t = d + a;
case 1:
 b++;
 break;
default:
 b = 1;
}
 b++;
}
`,
string1: `
switch(a){
  case 1:
    t++;
    break;
  default:    
    b++;
    switch(b){
      default:
    }
    while(c){
      d++;
    }
    for(;;){
      g++;
    }
    if(f){
      k++;
    }else {
      d++;
    }
    b++;
    
}
`,
shouldAST1: null,
  shouldAST: new SwitchStatement(
    new Identifier('a'),
    SwitchCases.from([
      new SwitchCase(null, SwitchConsequent.from([
        UpdateExpressions.from([new UpdateExpression('++', new Identifier('a'), false)]),
        new SwitchStatement(
          new Identifier('value'),
          SwitchCases.from([
            new SwitchCase(
              new Literal('0', 'integer'),
              SwitchConsequent.from([
                new AssignmentExpression('=', new Identifier('t'), new BinaryExpression({operator: '+', left: new Identifier('d'), right: new Identifier('a')}))
              ])
            ),
            new SwitchCase(
              new Literal('1', 'integer'),
              SwitchConsequent.from([
                UpdateExpressions.from([new UpdateExpression('++', new Identifier('b'), false)]),
                new BreakStatement()
              ])
            ),
            new SwitchCase(
              null,
              SwitchConsequent.from([
                new AssignmentExpression('=', new Identifier('b'), new Literal('1', 'integer'))
              ])
            )
          ])
        ),
        UpdateExpressions.from([new UpdateExpression('++', new Identifier('b'), false)]),       
      ]))
    ])
  )
      
    
  
  },
  {
    string: `
while (i < 5) {
 sum += float(i);
while (j > 5) {
 j--;
}
i++;
}`,
    shouldAST: new WhileStatement(
      new BinaryExpression({operator: '<', left: new Identifier('i'), right: new Literal('5', 'integer')}),
      BlockStatement.from([
        new CompoundAssignmentExpression('+=', new Identifier('sum'), new ConstructorCall('float',[new Identifier('i')])),
        new WhileStatement(
          new BinaryExpression({operator: '>', left: new Identifier('j'), right: new Literal('5', 'integer')}),
          BlockStatement.from([
            UpdateExpressions.from([new UpdateExpression('--', new Identifier('j'), false)])
          ])
        ),
        UpdateExpressions.from([new UpdateExpression('++', new Identifier('i'), false)])
      ])
    )
  }



]

const prog = new Program('test', 'vertex', [], [
  new PrecisionQualifierDeclaration(
    'mediump',
    'float'
  ),
  new QualifiedVariableDeclaration(        
    'vec2',
    'aPosition',
    'in',
    {qualifier: new LayoutQualifier(new Parameter('location', '0'))}
  ),
  new QualifiedVariableDeclaration(        
    'vec2',
    'glyphUV',
    'out',
  ),
  new QualifiedVariableDeclaration(        
    'float',
    'uRowCount',
    'uniform',
    {precisionQualifier: 'mediump'}
  ),
  new QualifiedVariableDeclaration(
    'float',
    'leftPadding',
    'const',
    {
      initializer: new Literal('0.', 'float')
    }
  ),
  new FunctionDeclaration(
  "fnName", 
  "vec2",
  [
    new ParameterDeclaration("float", "a"),
    new ParameterDeclaration("vec2", "b"),
  ],
  [
    VariableDeclarations.from([new VariableDeclaration('vec2','d',new Identifier('a'))]),
    new ReturnStatement(new Identifier('d'))
])])
prog.version = '300 es'
const completeTestCases = [
  {
    string: `
#version 300 es
precision mediump float;
layout(location=0) in vec2 aPosition;
out vec2 glyphUV;
uniform mediump float uRowCount;
const float leftPadding = 0.;
vec2 fnName(float a, vec2 b) {
  vec2 d = a;
  return d;
}
    `,
    shouldAST: prog.ast
  }
]



describe('Parser and Serializer', () => {
  

  // A helper function to run the common logic
  const runProgramTest = (string, shouldAST) => {
    Parser.version = '300 es'
    const AST = Parser.tokenize(string).parseProgram().ast;
    console.log('AST', util.inspect(AST, {showHidden: false, depth: null, colors: false}))

    
    expect(AST).toEqual(shouldAST);

  };

  const runLocTest = (string, shouldAST) => {
    
    const AST = Parser.tokenize(string).parseBodyTokens();
    console.log('AST', util.inspect(AST, {showHidden: false, depth: null, colors: false}))

    
    expect(AST).toEqual(shouldAST);

  };

  const runSerializeTest = (shouldString, shouldAST) => {
   //console.log('shouldAST', util.inspect(shouldAST, {showHidden: false, depth: null, colors: false}))

    const string = Serializer(shouldAST)
    console.log('serialized:', string)

    
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
      runSerializeTest((testCase as any).sString || testCase.string, testCase.shouldAST);
    });
  });


  
})



