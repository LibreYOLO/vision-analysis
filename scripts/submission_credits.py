"""Publication credit lives separately from the unmodified measurement JSON."""
import re
from urllib.parse import urlsplit


def validate_credits(credits, filenames):
    errors = []
    if not isinstance(credits, dict):
        return ["submission-credits.json must be an object"]
    for filename, credit in credits.items():
        if filename not in filenames:
            errors.append(f"{filename}: credit has no matching submission")
        if not isinstance(credit, dict):
            errors.append(f"{filename}: credit must be an object")
            continue
        if set(credit) - {"source_pr", "submitted_by", "author"}:
            errors.append(f"{filename}: unknown credit fields")
        if not re.fullmatch(r"https://github\.com/LibreYOLO/vision-analysis/pull/[1-9][0-9]*", str(credit.get("source_pr", ""))):
            errors.append(f"{filename}: source_pr must link to a Vision Analysis PR")
        if not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?", str(credit.get("submitted_by", ""))):
            errors.append(f"{filename}: submitted_by must be a GitHub handle")
        author = credit.get("author")
        if author is None:
            continue
        if not isinstance(author, dict) or set(author) - {"display_name", "anonymous", "links"}:
            errors.append(f"{filename}: invalid author fields")
            continue
        if "anonymous" in author and not isinstance(author["anonymous"], bool):
            errors.append(f"{filename}: anonymous must be a boolean")
        if author.get("anonymous"):
            if author.get("display_name") or author.get("links"):
                errors.append(f"{filename}: anonymous author must not include name or links")
            continue
        name = author.get("display_name")
        if not isinstance(name, str) or not 1 <= len(name.strip()) <= 100:
            errors.append(f"{filename}: author needs a display_name of 1-100 characters")
        links = author.get("links", {})
        if not isinstance(links, dict) or set(links) - {"github", "linkedin", "x", "website"}:
            errors.append(f"{filename}: invalid author links")
            continue
        domains = {"github": {"github.com"}, "linkedin": {"linkedin.com", "www.linkedin.com"}, "x": {"x.com", "www.x.com", "twitter.com", "www.twitter.com"}}
        for kind, url in links.items():
            try:
                parsed = urlsplit(url) if isinstance(url, str) else None
                valid = parsed and parsed.scheme == "https" and parsed.hostname and not parsed.username and not parsed.password and parsed.port in (None, 443)
                if kind in domains:
                    valid = valid and parsed.hostname in domains[kind]
            except ValueError:
                valid = False
            if not valid:
                errors.append(f"{filename}: invalid HTTPS {kind} profile URL")
    return errors
