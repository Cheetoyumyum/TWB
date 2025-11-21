import OpenAI from 'openai';
import axios from 'axios';

export interface TriviaQuestion {
  prompt: string;
  answers: string[];
  source?: 'ai' | 'preset';
}

type TriviaProvider = 'openai' | 'groq' | 'none';

export class TriviaGenerator {
  private openai: OpenAI | null = null;
  private groqApiKey?: string;
  private provider: TriviaProvider = 'none';

  constructor(openaiApiKey?: string, groqApiKey?: string) {
    if (openaiApiKey) {
      this.openai = new OpenAI({ apiKey: openaiApiKey });
      this.provider = 'openai';
    } else if (groqApiKey) {
      this.groqApiKey = groqApiKey;
      this.provider = 'groq';
    }
  }

  async generateTrivia(exclusions: string[] = [], categoryHint?: string): Promise<TriviaQuestion | null> {
    const avoidList = exclusions.length
      ? `Avoid repeating or paraphrasing ANY of these recent topics/questions: ${exclusions
          .map((q) => `"${q}"`)
          .join(', ')}.`
      : '';

    const categoryLine = categoryHint ? `Focus on the current stream theme: ${categoryHint}.` : '';

    const instructions = `You are an elite trivia master. Produce a challenging, creative trivia question with a single concise answer.
Return ONLY valid JSON of the form {"question":"...","answers":["answer1","answer2"]}.
Rules:
- The question must be precise, self-contained, and less than 110 characters.
- The question must be a complete sentence ending with a question mark.
- Pick harder topics or deep cuts (advanced science, world history, niche pop culture, esports, math, inventions, art, mythology, tech lore, etc.).
- ${avoidList}
- ${categoryLine}
- Provide 1-3 accepted answers. Answers must be lowercase strings with no punctuation.
- Answers should be specific (e.g., "nikola tesla", not just "tesla").
- When referencing existing franchises (Zelda, Dead by Daylight, Overwatch, etc.), prefer canon, in-game names and official spellings.
- If you are not absolutely certain the answer is canonically correct, do NOT use that topic—pick a different subject instead.
- Do NOT produce generic questions like capitals, "largest planet", "chemical symbol", or anything basic.
- Do NOT include explanations or extra text—output ONLY the JSON.`;

    const attempts: Array<() => Promise<string | null>> = [];
    if (this.provider === 'openai' && this.openai) {
      attempts.push(() => this.requestOpenAI(instructions));
      attempts.push(() => this.requestGroq(instructions));
    } else if (this.provider === 'groq' && this.groqApiKey) {
      attempts.push(() => this.requestGroq(instructions));
      attempts.push(() => this.requestOpenAI(instructions));
    } else {
      attempts.push(() => this.requestGroq(instructions));
      attempts.push(() => this.requestOpenAI(instructions));
    }

    for (const fn of attempts) {
      const raw = await fn();
      if (!raw) continue;
      const parsed = this.parseTriviaResponse(raw);
      if (parsed) {
        return parsed;
      }
    }

    return null;
  }

  private async requestOpenAI(prompt: string): Promise<string | null> {
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
    } catch (error) {
      console.error('TriviaGenerator OpenAI error:', error);
      return null;
    }
  }

  private async requestGroq(prompt: string): Promise<string | null> {
    if (!this.groqApiKey) {
      return null;
    }
    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'system', content: prompt }],
          max_tokens: 200,
          temperature: 0.9,
        },
        {
          headers: {
            Authorization: `Bearer ${this.groqApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data?.choices?.[0]?.message?.content?.trim() ?? null;
    } catch (error: any) {
      console.error('TriviaGenerator Groq error:', error.response?.data || error.message);
      return null;
    }
  }

  private parseTriviaResponse(raw: string): TriviaQuestion | null {
    let jsonText = raw.trim();
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      jsonText = jsonText.slice(start, end + 1);
    }

    try {
      const data = JSON.parse(jsonText);
      const question: string | undefined = data.question || data.prompt;
      let answers: string[] = Array.isArray(data.answers) ? data.answers : [];
      if (!question || answers.length === 0) {
        return null;
      }
      let cleanedQuestion = question.trim();
      cleanedQuestion = cleanedQuestion.replace(/[\s,.;:]+$/g, '');
      if (!cleanedQuestion.endsWith('?')) {
        cleanedQuestion = `${cleanedQuestion}?`;
      }
      answers = answers
        .map((ans) => (typeof ans === 'string' ? ans.trim().toLowerCase() : ''))
        .filter(Boolean);
      if (answers.length === 0) {
        return null;
      }
      if (this.containsForbiddenPair(cleanedQuestion, answers)) {
        console.warn('[Trivia] Rejecting response due to known canon mismatch.');
        return null;
      }
      return {
        prompt: `🧠 Trivia! First to answer wins 400 pts: ${cleanedQuestion}`,
        answers,
        source: 'ai',
      };
    } catch (error) {
      console.error('TriviaGenerator parse error:', error, raw);
      return null;
    }
  }

  private containsForbiddenPair(question: string, answers: string[]): boolean {
    const lowerQuestion = question.toLowerCase();
    if (lowerQuestion.includes('ocarina of time')) {
      if (lowerQuestion.includes('sacred forest') || lowerQuestion.includes('kokiri') || lowerQuestion.includes('temple of time')) {
        const hasKokiri = answers.some((ans) => ans.includes('kokiri'));
        if (!hasKokiri) {
          return true;
        }
      }
      if (lowerQuestion.includes('ganondorf') && lowerQuestion.includes('steed')) {
        const hasPhantomGanon = answers.some(
          (ans) => ans.includes('phantom ganon') || ans.includes('phantom')
        );
        if (!hasPhantomGanon) {
          return true;
        }
      }
    }
    return false;
  }
}

