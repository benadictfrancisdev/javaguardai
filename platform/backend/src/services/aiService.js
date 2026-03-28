const OpenAI = require('openai');
const config = require('../config/config');
const cacheService = require('./cacheService');

class AIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: config.ai.apiKey,
      baseURL: config.ai.baseUrl,
    });
    this.model = config.ai.model;
  }

  async analyzeCode(sourceCode, compilationOutput, executionOutput, errors) {
    const cacheKey = cacheService.generateKey('analysis', {
      code: sourceCode,
      errors: errors,
    });

    const cached = cacheService.get(cacheKey);
    if (cached) return { ...cached, fromCache: true };

    const prompt = this._buildAnalysisPrompt(sourceCode, compilationOutput, executionOutput, errors);
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: this._getSystemPrompt() },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      });

      const responseTimeMs = Date.now() - startTime;
      const content = response.choices[0].message.content;
      const parsed = this._parseAIResponse(content);

      const result = {
        ...parsed,
        modelUsed: this.model,
        tokensUsed: response.usage?.total_tokens || 0,
        responseTimeMs,
        rawResponse: content,
        fromCache: false,
      };

      cacheService.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('AI Service error:', error.message);
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  async getCodeFix(sourceCode, errors) {
    const cacheKey = cacheService.generateKey('fix', { code: sourceCode, errors });
    const cached = cacheService.get(cacheKey);
    if (cached) return { ...cached, fromCache: true };

    const prompt = this._buildFixPrompt(sourceCode, errors);
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: this._getFixSystemPrompt() },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 4096,
      });

      const responseTimeMs = Date.now() - startTime;
      const content = response.choices[0].message.content;
      const parsed = this._parseFixResponse(content);

      const result = {
        ...parsed,
        modelUsed: this.model,
        tokensUsed: response.usage?.total_tokens || 0,
        responseTimeMs,
        fromCache: false,
      };

      cacheService.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('AI Fix error:', error.message);
      throw new Error(`AI fix generation failed: ${error.message}`);
    }
  }

  async optimizeCode(sourceCode) {
    const prompt = `Analyze the following Java code and suggest optimizations for performance, readability, and best practices.

\`\`\`java
${sourceCode}
\`\`\`

Respond in the following JSON format:
{
  "optimizedCode": "the optimized Java code",
  "changes": ["list of changes made"],
  "performanceImpact": "description of performance improvements",
  "explanation": "detailed explanation of optimizations"
}`;

    const startTime = Date.now();
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are a Java optimization expert. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    });

    const responseTimeMs = Date.now() - startTime;
    const content = response.choices[0].message.content;

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { explanation: content };
    } catch (_) {
      parsed = { explanation: content };
    }

    return {
      ...parsed,
      modelUsed: this.model,
      tokensUsed: response.usage?.total_tokens || 0,
      responseTimeMs,
    };
  }

  _getSystemPrompt() {
    return `You are an expert Java developer and debugging assistant. Your role is to:
1. Analyze Java code for errors, bugs, and issues
2. Explain errors in clear, beginner-friendly language
3. Provide detailed fix suggestions with corrected code
4. Identify potential security vulnerabilities and performance issues

Always respond in the following JSON format:
{
  "summary": "Brief summary of the analysis",
  "errors": [
    {
      "type": "compilation|runtime|logical|security|performance",
      "severity": "error|warning|info",
      "line": null,
      "message": "Description of the issue",
      "explanation": "Detailed beginner-friendly explanation",
      "suggestion": "How to fix this issue"
    }
  ],
  "fixedCode": "The corrected Java code (complete)",
  "explanation": "Overall explanation of what was wrong and how it was fixed",
  "suggestions": ["List of additional improvement suggestions"],
  "codeQuality": {
    "score": 0-100,
    "readability": "good|fair|poor",
    "maintainability": "good|fair|poor",
    "performance": "good|fair|poor"
  }
}`;
  }

  _getFixSystemPrompt() {
    return `You are an expert Java developer. Fix the provided Java code based on the errors shown.
Respond ONLY with the following JSON format:
{
  "fixedCode": "The complete corrected Java code",
  "changes": ["List of specific changes made"],
  "explanation": "Brief explanation of the fixes"
}`;
  }

  _buildAnalysisPrompt(sourceCode, compilationOutput, executionOutput, errors) {
    let prompt = `Analyze the following Java code:\n\n\`\`\`java\n${sourceCode}\n\`\`\`\n`;

    if (compilationOutput) {
      prompt += `\nCompilation output:\n\`\`\`\n${compilationOutput}\n\`\`\`\n`;
    }

    if (executionOutput) {
      prompt += `\nExecution output:\n\`\`\`\n${executionOutput}\n\`\`\`\n`;
    }

    if (errors && errors.length > 0) {
      prompt += `\nDetected errors:\n${JSON.stringify(errors, null, 2)}\n`;
    }

    prompt += '\nProvide a comprehensive analysis with error explanations and fixed code.';
    return prompt;
  }

  _buildFixPrompt(sourceCode, errors) {
    return `Fix the following Java code:\n\n\`\`\`java\n${sourceCode}\n\`\`\`\n\nErrors:\n${JSON.stringify(errors, null, 2)}\n\nProvide the complete corrected code.`;
  }

  _parseAIResponse(content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (_) {
      // Fall through to text parsing
    }

    return {
      summary: 'Analysis complete',
      explanation: content,
      errors: [],
      fixedCode: null,
      suggestions: [],
      codeQuality: { score: 0, readability: 'fair', maintainability: 'fair', performance: 'fair' },
    };
  }

  _parseFixResponse(content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (_) {
      // Fall through
    }

    const codeMatch = content.match(/```java\n([\s\S]*?)```/);
    return {
      fixedCode: codeMatch ? codeMatch[1].trim() : content,
      changes: [],
      explanation: content,
    };
  }
}

module.exports = new AIService();
