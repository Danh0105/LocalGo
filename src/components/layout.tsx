import { getSystemInfo } from "zmp-sdk";
import {
  AnimationRoutes,
  App,
  Route,
  SnackbarProvider,
  ZMPRouter,
} from "zmp-ui";
import { AppProps } from "zmp-ui/app";

import AgricultureDetailPage from "@/pages/agriculture-detail";
import AgriculturePage from "@/pages/agriculture";
import AboutPage from "@/pages/about";
import AttractionDetailPage from "@/pages/attraction-detail";
import AttractionsPage from "@/pages/attractions";
import ContactDetailPage from "@/pages/contact-detail";
import ContactsPage from "@/pages/contacts";
import CraftVillageDetailPage from "@/pages/craft-village-detail";
import CraftVillagesPage from "@/pages/craft-villages";
import CuisineDetailPage from "@/pages/cuisine-detail";
import CuisinePage from "@/pages/cuisine";
import ExperienceTourDetailPage from "@/pages/experience-tour-detail";
import ExperienceToursPage from "@/pages/experience-tours";
import FeedbackDetailPage from "@/pages/feedback-detail";
import FeedbackPage from "@/pages/feedback";
import FestivalDetailPage from "@/pages/festival-detail";
import FestivalsPage from "@/pages/festivals";
import HistoricalSiteDetailPage from "@/pages/historical-site-detail";
import HistoricalSitesPage from "@/pages/historical-sites";
import HomePage from "@/pages/index";
import MapPlaceDetailPage from "@/pages/map-place-detail";
import MapPlacesPage from "@/pages/map-places";
import NewsDetailPage from "@/pages/news-detail";
import NewsPage from "@/pages/news";
import OcopDetailPage from "@/pages/ocop-detail";
import OcopPage from "@/pages/ocop";
import SpecialtiesPage from "@/pages/specialties";
import SpecialtyDetailPage from "@/pages/specialty-detail";
import TempleDetailPage from "@/pages/temple-detail";
import TemplesPage from "@/pages/temples";

const Layout = () => {
  return (
    <App theme={getSystemInfo().zaloTheme as AppProps["theme"]}>
      <SnackbarProvider>
        <ZMPRouter>
          <AnimationRoutes>
            <Route path="/" element={<HomePage />}></Route>
            <Route path="/agriculture" element={<AgriculturePage />}></Route>
            <Route
              path="/agriculture/:id"
              element={<AgricultureDetailPage />}
            ></Route>
            <Route path="/about" element={<AboutPage />}></Route>
            <Route path="/temples" element={<TemplesPage />}></Route>
            <Route path="/temples/:id" element={<TempleDetailPage />}></Route>
            <Route path="/attractions" element={<AttractionsPage />}></Route>
            <Route
              path="/attractions/:id"
              element={<AttractionDetailPage />}
            ></Route>
            <Route path="/contacts" element={<ContactsPage />}></Route>
            <Route
              path="/contacts/:id"
              element={<ContactDetailPage />}
            ></Route>
            <Route
              path="/craft-villages"
              element={<CraftVillagesPage />}
            ></Route>
            <Route
              path="/craft-villages/:id"
              element={<CraftVillageDetailPage />}
            ></Route>
            <Route path="/cuisine" element={<CuisinePage />}></Route>
            <Route
              path="/cuisine/:id"
              element={<CuisineDetailPage />}
            ></Route>
            <Route
              path="/experience-tours"
              element={<ExperienceToursPage />}
            ></Route>
            <Route
              path="/experience-tours/:id"
              element={<ExperienceTourDetailPage />}
            ></Route>
            <Route path="/feedback" element={<FeedbackPage />}></Route>
            <Route
              path="/feedback/:id"
              element={<FeedbackDetailPage />}
            ></Route>
            <Route path="/festivals" element={<FestivalsPage />}></Route>
            <Route
              path="/festivals/:id"
              element={<FestivalDetailPage />}
            ></Route>
            <Route
              path="/historical-sites"
              element={<HistoricalSitesPage />}
            ></Route>
            <Route
              path="/historical-sites/:id"
              element={<HistoricalSiteDetailPage />}
            ></Route>
            <Route path="/map" element={<MapPlacesPage />}></Route>
            <Route path="/map/:id" element={<MapPlaceDetailPage />}></Route>
            <Route path="/news" element={<NewsPage />}></Route>
            <Route path="/news/:id" element={<NewsDetailPage />}></Route>
            <Route path="/ocop" element={<OcopPage />}></Route>
            <Route path="/ocop/:id" element={<OcopDetailPage />}></Route>
            <Route path="/specialties" element={<SpecialtiesPage />}></Route>
            <Route
              path="/specialties/:id"
              element={<SpecialtyDetailPage />}
            ></Route>
          </AnimationRoutes>
        </ZMPRouter>
      </SnackbarProvider>
    </App>
  );
};
export default Layout;
