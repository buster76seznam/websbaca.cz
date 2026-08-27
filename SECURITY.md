"# Security Policy for Webs Bača

## 🛡️ Overview

This document outlines security practices for the Webs Bača project.

## 🔐 Master Password Protection

### Current Implementation
- All master passwords are encrypted using AES-256 encryption
- In production environment, hashed versions are used
- Development passwords are stored for debugging purposes only

### Password List
- **Obchodní zástupce**: Hashed in production
- **Vývojář**: Hashed in production
- **Správce**: Hashed in production

### Security Measures
- ✅ Passwords are never stored in plain text in production
- ✅ Encryption keys are stored in environment variables
- ✅ GitHub repository should be private
- ✅ Environment variables are never committed to repository

## 🚀 GitHub Security

### Repository Setup
- Repository should be **private** (not public)
- Use GitHub Secrets for environment variables
- Enable GitHub Actions for CI/CD with proper permissions

### Environment Variables Required
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
ENCRYPTION_KEY=your_32_character_encryption_key_here
API_SECRET_KEY=your_api_secret_key_here
DATABASE_URL=your_database_url_here
```

### .gitignore Requirements
- All .env files should be ignored
- Node modules and build directories ignored
- IDE and OS files ignored

## 🔍 Reporting Security Issues

If you discover any security vulnerabilities, please report them immediately to:
- Email: info@websbaca.cz
- Subject: SECURITY ISSUE - [Project Name]

## 📋 Best Practices

1. **Never commit sensitive data** to version control
2. **Use environment variables** for all secrets
3. **Keep dependencies updated** regularly
4. **Use HTTPS** for all external communications
5. **Monitor for unusual activity** in the application

## 🔧 Development Security

- Use encrypted passwords only for development
- Never share master passwords in code comments
- Use proper access controls for different environments
- Implement proper error handling that doesn't expose sensitive information
"