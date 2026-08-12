const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const srcFilePath = path.join(__dirname, 'app.src.js');
const distFilePath = path.join(__dirname, '..', 'app.js');

if (!fs.existsSync(srcFilePath)) {
  console.error('Error: Source file dev/app.src.js not found!');
  process.exit(1);
}

console.log('Reading dev/app.src.js for obfuscation...');
const sourceCode = fs.readFileSync(srcFilePath, 'utf8');

console.log('Obfuscating code with high security settings...');
const obfuscationResult = JavaScriptObfuscator.obfuscate(sourceCode, {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64', 'rc4'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.8,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
});

fs.writeFileSync(distFilePath, obfuscationResult.getObfuscatedCode(), 'utf8');
console.log('SUCCESS! Obfuscated protected code generated at app.js');
