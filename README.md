# Rekwizytor 🎭

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=jakub-pelka_rekwizytor&metric=alert_status)](https://sonarcloud.io/summary/overall?id=jakub-pelka_rekwizytor)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=jakub-pelka_rekwizytor&metric=security_rating)](https://sonarcloud.io/summary/overall?id=jakub-pelka_rekwizytor)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=jakub-pelka_rekwizytor&metric=sqale_rating)](https://sonarcloud.io/summary/overall?id=jakub-pelka_rekwizytor)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=jakub-pelka_rekwizytor&metric=code_smells)](https://sonarcloud.io/summary/overall?id=jakub-pelka_rekwizytor)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=jakub-pelka_rekwizytor&metric=ncloc)](https://sonarcloud.io/summary/overall?id=jakub-pelka_rekwizytor)

Aplikacja do zarządzania rekwizytami teatralnymi z AI-powered search.

## ✨ Features

- 🎨 **Modern UI** - Dark mode, animacje (Framer Motion), responsywny design
- 🤖 **AI Search** - Inteligentne wyszukiwanie z Google Gemini embeddings
- 🔐 **Security** - Row Level Security, user approval system, prompt injection protection
- 📦 **Inventory Management** - Pełna ewidencja rekwizytów, grup, spektakli
- 🏷️ **QR Labels** - Generator etykiet PDF z kodami QR
- 📝 **Rich Notes** - Edytor notatek (Tiptap) z interaktywnymi checklistami
- 🌍 **i18n** - Wsparcie dla języka polskiego i angielskiego

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm lub yarn
- Konto Supabase

### Installation

```bash
# Clone repository
git clone https://github.com/jakub-pelka/rekwizytor.git
cd rekwizytor

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict mode)
- **Database:** Supabase (PostgreSQL)
- **AI:** Google Gemini (embeddings, generation)
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Forms:** React Hook Form + Zod
- **Rich Text:** Tiptap

## 📊 Code Quality

This project uses SonarCloud for continuous code quality and security analysis.

- **Quality Gate:** Enforced on all pull requests
- **Security:** OWASP Top 10 coverage
- **Maintainability:** Tracked and improved continuously

## 📚 Documentation

- [Project Summary](./PROJECT_SUMMARY.md)
- [PocketBase Migration Guide](./docs/POCKETBASE_MIGRATION.md)
- [Embedding Testing Guide](./docs/EMBEDDING_TESTING.md)
- [Environment Variables](./docs/ENV_VARIABLES.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Note:** All PRs must pass SonarCloud Quality Gate before merging.

## 📝 License

This project is private and not licensed for public use.

## 👨‍💻 Author

**Jakub Pelka** - [GitHub](https://github.com/kubi-4327)

---

Built with ❤️ using Next.js and AI
