import re

text = """
Balenciaga Track
https://hipobuy.cn/3zXiVbJs
50€
Nike Mind 001
https://hipobuy.cn/RQ5OvWgQ
25€
Asics gel NYC
https://hipobuy.cn/3Oh6IHb5
20€
New Balance 530
https://hipobuy.cn/1sTyWMQw
25€
Louis Vuitton Trainer
https://hipobuy.cn/y2YEN3MP
66€
Nike dunk StrangeLove
https://hipobuy.cn/M6xSH9fj
53€
Air force one Nocta/suprême
https://hipobuy.cn/7D2qDxzs
32€
Balenciaga Track LED
https://hipobuy.cn/GdFMNFc1
64€
Louis Vuitton Skate
https://hipobuy.cn/3ggFuMfm
66€
Dunk Travis Scott
https://hipobuy.cn/eA0zhaqg
48€
Adidas Samba
https://hipobuy.cn/jkMJwCVC
15€
AF1
https://hipobuy.cn/I5ObS87A
20€
Jordan 4
https://hipobuy.cn/RroTNS3P
66€
New Balance 2002
https://hipobuy.cn/0qTVuyjg
32€
Dior B30
https://hipobuy.cn/nPXgPOeS
80€
Dior B25
https://hipobuy.cn/iJRoloKQ
80€
Nike Mind 001
https://hipobuy.cn/8fWulQbS
22€
Claquette Burberry
https://hipobuy.cn/ok8cfD9x
28€
Yeezy Slide
https://hipobuy.cn/mSHCyU7I
13€
Air Max 95 1:1
https://hipobuy.cn/8szSjRRT
145€
Sac a dos Nike élite
https://hipobuy.cn/ksv9RBAW
19€
Prada CUP
https://hipobuy.cn/UbiNLUay
51€
Air Max 95 Cortez
https://hipobuy.cn/m5foFaMg
35€
Gucci Shoes
https://hipobuy.cn/BKprIo8Z
61€
Hermes Shoes
https://hipobuy.cn/uHTL6Aar
56€
Jordan 1 Low Dior
https://hipobuy.cn/PHcP7Wjl
41€
Dior B27
https://hipobuy.cn/Mce1WavA
30€
Jordan B9S
https://hipobuy.cn/6KGN6CRo
62€
"""

lines = [l.strip() for l in text.strip().split('\n') if l.strip()]
shoes = []
for i in range(0, len(lines), 3):
    if i+2 < len(lines):
        shoes.append({
            'title': lines[i],
            'url': lines[i+1],
            'price': lines[i+2]
        })

html = """<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <link rel="icon" href="/assets/img/favicon.png" type="image/png" />
  <title>Chaussures de Maxence | La Sélection du Chef</title>
  <meta name="description" content="La sélection exclusive de chaussures de Maxence." />
  <meta name="robots" content="noindex, nofollow" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />

  <link rel="stylesheet" href="/assets/css/main.css" />
  
  <style>
    .spreadsheet-hero {
      position: relative;
      padding: clamp(100px, 15vw, 180px) clamp(24px, 5vw, 80px) clamp(60px, 8vw, 100px);
      text-align: center;
      overflow: hidden;
      min-height: 50vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 2;
    }

    .spreadsheet-title {
      font-family: var(--font-d);
      font-size: clamp(3rem, 8vw, 6rem);
      font-weight: 800;
      line-height: 1.05;
      letter-spacing: -0.03em;
      margin-bottom: 24px;
      color: var(--white);
    }
    
    .spreadsheet-title .accent {
      color: var(--accent);
    }

    .spreadsheet-subtitle {
      font-size: clamp(1rem, 2vw, 1.25rem);
      color: var(--grey-4);
      max-width: 600px;
      margin: 0 auto 40px;
      line-height: 1.8;
    }

    .shoes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
      padding: 0 clamp(24px, 5vw, 80px) clamp(100px, 10vw, 160px);
      max-width: 1360px;
      margin: 0 auto;
      position: relative;
      z-index: 2;
    }

    .shoe-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 32px 24px;
      transition: all 0.4s var(--ease-out);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 240px;
      backdrop-filter: blur(10px);
    }

    .shoe-card::before {
      content: "";
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: radial-gradient(circle at top right, rgba(200, 255, 87, 0.1), transparent 50%);
      opacity: 0;
      transition: opacity 0.5s var(--ease-out);
      pointer-events: none;
    }

    .shoe-card:hover {
      transform: translateY(-8px);
      border-color: rgba(200, 255, 87, 0.3);
      background: rgba(255, 255, 255, 0.04);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(200, 255, 87, 0.05);
    }

    .shoe-card:hover::before {
      opacity: 1;
    }

    .shoe-card-index {
      font-family: var(--font-d);
      font-size: 0.8rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.15);
      position: absolute;
      top: 24px;
      right: 24px;
      transition: color 0.3s;
    }

    .shoe-card:hover .shoe-card-index {
      color: var(--accent);
    }

    .shoe-card-title {
      font-family: var(--font-d);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--white);
      margin-bottom: 12px;
      line-height: 1.2;
      padding-right: 30px;
    }

    .shoe-card-price {
      display: inline-block;
      font-family: var(--font-b);
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--accent);
      margin-bottom: 30px;
    }

    .shoe-card-link {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      font-family: var(--font-d);
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--black);
      background: var(--white);
      padding: 16px 24px;
      border-radius: 6px;
      text-decoration: none;
      transition: all 0.3s var(--ease-out);
      align-self: flex-start;
      margin-top: auto;
    }

    .shoe-card-link:hover {
      background: var(--accent);
      transform: translateX(4px);
      box-shadow: 0 0 20px rgba(200, 255, 87, 0.3);
    }
    
    .shoe-card-link svg {
      width: 16px;
      height: 16px;
      transition: transform 0.3s var(--ease-out);
    }

    .shoe-card-link:hover svg {
      transform: translateX(4px) rotate(-45deg);
    }

    .spread-ambient {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    }
    .spread-orb-1 {
      position: absolute;
      width: 60vw;
      height: 60vw;
      top: -20%;
      left: -10%;
      background: radial-gradient(circle, rgba(200, 255, 87, 0.05) 0, transparent 60%);
      filter: blur(80px);
      border-radius: 50%;
    }
    .spread-orb-2 {
      position: absolute;
      width: 50vw;
      height: 50vw;
      bottom: -10%;
      right: -10%;
      background: radial-gradient(circle, rgba(200, 255, 87, 0.03) 0, transparent 60%);
      filter: blur(80px);
      border-radius: 50%;
    }
    
    .reveal-item {
      opacity: 0;
      transform: translateY(30px);
      animation: fadeUpItem 0.8s var(--ease-out) forwards;
    }
    @keyframes fadeUpItem {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  </style>
</head>
<body class="loading">
  <div id="grain" aria-hidden="true"></div>
  <div id="cursor-dot" aria-hidden="true"></div>
  <div id="cursor-ring" aria-hidden="true"></div>

  <div class="spread-ambient" aria-hidden="true">
    <div class="spread-orb-1"></div>
    <div class="spread-orb-2"></div>
    <div class="hero-grid" aria-hidden="true"></div>
  </div>

  <header role="banner">
    <nav id="nav" aria-label="Navigation principale" class="visible">
      <div class="wrap nav-row">
        <a href="/" class="nav-logo" aria-label="Retour à l'accueil">MB</a>
        <ul class="nav-links" role="list">
          <li role="listitem"><a href="/">Accueil</a></li>
          <li role="listitem"><a href="/spreadsheet">Spreadsheets</a></li>
        </ul>
        <div class="nav-right">
          <div class="nav-status" role="status">
            <span class="nav-dot" aria-hidden="true"></span>
            <span>Disponible</span>
          </div>
        </div>
      </div>
    </nav>
  </header>

  <main id="main-content">
    <section class="spreadsheet-hero">
      <p class="s-label reveal on" data-num="01" aria-hidden="true">La sélection du chef</p>
      <h1 class="spreadsheet-title reveal on reveal-d1">Chaussures de<br><span class="accent">Maxence</span></h1>
      <p class="spreadsheet-subtitle reveal on reveal-d2">Une sélection exclusive de sneakers, claquettes et sacs à dos. Découvrez les meilleures pièces au meilleur prix.</p>
    </section>

    <div class="shoes-grid">
"""

for idx, shoe in enumerate(shoes):
    delay = 0.1 + (idx * 0.05)
    html += f"""
      <article class="shoe-card reveal-item" style="animation-delay: {delay}s;">
        <span class="shoe-card-index">{str(idx+1).zfill(2)}</span>
        <div>
          <h2 class="shoe-card-title">{shoe['title']}</h2>
          <span class="shoe-card-price">{shoe['price']}</span>
        </div>
        <a href="{shoe['url']}" target="_blank" rel="noopener noreferrer" class="shoe-card-link">
          Acheter
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </article>"""

html += """
    </div>
  </main>

  <footer role="contentinfo" style="position: relative; z-index: 2;">
    <div class="wrap footer-row" style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 28px;">
      <p class="footer-copy">
        &copy; 2026 <span>Mahé Brizion</span> — La Sélection du Chef
      </p>
    </div>
  </footer>

  <script src="/assets/js/main.js" defer></script>
</body>
</html>
"""

with open("spreadsheet/chaussures-de-maxence/index.html", "w") as f:
    f.write(html)

print("Generated chaussures-de-maxence/index.html")
