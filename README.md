<<<<<<< HEAD
# UserProject

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 15.2.11.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
=======
# Sof-Talent
# 🧠 Sof'Talent Smart CV and Skills Management Platform

**Sof'Talent** is more than a simple CV tool it's a complete ecosystem that redefines how companies manage employee profiles and internal skills. The platform centralizes and standardizes CV generation, skills analysis, and internal mobility management through a modern and intelligent web solution.
> **Note**: This repository contains a partial version of the project. Some components and features remain confidential due to proprietary business logic and company policies.

## 🚀 Key Features

### 📄 Automated CV Generation and Management
- **Employee Self-Service**: Create, edit, and download CVs in PDF or DOCX formats directly from an interactive form
- **Automatic Translation**: English version of CVs generated automatically
- **Standardized Format**: Ensures consistent company-wide CV templates and eliminates manual entry errors
- **Manager Dashboard**: Easy access to review and update team CVs
- **Smart Notifications**: Automated alerts inform employees when their CV is modified, ensuring transparency and traceability

### 🔍 Advanced Skills Analysis (NLP-Powered)
- **Intelligent Skills Detection**: Automatically identifies employee competencies based on CV data
- **Gap Analysis**: Helps managers detect missing skills and competencies
- **Profile Matching**: Match employee profiles with new job requirements
- **Training Planning**: Support targeted training and mobility actions efficiently

### 📚 Centralized CV Repository
- **Unified Interface**: All employee CVs stored in one accessible location
- **Quick Search**: Structured access reduces search time and improves decision-making
- **Team Management**: Simplified oversight for managers

### 🎯 Internal Mobility Optimization
- **Smart Matching**: Automatically compares job descriptions with internal profiles
- **Comprehensive Analysis**: Evaluates skills, experience, and seniority
- **Candidate Recommendations**: Suggests the most relevant internal candidates
- **Career Tracking**: Monitor career evolution within the company

## 🧩 Tech Stack

| Category | Technologies |
|----------|-------------|
| **Backend** | Django REST Framework + ASGI (Daphne) |
| **Frontend** | Angular |
| **Database** | PostgreSQL 16 |
| **Cache & Message Broker** | Redis |
| **AI / NLP** | NLTK, Hugging Face Transformers |
| **Real-time Communication** | WebSockets (Django Channels) |
| **Authentication** | Token-based (DRF Authtoken) |
| **Visualization** | Chart.js |
| **Containerization** | Docker |

## 🛠️ Installation
```bash
# Clone the repository
git clone https://github.com/ranim-ahmadi/Sof-Talent.git


# Using Docker
docker-compose up -d


# Backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Start Redis server
redis-server

# Run with ASGI server
daphne -b 0.0.0.0 -p 8000 config.asgi:application
# Frontend
npm install
ng serve
```


>>>>>>> 06381be10086a40f22fdc9437c0b59b39b28b115
