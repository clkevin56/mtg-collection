const program = [
  {
    day: "Lundi",
    theme: "Cardio & Gainage",
    sport: {
      title: "HIIT + Gainage",
      duration: "35 min",
      intensity: "Élevée",
      details: [
        { name: "Échauffement", time: "5 min", desc: "Jumping jacks, rotation des épaules, genoux hauts" },
        { name: "Circuit HIIT × 3", time: "20 min", desc: "30s Burpees → 30s repos · 30s Mountain climbers → 30s repos · 30s Jump squats → 30s repos · 30s High knees → 30s repos" },
        { name: "Gainage", time: "10 min", desc: "Planche 45s × 3 · Planche latérale 30s/côté × 2 · Superman 12 reps × 3" },
      ],
      kcal: 320,
      tip: "Priorité au gainage pour éliminer la graisse abdominale. Gardez le ventre rentré pendant tous les exercices."
    },
    meals: [
      {
        name: "Petit-déjeuner",
        icon: "🌅",
        time: "7h00",
        items: [
          "Porridge : 60g de flocons d'avoine + lait écrémé ou végétal",
          "100g de fruits rouges frais ou surgelés",
          "1 yaourt grec nature 0%",
          "Café ou thé sans sucre"
        ],
        kcal: 420,
        proteins: 22
      },
      {
        name: "Collation matin",
        icon: "🍎",
        time: "10h30",
        items: [
          "1 pomme",
          "15 amandes (≈ 20g)"
        ],
        kcal: 195,
        proteins: 5
      },
      {
        name: "Déjeuner",
        icon: "☀️",
        time: "12h30",
        items: [
          "150g de poulet grillé (sans peau)",
          "80g de quinoa cuit",
          "200g de brocolis vapeur",
          "1 filet d'huile d'olive + citron"
        ],
        kcal: 520,
        proteins: 45
      },
      {
        name: "Collation après-midi",
        icon: "🥛",
        time: "16h00",
        items: [
          "1 yaourt nature 0%",
          "1 càs de graines de chia"
        ],
        kcal: 130,
        proteins: 10
      },
      {
        name: "Dîner",
        icon: "🌙",
        time: "19h30",
        items: [
          "150g de saumon vapeur",
          "150g de patate douce rôtie",
          "Salade verte + vinaigrette légère",
          "1 tranche de pain complet"
        ],
        kcal: 490,
        proteins: 38
      }
    ],
    totalKcal: 1755,
    totalProteins: 120
  },
  {
    day: "Mardi",
    theme: "Musculation Haut du Corps",
    sport: {
      title: "Force — Haut du Corps",
      duration: "45 min",
      intensity: "Modérée–Élevée",
      details: [
        { name: "Échauffement", time: "5 min", desc: "Rotations bras, pompes lentes, swing épaules" },
        { name: "Pompes", time: "3 séries", desc: "15 reps · Variante: pieds surélevés pour cibler les épaules · 60s repos" },
        { name: "Tractions / Rowing avec élastique", time: "3 séries", desc: "8–12 reps · 90s de repos" },
        { name: "Dips sur chaise", time: "3 séries", desc: "12 reps · 60s repos · Cibles : triceps, poitrine" },
        { name: "Développé épaules (haltères ou élastiques)", time: "3 séries", desc: "12 reps · 60s repos" },
        { name: "Curl biceps", time: "3 séries", desc: "12 reps · 60s repos" },
        { name: "Gainage final", time: "5 min", desc: "Planche 60s × 3" }
      ],
      kcal: 280,
      tip: "La musculation brûle des calories pendant 24–48h après la séance (effet afterburn). Priorité à la bonne forme sur la charge."
    },
    meals: [
      {
        name: "Petit-déjeuner",
        icon: "🌅",
        time: "7h00",
        items: [
          "3 œufs brouillés à la poêle (sans beurre ou spray huile)",
          "2 tranches de pain complet toasté",
          "½ avocat",
          "Café ou thé sans sucre"
        ],
        kcal: 455,
        proteins: 28
      },
      {
        name: "Collation matin",
        icon: "🧀",
        time: "10h30",
        items: [
          "100g de fromage blanc 0%",
          "1 poignée de noix (≈ 25g)"
        ],
        kcal: 185,
        proteins: 12
      },
      {
        name: "Déjeuner",
        icon: "☀️",
        time: "12h30",
        items: [
          "1 boîte de thon naturel (140g égoutté)",
          "200g de lentilles vertes cuites",
          "Tomates cerises + concombre",
          "Vinaigrette moutarde-citron"
        ],
        kcal: 535,
        proteins: 48
      },
      {
        name: "Collation après-midi",
        icon: "🍌",
        time: "16h00",
        items: [
          "1 banane moyenne"
        ],
        kcal: 95,
        proteins: 1
      },
      {
        name: "Dîner",
        icon: "🌙",
        time: "19h30",
        items: [
          "150g de blanc de poulet mariné (herbes de Provence)",
          "Ratatouille maison (courgettes, aubergines, tomates)",
          "80g de riz basmati cuit"
        ],
        kcal: 490,
        proteins: 40
      }
    ],
    totalKcal: 1760,
    totalProteins: 129
  },
  {
    day: "Mercredi",
    theme: "Récupération Active",
    sport: {
      title: "Marche Rapide ou Yoga",
      duration: "45 min",
      intensity: "Faible",
      details: [
        { name: "Option A — Marche rapide", time: "45 min", desc: "Allure soutenue (5–6 km/h), bras actifs. Idéalement en nature ou en côtes légères pour travailler les fessiers." },
        { name: "Option B — Yoga / Stretching", time: "45 min", desc: "Salutation au soleil × 5 · Posture du guerrier · Posture de l'enfant · Torsion assise · Pigeon (hanches et fessiers)" }
      ],
      kcal: 200,
      tip: "Le jour de récupération est AUSSI important que les séances intenses. Le corps construit le muscle pendant le repos."
    },
    meals: [
      {
        name: "Petit-déjeuner",
        icon: "🌅",
        time: "7h30",
        items: [
          "Smoothie : 200ml lait d'amande + 1 banane + 1 poignée d'épinards + 1 càs beurre de cajou",
          "2 tranches de pain complet + houmous"
        ],
        kcal: 395,
        proteins: 16
      },
      {
        name: "Collation matin",
        icon: "🍐",
        time: "10h30",
        items: [
          "1 poire",
          "1 tranche de fromage (emmental ou comté, 30g)"
        ],
        kcal: 195,
        proteins: 7
      },
      {
        name: "Déjeuner",
        icon: "☀️",
        time: "12h30",
        items: [
          "Grande salade niçoise : thon, œuf dur, haricots verts, olives noires, tomates",
          "1 tranche de pain de seigle",
          "Vinaigrette olive + citron"
        ],
        kcal: 455,
        proteins: 38
      },
      {
        name: "Collation après-midi",
        icon: "🥜",
        time: "16h00",
        items: [
          "20g de noix de cajou",
          "1 carré de chocolat noir 70%"
        ],
        kcal: 165,
        proteins: 4
      },
      {
        name: "Dîner",
        icon: "🌙",
        time: "19h30",
        items: [
          "3 œufs en omelette avec champignons et épinards",
          "Bol de soupe de légumes maison (carottes, poireaux, céleri)",
          "1 yaourt nature"
        ],
        kcal: 435,
        proteins: 32
      }
    ],
    totalKcal: 1645,
    totalProteins: 97
  },
  {
    day: "Jeudi",
    theme: "Cardio + Bas du Corps",
    sport: {
      title: "Course + Jambes",
      duration: "50 min",
      intensity: "Élevée",
      details: [
        { name: "Course à pied", time: "30 min", desc: "Rythme confortable (conversation possible). Alternez 3 min à allure normale + 1 min accélération × 6." },
        { name: "Squats", time: "3 séries × 20 reps", desc: "Pieds largeur d'épaules, descendre jusqu'aux 90°. 60s repos." },
        { name: "Fentes avant alternées", time: "3 séries × 12/jambe", desc: "Contrôle du genou. 60s repos." },
        { name: "Hip thrust (fessiers)", time: "3 séries × 15 reps", desc: "Sur sol ou banc. 60s repos. Excellent pour cibler les fessiers." },
        { name: "Mollets debout", time: "3 séries × 25 reps", desc: "Sur une marche. 45s repos." }
      ],
      kcal: 380,
      tip: "La course à jeun n'est PAS nécessaire. Manger son petit-déjeuner 1h avant est suffisant et plus agréable."
    },
    meals: [
      {
        name: "Petit-déjeuner",
        icon: "🌅",
        time: "7h00",
        items: [
          "2 tranches de pain complet",
          "2 càs de beurre de cacahuète naturel",
          "1 banane",
          "Café ou thé sans sucre"
        ],
        kcal: 435,
        proteins: 18
      },
      {
        name: "Collation matin",
        icon: "🥛",
        time: "10h30",
        items: [
          "1 yaourt grec nature",
          "2 càs de granola sans sucre ajouté"
        ],
        kcal: 225,
        proteins: 14
      },
      {
        name: "Déjeuner",
        icon: "☀️",
        time: "12h30",
        items: [
          "150g de steak haché 5% MG",
          "100g de haricots rouges",
          "Poivrons et courgettes rôtis",
          "1 petite tortilla de blé complet"
        ],
        kcal: 545,
        proteins: 42
      },
      {
        name: "Collation après-midi",
        icon: "🍊",
        time: "16h00",
        items: [
          "1 orange",
          "12 amandes"
        ],
        kcal: 170,
        proteins: 5
      },
      {
        name: "Dîner",
        icon: "🌙",
        time: "19h30",
        items: [
          "200g de crevettes sautées à l'ail et citron",
          "Nouilles de courgettes (spiraliser 2 courgettes)",
          "Sauce tomate maison",
          "Parmesan râpé (10g)"
        ],
        kcal: 420,
        proteins: 36
      }
    ],
    totalKcal: 1795,
    totalProteins: 115
  },
  {
    day: "Vendredi",
    theme: "Circuit Training",
    sport: {
      title: "Full Body Circuit",
      duration: "40 min",
      intensity: "Élevée",
      details: [
        { name: "Échauffement", time: "5 min", desc: "Corde à sauter ou jumping jacks" },
        { name: "Circuit × 4 (sans repos entre exercices)", time: "30 min", desc: "10 pompes · 15 squats sautés · 20 mountain climbers · 10 dips · 15 fentes alternées · 30s planche · 2 min repos entre circuits" },
        { name: "Retour au calme", time: "5 min", desc: "Étirements statiques : ischio-jambiers, quadriceps, dos, épaules" }
      ],
      kcal: 350,
      tip: "Le circuit training combine cardio + musculation : idéal pour brûler un maximum de calories en peu de temps."
    },
    meals: [
      {
        name: "Petit-déjeuner",
        icon: "🌅",
        time: "7h00",
        items: [
          "Crêpes protéinées : 60g de flocons d'avoine mixés + 2 blancs d'œuf + 1 œuf entier",
          "1 càs de sirop d'érable (petite dose)",
          "100g de fruits frais"
        ],
        kcal: 405,
        proteins: 30
      },
      {
        name: "Collation matin",
        icon: "🥤",
        time: "10h30",
        items: [
          "Smoothie : 200ml lait végétal + 100g fruits rouges + 1 càs graines de lin"
        ],
        kcal: 175,
        proteins: 5
      },
      {
        name: "Déjeuner",
        icon: "☀️",
        time: "12h30",
        items: [
          "Wrap : tortilla complète + 130g poulet émincé + crudités (laitue, tomate, concombre)",
          "3 càs de houmous",
          "1 pomme"
        ],
        kcal: 530,
        proteins: 38
      },
      {
        name: "Collation après-midi",
        icon: "🍫",
        time: "16h00",
        items: [
          "2 carrés de chocolat noir 70%",
          "Thé vert ou infusion sans sucre"
        ],
        kcal: 110,
        proteins: 2
      },
      {
        name: "Dîner",
        icon: "🌙",
        time: "19h30",
        items: [
          "150g de cabillaud au four (herbes fraîches + citron)",
          "Légumes rôtis au four (poivrons, aubergines, tomates)",
          "80g de quinoa cuit"
        ],
        kcal: 475,
        proteins: 42
      }
    ],
    totalKcal: 1695,
    totalProteins: 117
  },
  {
    day: "Samedi",
    theme: "Endurance",
    sport: {
      title: "Vélo ou Natation",
      duration: "60–90 min",
      intensity: "Modérée",
      details: [
        { name: "Option A — Vélo", time: "60–90 min", desc: "Sortie en plein air ou vélo stationnaire. Allure modérée (60–70% FCmax). Alternez terrain plat et petites montées." },
        { name: "Option B — Natation", time: "60 min", desc: "25 longueurs de crawl · 10 longueurs de dos crawlé · 5 longueurs de brasse. Très efficace pour le ventre." },
        { name: "Option C — Randonnée", time: "90 min", desc: "En forêt ou en montagne. Faible impact articulaire, excellent pour déstresser et brûler des calories progressivement." }
      ],
      kcal: 450,
      tip: "Le samedi, profitez-en pour faire une activité plaisir en extérieur. Le sport que l'on aime, on le pratique régulièrement."
    },
    meals: [
      {
        name: "Petit-déjeuner",
        icon: "🌅",
        time: "7h30",
        items: [
          "60g de granola maison (flocons d'avoine, noix, graines) + 200ml lait végétal",
          "1 kiwi + quelques fraises",
          "1 café"
        ],
        kcal: 455,
        proteins: 14
      },
      {
        name: "Collation avant sport",
        icon: "⚡",
        time: "10h00",
        items: [
          "1 banane",
          "1 càs de beurre d'amande"
        ],
        kcal: 200,
        proteins: 4
      },
      {
        name: "Déjeuner",
        icon: "☀️",
        time: "13h00",
        items: [
          "Paëlla légère maison : 80g de riz complet + 100g de blanc de poulet + 80g de crevettes + poivrons + tomates",
          "Assaisonnement : safran, paprika, ail"
        ],
        kcal: 575,
        proteins: 44
      },
      {
        name: "Collation après-midi",
        icon: "🥛",
        time: "16h30",
        items: [
          "150g de fromage blanc 0%",
          "1 pêche ou 1 nectarine"
        ],
        kcal: 175,
        proteins: 14
      },
      {
        name: "Dîner",
        icon: "🌙",
        time: "20h00",
        items: [
          "Grande soupe minestrone (tomates, haricots blancs, courgettes, carottes, céleri)",
          "1 tranche de pain complet grillé",
          "1 yaourt grec"
        ],
        kcal: 380,
        proteins: 20
      }
    ],
    totalKcal: 1785,
    totalProteins: 96
  },
  {
    day: "Dimanche",
    theme: "Repos & Récupération",
    sport: {
      title: "Yoga / Stretching",
      duration: "30 min",
      intensity: "Très faible",
      details: [
        { name: "Yoga doux", time: "30 min", desc: "Salutation au soleil × 3 (lente) · Posture de l'enfant · Pigeon bilatéral · Torsion allongée · Relaxation finale (savasana 5 min)" }
      ],
      kcal: 80,
      tip: "Le dimanche est le jour de recharge mentale et physique. Préparez mentalement la semaine suivante et faites vos courses sainement."
    },
    meals: [
      {
        name: "Petit-déjeuner",
        icon: "🌅",
        time: "9h00",
        items: [
          "Pancakes à l'avoine : 80g de flocons d'avoine mixés + 2 œufs + 1 banane écrasée",
          "Garniture : fruits frais + 1 càc de miel",
          "1 café ou thé"
        ],
        kcal: 430,
        proteins: 22
      },
      {
        name: "Brunch / Collation",
        icon: "🥚",
        time: "11h30",
        items: [
          "2 œufs pochés",
          "Salade d'avocat + tomates cerises + roquette",
          "1 tranche de pain complet"
        ],
        kcal: 390,
        proteins: 20
      },
      {
        name: "Déjeuner",
        icon: "☀️",
        time: "14h00",
        items: [
          "Pot-au-feu léger : 150g de bœuf maigre + carottes, poireaux, navets, pommes de terre",
          "Bouillon dégraissé"
        ],
        kcal: 465,
        proteins: 38
      },
      {
        name: "Collation",
        icon: "🍵",
        time: "17h00",
        items: [
          "Thé ou infusion",
          "15 noix de cajou ou amandes"
        ],
        kcal: 120,
        proteins: 4
      },
      {
        name: "Dîner",
        icon: "🌙",
        time: "19h30",
        items: [
          "Soupe de légumes légère (brocolis, épinards, poireaux)",
          "100g de fromage blanc 0%",
          "1 tranche de pain complet"
        ],
        kcal: 280,
        proteins: 18
      }
    ],
    totalKcal: 1685,
    totalProteins: 102
  }
];

const intensityColors = {
  "Élevée": "#ef4444",
  "Modérée–Élevée": "#f97316",
  "Modérée": "#f59e0b",
  "Faible": "#22c55e",
  "Très faible": "#3b82f6"
};

function getCalPercent(kcal, total) {
  return Math.round((kcal / total) * 100);
}

function renderDay(idx) {
  const d = program[idx];
  const container = document.getElementById("dayContent");

  const intensityColor = intensityColors[d.sport.intensity] || "#6366f1";

  const sportDetailsHtml = d.sport.details.map(detail => `
    <div class="sport-detail">
      <div class="sport-detail-name">${detail.name}</div>
      <div class="sport-detail-time">${detail.time}</div>
      <div class="sport-detail-desc">${detail.desc}</div>
    </div>
  `).join("");

  const mealsHtml = d.meals.map(meal => {
    const percent = getCalPercent(meal.kcal, d.totalKcal);
    const items = meal.items.map(i => `<li>${i}</li>`).join("");
    return `
      <div class="meal-card">
        <div class="meal-header">
          <span class="meal-icon">${meal.icon}</span>
          <div class="meal-info">
            <span class="meal-name">${meal.name}</span>
            <span class="meal-time">${meal.time}</span>
          </div>
          <div class="meal-kcal">
            <span class="kcal-val">${meal.kcal}</span>
            <span class="kcal-label">kcal</span>
          </div>
        </div>
        <ul class="meal-items">${items}</ul>
        <div class="meal-bar-wrap">
          <div class="meal-bar" style="width:${percent}%"></div>
          <span class="meal-bar-label">${percent}% du total</span>
        </div>
        <div class="meal-proteins">🥩 ${meal.proteins}g de protéines</div>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <div class="day-header">
      <div class="day-title">
        <h2>${d.day}</h2>
        <span class="day-theme">${d.theme}</span>
      </div>
      <div class="day-totals">
        <div class="total-badge">
          <span>${d.totalKcal}</span>
          <small>kcal total</small>
        </div>
        <div class="total-badge prot">
          <span>${d.totalProteins}g</span>
          <small>protéines</small>
        </div>
      </div>
    </div>

    <div class="day-grid">
      <div class="sport-section">
        <h3 class="section-title">💪 Séance de sport</h3>
        <div class="sport-card">
          <div class="sport-meta">
            <span class="sport-title">${d.sport.title}</span>
            <span class="sport-duration">⏱ ${d.sport.duration}</span>
            <span class="sport-intensity" style="background:${intensityColor}20; color:${intensityColor}; border:1px solid ${intensityColor}40">
              ${d.sport.intensity}
            </span>
            <span class="sport-kcal">🔥 ~${d.sport.kcal} kcal</span>
          </div>
          <div class="sport-details">${sportDetailsHtml}</div>
          <div class="sport-tip">
            <span>💡</span>
            <p>${d.sport.tip}</p>
          </div>
        </div>
      </div>

      <div class="meals-section">
        <h3 class="section-title">🥘 Menus de la journée</h3>
        ${mealsHtml}
      </div>
    </div>
  `;

  container.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

document.addEventListener("DOMContentLoaded", () => {
  renderDay(0);

  document.getElementById("daysNav").addEventListener("click", e => {
    const btn = e.target.closest(".day-btn");
    if (!btn) return;
    document.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderDay(parseInt(btn.dataset.day));
  });
});
