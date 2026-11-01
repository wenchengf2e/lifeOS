import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AboutPage } from "./pages/AboutPage";
import { BeliefPage } from "./pages/BeliefPage";
import { DiaryPage } from "./pages/DiaryPage";
import { LifeOSPage } from "./pages/LifeOSPage";
import { ListsPage } from "./pages/ListsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OverviewPage } from "./pages/OverviewPage";
import { PrinciplesPage } from "./pages/PrinciplesPage";
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
        <Route path="/belief" element={<BeliefPage />} />
        <Route path="/lifeos" element={<LifeOSPage />} />
        <Route path="/diary" element={<DiaryPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/review/week/:key" element={<ReviewWizardPage />} />
        <Route path="/lists" element={<ListsPage />} />
        <Route path="/principles" element={<PrinciplesPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
