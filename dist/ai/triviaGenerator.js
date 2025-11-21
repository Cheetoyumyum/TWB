"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriviaGenerator = void 0;
const openai_1 = __importDefault(require("openai"));
const axios_1 = __importDefault(require("axios"));
class TriviaGenerator {
    constructor(openaiApiKey, groqApiKey) {
        this.openai = null;
        this.provider = 'none';
        if (openaiApiKey) {
            this.openai = new openai_1.default({ apiKey: openaiApiKey });
            this.provider = 'openai';
        }
        else if (groqApiKey) {
            this.groqApiKey = groqApiKey;
            this.provider = 'groq';
        }
    }
    async generateTrivia(exclusions = []) {
        const avoidList = exclusions.length
            ? `Avoid reusing or paraphrasing any of these recent questions or topics: ${exclusions
                .map((q) => `"${q}"`)
                .join(', ')}.`
            : '';
        const instructions = `You are a trivia generator. Produce a short, fun trivia question with a single concise answer.
Return ONLY valid JSON of the form {"question":"...","answers":["answer1","answer2"]}.
Requirements:
- The question must be understandable without extra context and less than 120 characters.
- Provide 1-3 acceptable answers. Answers must be lowercase, simple strings with no punctuation.
- Questions should cover varied general knowledge topics (geography, science, history, literature, pop culture, technology, sports, etc.).
- ${avoidList}
- Do not include explanations or extra text—just the JSON.`;
        const attempts = [];
        if (this.provider === 'openai' && this.openai) {
            attempts.push(() => this.requestOpenAI(instructions));
            attempts.push(() => this.requestGroq(instructions));
        }
        else if (this.provider === 'groq' && this.groqApiKey) {
            attempts.push(() => this.requestGroq(instructions));
            attempts.push(() => this.requestOpenAI(instructions));
        }
        else {
            attempts.push(() => this.requestGroq(instructions));
            attempts.push(() => this.requestOpenAI(instructions));
        }
        for (const fn of attempts) {
            const raw = await fn();
            if (!raw)
                continue;
            const parsed = this.parseTriviaResponse(raw);
            if (parsed) {
                return parsed;
            }
        }
        return null;
    }
    async requestOpenAI(prompt) {
        if (!this.openai) {
            return null;
        }
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'system', content: prompt }],
                max_tokens: 200,
                temperature: 0.9,
            });
            return response.choices[0]?.message?.content?.trim() ?? null;
        }
        catch (error) {
            console.error('TriviaGenerator OpenAI error:', error);
            return null;
        }
    }
    async requestGroq(prompt) {
        if (!this.groqApiKey) {
            return null;
        }
        try {
            const response = await axios_1.default.post('https://api.groq.com/openai/v1/chat/completions', {
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'system', content: prompt }],
                max_tokens: 200,
                temperature: 0.9,
            }, {
                headers: {
                    Authorization: `Bearer ${this.groqApiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            return response.data?.choices?.[0]?.message?.content?.trim() ?? null;
        }
        catch (error) {
            console.error('TriviaGenerator Groq error:', error.response?.data || error.message);
            return null;
        }
    }
    parseTriviaResponse(raw) {
        let jsonText = raw.trim();
        const start = jsonText.indexOf('{');
        const end = jsonText.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            jsonText = jsonText.slice(start, end + 1);
        }
        try {
            const data = JSON.parse(jsonText);
            const question = data.question || data.prompt;
            let answers = Array.isArray(data.answers) ? data.answers : [];
            if (!question || answers.length === 0) {
                return null;
            }
            answers = answers
                .map((ans) => (typeof ans === 'string' ? ans.trim().toLowerCase() : ''))
                .filter(Boolean);
            if (answers.length === 0) {
                return null;
            }
            return {
                prompt: `🧠 Trivia! First to answer wins 400 pts: ${question.trim()}`,
                answers,
                source: 'ai',
            };
        }
        catch (error) {
            console.error('TriviaGenerator parse error:', error, raw);
            return null;
        }
    }
}
exports.TriviaGenerator = TriviaGenerator;
