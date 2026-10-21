import MyContentReviewsPage from "@/pages/my-content-reviews";
import { getSystemInfo } from "zmp-sdk";
import {
  AnimationRoutes,
  App,
  Route,
  SnackbarProvider,
  ZMPRouter,
} from "zmp-ui";

import AgricultureDetailPage from "@/pages/agriculture-detail";
import AgriculturePage from "@/pages/agriculture";
import AboutPage from "@/pages/about";
import BusinessRegisterPage from "@/pages/business-register";
import BusinessProfileManagePage from "@/pages/business-profile-manage";
import BusinessProfilesPage from "@/pages/business-profiles";
import BusinessProfileDetailPage from "@/pages/business-profile-detail";
import AttractionDetailPage from "@/pages/attraction-detail";
import AttractionsPage from "@/pages/attractions";
import ContactDetailPage from "@/pages/contact-detail";
import ContactsPage from "@/pages/contacts";
import CraftVillageDetailPage from "@/pages/craft-village-detail";
import CraftVillagesPage from "@/pages/craft-villages";
import CuisineDetailPage from "@/pages/CuisineDetailPage";
import CuisinePage from "@/pages/cuisine";
import ExperienceTourDetailPage from "@/pages/experience-tour-detail";
import ExperienceToursPage from "@/pages/experience-tours";
import FeedbackDetailPage from "@/pages/feedback-detail";
import FeedbackPage from "@/pages/feedback";
import FeedbackLookupPage from "@/pages/feedback-lookup";
import FeedbackSendPage from "@/pages/feedback-send";
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
import TradePage from "@/pages/trade";
import TradeCreatePage from "@/pages/trade-create";
import TradeDetailPage from "@/pages/trade-detail";
import TradeEditPage from "@/pages/trade-edit";
import TradeManagementPage from "@/pages/trade-management";
import TradeMessagesPage from "@/pages/trade-messages";
import AppBackHandler from "@/components/app-back-handler";
import { AuthProvider } from "@/contexts/auth-context";
import { NotificationProvider } from "@/contexts/notification-context";
import { TradeSaveProvider } from "@/contexts/trade-save-context";
import NotificationsPage from "@/pages/notifications";
import SavedTradePostsPage from "@/pages/trade-saved";
import "@/css/responsive.css";
import "@/css/components/back-button.css";

const systemInfo = getSystemInfo();
document.documentElement.dataset.platform = systemInfo.platform || "unknown";

const Layout = () => {
  return (
    <App theme="light">
      <AuthProvider>
        <SnackbarProvider>
          <ZMPRouter>
            <NotificationProvider>
              <TradeSaveProvider>
                <AppBackHandler />
                <AnimationRoutes>
                  <Route path="/business/profile" element={<BusinessProfileManagePage />} />
                  <Route path="/business-profiles" element={<BusinessProfilesPage />} />
                  <Route path="/business-profiles/:id" element={<BusinessProfileDetailPage />} />
                  <Route path="/" element={<HomePage />}></Route>
                  <Route
                    path="/agriculture"
                    element={<AgriculturePage />}
                  ></Route>
                  <Route
                    path="/agriculture/:id"
                    element={<AgricultureDetailPage />}
                  ></Route>
                  <Route path="/about" element={<AboutPage />}></Route>
                  <Route path="/temples" element={<TemplesPage />}></Route>
                  <Route
                    path="/temples/:id"
                    element={<TempleDetailPage />}
                  ></Route>
                  <Route
                    path="/attractions"
                    element={<AttractionsPage />}
                  ></Route>
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
                    path="/feedback/send"
                    element={<FeedbackSendPage />}
                  ></Route>
                  <Route
                    path="/feedback/lookup"
                    element={<FeedbackLookupPage />}
                  ></Route>
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
                  <Route
                    path="/map/:id"
                    element={<MapPlaceDetailPage />}
                  ></Route>
                  <Route path="/news" element={<NewsPage />}></Route>
                  <Route path="/news/:id" element={<NewsDetailPage />}></Route>
                  <Route
                    path="/notifications"
                    element={<NotificationsPage />}
                  ></Route>
                  <Route path="/reviews/me" element={<MyContentReviewsPage />} />
                  <Route path="/ocop" element={<OcopPage />}></Route>
                  <Route path="/ocop/:id" element={<OcopDetailPage />} />
                  <Route
                    path="/specialties"
                    element={<SpecialtiesPage />}
                  ></Route>
                  <Route
                    path="/business/register"
                    element={<BusinessRegisterPage />}
                  ></Route>
                  <Route path="/trade" element={<TradePage />}></Route>
                  <Route
                    path="/trade/saved"
                    element={<SavedTradePostsPage />}
                  ></Route>
                  <Route
                    path="/trade/create"
                    element={<TradeCreatePage />}
                  ></Route>
                  <Route
                    path="/trade/manage"
                    element={<TradeManagementPage />}
                  ></Route>
                  <Route
                    path="/trade/manage/posts/:id/edit"
                    element={<TradeEditPage />}
                  ></Route>
                  <Route
                    path="/trade/messages/:id"
                    element={<TradeMessagesPage />}
                  ></Route>
                  <Route
                    path="/trade/:id"
                    element={<TradeDetailPage />}
                  ></Route>
                  <Route
                    path="/specialties/:id"
                    element={<SpecialtyDetailPage />}
                  ></Route>
                </AnimationRoutes>
              </TradeSaveProvider>
            </NotificationProvider>
          </ZMPRouter>
        </SnackbarProvider>
      </AuthProvider>
    </App>
  );
};
export default Layout;
