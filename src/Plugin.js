import { join } from 'path';
import { addDefault, addSideEffect } from '@babel/helper-module-imports';

function camel2Dash(_str) {
  const str = _str[0].toLowerCase() + _str.substr(1);
  return str.replace(/([A-Z])/g, ($1) => `-${$1.toLowerCase()}`);
}

function winPath(path) {
  return path.replace(/\\/g, '/');
}

export default class Plugin {
  constructor(libraryName,
              libraryDirectory,
              style,
              fileName,
              themes,
              customName,
              types) {
    this.specified = null;
    this.libraryObjs = null;
    this.selectedMethods = null;
    this.libraryName = libraryName || 'vimo';
    this.libraryDirectory = typeof libraryDirectory === 'undefined'
      ? 'lib'
      : libraryDirectory;
    this.style = style || false;
    this.fileName = fileName || '';
    this.themes = themes || null; // str/array
    this.customName = customName;
    this.types = types;
  }

  importMethod(methodName, file) {
    if (!this.selectedMethods[methodName]) {
      const libraryDirectory = this.libraryDirectory;

      const style = (typeof this.style === 'boolean' && this.style) ? 'css' : this.style;

      const transformedMethodName = camel2Dash(methodName);
      const path = winPath(
        this.customName ? this.customName(transformedMethodName) : join(this.libraryName, libraryDirectory, transformedMethodName, this.fileName) // eslint-disable-line
      );
      this.selectedMethods[methodName] = addDefault(file.path, path, { nameHint: methodName });

      if (this.themes) {
        if (Array.isArray(this.themes)) {
          this.themes.forEach(item => {
            const themeName = item.themeName || '';
            const themeExt = item.themeExt || style || 'css';
            const symbol = item.symbol ? `.${item.symbol}` : '';
            const themeDirectory = item.themeDirectory || 'components';
            const themePath = `${themeName}/${themeDirectory}/${transformedMethodName}`;
            addSideEffect(file.path, `${themePath}${symbol}.${themeExt}`);
          });
        } else {
          const themeName = this.themes.themeName || '';
          const themeExt = this.themes.themeExt || style || 'css';
          const symbol = this.themes.symbol ? `.${this.themes.symbol}` : '';
          const themeDirectory = this.themes.themeDirectory || 'components';
          const themePath = `${themeName}/${themeDirectory}/${transformedMethodName}`;
          addSideEffect(file.path, `${themePath}${symbol}.${themeExt}`);
        }
      }
      if (typeof style === 'string') {
        addSideEffect(file.path, `${path}/${transformedMethodName}.${style}`);
      }

      if (typeof style === 'function') {
        addSideEffect(file.path, style(path));
      }
    }

    return Object.assign({}, this.selectedMethods[methodName]);
  }

  buildExpressionHandler(node, props, path, state) {
    const file = (path && path.hub && path.hub.file) || (state && state.file);
    const types = this.types;
    props.forEach(prop => {
      if (!types.isIdentifier(node[prop])) return;
      if (this.specified[node[prop].name]) {
        node[prop] = this.importMethod(this.specified[node[prop].name], file);  // eslint-disable-line
      }
    });
  }

  buildDeclaratorHandler(node, prop, path, state) {
    const file = (path && path.hub && path.hub.file) || (state && state.file);
    const types = this.types;
    if (!types.isIdentifier(node[prop])) return;
    if (this.specified[node[prop].name] &&
      path.scope.hasBinding(node[prop].name) &&
      path.scope.getBinding(node[prop].name).path.type === 'ImportSpecifier') {
      node[prop] = this.importMethod(node[prop].name, file);  // eslint-disable-line
    }
  }

  ProgramEnter() {
    this.specified = Object.create(null);
    this.libraryObjs = Object.create(null);
    this.selectedMethods = Object.create(null);
    this.pathsToRemove = [];
  }

  ProgramExit() {
    this.pathsToRemove.forEach(p => !p.removed && p.remove());
  }

  ImportDeclaration(path) {
    const { node } = path;

    // path maybe removed by prev instances.
    if (!node) return;

    const { value } = node.source;
    const libraryName = this.libraryName;
    const types = this.types;
    if (value === libraryName) {
      node.specifiers.forEach(spec => {
        if (types.isImportSpecifier(spec)) {
          this.specified[spec.local.name] = spec.imported.name;
        } else {
          this.libraryObjs[spec.local.name] = true;
        }
      });
      this.pathsToRemove.push(path);
    }
  }

  CallExpression(path, state) {
    const { node } = path;
    const file = (path && path.hub && path.hub.file) || (state && state.file);
    const { name } = node.callee;
    const types = this.types;

    if (types.isIdentifier(node.callee)) {
      if (this.specified[name]) {
        node.callee = this.importMethod(this.specified[name], file);
      }
    }

    node.arguments = node.arguments.map(arg => {
      const { name: argName } = arg;
      if (this.specified[argName] &&
        path.scope.hasBinding(argName) &&
        path.scope.getBinding(argName).path.type === 'ImportSpecifier') {
        return this.importMethod(this.specified[argName], file);
      }
      return arg;
    });
  }

  MemberExpression(path, state) {
    const { node } = path;
    const file = (path && path.hub && path.hub.file) || (state && state.file);

    // multiple instance check.
    if (!node.object || !node.object.name) return;

    if (this.libraryObjs[node.object.name]) {
      // antd.Button -> _Button
      path.replaceWith(this.importMethod(node.property.name, file));
    } else if (this.specified[node.object.name]) {
      node.object = this.importMethod(this.specified[node.object.name], file);
    }
  }

  Property(path, state) {
    const { node } = path;
    this.buildDeclaratorHandler(node, 'value', path, state);
  }

  VariableDeclarator(path, state) {
    const { node } = path;
    this.buildDeclaratorHandler(node, 'init', path, state);
  }

  ArrayExpression(path, state) {
    const { node } = path;
    const props = node.elements.map((_, index) => index);
    this.buildExpressionHandler(node.elements, props, path, state);
  }

  LogicalExpression(path, state) {
    const { node } = path;
    this.buildExpressionHandler(node, ['left', 'right'], path, state);
  }

  ConditionalExpression(path, state) {
    const { node } = path;
    this.buildExpressionHandler(node, ['test', 'consequent', 'alternate'], path, state);
  }

  IfStatement(path, state) {
    const { node } = path;
    this.buildExpressionHandler(node, ['test'], path, state);
    this.buildExpressionHandler(node.test, ['left', 'right'], path, state);
  }

  ExpressionStatement(path, state) {
    const { node } = path;
    const { types } = this;
    if (types.isAssignmentExpression(node.expression)) {
      this.buildExpressionHandler(node.expression, ['right'], path, state);
    }
  }

  ReturnStatement(path, state) {
    const types = this.types;
    const file = (path && path.hub && path.hub.file) || (state && state.file);
    const { node } = path;
    if (node.argument && types.isIdentifier(node.argument) && this.specified[node.argument.name]) {
      node.argument = this.importMethod(node.argument.name, file);
    }
  }

  ExportDefaultDeclaration(path, state) {
    const { node } = path;
    this.buildExpressionHandler(node, ['declaration'], path, state);
  }

  BinaryExpression(path, state) {
    const { node } = path;
    this.buildExpressionHandler(node, ['left', 'right'], path, state);
  }

  NewExpression(path, state) {
    const { node } = path;
    this.buildExpressionHandler(node, ['callee', 'arguments'], path, state);
  }
}
