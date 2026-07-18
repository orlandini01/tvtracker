import { Navigate, Route, Routes } from "react-router-dom";
import { AchievementsPage } from "./pages/AchievementsPage";
import { CalendarPage } from "./pages/CalendarPage";
import { ChallengesPage } from "./pages/ChallengesPage";
import { ComparePage } from "./pages/ComparePage";
import { DiaryPage } from "./pages/DiaryPage";
import { FeedPage } from "./pages/FeedPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { FriendProfilePage } from "./pages/FriendProfilePage";
import { FriendsPage } from "./pages/FriendsPage";
import { HomePage } from "./pages/HomePage";
import { ListDetailPage } from "./pages/ListDetailPage";
import { ListsPage } from "./pages/ListsPage";
import { LoginPage } from "./pages/LoginPage";
import { MediaDetailPage } from "./pages/MediaDetailPage";
import { MyListPage } from "./pages/MyListPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PublicWrappedPage } from "./pages/PublicWrappedPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { RoulettePage } from "./pages/RoulettePage";
import { SignupPage } from "./pages/SignupPage";
import { StatsPage } from "./pages/StatsPage";
import { WrappedPage } from "./pages/WrappedPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
      <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
      <Route path="/w/:token" element={<PublicWrappedPage />} />
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/minha-lista" element={<ProtectedRoute><MyListPage /></ProtectedRoute>} />
      <Route path="/listas" element={<ProtectedRoute><ListsPage /></ProtectedRoute>} />
      <Route path="/listas/:listId" element={<ProtectedRoute><ListDetailPage /></ProtectedRoute>} />
      <Route path="/amigos" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
      <Route path="/amigos/:friendId/comparar" element={<ProtectedRoute><ComparePage /></ProtectedRoute>} />
      <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
      <Route path="/wrapped" element={<ProtectedRoute><WrappedPage /></ProtectedRoute>} />
      <Route path="/calendario" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
      <Route path="/conquistas" element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>} />
      <Route path="/diario" element={<ProtectedRoute><DiaryPage /></ProtectedRoute>} />
      <Route path="/estatisticas" element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
      <Route path="/roleta" element={<ProtectedRoute><RoulettePage /></ProtectedRoute>} />
      <Route path="/desafios" element={<ProtectedRoute><ChallengesPage /></ProtectedRoute>} />
      <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/perfil/:userId" element={<ProtectedRoute><FriendProfilePage /></ProtectedRoute>} />
      <Route path="/media/:mediaType/:tmdbId" element={<ProtectedRoute><MediaDetailPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
