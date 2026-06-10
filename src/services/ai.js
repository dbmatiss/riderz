const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic();

const MODEL = 'claude-opus-4-8';

// Score de compatibilité entre deux profils — appelé à la création d'un match
async function computeCompatibility(profileA, profileB) {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: `Tu analyses la compatibilité amoureuse entre deux motards pour l'app de rencontre Riderz.
Base ton analyse sur : style de conduite, niveau, ville/région, bio, motos du garage.`,
    output_config: {
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            score: { type: 'integer', description: 'Score de compatibilité de 0 à 100' },
            summary: { type: 'string', description: '1 phrase max, ex: "Vous partagez la passion des routes de montagne"' },
            common_points: {
              type: 'array',
              items: { type: 'string' },
              description: '2 à 4 points communs concrets'
            }
          },
          required: ['score', 'summary', 'common_points'],
          additionalProperties: false
        }
      }
    },
    messages: [{
      role: 'user',
      content: `Profil A : ${JSON.stringify(profileA)}\nProfil B : ${JSON.stringify(profileB)}`
    }]
  });

  return JSON.parse(response.content.find(b => b.type === 'text').text);
}

// Itinéraire moto suggéré pour le premier rendez-vous
async function suggestRoute({ cityA, cityB, styleA, styleB, levelA, levelB }) {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: `Tu es un expert des routes moto en France et en Europe.
Génère un itinéraire moto idéal pour un premier rendez-vous entre deux motards.
L'itinéraire doit être romantique, accessible aux deux niveaux, et se terminer dans un endroit sympa (belvédère, village, restaurant).
Le point de rencontre doit être à mi-chemin entre les deux villes. Les coordonnées GPS doivent être réalistes et précises.`,
    output_config: {
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string', description: '2-3 phrases, ton chaleureux' },
            duration_h: { type: 'number' },
            distance_km: { type: 'number' },
            waypoints: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  lat: { type: 'number' },
                  lng: { type: 'number' },
                  label: { type: 'string' },
                  note: { type: 'string' }
                },
                required: ['lat', 'lng', 'label', 'note'],
                additionalProperties: false
              }
            },
            end_spot: { type: 'string', description: "Nom du lieu d'arrivée suggéré" },
            why_perfect: { type: 'string', description: '1 phrase pourquoi c\'est parfait pour eux' }
          },
          required: ['title', 'description', 'duration_h', 'distance_km', 'waypoints', 'end_spot', 'why_perfect'],
          additionalProperties: false
        }
      }
    },
    messages: [{
      role: 'user',
      content: `Rider A : ${cityA}, style ${styleA}, niveau ${levelA}
Rider B : ${cityB}, style ${styleB}, niveau ${levelB}`
    }]
  });

  return JSON.parse(response.content.find(b => b.type === 'text').text);
}

module.exports = { computeCompatibility, suggestRoute };
