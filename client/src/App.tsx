import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import LoginModal from "./components/LoginModal";
import Assessment from "./pages/Assessment";
import AuditCenter from "./pages/admin/AuditCenter";
import AdminHome from "./pages/admin/AdminHome";
import AdminLayout from "./pages/admin/AdminLayout";
import Consulting from "./pages/Consulting";
import CounselingOperations from "./pages/CounselingOperations";
import CounselorWorkbench from "./pages/CounselorWorkbench";
import CourseDetail from "./pages/CourseDetail";
import CourseLearning from "./pages/CourseLearning";
import Courses from "./pages/Courses";
import CourseProducts from "./pages/admin/CourseProducts";
import FinanceManagement from "./pages/admin/FinanceManagement";
import Home from "./pages/Home";
import MyCourses from "./pages/MyCourses";
import OrderManagement from "./pages/admin/OrderManagement";
import PaymentReconciliation from "./pages/PaymentReconciliation";
import RiskReview from "./pages/admin/RiskReview";
import TransactionManagement from "./pages/admin/TransactionManagement";
import UserMembers from "./pages/admin/UserMembers";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/courses"} component={Courses} />
      <Route path={"/courses/:courseId/learn"} component={CourseLearning} />
      <Route path={"/courses/:courseId"} component={CourseDetail} />
      <Route path={"/consulting"} component={Consulting} />
      <Route path={"/counselor/workbench"} component={CounselorWorkbench} />
      <Route path={"/admin/counseling"}>
        <AdminLayout>
          <CounselingOperations />
        </AdminLayout>
      </Route>
      <Route path={"/admin/payments"}>
        <AdminLayout>
          <PaymentReconciliation />
        </AdminLayout>
      </Route>
      <Route path={"/admin/courses"}>
        <AdminLayout>
          <CourseProducts />
        </AdminLayout>
      </Route>
      <Route path={"/admin/users"}>
        <AdminLayout>
          <UserMembers />
        </AdminLayout>
      </Route>
      <Route path={"/admin/orders"}>
        <AdminLayout>
          <OrderManagement />
        </AdminLayout>
      </Route>
      <Route path={"/admin/transactions"}>
        <AdminLayout>
          <TransactionManagement />
        </AdminLayout>
      </Route>
      <Route path={"/admin/finance"}>
        <AdminLayout>
          <FinanceManagement />
        </AdminLayout>
      </Route>
      <Route path={"/admin/risk"}>
        <AdminLayout>
          <RiskReview />
        </AdminLayout>
      </Route>
      <Route path={"/admin/audit"}>
        <AdminLayout>
          <AuditCenter />
        </AdminLayout>
      </Route>
      <Route path={"/admin"}>
        <AdminLayout>
          <AdminHome />
        </AdminLayout>
      </Route>
      <Route path={"/assessment"} component={Assessment} />
      <Route path={"/me/courses"} component={MyCourses} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <LoginModal />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
