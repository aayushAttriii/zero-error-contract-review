# Zero-Error Contract Review Agent 🚀

AI-powered contract review system with PII/PHI redaction, privilege flagging, and intelligent analysis.

## 🎯 Features

### Core Features
- ✅ **Deterministic PII/PHI Redaction** - Email, Phone, SSN, Credit Cards, Dates, Addresses
- ✅ **Smart Flagging** - Attorney-client privilege, PHI, Confidentiality clauses
- ✅ **PDF/DOCX/TXT Support** - Automatic text extraction
- ✅ **Download Redacted Versions** - Export clean documents

### AI-Powered Features
- 🤖 **Contract Type Classification** - Automatic detection (NDA, Service Agreement, etc.)
- 🤖 **Entity Extraction** - Parties, people, financial amounts
- 🤖 **Obligation Identification** - Key responsibilities and requirements
- 🤖 **Risk Assessment** - 0-10 risk scoring with specific concerns
- 🤖 **Compliance Checking** - GDPR, HIPAA, CCPA detection
- 🤖 **Smart Redaction Suggestions** - AI recommends additional redactions

## 🏗️ Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js 18+
- **AI**: OpenAI GPT-4 Turbo
- **Document Processing**: pdf-parse, mammoth
- **Testing**: Jest, React Testing Library

## 📦 Installation

### 1. Clone or Create Project

```bash
npx create-next-app@latest zero-error-contract-review
cd zero-error-contract-review
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create `.env.local` file in root:

```env
# OpenAI API Key (Required for AI features)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional: Node environment
NODE_ENV=development
```

**Get your OpenAI API Key:**
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy and paste into `.env.local`

### 4. Project Structure

```
zero-error-contract-review/
├── pages/
│   ├── index.js                 # Main UI
│   ├── api/
│   │   └── review.js           # Review endpoint
├── lib/
│   ├── redact.js               # PII redaction
│   ├── flagging.js             # Privilege flagging
│   ├── aiAnalyzer.js           # OpenAI integration
│   └── pdfExtractor.js         # PDF extraction
├── tests/
│   ├── redact.test.js
│   └── flagging.test.js
├── .env.local                  # Environment variables
├── package.json
├── next.config.js
├── jest.config.js
└── README.md
```

## 🚀 Running Locally

### Development Mode

```bash
npm run dev
```

Visit http://localhost:3000

### Run Tests

```bash
# Watch mode
npm test

# Single run
npm run test:ci

# With coverage
npm run test:coverage
```

### Build for Production

```bash
npm run build
npm start
```

## 📤 Deploy to Vercel

### Method 1: GitHub Integration (Recommended)

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/zero-error-contract-review.git
git push -u origin main
```

2. **Connect to Vercel**
   - Go to https://vercel.com
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel auto-detects Next.js settings ✅

3. **Add Environment Variables**
   - In Vercel project settings → Environment Variables
   - Add: `OPENAI_API_KEY` = `sk-your-key-here`
   - Click "Deploy"

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts, then:
vercel env add OPENAI_API_KEY
# Enter your OpenAI key

# Deploy to production
vercel --prod
```

### Method 3: One-Click Deploy

Click this button:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/zero-error-contract-review)

## 🔧 Configuration

### OpenAI Model Configuration

Edit `lib/aiAnalyzer.js` to change models:

```javascript
const response = await client.chat.completions.create({
  model: 'gpt-4-turbo-preview', // Change to gpt-4, gpt-3.5-turbo, etc.
  temperature: 0.3,              // Lower = more deterministic
  max_tokens: 1000,              // Adjust response length
});
```

### Cost Optimization

For lower costs, use GPT-3.5:
```javascript
model: 'gpt-3.5-turbo' // ~10x cheaper than GPT-4
```

### Redaction Patterns

Add custom patterns in `lib/redact.js`:

```javascript
export function addCustomPattern(type, regex, options = {}) {
  return {
    type: 'MY_CUSTOM_TYPE',
    regex: /\bCUSTOM-\d{6}\b/g,
    priority: 8,
    confidence: 'high'
  };
}
```

## 📝 API Usage

### POST /api/review

**Request:**
```javascript
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('options', JSON.stringify({
  redactPII: true,
  redactPHI: true,
  flagPrivilege: true,
  useAI: true
}));

const response = await fetch('/api/review', {
  method: 'POST',
  body: formData
});

const result = await response.json();
```

**Response:**
```json
{
  "originalText": "...",
  "redactedText": "...",
  "redactions": [
    {
      "id": "EMAIL#1",
      "type": "EMAIL",
      "original": "alice@example.com",
      "start": 123,
      "end": 140,
      "confidence": "high"
    }
  ],
  "flags": [
    {
      "id": "F1",
      "type": "PRIVILEGE",
      "excerpt": "attorney-client privileged...",
      "reason": "Contains attorney + legal advice",
      "severity": "HIGH"
    }
  ],
  "summary": {
    "email": 2,
    "phone": 1,
    "flags": 3,
    "totalRedactions": 5
  },
  "aiAnalysis": {
    "contractType": "Service Agreement",
    "riskScore": 6.5,
    "obligations": [...],
    "concerns": [...],
    "compliance": { "gdpr": true, "hipaa": false }
  }
}
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Test Coverage
```bash
npm run test:coverage
```

### Test Specific File
```bash
npm test redact.test.js
```

### Example Test Cases

**Email Redaction:**
```javascript
test('should redact email', () => {
  const input = 'Contact: alice@example.com';
  const result = redactText(input);
  expect(result.redactedText).toBe('Contact: [REDACTED:EMAIL#1]');
});
```

**Privilege Flagging:**
```javascript
test('should flag privilege', () => {
  const input = 'Attorney advised this is privileged.';
  const result = flagSensitiveContent(input);
  expect(result.flags.some(f => f.type === 'PRIVILEGE')).toBe(true);
});
```

## 🎨 UI Customization

### Change Colors

Edit Tailwind classes in `pages/index.js`:

```javascript
// Purple theme (default)
className="bg-purple-600"

// Blue theme
className="bg-blue-600"

// Green theme  
className="bg-green-600"
```

### Add Features

The UI is modular. Add new tabs in the `activeTab` state:

```javascript
const [activeTab, setActiveTab] = useState('upload');

// Add new tab
<button onClick={() => setActiveTab('history')}>
  History
</button>
```

## ⚡ Performance Tips

### For Large Documents

1. **Chunk Processing** (lib/aiAnalyzer.js):
```javascript
await analyzeInChunks(text, 4000); // Process in 4KB chunks
```

2. **Parallel Processing**:
```javascript
const [redactions, flags, aiAnalysis] = await Promise.all([
  redactText(text),
  flagSensitiveContent(text),
  performFullAnalysis(text)
]);
```

### Caching

Add Redis for caching AI results:
```bash
npm install redis
```

## 🔒 Security Best Practices

1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Rotate API keys regularly**
3. **Use environment variables for all secrets**
4. **Enable rate limiting** (Vercel does this automatically)
5. **Sanitize file uploads**

## 🐛 Troubleshooting

### "OpenAI API Key not found"
- Check `.env.local` exists
- Verify key starts with `sk-`
- Restart dev server after adding key

### PDF Extraction Fails
- Try converting to TXT first
- Check PDF isn't password protected
- Ensure file size < 10MB

### Tests Failing
- Run `npm install` again
- Check Node version >= 18
- Clear Jest cache: `npx jest --clearCache`

### Deployment Issues
- Check Vercel logs: `vercel logs`
- Verify environment variables are set in Vercel dashboard
- Ensure all dependencies are in `package.json`

## 📊 Cost Estimates

### OpenAI API Costs (GPT-4 Turbo)

- Input: $0.01 / 1K tokens
- Output: $0.03 / 1K tokens

**Per Contract Analysis (~3000 words):**
- Input tokens: ~4,000 tokens ($0.04)
- Output tokens: ~1,500 tokens ($0.045)
- **Total: ~$0.085 per contract**

**Monthly estimates:**
- 100 contracts/month: ~$8.50
- 1000 contracts/month: ~$85
- 10,000 contracts/month: ~$850

### Use GPT-3.5 for Lower Costs

Change model to `gpt-3.5-turbo`:
- ~10x cheaper
- ~$0.008 per contract
- Slightly lower accuracy

## 🎯 Hackathon Tips

### Speed Run (2 hours)
1. Use provided code as-is ✅
2. Skip AI features initially
3. Focus on core redaction + UI
4. Add tests last

### Impress Judges (5 hours)
1. Enable all AI features
2. Add batch processing
3. Create demo video
4. Polish UI with animations
5. Add comprehensive tests

### Winning Features
- 🎨 Beautiful, modern UI
- ⚡ Fast processing (<3 seconds)
- 🤖 AI insights that "wow"
- 📊 Clear metrics/dashboards
- ✅ Passing tests
- 📖 Great documentation

## 📚 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Vercel Deployment](https://vercel.com/docs)
- [Jest Testing](https://jestjs.io/docs)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## 📄 License

MIT License - feel free to use for your hackathon!

## 🎉 Credits

Built for hackathons with ❤️

---

**Questions?** Open an issue or reach out!

**Good luck with your hackathon! 🚀**