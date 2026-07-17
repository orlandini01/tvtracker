// Ícone e chaves de tradução (não o texto em si) por emblema — o backend só
// manda id/earned/progress/target (STATUS_LABEL_KEYS já usa esse mesmo
// padrão pra status de biblioteca). Compartilhado entre AchievementsPage
// (lista completa) e ProfilePage (prévia).
export const ACHIEVEMENT_META: Record<string, { icon: string; nameKey: string; descriptionKey: string }> = {
  primeiro_passo: { icon: "🎬", nameKey: "achievements.primeiro_passo.name", descriptionKey: "achievements.primeiro_passo.description" },
  maratonista: { icon: "🍿", nameKey: "achievements.maratonista.name", descriptionKey: "achievements.maratonista.description" },
  cinefilo: { icon: "🎥", nameKey: "achievements.cinefilo.name", descriptionKey: "achievements.cinefilo.description" },
  serie_viciado: { icon: "📺", nameKey: "achievements.serie_viciado.name", descriptionKey: "achievements.serie_viciado.description" },
  critico: { icon: "⭐", nameKey: "achievements.critico.name", descriptionKey: "achievements.critico.description" },
  curador: { icon: "📋", nameKey: "achievements.curador.name", descriptionKey: "achievements.curador.description" },
  social: { icon: "🤝", nameKey: "achievements.social.name", descriptionKey: "achievements.social.description" },
  comentarista: { icon: "💬", nameKey: "achievements.comentarista.name", descriptionKey: "achievements.comentarista.description" },
  favoritos: { icon: "❤️", nameKey: "achievements.favoritos.name", descriptionKey: "achievements.favoritos.description" },
};
