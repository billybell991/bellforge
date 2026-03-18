// Quick Gemini QA script for the jumble preview HTML
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

const buildId = process.argv[2] || '25f2be94-92ae-4886-9a0b-2b2a72b3f840';
const htmlPath = join(process.cwd(), 'data', 'previews', `${buildId}.html`);
const html = readFileSync(htmlPath, 'utf-8');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { console.error('No GEMINI_API_KEY'); process.exit(1); }

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const prompt = `You are a usability tester evaluating a browser-based jumble puzzle game for a general audience (think: someone who has played newspaper jumbles but is NOT tech-savvy).

Here is the complete HTML/CSS/JS for the game:
\`\`\`html
${html.substring(0, 15000)}
\`\`\`

Evaluate it from the perspective of a slightly confused player who just opened it. Answer these questions:
1. Is it immediately clear what to do first?
2. Is the role of the "circled" (circular/orange-bordered) boxes obvious?
3. Is it clear that letters will automatically drop into the final answer section?
4. Is the drag-and-drop mechanic for the final answer clearly communicated?
5. Is the shuffle (🔀) button purpose obvious?
6. Any confusing labels, layout issues, or missing feedback?
7. Overall rating: CLEAR / SOMEWHAT CLEAR / CONFUSING
8. Top 3 specific UX improvements (if any)

Be direct and critical. Think like a 55-year-old who plays newspaper word games.`;

console.log('Asking Gemini to QA the jumble...\n');
model.generateContent(prompt).then(result => {
  console.log(result.response.text());
}).catch(err => { console.error(err); process.exit(1); });
