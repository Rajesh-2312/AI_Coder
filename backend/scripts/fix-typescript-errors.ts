/**
 * Auto-fix script for TypeScript errors
 * This script automatically fixes common TypeScript compilation errors
 */

import * as fs from 'fs';
import * as path from 'path';

interface Fix {
  file: string;
  line: number;
  errorCode: string;
  fix: string;
}

const fixes: Fix[] = [];

function addReturnStatements(filePath: string): void {
  let content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let modified = false;

  // Fix "Not all code paths return a value" errors
  lines.forEach((line, index) => {
    if (line.includes('res.json') && !line.includes('return')) {
      const indentation = line.match(/^(\s*)/)?.[1] || '';
      lines[index] = `${indentation}return ${line.trim()}`;
      modified = true;
      fixes.push({
        file: filePath,
        line: index + 1,
        errorCode: 'TS7030',
        fix: 'Add return statement'
      });
    }
    
    if (line.includes('res.status(') && !line.includes('return')) {
      const indentation = line.match(/^(\s*)/)?.[1] || '';
      lines[index] = `${indentation}return ${line.trim()}`;
      modified = true;
      fixes.push({
        file: filePath,
        line: index + 1,
        errorCode: 'TS7030',
        fix: 'Add return statement'
      });
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  }
}

function addTypeAnnotations(filePath: string): void {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // Fix implicit 'any' type errors
  content = content.replace(/\(data\)/g, '(data: any)');
  content = content.replace(/\(code\)/g, '(code: number)');
  content = content.replace(/\(err\)/g, '(err: any)');
  content = content.replace(/\(error\)/g, '(error: any)');
  content = content.replace(/\(chunk\?\)/g, '(chunk?: any)');
  content = content.replace(/\(encoding\?\)/g, '(encoding?: any)');

  if (content !== fs.readFileSync(filePath, 'utf-8')) {
    fs.writeFileSync(filePath, content, 'utf-8');
    modified = true;
    fixes.push({
      file: filePath,
      line: 0,
      errorCode: 'TS7006',
      fix: 'Add type annotations'
    });
  }
}

function fixBackendFiles(): void {
  const srcDir = path.join(__dirname, '..', 'src');
  
  // Files that need fixing
  const filesToFix = [
    'routes/ai.ts',
    'routes/execute.ts',
    'routes/files.ts',
    'routes/modelDownload.ts',
    'routes/training.ts',
    'routes/agents.ts',
    'routes/autoFix.ts'
  ];

  filesToFix.forEach(relativePath => {
    const filePath = path.join(srcDir, relativePath);
    if (fs.existsSync(filePath)) {
      console.log(`Fixing ${relativePath}...`);
      addReturnStatements(filePath);
      addTypeAnnotations(filePath);
    }
  });

  console.log(`\n✅ Fixed ${fixes.length} error(s)`);
  console.log('\nFixes applied:');
  fixes.forEach(fix => {
    console.log(`  - ${fix.file}:${fix.line} (${fix.errorCode}): ${fix.fix}`);
  });
}

// Run the fix
fixBackendFiles();

