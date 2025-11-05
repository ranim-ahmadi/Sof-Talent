import os
import re
import unicodedata
import pdfplumber
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import logging
from transformers import MarianTokenizer, MarianMTModel

logger = logging.getLogger(__name__)

# Charger les modèles de traduction
try:
    fr_to_en_model_name = "Helsinki-NLP/opus-mt-fr-en"
    fr_to_en_tokenizer = MarianTokenizer.from_pretrained(fr_to_en_model_name)
    fr_to_en_model = MarianMTModel.from_pretrained(fr_to_en_model_name)
    en_to_fr_model_name = "Helsinki-NLP/opus-mt-en-fr"
    en_to_fr_tokenizer = MarianTokenizer.from_pretrained(en_to_fr_model_name)
    en_to_fr_model = MarianMTModel.from_pretrained(en_to_fr_model_name)
    logger.info("Modèles de traduction chargés avec succès.")
except Exception as e:
    logger.error(f"Erreur lors du chargement des modèles de traduction : {str(e)}")
    fr_to_en_model = None
    fr_to_en_tokenizer = None
    en_to_fr_model = None
    en_to_fr_tokenizer = None

# Fonctions de traduction et d'extraction
def translate_text(text, tokenizer, model, direction="fr_to_en"):
    if not text or not tokenizer or not model:
        return text
    try:
        inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=512)
        translated = model.generate(**inputs)
        translated_text = tokenizer.decode(translated[0], skip_special_tokens=True)
        logger.debug(f"Traduction {direction} : {text} → {translated_text}")
        return translated_text
    except Exception as e:
        logger.error(f"Erreur lors de la traduction ({direction}) de '{text}' : {str(e)}")
        return text

def generate_translated_variants(text):
    if not text:
        return [""]
    normalized_text = normalize_text(text)
    variants = [normalized_text]
    if fr_to_en_model and fr_to_en_tokenizer:
        try:
            fr_to_en = translate_text(text, fr_to_en_tokenizer, fr_to_en_model, "fr_to_en")
            normalized_fr_to_en = normalize_text(fr_to_en)
            if normalized_fr_to_en and normalized_fr_to_en != normalized_text:
                variants.append(normalized_fr_to_en)
        except Exception as e:
            logger.warning(f"Erreur lors de la génération de variante FR->EN pour '{text}': {str(e)}")
    if en_to_fr_model and en_to_fr_tokenizer:
        try:
            en_to_fr = translate_text(text, en_to_fr_tokenizer, en_to_fr_model, "en_to_fr")
            normalized_en_to_fr = normalize_text(en_to_fr)
            if normalized_en_to_fr and normalized_en_to_fr != normalized_text:
                variants.append(normalized_en_to_fr)
        except Exception as e:
            logger.warning(f"Erreur lors de la génération de variante EN->FR pour '{text}': {str(e)}")
    return list(set([variant for variant in variants if variant]))

def extract_text_from_pdf(pdf_path):
    try:
        text = ""
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        if not text.strip():
            logger.warning(f"Aucun texte extrait de {pdf_path}.")
            return ""
        logger.debug(f"Texte brut extrait :\n{text}")
        return text.strip()
    except Exception as e:
        logger.error(f"Erreur lors de l'extraction avec pdfplumber : {str(e)}")
        raise

def parse_fiche_poste_pdf(pdf_path):
    try:
        # Extraire tout le texte du PDF
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        logger.debug(f"Texte extrait du PDF : {text[:500]}...")

        # Initialiser les champs à extraire
        parsed_data = {
            'title': '',
            'missions': '',
            'main_tasks': [],
            'profile': '',
            'technical_skills': [],
            'personal_qualities': [],
            'keywords': []
        }

        # Extraire le titre de manière générique
        lines = text.split("\n")
        title_candidates = []
        for i, line in enumerate(lines[:10]):  # Regarder les 10 premières lignes
            line = line.strip()
            # Ignorer les lignes contenant des métadonnées ou des numéros de page
            if not line or re.match(r'^\d+$', line) or 'Sofrecom' in line or '©' in line:
                continue
            # Chercher un motif comme "Fiche de poste : Titre" ou juste un titre
            if re.search(r'Fiche de poste\s*[:\-]', line, re.IGNORECASE):
                title_part = re.split(r'Fiche de poste\s*[:\-]', line, flags=re.IGNORECASE)[1].strip()
                if title_part:
                    title_candidates.append(title_part)
            elif len(line.split()) > 1 and len(line) < 50:  # Un titre est souvent court et contient plusieurs mots
                title_candidates.append(line)
        # Prendre le premier candidat non vide comme titre
        parsed_data['title'] = next((candidate for candidate in title_candidates if candidate), '')

        # Extraire les missions
        if "Missions" in text:
            missions_section = text.split("Missions")[1].split("Activités principales")[0].strip()
            parsed_data['missions'] = missions_section if missions_section != "Rien" else ""

        # Extraire les activités principales
        if "Activités principales" in text:
            tasks_section = text.split("Activités principales")[1].split("Profil")[0].strip()
            tasks = [task.strip() for task in tasks_section.split("\n") if task.strip() and task != "- Rien"]
            parsed_data['main_tasks'] = tasks

        # Extraire le profil
        if "Profil" in text:
            profile_section = text.split("Profil")[1].split("Compétences techniques exigées")[0].strip()
            parsed_data['profile'] = profile_section

        # Extraire les compétences techniques
        if "Compétences techniques exigées" in text:
            skills_section = text.split("Compétences techniques exigées")[1].split("Aptitudes relationnelles")[0].strip()
            skills = [skill.strip() for skill in skills_section.split("\n") if skill.strip() and skill != "- Rien"]
            parsed_data['technical_skills'] = skills

        # Extraire les aptitudes relationnelles
        if "Aptitudes relationnelles et comportementales" in text:
            qualities_section = text.split("Aptitudes relationnelles et comportementales")[1].split("L'environnent international")[0].strip()
            qualities = [quality.strip() for quality in qualities_section.split("\n") if quality.strip() and quality != "- Rien"]
            parsed_data['personal_qualities'] = qualities

        # Extraire les mots-clés
        if "Mots-clés :" in text:
            keywords_section = text.split("Mots-clés :")[1].strip()
            keywords = [kw.strip() for kw in keywords_section.split("\n") if kw.strip() and kw not in ["(1 row)", "© Sofrecom -", "2"]]
            parsed_data['keywords'] = keywords
        else:
            logger.warning(f"Aucune section 'Mots-clés' trouvée dans le PDF {pdf_path}")

        return parsed_data, text

    except Exception as e:
        logger.error(f"Erreur lors de l'extraction du PDF {pdf_path}: {str(e)}", exc_info=True)
        return None, ""

def generate_pdf(fiche_poste, pdf_path):
    c = canvas.Canvas(pdf_path)
    c.setFont("Helvetica", 16)
    c.drawString(100, 750, fiche_poste.get("title", ""))
    c.setFont("Helvetica", 12)
    y = 700

    text_lines = [
        "Objectifs du poste:",
        fiche_poste.get("job_objectives", ""),
        "Activités principales:"
    ]
    for task in fiche_poste.get("main_tasks", []):
        text_lines.append(f"- {task}")
    text_lines.extend([
        "Profil:",
        fiche_poste.get("profile", ""),
        "Compétences techniques exigées:"
    ])
    for skill in fiche_poste.get("technical_skills", []):
        text_lines.append(f"- {skill}")
    text_lines.extend([
        "Aptitudes relationnelles et comportementales:"
    ])
    for quality in fiche_poste.get("personal_qualities", []):
        text_lines.append(f"- {quality}")
    text_lines.extend([
        "Mots-clés:",
        ", ".join(fiche_poste.get("keywords", [])) if fiche_poste.get("keywords") else ""
    ])

    for line in text_lines:
        c.drawString(100, y, line)
        y -= 20
        if y < 50:
            c.showPage()
            c.setFont("Helvetica", 12)
            y = 750
    c.save()
    logger.debug(f"PDF généré avec succès à {pdf_path}")

def normalize_text(text):
    if not text:
        return ""
    if isinstance(text, str):
        text = text.lower()
        text = ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')
        text = re.sub(r'[^\w\s.]', ' ', text).strip()
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    return str(text).lower().strip()

def extract_technologies_from_experience(experiences):
    technologies = []
    for exp in experiences:
        if hasattr(exp, 'technologies') and exp.technologies:
            if isinstance(exp.technologies, str):
                tech_list = [tech.strip() for tech in exp.technologies.split(',') if tech.strip()]
                technologies.extend(tech_list)
            elif isinstance(exp.technologies, list):
                technologies.extend([str(tech).strip() for tech in exp.technologies if str(tech).strip()])
    return list(set([normalize_text(tech) for tech in technologies]))

def calculate_skills_match(job_keywords, cv_skills, cv_certifications, cv_technologies):
    normalized_job_keywords = list(set([normalize_text(req) for req in job_keywords if req]))
    logger.debug(f"Job keywords normalisés : {normalized_job_keywords}")
    if not normalized_job_keywords:
        logger.warning("Aucune exigence de compétence trouvée")
        return 0.0, []

    normalized_cv_skills = [normalize_text(skill) for skill in cv_skills if skill]
    normalized_cv_certifications = [normalize_text(cert) for cert in cv_certifications if cert]
    normalized_cv_technologies = [normalize_text(tech) for tech in cv_technologies if tech]
    cv_all_skills = list(set(normalized_cv_skills + normalized_cv_certifications + normalized_cv_technologies))
    logger.debug(f"Toutes les compétences CV normalisées : {cv_all_skills}")

    matches = []
    matched_skills = []
    for job_req in normalized_job_keywords:
        job_words = job_req.split()
        for cv_skill in cv_all_skills:
            cv_words = cv_skill.split()
            if (job_req == cv_skill or
                job_req in cv_skill or
                cv_skill in job_req or
                any(word in cv_skill for word in job_words) or
                any(cv_word in job_req for cv_word in cv_words)):
                matches.append(job_req)
                matched_skills.append(job_req)
                logger.debug(f"Correspondance trouvée : job_req={job_req}, cv_skill={cv_skill}")
                break

    skills_score = (len(set(matches)) / len(normalized_job_keywords) * 100) if normalized_job_keywords else 0
    skills_score = min(round(skills_score, 1), 100.0)
    logger.debug(f"Score compétences : {skills_score}%, Correspondances : {set(matched_skills)}")
    return skills_score, list(set(matched_skills))

def extract_job_id_from_pdf_filename(pdf_path):
    # Motif original
    match = re.search(r'fiche_poste_(\d+).pdf', pdf_path.lower())
    if match:
        return int(match.group(1))

    # Nouveau motif pour les fichiers comme "Ingénieur_Data_Fiche_200.pdf"
    match = re.search(r'fiche_(\d+).pdf', pdf_path.lower())
    if match:
        return int(match.group(1))

    # Motif encore plus général pour capturer tout nombre suivi de .pdf
    match = re.search(r'_(\d+)\.pdf$', pdf_path.lower())
    if match:
        return int(match.group(1))

    raise ValueError("Impossible d'extraire l'ID de la fiche de poste depuis le nom du fichier PDF")