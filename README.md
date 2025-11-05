# Sof-Talent
# 🧠 Sof'Talent Smart CV and Skills Management Platform

**Sof'Talent** is more than a simple CV tool it's a complete ecosystem that redefines how companies manage employee profiles and internal skills. The platform centralizes and standardizes CV generation, skills analysis, and internal mobility management through a modern and intelligent web solution.

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
| **Backend** | Django REST Framework |
| **Frontend** | Angular |
| **Database** | PostgreSQL 16 |
| **AI / NLP** | NLTK, Transformers |
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
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
ng serve
```

**Made with ❤️ by Ranim Ahmadi**
