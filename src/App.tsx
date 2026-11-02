import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AboutPage } from "./pages/AboutPage";
import { DailyPage } from "./pages/DailyPage";
import { DiaryPage } from "./pages/DiaryPage";
import { GoalDetailPage } from "./pages/GoalDetailPage";
import { GoalsPage } from "./pages/GoalsPage";
import { LifeOSPage } from "./pages/LifeOSPage";
import { ListsPage } from "./pages/ListsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OverviewPage } from "./pages/OverviewPage";
import { ReviewPage } from "./pages/ReviewPage";
import { ReviewWizardPage } from "./pages/ReviewWizardPage";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export function App() {
  return (
    <Layout>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/daily" element={<DailyPage />} />
        {/* 旧地址：信念重写 → 每日仪式，晚间日记 → 并入每日仪式 */}
        <Route path="/belief" element={<Navigate to="/daily" replace />} />
        <Route path="/evening" element={<Navigate to="/daily" replace />} />
        <Route path="/lifeos" element={<LifeOSPage />} />
        <Route path="/diary" element={<DiaryPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/review/week/:key" element={<ReviewWizardPage />} />
        <Route path="/lists" element={<ListsPage />} />
        <Route path="/principles" element={<GoalsPage />} />
        <Route path="/principles/:goalId" element={<GoalDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
