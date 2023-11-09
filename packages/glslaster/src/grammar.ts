// GLSL Grammar in EBNF notation

type GLSLProgram = Statement[];

type Statement = 
    | VariableDeclaration
    | FunctionDeclaration
    | ExpressionStatement 
    | IfStatement
    | ForStatement
    | WhileStatement
    | ReturnStatement;

type VariableDeclaration = {
    type: "VariableDeclaration",
    qualifiers: StorageQualifier[],
    dataType: DataType,
    identifier: Identifier,
    initializer?: Expression
};

type FunctionDeclaration = {
    type: "FunctionDeclaration",
    returnType: DataType,
    identifier: Identifier,
    parameters: Parameter[],
    body: Statement[]
};

type Parameter = {
    dataType: DataType,
    parameterQualifiers: ParameterQualifier[], // Specifically for function parameters
    identifier: Identifier
};

type ExpressionStatement = {
    type: "ExpressionStatement",
    expression: Expression
};

type IfStatement = {
    type: "IfStatement",
    condition: Expression,
    thenBody: Statement[],
    elseBody?: Statement[]
};

type ForStatement = {
    type: "ForStatement",
    initializer: VariableDeclaration | ExpressionStatement,
    condition: Expression,
    increment: Expression,
    body: Statement[]
};

type WhileStatement = {
    type: "WhileStatement",
    condition: Expression,
    body: Statement[]
};


type ReturnStatement = {
    type: "ReturnStatement",
    expression?: Expression
};



type Expression = 
    | BinaryExpression
    | UnaryExpression
    | FunctionCall
    | Literal
    | Identifier;

type BinaryExpression = {
    type: "BinaryExpression",
    left: Expression,
    operator: BinaryOperator,
    right: Expression
};

type UnaryExpression = {
    type: "UnaryExpression",
    operator: UnaryOperator,
    operand: Expression
};


type FunctionCall = {
    type: "FunctionCall",
    callee: Identifier,
    arguments: Expression[]
};


type DataType = "float" 
    | "int" 
    | "vec2" 
    | "vec3" 
    | "vec4" 
    | "mat2" 
    | "mat3" 
    | "mat4" 
    | "sampler2D" 
    | "sampler3D" 
    | "samplerCube" 
    | ArrayType
    | StructType; // Extend with other GLSL data types

type ArrayType = {
    type: "ArrayType",
    baseType: DataType,
    size: number
};

type StructType = {
    type: "StructType",
    name: Identifier
};

type Identifier = string; // Variable or function name

type Literal = {
    type: "Literal",
    value: string | number
};

type BinaryOperator = 
    | "+" 
    | "-" 
    | "*" 
    | "/" 
    | "==" 
    | "!=" 
    | "<" 
    | "<=" 
    | ">" 
    | ">=" 
    ; // Extend with other GLSL operators

type UnaryOperator = 
    | "-" 
    | "!" 
    ; // Extend with other GLSL unary operators

type Qualifier = 
    | StorageQualifier
    | ParameterQualifier
    | PrecisionQualifier
    | InterpolationQualifier
    | "invariant" 
    | LayoutQualifier;

type LayoutQualifier = {
    type: "LayoutQualifier",
    attributes: LayoutAttribute[]
};


type LayoutAttribute = {
    name: string,
    value?: string | number
};

type StorageQualifier = 
    | "const"
    | "uniform"
    | "buffer"
    | "shared"
    | "attribute" // Older GLSL versions
    | "varying"  // Older GLSL versions
    | "in"      // For variable storage in shaders
    | "out";    // For variable storage in shaders


type ParameterQualifier = 
    | "in"
    | "out"
    | "inout"; // For function parameters that can be both read from and written to


type PrecisionQualifier = 
    | "highp" 
    | "mediump" 
    | "lowp";

type InterpolationQualifier = 
    | "smooth" 
    | "flat" 
    | "noperspective";


export type Token = {
    type: string;
    data: string;
    position: number;
    line: number;
    column: number;
};

type SourceMap = {
    mappings: Mapping[];
}

type Mapping = {
    generated: Position;
    original: Position;
}

type Position = {
    line: number;
    column: number;
}

    