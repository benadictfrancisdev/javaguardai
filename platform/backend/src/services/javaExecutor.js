const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

class JavaExecutor {
  constructor() {
    this.timeout = config.java.executionTimeout;
    this.maxMemory = config.java.maxMemory;
  }

  async execute(sourceCode) {
    const executionId = uuidv4();
    const tempDir = path.join(os.tmpdir(), `java-ai-${executionId}`);
    const result = {
      compilationOutput: '',
      executionOutput: '',
      errors: [],
      status: 'pending',
      executionTimeMs: 0,
    };

    try {
      await fs.mkdir(tempDir, { recursive: true });

      // Extract class name from source code
      const className = this._extractClassName(sourceCode);
      const fileName = `${className}.java`;
      const filePath = path.join(tempDir, fileName);

      await fs.writeFile(filePath, sourceCode, 'utf8');

      // Compile
      const compileResult = await this._compile(filePath, tempDir);
      result.compilationOutput = compileResult.output;

      if (compileResult.exitCode !== 0) {
        result.status = 'compilation_error';
        result.errors = this._parseCompilationErrors(compileResult.output, sourceCode);
        return result;
      }

      // Execute
      const execResult = await this._run(className, tempDir);
      result.executionOutput = execResult.output;
      result.executionTimeMs = execResult.executionTimeMs;

      if (execResult.timedOut) {
        result.status = 'timeout';
        result.errors.push({
          type: 'runtime',
          message: `Execution timed out after ${this.timeout}ms`,
          severity: 'error',
        });
      } else if (execResult.exitCode !== 0) {
        result.status = 'runtime_error';
        result.errors = this._parseRuntimeErrors(execResult.output);
      } else {
        result.status = 'success';
      }

      return result;
    } catch (error) {
      result.status = 'runtime_error';
      result.errors.push({
        type: 'runtime',
        message: error.message,
        severity: 'error',
      });
      return result;
    } finally {
      // Cleanup temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (_) {
        // Ignore cleanup errors
      }
    }
  }

  _extractClassName(sourceCode) {
    const match = sourceCode.match(/public\s+class\s+(\w+)/);
    return match ? match[1] : 'Main';
  }

  _compile(filePath, workDir) {
    return new Promise((resolve) => {
      const args = ['-Xlint:all', filePath];
      const proc = spawn('javac', args, {
        cwd: workDir,
        timeout: this.timeout,
        env: { ...process.env, HOME: workDir },
      });

      let output = '';
      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.stderr.on('data', (data) => { output += data.toString(); });

      proc.on('close', (exitCode) => {
        resolve({ output: output.trim(), exitCode: exitCode ?? 1 });
      });

      proc.on('error', (err) => {
        resolve({ output: err.message, exitCode: 1 });
      });
    });
  }

  _run(className, workDir) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let timedOut = false;

      const args = [
        `-Xmx${this.maxMemory}`,
        '-Djava.security.manager=allow',
        '-cp', workDir,
        className,
      ];

      const proc = spawn('java', args, {
        cwd: workDir,
        timeout: this.timeout,
        env: { ...process.env, HOME: workDir },
      });

      let output = '';
      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.stderr.on('data', (data) => { output += data.toString(); });

      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGKILL');
      }, this.timeout);

      proc.on('close', (exitCode) => {
        clearTimeout(timer);
        const executionTimeMs = Date.now() - startTime;
        resolve({
          output: output.trim(),
          exitCode: exitCode ?? 1,
          executionTimeMs,
          timedOut,
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          output: err.message,
          exitCode: 1,
          executionTimeMs: Date.now() - startTime,
          timedOut: false,
        });
      });
    });
  }

  _parseCompilationErrors(output, _sourceCode) {
    const errors = [];
    const lines = output.split('\n');

    for (const line of lines) {
      const match = line.match(/\.java:(\d+):\s*(error|warning):\s*(.+)/);
      if (match) {
        errors.push({
          type: 'compilation',
          line: parseInt(match[1]),
          severity: match[2],
          message: match[3],
        });
      }
    }

    if (errors.length === 0 && output.length > 0) {
      errors.push({
        type: 'compilation',
        message: output,
        severity: 'error',
      });
    }

    return errors;
  }

  _parseRuntimeErrors(output) {
    const errors = [];
    const exceptionMatch = output.match(/Exception[^\n]*/g);

    if (exceptionMatch) {
      for (const ex of exceptionMatch) {
        const lineMatch = ex.match(/at\s+[\w.]+\([\w.]+\.java:(\d+)\)/);
        errors.push({
          type: 'runtime',
          message: ex,
          line: lineMatch ? parseInt(lineMatch[1]) : null,
          severity: 'error',
        });
      }
    }

    if (errors.length === 0 && output.length > 0) {
      errors.push({
        type: 'runtime',
        message: output,
        severity: 'error',
      });
    }

    return errors;
  }
}

module.exports = new JavaExecutor();
