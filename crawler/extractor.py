from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup


def favicon_for(url: str, soup: BeautifulSoup) -> str:
    icon = soup.find("link", rel=lambda value: value and "icon" in value.lower())
    if icon and icon.get("href"):
        return urljoin(url, icon["href"])
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}/favicon.ico"


def summarize(text: str, limit: int = 420) -> str:
    clean = " ".join(text.split())
    if len(clean) <= limit:
        return clean
    return clean[:limit].rsplit(" ", 1)[0] + "..."


def extract_page(url: str, html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    for element in soup(["script", "style", "noscript", "svg"]):
        element.decompose()

    title = soup.title.string.strip() if soup.title and soup.title.string else urlparse(url).netloc
    description_tag = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", property="og:description")
    description = description_tag.get("content", "").strip() if description_tag else ""
    headings = [heading.get_text(" ", strip=True) for heading in soup.find_all(["h1", "h2", "h3"]) if heading.get_text(strip=True)]
    links = []
    for anchor in soup.find_all("a", href=True):
        absolute = urljoin(url, anchor["href"])
        parsed = urlparse(absolute)
        if parsed.scheme in {"http", "https"}:
            links.append(absolute.split("#", 1)[0])

    text = soup.get_text(" ", strip=True)
    parsed = urlparse(url)
    return {
        "url": url,
        "domain": parsed.netloc.lower(),
        "title": title,
        "description": description or summarize(text, 180),
        "headings": headings[:25],
        "links": sorted(set(links))[:150],
        "content": text,
        "summary": summarize(text),
        "favicon": favicon_for(url, soup),
    }
