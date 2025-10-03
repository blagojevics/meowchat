# 🚨 URGENT SECURITY FIXES FOR MEOWCHAT

## IMMEDIATE ACTIONS REQUIRED (Before GitHub/Production)

### 1. 🔐 SECURE YOUR SECRETS

**Generate Strong JWT Secret:**
```bash
# Generate a 64-character random secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Update .env file:**
```env
JWT_SECRET=your_generated_64_character_secret_here
FIREBASE_PRIVATE_KEY=your_actual_firebase_private_key
CLOUDINARY_API_SECRET=your_actual_cloudinary_secret
```

### 2. 🔥 FIREBASE SECURITY

**Regenerate Firebase Service Account:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Delete current service account key
3. Generate new one
4. Download and replace serviceAccountKey.json
5. Update environment variables

### 3. 📁 REMOVE SENSITIVE FILES FROM GIT

```bash
# Remove from git history
git rm --cached backend/serviceAccountKey.json
git rm --cached backend/.env

# Add to .gitignore (already done)
echo "backend/serviceAccountKey.json" >> .gitignore
echo "backend/.env" >> .gitignore

# Commit changes
git add .gitignore
git commit -m "Remove sensitive files and update gitignore"
```

### 4. 🛡️ ADD PRODUCTION SECURITY

**Rate Limiting:**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

**File Upload Security:**
```javascript
// Restrict file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
  }
};
```

**Input Sanitization:**
```javascript
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(xss()); // Clean user input from malicious HTML
```

## PRODUCTION CHECKLIST

### Environment Variables
- [ ] Strong JWT secret (64+ characters)
- [ ] Real Firebase credentials
- [ ] Real Cloudinary credentials  
- [ ] Production MongoDB URI
- [ ] NODE_ENV=production

### Security Headers
- [ ] Helmet.js configured
- [ ] CORS restricted to production domains
- [ ] Rate limiting enabled
- [ ] File upload restrictions

### Database Security
- [ ] MongoDB authentication enabled
- [ ] Database user with minimal permissions
- [ ] Input validation on all endpoints
- [ ] NoSQL injection protection

### Deployment Security
- [ ] HTTPS enabled
- [ ] Environment variables in deployment platform
- [ ] No secrets in code repository
- [ ] Monitoring and logging enabled

## SAFE GITHUB UPLOAD

**Before uploading to GitHub:**

1. **Check .gitignore covers:**
   ```
   .env
   *.env
   serviceAccountKey.json
   node_modules/
   ```

2. **Verify no secrets in code:**
   ```bash
   grep -r "secret\|key\|password" --exclude-dir=node_modules .
   ```

3. **Use environment variables for all secrets**

4. **Add security documentation**

## PRODUCTION DEPLOYMENT

**Recommended platforms (with environment variable support):**
- Vercel (Frontend) + Railway (Backend)
- Netlify (Frontend) + Heroku (Backend)  
- AWS Amplify + AWS Lambda
- DigitalOcean App Platform

**Never deploy with:**
- Hardcoded secrets
- Default JWT secret
- Development CORS settings
- Unrestricted file uploads