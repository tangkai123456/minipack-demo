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

function createGragh(entry) {
  // 解析入口模块
  const mainAsset = createAsset(entry);

  // 模块数组
  const queue = [mainAsset];

  // 分析每个模块是否有其他依赖模块，如果有，push进queue中
  for (const asset of queue) {
    const { filename, dependencies } = asset;
    asset.mapping = {};

    const dirname = path.dirname(filename);
    // 遍历所有依赖
    dependencies.forEach((item) => {
      const absolutePath = path.join(dirname, item);
      const childAsset = createAsset(absolutePath);

      asset.mapping[item] = childAsset;
      queue.push(childAsset);
    })
  }

  return queue;
}

function bundle(graph) {
  let modules = '';

  graph.forEach((item) => {
    modules += `${item.id}: [
      function (require, module, exports) { ${item.code} },
      ${JSON.stringify(item.mapping)},
    ],`;
  })

  const result = `
    (function(modules) {
      function require(id) {
        const [fn, mapping] = modules[id];

        function localRequire(name) {
          return require(mapping[name].id); //  例子中没有取id，会报错，取id才是正确的。
        }

        const module = { exports: {} };

        fn(localRequire, module, module.exports);

        return module.exports;
      }

      require(0);
    })({${modules}})
  `

  return result;
}

fs.writeFileSync('./bundle.js', bundle(createGragh("./entry.js")));
