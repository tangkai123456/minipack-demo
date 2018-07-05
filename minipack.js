const fs = require('fs');
const path = require('path');
const babelParser = require('@babel/parser');
const traverse = require("@babel/traverse").default;
const { transformFromAst } = require('babel-core');

let ID = 0;

function createAsset(filename) {
  // 读取文件内容
  const content = fs.readFileSync(filename, 'utf-8');

  // 转化为ast
  const ast = babelParser.parse(content, {
    sourceType: 'module',
  });

  const dependencies = [];

  traverse(ast, {
    ImportDeclaration: (info) => {
      dependencies.push(info.node.source.value);
    }
  })

  const { code } = transformFromAst(ast, null, {
    presets: ['env'],
  });

  const id = ID++;

  return {
    id,
    filename,
    dependencies,
    code,
  };
}

fs.writeFileSync('./entry.json', JSON.stringify(createAsset("./entry.js")));